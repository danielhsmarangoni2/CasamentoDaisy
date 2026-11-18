-- Melhorias 8 e 12: limite de tentativas nos convites e registro de aberturas do link.
-- Rode no SQL Editor do Supabase (uma vez). Não apaga dados.

-- 8) Limite de tentativas por IP (protege consulta de convite e envio de RSVP).
create table if not exists public.limite_tentativas_casamento (
  chave text primary key,
  contador integer not null default 0,
  janela_inicio timestamptz not null default now()
);
alter table public.limite_tentativas_casamento enable row level security;

create or replace function public.registrar_tentativa_casamento(p_chave text, p_max integer, p_janela_seg integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  c integer;
begin
  insert into public.limite_tentativas_casamento as t (chave, contador, janela_inicio)
  values (p_chave, 1, now())
  on conflict (chave) do update set
    contador = case when t.janela_inicio < now() - make_interval(secs => p_janela_seg) then 1 else t.contador + 1 end,
    janela_inicio = case when t.janela_inicio < now() - make_interval(secs => p_janela_seg) then now() else t.janela_inicio end
  returning t.contador into c;
  return c <= p_max;
end;
$$;

revoke execute on function public.registrar_tentativa_casamento(text, integer, integer) from public, anon, authenticated;
grant execute on function public.registrar_tentativa_casamento(text, integer, integer) to service_role;

-- 12) Registro de aberturas do link individual do convite.
create table if not exists public.aberturas_convite_casamento (
  id bigserial primary key,
  convite_id uuid not null references public.convites_casamento(id) on delete cascade,
  aberto_em timestamptz not null default now()
);
create index if not exists aberturas_convite_casamento_convite_idx on public.aberturas_convite_casamento (convite_id, aberto_em desc);
alter table public.aberturas_convite_casamento enable row level security;
