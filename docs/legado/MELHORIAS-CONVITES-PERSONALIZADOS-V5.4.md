# Convites personalizados automáticos – Daisy e Vinícius V5.4

Ao cadastrar uma família individualmente ou importar por CSV, o sistema gera o link exclusivo e permite montar imediatamente a arte do convite com o nome da família, quantidades autorizadas, local, horários e QR Code apontando ao RSVP.

## Uso pelo painel

1. Vá em **Convites e QR** no painel (`/admin.html`).
2. Cadastre a família e as pessoas, ou importe o CSV com quantidades (até 6 adultos e 6 crianças).
3. Ao cadastrar manualmente, a arte aparece automaticamente; clique **Baixar convite PNG** ou **Compartilhar convite**.
4. Ao importar planilha, baixe o CSV privado de links assim que for gerado. Para cada linha, clique **Ver convite / QR** e **Baixar imagem**. Cada família terá uma imagem distinta. A arte é montada quando solicitada, evitando processar até 200 imagens simultaneamente.
5. O botão **Enviar pelo WhatsApp** envia mensagem com endereço exclusivo; para enviar a imagem anexa, use **Compartilhar convite** no celular ou baixe o PNG e anexe ao WhatsApp.

## Privacidade e segurança

- A arte inclui QR Code com URL privativa. Qualquer pessoa que receber a imagem poderá usar o convite e confirmar a presença. Compartilhe somente com a família correta.
- O QR usa gerador local; links nunca são enviados a sites de geração de QR.
- O banco guarda somente o hash do token, e a imagem do convite é gerada somente no navegador do administrador. Links devem ser baixados ou compartilhados imediatamente, antes de fechar a página.
- Se o link for perdido, renove-o no painel e envie novamente a **nova imagem**: o QR anterior deixará de funcionar.
- Em importações só por quantidade, aparecem **Adulto 1 / Criança 1** no RSVP. Os nomes específicos podem ser cadastrados individualmente no painel.
- A prévia `public/admin-demo.html` usa dados fictícios e não salva nada.

## Publicar

Publique **a pasta completa do projeto** no Netlify, com `netlify.toml`, `netlify/functions/` e `public/`. Esta melhoria visual não requer migração SQL extra, mas o banco e as permissões da V4/V5 precisam ter sido configurados. Sem as integrações reais, teste apenas a prévia.

**V5.5:** Novo convite interativo com animação de envelope, sem quantidade de convidados visível na arte. Veja `MELHORIAS-CONVITE-INTERATIVO-V5.5.md`.
