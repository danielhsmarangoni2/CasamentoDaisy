# Versão 5.5 — Convite interativo sem quantidade exibida

## O que mudou
- O convite individual agora abre `convite-interativo.html?convite=TOKEN`, com envelope animado, nome da família, data, horários e local.
- Botões: **Confirmar presença**, **Como chegar**, **Adicionar ao calendário**, **Trajes sugeridos**, **Conhecer o site**.
- A arte PNG/QR do painel **não informa a quantidade de adultos e crianças**. O convite interativo também não mostra quotas.
- **Os limites de presença continuam cadastrados e validados no backend** no momento do RSVP. Na página de confirmação, os integrantes da família podem ser selecionados conforme cadastro.
- Todos os convites gerados após a publicação levam à experiência interativa. Links antigos que apontam para `/?convite=...#confirmacao` continuam abrindo o formulário de confirmação.

## Prévia sem publicar
Abra `public/convite-interativo.html?demo=1&familia=Fam%C3%ADlia%20Almeida` por um servidor local, ou use a versão separada `previa-convite-interativo-daisy-e-vinicius.html` fornecida junto com o ZIP. Em demonstração, o botão Confirmar presença abre um formulário simulado, sem salvar dados.

## Publicação
Publique o projeto inteiro no Netlify (não apenas a pasta `public`) para disponibilizar as funções protegidas. Configure Supabase e as variáveis do projeto conforme os guias anteriores. Não publique links/tokens de convites em redes públicas. Envie cada convite à sua família correspondente.

## Atenção
O QR Code dos novos convites é gerado a partir do endereço do convite. A imagem de demonstração não constitui um convite real e não é válida para RSVP. Sem publicar e configurar o Supabase, nenhum RSVP real será enviado.
