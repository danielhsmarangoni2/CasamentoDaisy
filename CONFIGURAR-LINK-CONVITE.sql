-- Guarda o link individual do convite criptografado, para o painel mostrar e enviar de novo sem trocar o link.
-- Rode no SQL Editor do Supabase (uma vez). Convites antigos ficam sem link guardado até usar "Gerar link".
alter table public.convites_casamento add column if not exists link_cifrado text;
