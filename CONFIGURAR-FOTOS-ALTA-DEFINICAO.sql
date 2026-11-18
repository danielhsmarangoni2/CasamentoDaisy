-- Fotos de alta definição: aumenta o limite do bucket casamento-fotos de 4 MB para 9 MB.
-- Execute uma vez no SQL Editor do Supabase. Mantém apenas JPEG.
update storage.buckets
set file_size_limit = 9437184,
    allowed_mime_types = array['image/jpeg']
where id = 'casamento-fotos';
