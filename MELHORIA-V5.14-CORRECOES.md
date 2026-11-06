# V5.14 · Correções de revisão

- **Anti-bot (Turnstile):** sem `TURNSTILE_SECRET_KEY`, a verificação continua desligada (comportamento documentado), mas agora registra aviso no log. Para bloquear pagamentos, RSVP e fotos quando a chave faltar, defina `TURNSTILE_REQUIRED=true` no Netlify.
- **Títulos do site:** “Nosso casamento” saiu do `<title>` e do `og:title` da página de convidados (`index.html`, `convite-demo.html`) e do título dinâmico (`app.js`). Agora: “Daisy e Vinícius | Casamento”.
- **Identidade:** removido o token de cor `--gold` (que apontava para o fúcsia). O separador de horários usa `--fuchsia`.
- **Páginas de demonstração e prévia:** `admin.html`, `admin-demo.html`, `convite-demo.html` e as três `PREVIA-*.html` recebem `X-Robots-Tag: noindex, nofollow` no `netlify.toml`. Continuam no mesmo endereço porque outras páginas e guias apontam para elas.

Sem migração de banco. Para ativar: publique `public/` e as funções Netlify deste pacote.
