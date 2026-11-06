# Integração: WhatsApp automático + RSVP + Mercado Pago + Health Check

**Casamento Daisy e Vinícius — 23/05/2027 — Mansão Victória, São Paulo**

## 1. O que esta versão faz

- Ao confirmar a presença, salva os dados na tabela `confirmacoes_casamento` e solicita o envio de **uma mensagem-modelo pelo WhatsApp oficial da Meta** para o número do responsável.
- Ao escolher o checkout **Mercado Pago integrado**, salva a contribuição como `iniciado`. Só depois do **webhook de pagamento aprovado**, validado por assinatura e consulta à API do Mercado Pago, passa para `aprovado` e envia o aviso.
- Pode identificar o convidado que pagou, pois a janela do cartão exige o nome de quem está presenteando.
- `/.netlify/functions/health` retorna o estado do backend. Uma função agendada verifica site e backend a cada **15 minutos** e tenta avisar no WhatsApp quando a disponibilidade muda (queda e recuperação).
- Os pagamentos pelo **QR Code Pix de chave própria** não possuem consulta automática ao banco. Não serão lançados na tabela de contribuições nem avisados por WhatsApp automaticamente. Para alerta automático no Pix, o convidado deve escolher **Mercado Pago (cartão/Pix quando disponível)** ou você deverá contratar uma API Pix do banco.

## 2. Fazer deploy da versão com backend

Esta versão contém **Netlify Functions**. Recomendamos conectar um repositório GitHub ao Netlify (Site configuration → Build & deploy → Link repository). Também é possível usar Netlify CLI em um computador:

```bash
npm install -g netlify-cli
cd casamento-daisy-e-vinicius
netlify login
netlify link
netlify deploy                 # cria prévia; NÃO publica para convidados
netlify deploy --prod          # só após testar
```

Ao fazer deploy com CLI, verifique se `netlify.toml` está na raiz e se as funções aparecem no painel **Functions**. Arrastar só o arquivo `index.html` não ativa nenhuma função e não envia WhatsApp. A implantação do site e o uso do backend exigem publicar o projeto completo.

## 3. Configurar Supabase

No Supabase, use o MESMO projeto do site e execute, em ordem, pelo **SQL Editor**:

1. `CONFIGURAR-SUPABASE.sql` — mural (se ainda não executou).
2. `CONFIGURAR-RSVP.sql` — confirmações (se ainda não executou).
3. `CONFIGURAR-ALERTAS.sql` — contribuições privadas, notificação e monitor (novo).

No painel Supabase obtenha a Project URL e a **service_role key** / **secret key para operações de servidor**, conforme compatibilidade com a API REST do projeto. Coloque o token apenas no painel **Netlify → Environment variables**. Nunca no `public/config.js`, repositório público ou em mensagens a terceiros.

## 4. Mercado Pago — contribuição com confirmação

O usuário que vai receber o dinheiro deve entrar em [Mercado Pago Developers](https://www.mercadopago.com.br/developers/pt), criar uma integração Checkout Pro e obter o **Access Token de produção**. No Netlify, configure `MP_ACCESS_TOKEN`.

No painel da integração, abra **Webhooks → Configurar notificações**. Em produção, ative o evento **Pagamentos** e configure a URL pública:

```
https://SEU-SITE.netlify.app/.netlify/functions/mp-webhook
```

Copie a chave de assinatura do webhook no Netlify como `MP_WEBHOOK_SECRET`. É necessária a assinatura correta, senão os webhooks são rejeitados. A criação do checkout também define uma `notification_url` com o mesmo endpoint.

O site cria um checkout sob demanda, com um `external_reference` único em cada contribuição; a transação só gera alerta quando o Mercado Pago informa `approved` e o servidor confirma pelo endpoint oficial da API. **O clique no botão ou a página de retorno não comprovam pagamento**. Links manuais antigos (`mpago.la`) NÃO associam de forma automática a contribuição ao convidado; a versão nova usa a API quando `notificacoesAtivas: true`.

Faça testes controlados de integração com pagamentos de teste e a ferramenta **Simular** do painel Mercado Pago. O modo teste pode não gerar os mesmos webhooks de produção.

## 5. WhatsApp automático oficial

É preciso ter **Meta Business Portfolio**, um **WhatsApp Business Account** e um número habilitado para **WhatsApp Cloud API**, que será o número emissor. Em [Meta for Developers](https://developers.facebook.com/), configure a plataforma WhatsApp e obtenha:

- `META_WA_ACCESS_TOKEN` — token do servidor, com permissões de mensagens do WhatsApp.
- `META_WA_PHONE_NUMBER_ID` — identificador do número emissor da Cloud API.
- `META_WA_DESTINO` — número do WhatsApp **comum ou Business** que receberá os alertas (código do país + DDD + telefone, só dígitos). Para Daisy e Vinícius, o destinatário já foi indicado; preencha o valor somente no **painel privado do Netlify**, usando o arquivo separado `CONFIGURACAO-PRIVADA-WHATSAPP.txt` entregue nesta conversa. O telefone do destinatário não precisa ser Business.
- `META_WA_TEMPLATE` — nome de um modelo de mensagem **aprovado** na sua conta de WhatsApp Business.
- `META_WA_LANG` — idioma do modelo, p.ex. `pt_BR`.
- `META_GRAPH_VERSION` — versão disponível da Graph API, p.ex. `v24.0` (confira na Meta).

**Modelo sugerido**, chamado `alerta_site_casamento` (submeta para avaliação no WhatsApp Manager):

```
Atualização do site de casamento Daisy e Vinícius
Tipo: {{1}}
Detalhes: {{2}}
```

São **2 parâmetros de texto**, usados respectivamente para tipo da ocorrência e detalhes. Não é possível enviar mensagens automáticas fora da janela de atendimento usando um texto livre comum. A aprovação/categoria do template e possíveis cobranças são decididas pela Meta. **O número emissor e o número destinatário precisam ser diferentes.** O destinatário pode continuar usando o WhatsApp comum, sem migrar seu número; o emissor é que precisa ser configurado na WhatsApp Business Platform. O destinatário deve consentir em receber os avisos, e a Meta exige modelos aprovados para notificações iniciadas pela empresa. Evite enviar informações desnecessárias sobre convidados.

## 6. Configurar variáveis privadas no Netlify

Abra o arquivo `EXEMPLO-VARIAVEIS-DE-AMBIENTE.txt` para consultar os nomes exatos. O destinatário específico está no arquivo **separado e privado** `CONFIGURACAO-PRIVADA-WHATSAPP.txt`, que NÃO deve ser adicionado ao GitHub nem publicado no Netlify como arquivo público. Configure em **Site configuration → Environment variables** na interface Netlify, marque como secret quando disponível e publique nova versão.

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`
- `META_WA_ACCESS_TOKEN`, `META_WA_PHONE_NUMBER_ID`, `META_WA_DESTINO`, `META_WA_TEMPLATE`, `META_WA_LANG`, `META_GRAPH_VERSION`
- `PUBLIC_SITE_URL`, como `https://SEU-SITE.netlify.app`

**Opcional para evitar spam:** Cloudflare Turnstile. Coloque `TURNSTILE_SECRET_KEY` no Netlify e `turnstileSiteKey` (site key pública) no `public/config.js`. Configure **ambas ou nenhuma**. O desafio aparece nos formulários e será validado no servidor.

## 7. Habilitar no site após configurar tudo

No `public/config.js`, altere:

```js
notificacoesAtivas: true,
```

Certifique-se de que `supabaseUrl` e `supabaseAnonKey` (públicas) estejam configuradas para o mural. Quando `notificacoesAtivas: false`, o site continua como antes, com RSVP via Supabase diretamente e cartão via links de pagamento, mas **SEM alertas automáticos**.

## 8. Testes obrigatórios antes de passar aos convidados

- Abra `https://SEU-SITE.netlify.app/.netlify/functions/health`: deve retornar status `ok` e `banco: ok`.
- Envie um RSVP com nome de teste; confira a tabela `confirmacoes_casamento` e a chegada da mensagem no seu WhatsApp.
- Confirme no Mercado Pago o valor de uma contribuição de teste, compare a tabela `contribuicoes_casamento` e o WhatsApp. Não use um pagamento real alto no teste.
- Teste no Safari iPhone e no Chrome anônimo.
- Verifique que `MP_WEBHOOK_SECRET` é a mesma chave usada na integração configurada.
- Confira se a função `health-monitor` aparece como **Scheduled**, com execução a cada 15 minutos (UTC), no painel Functions.
- Examine logs das funções Netlify para erros. Se o aviso falhar, o banco ainda preserva as confirmações e contribuições.

**Limitações**: nenhum monitor garante disponibilidade de 100%; se a plataforma Netlify inteira falhar, seu monitor hospedado nela pode não executar. Para monitoramento independente use serviço externo de uptime. Nenhum pagamento deve ser inferido pela tela de retorno do comprador. A entrega de mensagens depende da Meta, da aprovação do template, de taxas e de disponibilidade da API. Esta integração está **preparada**, mas somente entra em funcionamento após você cadastrar credenciais reais e publicar o backend.

**Estrutura segura:** os arquivos públicos ficam na pasta `public/`; o código backend está em `netlify/functions/`, fora da pasta publicada. Edite as informações do casal em `public/config.js`.


### Nome de quem contribuiu (Pix versus cartão)
No Pix direto do site não há pergunta de nome: o convidado usa o QR Code ou o Pix Copia e Cola e o casal verifica quem enviou pelo extrato do banco. No cartão, o site solicita **nome de quem está presenteando**, que pode ser diferente do titular do cartão. O nome só é salvo e vinculado ao pagamento no modo **checkout integrado** (`notificacoesAtivas: true` com backend e credenciais configurados). O webhook oficial do Mercado Pago informa a aprovação, que gera o aviso no WhatsApp. Links manuais de cobrança **não** associam esse nome ao pagamento automaticamente.
