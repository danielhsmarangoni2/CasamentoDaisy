# Daisy e Vinícius · Convites personalizados com QR Code (versão 4)

## O que mudou

Cada família/grupo recebe um endereço individual gerado com token aleatório de alta entropia e QR Code próprio. No site, só aparecem os nomes previamente cadastrados na família. O convidado seleciona, dentre esses nomes, quem estará presente; a contagem e a autorização são validadas **novamente no servidor**, não apenas na tela. A confirmação pode ser alterada pelo mesmo link e substitui a anterior sem criar um RSVP duplicado. Convites podem ser cancelados/reativados e links podem ser renovados no painel dos noivos.

A confirmação por nome livre da versão anterior foi **desativada**; ela permitiria ultrapassar o limite e prejudicaria a lista. Os registros antigos continuam preservados e aparecem no relatório, mas não são vinculados automaticamente a novos convites.

## Para testar sem publicar

Na pasta `public/`, abra `admin-demo.html` para experimentar a nova aba **Convites e QR**. Abra `convite-demo.html` para ver um exemplo da Família Silva e marcar os participantes. São demos com dados inventados: não enviam mensagens, não processam pagamentos nem salvam registros reais. Para funcionar corretamente, abra os arquivos em um servidor local ou na hospedagem de teste, pois alguns navegadores restringem arquivos locais.

## Como ativar no site real

1. Crie/atualize o projeto do Supabase e execute, na ordem, os scripts de configuração V3 existentes no pacote (veja `GUIA-DE-HOSPEDAGEM.md`). Faça backup antes da migração.
2. Execute no **SQL Editor do Supabase** o arquivo `CONFIGURAR-CONVITES-V4.sql`. Ele cria `convites_casamento`, vincula as confirmações a cada família, configura as permissões e desativa o RSVP anônimo antigo. **Não execute antes das migrações V3**, pois a auditoria e o painel precisam existir.
3. Confira os valores de `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e demais credenciais privadas nas **Environment variables** do Netlify. A chave service_role nunca vai em `public/config.js`. Em `public/config.js`, mantenha `convitesAtivos: true`. Para notificações automáticas, é necessária a configuração separada da WhatsApp Cloud API (opcional; o RSVP é salvo mesmo sem WhatsApp).
4. Envie **o projeto todo**, preservando `netlify.toml`, a pasta `netlify/functions/` e `public/`. Não publique apenas a pasta `public`, pois os convites precisam das funções de servidor. Reimplante pelo painel do Netlify ou faça deploy via repositório/Git. Abra `/admin.html` e entre com o administrador autorizado pelo Supabase.
5. Na aba **Convites e QR**, escreva o nome da família e, uma pessoa por linha, `Nome Sobrenome; adulto` ou `Nome Sobrenome; criança`. Exemplo:

   ```text
   Maria Oliveira; adulto
   João Oliveira; adulto
   Luísa Oliveira; criança
   ```

6. Clique em **Gerar convite e QR Code**. Copie o link, compartilhe pelo WhatsApp ou imprima o QR Code. O endereço inclui `?convite=TOKEN#confirmacao` e leva diretamente à confirmação. O QR aponta para o mesmo endereço.
7. **Guarde o link no momento da criação**. Por segurança, o token original só é mostrado uma vez e não é armazenado em texto claro. Se você perder, use **Novo link** na linha da família; o anterior deixará de funcionar.
8. Faça um teste com dois dispositivos: marque parte da família, confirme, reabra o mesmo link, altere a resposta e confira se o painel mostra somente um RSVP por família. Teste também um convite cancelado.

## Segurança, limite e privacidade

- Cada link contém um código de 192 bits gerado criptograficamente; o banco guarda somente o **hash SHA-256**. Qualquer pessoa com o link consegue consultar e confirmar em nome daquela família, então compartilhe-o apenas com os convidados; cancelar ou renovar invalida o link.
- Os nomes são lidos por quem detém o link. Esse link não é um substituto para autenticação forte, mas é apropriado para convite familiar com controle de participantes.
- Aceita até 6 adultos e 6 crianças (até 12 pessoas) por convite. O número real de pessoas depende de quantos **nomes** foram cadastrados. Um adulto deve ser selecionado em confirmações positivas.
- QR Code **não** é um sistema de check-in/controle de acesso da festa; é um atalho para o convite e RSVP.
- Para corrigir nomes ou adicionar participantes após gerar um convite, **cancele o convite antigo e gere um novo**. Essa versão evita edições silenciosas em convites já enviados.
- A API antiga `/rsvp` agora responde 410. O banco revoga INSERT anônimo de RSVP. As confirmações reais só são aceitas pelo endpoint validado.
- A chave Pix e o destinatário do WhatsApp continuam no painel (V2); os pagamentos e os backups continuam no pacote (V3). Ainda dependem de suas integrações externas para funcionar em produção.

## Backups e auditoria

Os convites e os hashes passam a integrar a exportação privada (`admin-export`) e o backup lógico criptografado (`backup-daily`), desde que Cloudflare R2 e chaves estejam configurados. Criar, cancelar ou renovar convites e atualizar RSVPs grava auditoria. A exportação pode conter nomes, telefones e hashes: trate-a como informação privada.

## O que não está ativo automaticamente

Sem publicar a versão V4 e executar o SQL correspondente, os convites permanecem apenas na prévia. Os avisos no WhatsApp não serão enviados sem a conta emissora da Meta. Esta entrega não criou nem enviou convites reais.
