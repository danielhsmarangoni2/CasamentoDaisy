-- Execute DEPOIS de CONFIGURAR-RSVP.sql, pelo Supabase SQL Editor.
-- Tabelas privadas: todas as alterações de pagamentos são realizadas apenas no servidor Netlify.
alter table public.confirmacoes_casamento add column if not exists aviso_whatsapp_em timestamptz;
alter table public.confirmacoes_casamento add column if not exists aviso_whatsapp_erro boolean not null default false;

create table if not exists public.contribuicoes_casamento (
 id uuid primary key default gen_random_uuid(),
 nome text check (nome is null or char_length(nome)<=80),
 valor numeric(12,2) not null check (valor between 5 and 10000),
 titulo text not null check (char_length(titulo)<=90),
 checkout_id text,
 mp_payment_id text unique,
 status text not null default 'iniciado' check (status in ('iniciado','aprovado')),
 notificacao_estado text not null default 'pendente' check (notificacao_estado in ('pendente','enviando','enviado','erro')),
 notificado_em timestamptz,
 criado_em timestamptz not null default now()
);
alter table public.contribuicoes_casamento enable row level security;
revoke all on public.contribuicoes_casamento from anon,authenticated;

create table if not exists public.site_monitor_estado (
 id int primary key check (id=1),
 status text not null default 'desconhecido' check (status in ('desconhecido','online','fora')),
 alterado_em timestamptz not null default now()
);
insert into public.site_monitor_estado (id,status) values (1,'desconhecido') on conflict (id) do nothing;
alter table public.site_monitor_estado enable row level security;
revoke all on public.site_monitor_estado from anon,authenticated;

-- Uma notificação Mercado Pago pode chegar várias vezes: esta função faz lock e reclama de maneira atômica.
create or replace function public.confirmar_contribuicao_aprovada(p_id uuid,p_payment_id text,p_valor numeric)
returns boolean language plpgsql security definer set search_path = '' as $$
declare registro public.contribuicoes_casamento%rowtype;
begin
 select * into registro from public.contribuicoes_casamento where id = p_id for update;
 if not found or registro.valor <> p_valor then return false; end if;
 if registro.mp_payment_id is not null and registro.mp_payment_id <> p_payment_id then return false; end if;
 if registro.notificacao_estado not in ('pendente','erro') then return false; end if;
 update public.contribuicoes_casamento set status='aprovado',mp_payment_id=p_payment_id,
  notificacao_estado='enviando' where id=p_id;
 return true;
end $$;
revoke all on function public.confirmar_contribuicao_aprovada(uuid,text,numeric) from public,anon,authenticated;
grant execute on function public.confirmar_contribuicao_aprovada(uuid,text,numeric) to service_role;
-- Para consultar as respostas e contribuições: Supabase > Table Editor (acesso do proprietário).
