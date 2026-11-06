# V5.6 — Nome principal no convite

Agora o convite apresenta **Daniel e família**, não “Família Almeida”.

- No painel **Convites e QR**, preencha **Família ou grupo** (identificador interno) e **Nome principal** (ex.: Daniel).
- Na planilha CSV, utilize as colunas `Família ou grupo;Nome principal;Adultos autorizados;Crianças autorizadas`.
- Importe o CSV UTF-8. Os convites gerados apresentam o nome principal seguido de “e família”.
- O limite de adultos/crianças continua salvo e não aparece na arte do convite.
- No Supabase, execute `CONFIGURAR-NOME-PRINCIPAL-V5.6.sql` antes de publicar esta versão. Convites antigos sem nome principal cadastrado continuam exibindo o nome do grupo.
- Teste a prévia: `public/convite-interativo.html?demo=1&nome=Daniel`.
- Nenhum convite é enviado automaticamente. O painel fornece link e imagem para compartilhar.
