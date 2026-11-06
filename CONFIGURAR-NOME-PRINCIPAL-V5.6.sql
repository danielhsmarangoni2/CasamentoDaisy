-- Daisy e Vinícius · V5.6: destinatário nominal separado da família interna.
-- Executar no SQL Editor do Supabase APÓS as migrações anteriores.
ALTER TABLE public.convites_casamento
 ADD COLUMN IF NOT EXISTS nome_principal text;
ALTER TABLE public.convites_casamento
 DROP CONSTRAINT IF EXISTS convites_casamento_nome_principal_check;
ALTER TABLE public.convites_casamento
 ADD CONSTRAINT convites_casamento_nome_principal_check
 CHECK (nome_principal IS NULL OR char_length(btrim(nome_principal)) BETWEEN 2 AND 70);
-- Convites antigos permanecem válidos; o painel mostra o nome da família
-- até um novo cadastro ou substituição ser realizada.
