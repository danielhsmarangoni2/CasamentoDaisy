-- CONFIGURACAO DO MURAL DE DAISY E VINÍCIUS
-- Cole TODO este script no SQL Editor do Supabase, clique em Run uma unica vez.
-- Politicas de seguranca: convidados podem enviar, mas NAO aprovar, editar ou excluir;
-- apenas postagens aprovadas ficam visiveis publicamente.

create table if not exists public.mural_de_recados (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 2 and 70),
  mensagem text not null default '' check (char_length(mensagem) <= 700),
  foto_path text,
  aprovado boolean not null default false,
  criado_em timestamptz not null default now(),
  constraint mensagem_ou_foto check (char_length(btrim(mensagem)) > 0 or foto_path is not null),
  constraint caminho_foto check (foto_path is null or foto_path ~ '^convidados/[a-f0-9-]{36}\.jpg$')
);
create index if not exists mural_de_recados_aprovado_data_idx on public.mural_de_recados (aprovado, criado_em desc);
alter table public.mural_de_recados enable row level security;

-- Revogacao explicita de permissoes antes de reautorizar leitura e criacao.
revoke all on public.mural_de_recados from anon, authenticated;
grant select, insert on public.mural_de_recados to anon, authenticated;

drop policy if exists "Convidados leem somente posts aprovados" on public.mural_de_recados;
create policy "Convidados leem somente posts aprovados"
on public.mural_de_recados for select to anon, authenticated
using (aprovado = true);

drop policy if exists "Convidados enviam apenas posts pendentes" on public.mural_de_recados;
create policy "Convidados enviam apenas posts pendentes"
on public.mural_de_recados for insert to anon, authenticated
with check (aprovado = false and char_length(btrim(nome)) between 2 and 70
  and char_length(mensagem) <= 700 and (char_length(btrim(mensagem)) > 0 or foto_path is not null)
  and (foto_path is null or foto_path ~ '^convidados/[a-f0-9-]{36}\.jpg$'));

-- Bucket publico: imagens so serao listadas no site quando o POST for aprovado.
-- Aviso: quem tiver o link direto de um arquivo publico pode abri-lo, mesmo antes da aprovacao.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('casamento-fotos','casamento-fotos',true,4194304,ARRAY['image/jpeg'])
on conflict (id) do update set public=true, file_size_limit=4194304, allowed_mime_types=ARRAY['image/jpeg'];

drop policy if exists "Convidados podem enviar imagens para pasta" on storage.objects;
create policy "Convidados podem enviar imagens para pasta"
on storage.objects for insert to anon, authenticated
with check (
  bucket_id = 'casamento-fotos'
  and (storage.foldername(name))[1] = 'convidados'
  and storage.extension(name) = 'jpg'
);

-- NAO crie politicas anonimas de UPDATE/DELETE nas tabelas nem no Storage.
-- Para MODERAR: Table Editor > mural_de_recados > marque aprovado=true.
-- Para REMOVER: exclua a linha no Table Editor e tambem a foto no Storage (se existir).
