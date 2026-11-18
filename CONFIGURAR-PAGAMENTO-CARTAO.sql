-- Credenciais do Mercado Pago gravadas pelo painel (criptografadas com SEGREDOS_ENCRYPTION_KEY).
-- Acesso somente pelo servidor (service role). Rode uma vez no SQL Editor do Supabase.
create table if not exists public.segredos_pagamento_casamento (
 id smallint primary key default 1 check (id = 1),
 mp_access_token_cifrado text,
 mp_webhook_secret_cifrado text,
 atualizado_em timestamptz not null default now()
);
alter table public.segredos_pagamento_casamento enable row level security;
revoke all on public.segredos_pagamento_casamento from anon, authenticated;
