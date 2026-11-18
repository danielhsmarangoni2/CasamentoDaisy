-- Pix recebido direto na chave, registrado manualmente a partir do extrato.
-- Acesso somente pelo servidor (service role). Rode uma vez no SQL Editor do Supabase.
create table if not exists public.presentes_manuais_casamento (
 id uuid primary key default gen_random_uuid(),
 nome text not null check (char_length(nome) between 2 and 80),
 valor numeric(10,2) not null check (valor >= 5 and valor <= 10000),
 data_recebimento date not null,
 observacao text check (observacao is null or char_length(observacao) <= 200),
 criado_por uuid,
 criado_em timestamptz not null default now()
);
alter table public.presentes_manuais_casamento enable row level security;
revoke all on public.presentes_manuais_casamento from anon, authenticated;
