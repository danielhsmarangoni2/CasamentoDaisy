# Site de casamento — Daisy e Vinícius

Versão atual: **V5.16** (ver `MELHORIA-V5.1*.md` para o histórico recente).

## Estrutura
- `public/`: site publicado (HTML, CSS, JS). Pasta publicada pelo Netlify.
- `netlify/functions/`: backend (checkout, webhook do Mercado Pago, RSVP por convite, painel, backups, monitor).
- `*.sql`: migrações do Supabase, na ordem em que foram criadas (ver a seção Banco).
- `docs/legado/`: guias das versões anteriores, mantidos como referência.

## Ativação (checklist)
1. **Supabase:** rodar os SQL na ordem: `CONFIGURAR-SUPABASE.sql`, `CONFIGURAR-RSVP.sql`, `CONFIGURAR-ALERTAS.sql`, `CONFIGURAR-PAINEL-E-ALBUM.sql`, `CONFIGURAR-FINANCEIRO-BACKUP-AUDITORIA.sql`, `CONFIGURAR-CONVITES-V4.sql`, `CONFIGURAR-NOME-PRINCIPAL-V5.6.sql`. Fazer cópia dos dados antes da V4.
2. **Netlify > Environment variables:** preencher as variáveis de `EXEMPLO-VARIAVEIS-DE-AMBIENTE.txt`. Nunca colocar chave `service_role` em `public/`.
3. **Anti-bot (opcional):** para usar Cloudflare Turnstile, defina `TURNSTILE_SECRET_KEY` **e** `turnstileSiteKey` em `public/config.js`. Para bloquear pagamentos, RSVP e fotos quando a chave secreta faltar, defina `TURNSTILE_REQUIRED=true`. Sem chave, o anti-bot fica desligado e o log mostra um aviso.
4. **`public/config.js`:** preencher `supabaseUrl` e `supabaseAnonKey` (chave pública), `whatsapp`, e trocar `notificacoesAtivas` para `true` só depois que Supabase, Mercado Pago e Meta estiverem configurados. `convitesAtivos` deve ficar `true` (RSVP só pelo link do convite).
5. **Mercado Pago:** criar os links de presente e colar em `mercadoPagoLinks` (ou pelo painel `/admin.html`, para o Pix). Configurar o webhook apontando para `/.netlify/functions/mp-webhook`.
6. **WhatsApp (Meta):** configurar o template usado por `META_WA_TEMPLATE` e o número em `META_WA_PHONE_NUMBER_ID`.
7. **Backups (R2):** criar bucket privado e definir `R2_*` e `BACKUP_ENCRYPTION_KEY`. Guardar a chave de criptografia fora do Netlify. Sem ela, os backups não são recuperáveis.
8. **Páginas de demonstração:** `admin-demo.html`, `convite-demo.html` e `PREVIA-*.html` ficam publicadas, mas com `noindex` (ver `netlify.toml`).

## Testes rápidos antes de divulgar
- Abrir `/convite-interativo.html?demo=1`: a passagem roda, "Pular animação" funciona e "Rever abertura" volta à capa.
- Abrir `/admin.html`: sem login, deve mostrar acesso negado.
- Criar um convite pelo painel e abrir o link: a família e as vagas aparecem e o RSVP é salvo.

## Pontos de atenção
- `rsvp.mjs` responde 410 de propósito. Só é usado se `convitesAtivos` for `false`, e nesse caso o RSVP não é salvo. Mantenha `convitesAtivos: true`.
- `invite-rsvp.mjs` é o endpoint ativo para confirmar presença pelo convite.
