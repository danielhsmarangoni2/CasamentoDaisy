-- RSVP DAISY E VINÍCIUS — EXECUTAR NO SQL EDITOR DO MESMO SUPABASE DO MURAL.
-- Somente os donos do projeto veem as respostas. O visitante pode ENVIAR,
-- mas não consegue listar, modificar ou apagar respostas pelo site público.
-- Requer Supabase conectado via config.js. O honeypot reduz alguns envios automáticos,
-- mas não substitui rate limit/CAPTCHA em caso de abuso.

create table if not exists public.confirmacoes_casamento (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 3 and 90),
  resposta text not null check (resposta in ('sim','nao')),
  adultos smallint not null default 0 check (adultos between 0 and 6),
  criancas smallint not null default 0 check (criancas between 0 and 6),
  acompanhantes text not null default '' check (char_length(acompanhantes) <= 450),
  contato text check (contato is null or char_length(contato) <= 20),
  criado_em timestamptz not null default now(),
  constraint validar_quantidades_rsvp check (
    (resposta = 'nao' and adultos = 0 and criancas = 0 and acompanhantes = '')
    or (resposta = 'sim' and adultos >= 1 and (adultos + criancas = 1 or char_length(btrim(acompanhantes)) >= 3))
  )
);

create index if not exists confirmacoes_casamento_data_idx on public.confirmacoes_casamento (criado_em desc);
alter table public.confirmacoes_casamento enable row level security;
revoke all on public.confirmacoes_casamento from anon, authenticated;
grant insert on public.confirmacoes_casamento to anon, authenticated;
drop policy if exists "Convidados podem confirmar presenca" on public.confirmacoes_casamento;
create policy "Convidados podem confirmar presenca"
on public.confirmacoes_casamento for insert to anon, authenticated
with check (
  char_length(btrim(nome)) between 3 and 90
  and resposta in ('sim','nao')
  and adultos between 0 and 6
  and criancas between 0 and 6
  and (contato is null or char_length(contato) <= 20)
  and (
    (resposta = 'nao' and adultos = 0 and criancas = 0 and acompanhantes = '')
    or (resposta = 'sim' and adultos >= 1 and (adultos + criancas = 1 or char_length(btrim(acompanhantes)) >= 3))
  )
);
-- IMPORTANTE: não crie policies SELECT/UPDATE/DELETE para anon.
-- Para consultar: Supabase > Table Editor > confirmacoes_casamento.
