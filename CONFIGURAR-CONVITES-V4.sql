-- V4 · Convites personalizados de Daisy e Vinícius.
-- EXECUTE APÓS TODOS OS SCRIPTS V3. Esta migração exige que o RSVP
-- passe somente pelo endpoint /invite-rsvp; os convites são obrigatórios.
-- Antes de ativar, faça uma cópia dos dados existentes.

create table if not exists public.convites_casamento (
 id uuid primary key default gen_random_uuid(),
 familia text not null check (char_length(btrim(familia)) between 3 and 100),
 pessoas jsonb not null check (jsonb_typeof(pessoas)='array' and jsonb_array_length(pessoas) between 1 and 12),
 max_adultos smallint not null check (max_adultos between 1 and 6),
 max_criancas smallint not null check (max_criancas between 0 and 6),
 token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
 ativo boolean not null default true,
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now()
);
create index if not exists convites_casamento_data_idx on public.convites_casamento(criado_em desc);
alter table public.convites_casamento enable row level security;
revoke all on public.convites_casamento from anon,authenticated;

alter table public.confirmacoes_casamento
 add column if not exists convite_id uuid references public.convites_casamento(id);
alter table public.confirmacoes_casamento add column if not exists ids_selecionados jsonb not null default '[]'::jsonb;
create unique index if not exists confirmacoes_casamento_convite_id_uq
 on public.confirmacoes_casamento(convite_id) where convite_id is not null;
-- Evita novos RSVPs livres por cliente REST; somente Netlify com service_role.
revoke all on public.confirmacoes_casamento from anon, authenticated;
drop policy if exists "Convidados podem confirmar presenca" on public.confirmacoes_casamento;

-- Distingue alterações feitas pelo convidado das feitas pelos administradores.
alter table public.auditoria_casamento drop constraint if exists auditoria_casamento_ator_tipo_check;
alter table public.auditoria_casamento add constraint auditoria_casamento_ator_tipo_check
 check (ator_tipo in ('administrador','mercado_pago','backup','convidado'));

-- Execução apenas pelo backend autenticado por service_role.
create or replace function public.registrar_rsvp_convite_v4(
 p_hash text, p_resposta text, p_ids jsonb, p_contato text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_inv public.convites_casamento%rowtype;
 v_atual public.confirmacoes_casamento%rowtype;
 v_pessoas jsonb := '[]'::jsonb;
 v_nome text;
 v_acompanhantes text := '';
 v_adultos int := 0;
 v_criancas int := 0;
 v_id uuid;
 v_alterado boolean := true;
 v_count int;
begin
 if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then raise exception 'Convite inválido'; end if;
 select * into v_inv from public.convites_casamento where token_hash=p_hash and ativo for update;
 if not found then raise exception 'Convite inválido ou cancelado'; end if;
 if p_resposta not in ('sim','nao') or p_ids is null or jsonb_typeof(p_ids)<>'array'
    or jsonb_array_length(p_ids)>12 then raise exception 'Resposta inválida'; end if;
 if p_contato is not null and (char_length(p_contato)>20 or p_contato !~ '^[0-9()+ -]{8,20}$')
 then raise exception 'WhatsApp inválido'; end if;
 select count(*),count(distinct x.id) into v_count,v_adultos
 from jsonb_array_elements_text(p_ids) as x(id);
 if v_count<>v_adultos then raise exception 'Há pessoas duplicadas na resposta'; end if;
 v_adultos:=0;
 if p_resposta='nao' then
   if v_count<>0 then raise exception 'Não selecione pessoas ao recusar convite'; end if;
 else
   if v_count=0 then raise exception 'Selecione ao menos uma pessoa'; end if;
   select coalesce(jsonb_agg(p), '[]'::jsonb) into v_pessoas
   from jsonb_array_elements(v_inv.pessoas) p
   where p->>'id' in (select x.id from jsonb_array_elements_text(p_ids) x(id));
   if jsonb_array_length(v_pessoas)<>v_count then raise exception 'Pessoa não incluída no convite'; end if;
   select count(*) filter (where p->>'tipo'='adulto'),
          count(*) filter (where p->>'tipo'='crianca')
    into v_adultos,v_criancas from jsonb_array_elements(v_pessoas) p;
   if v_adultos<1 or v_adultos>v_inv.max_adultos or v_criancas>v_inv.max_criancas
   then raise exception 'Quantidade acima do convite'; end if;
 end if;
 v_nome:=coalesce((select p->>'nome' from jsonb_array_elements(v_pessoas) p where p->>'tipo'='adulto' limit 1),
            v_inv.pessoas->0->>'nome');
 if p_resposta='sim' and v_count>1 then
  select string_agg(p->>'nome', ', ') into v_acompanhantes
  from jsonb_array_elements(v_pessoas) p where p->>'nome'<>v_nome;
 end if;
 if char_length(coalesce(v_acompanhantes,''))>450 then raise exception 'Muitos nomes de acompanhantes'; end if;
 select * into v_atual from public.confirmacoes_casamento where convite_id=v_inv.id;
 if found and v_atual.resposta=p_resposta and v_atual.adultos=v_adultos
   and v_atual.criancas=v_criancas and v_atual.nome=v_nome
   and v_atual.acompanhantes=coalesce(v_acompanhantes,'')
   and v_atual.ids_selecionados=p_ids
   and coalesce(v_atual.contato,'')=coalesce(p_contato,'')
 then
   v_alterado:=false;
   v_id:=v_atual.id;
 else
   insert into public.confirmacoes_casamento
     (convite_id,nome,resposta,adultos,criancas,acompanhantes,contato,ids_selecionados)
   values (v_inv.id,v_nome,p_resposta,v_adultos,v_criancas,coalesce(v_acompanhantes,''),nullif(p_contato,''),p_ids)
   on conflict (convite_id) where convite_id is not null do update set
     nome=excluded.nome,resposta=excluded.resposta,adultos=excluded.adultos,
     criancas=excluded.criancas,acompanhantes=excluded.acompanhantes,contato=excluded.contato,ids_selecionados=excluded.ids_selecionados,
     criado_em=now(),aviso_whatsapp_em=null,aviso_whatsapp_erro=false
   returning id into v_id;
   insert into public.auditoria_casamento(ator_tipo,ator_id,acao,entidade,detalhes)
    values('convidado',v_inv.id::text,'convite_rsvp_atualizado','convite',jsonb_build_object('convite_id',v_inv.id,'resposta',p_resposta,'adultos',v_adultos,'criancas',v_criancas));
 end if;
 return jsonb_build_object('ok',true,'alterado',v_alterado,'id',v_id,'nome',v_nome,'resposta',p_resposta,'adultos',v_adultos,'criancas',v_criancas,'acompanhantes',coalesce(v_acompanhantes,''));
end;
$$;
revoke all on function public.registrar_rsvp_convite_v4(text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.registrar_rsvp_convite_v4(text,text,jsonb,text) to service_role;

-- Importante: respostas antigas sem convite_id continuam no painel como histórico,
-- porém não são associadas automaticamente a novas famílias.
