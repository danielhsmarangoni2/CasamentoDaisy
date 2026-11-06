-- DAISY E VINÍCIUS: painel privado e moderação de fotos.
-- Executar DEPOIS de CONFIGURAR-SUPABASE.sql, CONFIGURAR-RSVP.sql e CONFIGURAR-ALERTAS.sql.

-- Usuários do painel são criados pela Auth > Users do Supabase (email e senha).
-- NÃO autorize todos os usuários autenticados: adicione IDs manualmente na tabela abaixo.
create table if not exists public.administradores_casamento (
 id uuid primary key references auth.users(id) on delete cascade,
 criado_em timestamptz not null default now()
);
alter table public.administradores_casamento enable row level security;
revoke all on public.administradores_casamento from anon,authenticated;

-- APÓS cadastrar o administrador na Auth > Users, consulte seu UUID:
-- select id,email from auth.users;
-- Depois execute substituindo SEU-UUID:
-- insert into public.administradores_casamento (id) values ('SEU-UUID') on conflict do nothing;

-- As fotos PENDENTES não são mais públicas, nem mesmo para quem tem o link.
update storage.buckets set public=false,file_size_limit=4194304,
 allowed_mime_types=ARRAY['image/jpeg'] where id='casamento-fotos';

-- Remova a permissão de upload direto anônimo: fotos sobem com token assinado emitido no servidor.
drop policy if exists "Convidados podem enviar imagens para pasta" on storage.objects;

-- Nenhuma policy de download para anon. O servidor assina fotos de posts aprovados.
-- Se já existiam links públicos de fotos, a migração torna-os privados.

-- Configuração privada dos noivos. Somente Netlify com SERVICE_ROLE pode ler/gravar.
-- NÃO conceda permissões anônimas, mesmo que a chave Pix seja exibida aos convidados.
create table if not exists public.configuracoes_casamento (
 id integer primary key check (id=1),
 telefone_notificacoes text not null default '' check (telefone_notificacoes='' or telefone_notificacoes ~ '^55[0-9]{10,11}$'),
 pix_chave text not null default '' check (char_length(pix_chave)<=77),
 pix_titular text not null default '' check (char_length(pix_titular)<=25),
 pix_cidade text not null default '' check (char_length(pix_cidade)<=15),
 atualizado_em timestamptz not null default now()
);
insert into public.configuracoes_casamento (id) values (1) on conflict (id) do nothing;
alter table public.configuracoes_casamento enable row level security;
revoke all on public.configuracoes_casamento from anon,authenticated;
-- A função pública /public-settings entrega SOMENTE os dados Pix; jamais entrega o telefone.
