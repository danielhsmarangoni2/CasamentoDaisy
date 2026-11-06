-- Daisy e Vinícius — V3: financeiro, trilha imutável de auditoria e histórico dos backups.
-- Rodar APÓS os quatro scripts SQL da V2. SQL idempotente.
-- A chave service_role NUNCA vai para o JavaScript público.

alter table public.contribuicoes_casamento drop constraint if exists contribuicoes_casamento_status_check;
alter table public.contribuicoes_casamento add constraint contribuicoes_casamento_status_check
 check (status in ('iniciado','pendente','aprovado','cancelado','estornado','contestado'));
alter table public.contribuicoes_casamento add column if not exists taxa_mp numeric(12,2) check (taxa_mp is null or taxa_mp>=0);
alter table public.contribuicoes_casamento add column if not exists liquido_mp numeric(12,2) check (liquido_mp is null or liquido_mp>=0);
alter table public.contribuicoes_casamento add column if not exists meio_pagamento text;
alter table public.contribuicoes_casamento add column if not exists detalhe_mp text;
alter table public.contribuicoes_casamento add column if not exists aprovado_em timestamptz;
alter table public.contribuicoes_casamento add column if not exists sincronizado_em timestamptz;
create index if not exists contribuicoes_status_idx on public.contribuicoes_casamento(status, criado_em desc);

create table if not exists public.auditoria_casamento (
 id bigint generated always as identity primary key,
 ocorrido_em timestamptz not null default now(),
 ator_tipo text not null check (ator_tipo in ('administrador','mercado_pago','backup')),
 ator_id text not null,
 acao text not null,
 entidade text not null,
 entidade_id text,
 detalhes jsonb not null default '{}'::jsonb
);
create index if not exists auditoria_data_idx on public.auditoria_casamento (ocorrido_em desc);
alter table public.auditoria_casamento enable row level security;
revoke all on public.auditoria_casamento from anon, authenticated;
-- Bloqueia UPDATE/DELETE normais; somente administrador do Supabase pode alterar schema.
create or replace function public.bloquear_alteracao_auditoria()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'Auditoria somente acrescenta registros'; end $$;
drop trigger if exists auditoria_sem_editar on public.auditoria_casamento;
create trigger auditoria_sem_editar before update or delete on public.auditoria_casamento
for each row execute function public.bloquear_alteracao_auditoria();

create table if not exists public.backups_casamento (
 id uuid primary key default gen_random_uuid(),
 criado_em timestamptz not null default now(),
 tipo text not null check (tipo in ('dados','fotos')),
 estado text not null check (estado in ('ok','erro')),
 arquivos integer not null default 0,
 registros integer not null default 0,
 referencia text,
 informacao text
);
create index if not exists backups_casamento_data_idx on public.backups_casamento(criado_em desc);
alter table public.backups_casamento enable row level security;
revoke all on public.backups_casamento from anon, authenticated;

create table if not exists public.backups_fotos_casamento (
 foto_path text primary key,
 destino text not null,
 salvo_em timestamptz not null default now()
);
alter table public.backups_fotos_casamento enable row level security;
revoke all on public.backups_fotos_casamento from anon, authenticated;

-- Configurações do portal com auditoria na mesma transação.
create or replace function public.admin_salvar_configuracoes_v3(
 p_admin uuid,p_telefone text,p_chave text,p_titular text,p_cidade text
) returns void language plpgsql security definer set search_path = '' as $$
declare antes public.configuracoes_casamento%rowtype;
begin
 if not exists(select 1 from public.administradores_casamento where id=p_admin) then
  raise exception 'Administrador não autorizado'; end if;
 select * into antes from public.configuracoes_casamento where id=1 for update;
 insert into public.configuracoes_casamento(id,telefone_notificacoes,pix_chave,pix_titular,pix_cidade,atualizado_em)
 values(1,p_telefone,p_chave,p_titular,p_cidade,now())
 on conflict (id) do update set telefone_notificacoes=excluded.telefone_notificacoes,
 pix_chave=excluded.pix_chave,pix_titular=excluded.pix_titular,
 pix_cidade=excluded.pix_cidade,atualizado_em=now();
 insert into public.auditoria_casamento(ator_tipo,ator_id,acao,entidade,entidade_id,detalhes)
 values('administrador',p_admin::text,'configuracoes_alteradas','configuracoes','1',
 jsonb_build_object('whatsapp_alterado',antes.telefone_notificacoes is distinct from p_telefone,
 'pix_alterado',antes.pix_chave is distinct from p_chave,
 'titular_alterado',antes.pix_titular is distinct from p_titular,
 'cidade_alterada',antes.pix_cidade is distinct from p_cidade));
end $$;

-- Aprovação/ocultação/exclusão + log atômico. Retorna path da foto para remoção posterior.
create or replace function public.admin_moderar_mural_v3(p_admin uuid,p_id uuid,p_acao text)
returns text language plpgsql security definer set search_path = '' as $$
declare registro public.mural_de_recados%rowtype;
begin
 if not exists(select 1 from public.administradores_casamento where id=p_admin) then
  raise exception 'Administrador não autorizado'; end if;
 if p_acao not in ('aprovar','ocultar','excluir') then raise exception 'Ação inválida'; end if;
 select * into registro from public.mural_de_recados where id=p_id for update;
 if not found then raise exception 'Publicação não encontrada'; end if;
 if p_acao='excluir' then delete from public.mural_de_recados where id=p_id;
 else update public.mural_de_recados set aprovado=(p_acao='aprovar') where id=p_id; end if;
 insert into public.auditoria_casamento(ator_tipo,ator_id,acao,entidade,entidade_id,detalhes)
 values('administrador',p_admin::text,'mural_'||p_acao,'mural',p_id::text,
 jsonb_build_object('tinha_foto',registro.foto_path is not null,'aprovado_anteriormente',registro.aprovado));
 return case when p_acao='excluir' then registro.foto_path else null end;
end $$;

-- Idempotência e estado financeiro provenientes da consulta autenticada à API do Mercado Pago.
create or replace function public.registrar_pagamento_mp_v3(
 p_id uuid,p_pagamento text,p_valor numeric,p_status text,
 p_taxa numeric,p_liquido numeric,p_metodo text,p_detalhe text,p_aprovado_em timestamptz
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare item public.contribuicoes_casamento%rowtype;
        novo text; enviar boolean:=false;
begin
 select * into item from public.contribuicoes_casamento where id=p_id for update;
 if not found or item.valor<>p_valor then return jsonb_build_object('valido',false,'motivo','valor'); end if;
 if item.mp_payment_id is not null and item.mp_payment_id<>p_pagamento then
   return jsonb_build_object('valido',false,'motivo','pagamento_diferente'); end if;
 if p_status='approved' then novo:='aprovado';
 elsif p_status='refunded' then novo:='estornado';
 elsif p_status='charged_back' then novo:='contestado';
 elsif p_status in ('cancelled','rejected') then novo:='cancelado';
 else novo:='pendente'; end if;
 -- Nenhum webhook pendente posterior pode regredir uma venda já aprovada ou estornada.
 if item.status in ('estornado','contestado') and novo not in ('estornado','contestado') then novo:=item.status; end if;
 if item.status='aprovado' and novo='pendente' then novo:='aprovado'; end if;
 enviar:=(novo='aprovado' and item.notificacao_estado in ('pendente','erro'));
 update public.contribuicoes_casamento
 set status=novo,mp_payment_id=p_pagamento,
 taxa_mp=coalesce(p_taxa,taxa_mp),liquido_mp=coalesce(p_liquido,liquido_mp),
 meio_pagamento=left(coalesce(p_metodo,''),64),detalhe_mp=left(coalesce(p_detalhe,''),80),
 aprovado_em=case when novo='aprovado' then coalesce(aprovado_em,p_aprovado_em,now()) else aprovado_em end,
 sincronizado_em=now(),notificacao_estado=case when enviar then 'enviando' else notificacao_estado end
 where id=p_id;
 if item.status is distinct from novo then
  insert into public.auditoria_casamento(ator_tipo,ator_id,acao,entidade,entidade_id,detalhes)
  values('mercado_pago',p_pagamento,'pagamento_'||novo,'contribuicao',p_id::text,
    jsonb_build_object('anterior',item.status,'atual',novo,'valor',p_valor));
 end if;
 return jsonb_build_object('valido',true,'alertar',enviar,'status',novo);
end $$;

revoke all on function public.admin_salvar_configuracoes_v3(uuid,text,text,text,text) from public,anon,authenticated;
revoke all on function public.admin_moderar_mural_v3(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.registrar_pagamento_mp_v3(uuid,text,numeric,text,numeric,numeric,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.admin_salvar_configuracoes_v3(uuid,text,text,text,text) to service_role;
grant execute on function public.admin_moderar_mural_v3(uuid,uuid,text) to service_role;
grant execute on function public.registrar_pagamento_mp_v3(uuid,text,numeric,text,numeric,numeric,text,text,timestamptz) to service_role;
