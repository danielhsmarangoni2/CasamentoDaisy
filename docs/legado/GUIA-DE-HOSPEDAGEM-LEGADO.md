**IMPORTANTE: ESTE GUIA É DA VERSÃO ESTÁTICA. PARA AVISOS AUTOMÁTICOS LEIA GUIA-INTEGRACAO-WHATSAPP.md. Os arquivos de site agora ficam em `public/`, não mais na raiz.**

# SITE DE CASAMENTO · DAISY E VINÍCIUS

## O que vem pronto
- Site próprio, responsivo para celular e computador, com visual floral romântico em fúcsia, com fundos neutros para leitura.
- Decoração do local: somente fúcsia (`#C81E76`). O site usa tons de fúcsia e fundos neutros claros para acessibilidade, sem champagne ou dourado. Edite as variáveis de cor no início de `styles.css` para ajustar o tema.
- Nossa história preenchida com **Lorem ipsum**, que pode ser substituído.
- **Data confirmada:** domingo, 23 de maio de 2027. **Local:** Mansão Victória. **Endereço:** Rua Orfanato, 440 - Vila Prudente, São Paulo - SP, 03131-010. **Entrada dos convidados:** 10h. **Cerimônia:** 11h.
- Contagem regressiva para **23/05/2027 às 11h**, início da cerimônia.
- **Confirmação de presença por formulário**: registra no Supabase com resposta Sim/Não, adultos, crianças, nomes de acompanhantes e contato opcional. Se o Supabase não estiver conectado e houver WhatsApp configurado, abre uma mensagem pronta como alternativa.
- **Lista de 7 presentes (R$ 150, 250, 350, 500, 750, 1.000 e outro valor)**, com pop-up otimizado para celular: opção Pix com QR Code e código copia e cola ou cartão com redirecionamento na **mesma aba** ao Mercado Pago. Os botões de pagamento só são habilitados após configurar links/chave.
- Mural para fotos e recados dos convidados, com moderação. Os convidados não precisam criar conta.
- **Importante:** fotos e recados só ficam realmente salvos depois de conectar o Supabase grátis.

## PASSO 1 — Personalizar os dados (5 minutos)
1. Extraia o ZIP para uma pasta `casamento-daisy-e-vinicius`.
2. Abra o arquivo `config.js` usando o Bloco de Notas (Windows), TextEdit em texto puro (Mac), VS Code ou outro editor simples.
3. Substitua os campos entre aspas. Por exemplo:

```js
  data: '2027-05-23',
  hora: '11:00',
  horaEntrada: '10:00',
  hora: '', // Ainda não informado: preencha, por exemplo, '16:00'
  local: 'Mansão Victória',
  endereco: 'Rua Orfanato, 440 - Vila Prudente, São Paulo - SP, 03131-010',
  mapaUrl: 'https://www.google.com/maps/dir/?api=1&destination=Mans%C3%A3o%20Vict%C3%B3ria%2C%20Rua%20Orfanato%2C%20440%2C%20Vila%20Prudente%2C%20S%C3%A3o%20Paulo%2C%20SP%2C%2003131-010',
  whatsapp: '5511999999999',
  pixChave: '', // Deixe vazio até gerar a chave aleatória no banco.
  pixTitular: '', // Nome do titular real (max. 25 caracteres).
  pixCidade: '', // Cidade do titular (ex.: SAO PAULO, max. 15 caracteres).
```

O site já vem com os nomes **Daisy e Vinícius**, data **23/05/2027**, local **Mansão Victória** e endereço **Rua Orfanato, 440 - Vila Prudente, São Paulo - SP, 03131-010**. O botão **Como chegar pelo Google Maps** já está ativo. Para alterar o texto **Lorem ipsum**, abra `index.html`, localize a seção com `id="historia"` e substitua os dois parágrafos de exemplo. Para colocar fotos dos noivos, substitua os arquivos SVG em `assets/` ou adicione elementos de imagem no HTML.

## PASSO 2 — Ativar contribuições por Pix e cartão com Mercado Pago
**Importante:** não existe cobrança ativa no arquivo baixado, pois você ainda precisa criar seus próprios links de pagamento. O site NÃO acessa sua conta nem exige sua senha. A integração é por links públicos oficiais do Mercado Pago, sem API e sem precisar de servidor.

1. Acesse o aplicativo Mercado Pago com a conta que receberá o dinheiro.
2. Vá em **Cobrar / Link de pagamento** (nomes podem variar). Crie links fixos com descrição `Presente de casamento — Daisy e Vinícius` para os valores **R$ 150, R$ 250, R$ 350, R$ 500, R$ 750 e R$ 1.000**. Copie e guarde cada endereço HTTPS.
3. Ainda no aplicativo, vá em **Link de pagamento > Seu link** (ou a opção equivalente de link com valor aberto) e crie o endereço no qual o próprio convidado digita quanto deseja pagar. Copie esse link.
4. Em `config.js`, preencha `mercadoPagoLinks` (um link para cada valor) e `mercadoPagoValorLivre`:

```js
  mercadoPagoLinks: {
    '150': 'https://link.mercadopago.com.br/EXEMPLO150',
    '250': 'https://link.mercadopago.com.br/EXEMPLO250',
    '350': 'https://link.mercadopago.com.br/EXEMPLO350',
    '500': 'https://link.mercadopago.com.br/EXEMPLO500',
    '750': 'https://link.mercadopago.com.br/EXEMPLO750',
    '1000': 'https://link.mercadopago.com.br/EXEMPLO1000'
  },
  mercadoPagoValorLivre: 'https://link.mercadopago.com.br/EXEMPLO-LIVRE',
```

**Esses são links de exemplo e NÃO funcionam.** Substitua-os pelos verdadeiros que você gerar. Não cole access tokens, senhas nem chaves privadas dentro do site.

5. Para oferecer **Pix direto para os noivos**, preencha `pixChave`, `pixTitular` e `pixCidade` em `config.js`. A opção **Pagar via Pix** gera o QR Code e o Pix Copia e Cola com o valor do presente. Não cria um QR dinâmico nem verifica automaticamente a confirmação do pagamento.
6. Ao clicar em **Pagar com cartão**, o modal fecha e o convidado é redirecionado ao link oficial do Mercado Pago **na mesma aba**. Isso reduz os bloqueios de novas janelas no Safari do iPhone (mas o sistema ainda pode perguntar se deseja abrir o aplicativo Mercado Livre/Mercado Pago). Para retornar ao site, basta usar **Voltar** no navegador. Alguns links também oferecem Pix e outras formas de pagamento. Em **Outro valor**, ele informará o valor no site **e precisará digitá-lo novamente no Mercado Pago**. Isso evita exigir um backend pago ou suas credenciais privadas.
7. Confira se cada link está correto e se a conta que recebe é a conta pretendida. Antes de divulgar, faça um pagamento pequeno de teste e verifique se o valor entrou na conta.

A opção de cartão só funciona quando o respectivo link real estiver preenchido; caso contrário, o botão permanece desativado. O Pix requer chave, nome e cidade do titular cadastrados em `config.js`. **Nunca interprete o retorno à página ou uma captura de tela como comprovante: confira a aprovação no painel Mercado Pago.**


### Experiência de pagamento (versão atualizada)
1. O convidado toca em um presente (ou em **Outro valor** e digita um valor).
2. O site exibe uma janela com o resumo do presente e duas opções: **Pagar via Pix** (se chave, titular e cidade estiverem configurados) e **Pagar com cartão** (se houver link real do Mercado Pago).
3. Em Pix, o site mostra **QR Code**, **código Pix Copia e Cola**, botão **Copiar código Pix**, botão **Voltar** e mensagem de agradecimento. O QR e o código incorporam o **valor escolhido**, mas **o pagamento não é confirmado automaticamente**: confira o extrato.
4. Em cartão, a janela fecha e o navegador é levado ao Mercado Pago **na mesma aba**. O app Mercado Livre ou Mercado Pago pode ser sugerido pelo iPhone; esse comportamento é controlado pelo sistema e pelos aplicativos, não pelo site.
5. Para **Outro valor** no cartão, confira o valor informado outra vez no Mercado Pago. Os links de pagamento manuais não garantem preenchimento automático do valor digitado no site.
6. **Não exiba mensagem de “pagamento aprovado” no site só porque alguém clicou.** Confira o status efetivo na conta que receberá.

Para testar sem cobrar de verdade, você pode usar os botões de presente até chegar à tela do Mercado Pago e voltar sem concluir. Para verificar recebimento real, use uma cobrança legítima de teste de valor baixo e confirme na sua conta.

### E se quiser o valor livre já preenchido automaticamente no Mercado Pago?
Isso exige uma integração dinâmica com o **Checkout Pro/API** (preferências de pagamento criadas no servidor) e configuração segura de access token fora do navegador. Os links manuais desta versão são mais fáceis e seguros para começar.

Fontes oficiais: https://www.mercadopago.com.br/blog/seu-link | https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/overview

## PASSO 3 — Publicar grátis no Netlify (sem precisar programar)
1. Entre em https://app.netlify.com/drop e crie uma conta gratuita (recomendado para manter e editar seu site).
2. Extraia o ZIP primeiro e arraste a **pasta extraída** `casamento-daisy-e-vinicius` para a área do Netlify Drop. Atenção: o `index.html` deve estar na raiz da pasta que você envia.
3. Quando terminar, o Netlify gerará um link como `https://nome-escolhido.netlify.app`.
4. No painel do site, entre em **Site configuration / Domain management** e personalize o nome do projeto, se estiver disponível.
5. Compartilhe o link gerado. O Netlify fornece HTTPS automaticamente.

➡️ Neste ponto o site já estará online com visual, história, presentes e formulário RSVP. Para **salvar confirmações diretamente no site**, execute também o SQL RSVP no Supabase (PASSO 4B). Sem banco de dados e sem WhatsApp configurado, nenhuma confirmação será enviada. Fotos e recados também exigem Supabase.

## PASSO 4 — Ativar as postagens de fotos e recados (Supabase gratuito)
1. Acesse https://supabase.com/dashboard e crie uma conta gratuita.
2. Crie um projeto (**New project**) e guarde a senha do banco de dados em local seguro.
3. No menu lateral, entre em **SQL Editor > New query**.
4. Abra o arquivo `CONFIGURAR-SUPABASE.sql`, copie TODO o texto e cole no editor SQL. Clique em **Run**. O script cria a tabela, o armazenamento de fotos e as políticas para aprovar as postagens.
5. Abra **Project Settings / Connect / API Keys** (a localização e os nomes do menu podem mudar com atualizações da plataforma). Copie a **Project URL** e a chave **Publishable key** ou a chave **anon public** do projeto.
6. Volte ao `config.js` e preencha:

```js
  supabaseUrl: 'https://seu-projeto.supabase.co',
  supabaseAnonKey: 'sua-chave-publishable-ou-anon-publica',
```

⚠️ **NUNCA** copie a chave `service_role` ou `secret` para `config.js` — esse arquivo fica público na internet. Somente as chaves públicas podem ficar no navegador.

7. Salve o arquivo `config.js` e faça um novo deploy da pasta no painel do Netlify, na seção **Deploys** (arraste a pasta atualizada). O site terá o mesmo endereço.
8. Faça um teste pelo celular: coloque nome e recado ou uma foto e clique em **Enviar minha lembrança**.

## PASSO 4B — Ativar a confirmação de presença no site (RSVP)
1. Depois de configurar o projeto e as chaves públicas do Supabase no `config.js` (PASSO 4), volte ao **SQL Editor** desse mesmo projeto.
2. Abra `CONFIGURAR-RSVP.sql` e execute todo o código uma vez.
3. No site, o convidado preenche **nome completo**, marca **Sim/Não**, informa **número de adultos e crianças** e, se vier acompanhado, preenche os **nomes dos acompanhantes**. O WhatsApp de contato é opcional.
4. Ao clicar **Enviar confirmação**, o site salva a resposta na tabela privada `confirmacoes_casamento` e exibe um aviso de sucesso apenas se o banco confirmar o recebimento.
5. Para ver as confirmações, abra **Supabase > Table Editor > confirmacoes_casamento**. Cada linha mostra a resposta e quantidades (adultos incluem o convidado).
6. Para apurar os números, filtre `resposta = sim` e some `adultos` e `criancas`. Para não comparecimento, filtre `resposta = nao`.
7. **Privacidade:** os visitantes podem inserir novas respostas, mas não podem ver respostas de outras pessoas. Não publique print/exportação da tabela com dados pessoais. Caso precise apagar ou corrigir uma resposta, faça isso pelo Table Editor.

**Alternativa simples:** se você ainda não ativar Supabase, pode colocar `whatsapp` no `config.js` para abrir uma mensagem pronta; o convidado precisa clicar em **Enviar** no WhatsApp. Sem nenhum dos dois configurado, o site avisa que a confirmação ainda não está ativa.

**Atenção:** por ser um formulário público, respostas podem se repetir ou ser enviadas sem convite. Para uma lista fechada, recomenda-se validar manualmente os nomes ou, futuramente, usar códigos individuais e proteção anti-spam. O formulário não cria automaticamente uma lista de convidados autorizados.

## PASSO 5 — Aprovar as postagens
Os visitantes podem publicar **fotos e recados**, mas o conteúdo ficará pendente para evitar que qualquer postagem apareça sem conferência.

1. Entre no painel do Supabase > **Table Editor** > tabela `mural_de_recados`.
2. Encontre a nova linha e altere a coluna `aprovado` de `false` para `true`.
3. Salve e atualize a página do casamento. A publicação aparecerá no mural.
4. Se precisar apagar um post, exclua a linha nessa tabela. Para apagar uma foto do armazenamento também vá em **Storage > casamento-fotos > convidados** e remova o arquivo da mesma postagem (`foto_path`).

Assim você não precisa contratar site de casamento nem pagar por um painel de administração.

## PASSO 6 — Colocar domínio personalizado `.com.br` (opcional)
1. Consulte a disponibilidade em https://registro.br e registre um domínio se quiser (o Registro.br informa o preço atual de R$ 40 por ano).
2. No Netlify, acesse o painel do projeto > **Domain management > Add a domain**.
3. Informe o domínio que você registrou. Siga os registros DNS indicados pelo Netlify (podem variar conforme sua configuração).
4. Aguarde a propagação do DNS. O Netlify oferece HTTPS para o domínio configurado.

Não é obrigatório pagar um domínio: o endereço `.netlify.app` pode ser usado gratuitamente.

## CUSTOS E LIMITES IMPORTANTES
- **Mercado Pago:** os links podem ser criados sem mensalidade, mas a plataforma cobra tarifas por transação conforme meio de pagamento, parcelamento e prazo de recebimento. Consulte o simulador de taxas da sua conta.
- **Netlify Free:** R$ 0/mês; plano com limite de uso por créditos. Se ultrapassar, o site pode ficar indisponível até o próximo ciclo, a menos que você contrate outro plano.
- **Supabase Free:** R$ 0/mês; atualmente 1 GB de armazenamento de arquivos, 500 MB de dados e até 5 GB de transferência não armazenada em cache. Projetos gratuitos podem ser pausados após uma semana sem atividade, então monitore o painel.
- **Domínio personalizado:** opcional, `.com.br` custa R$ 40/ano no Registro.br conforme preço publicado; disponibilidade depende do domínio.
- O site otimiza fotos enviadas pelo celular, mas muitos convidados enviando muitas imagens podem esgotar a franquia gratuita.
- Vídeos **não** estão habilitados nesta versão, justamente para preservar armazenamento e custos.

## PRIVACIDADE E SEGURANÇA
- Mensagens e fotos **aprovadas** ficam públicas para qualquer pessoa que acessar o site.
- Fotos ficam em um bucket público, portanto alguém com o link direto do arquivo pode visualizá-lo até antes da aprovação. Não use esse sistema para fotos privadas ou sensíveis.
- O formulário é público e tem validações simples; proteção contra abuso em larga escala e moderação avançada exigiriam autenticação, CAPTCHA e/ou um backend adicional.
- A moderação de fotos e recados é feita pelo painel privado do Supabase. Nunca entregue a senha desse painel aos convidados.
- Recomenda-se comunicar aos convidados a política de compartilhamento e obter consentimento; existe uma caixa de autorização no formulário.
- Faça backup periódico das fotos do Supabase, pois o plano gratuito não deve ser o único lugar para guardar lembranças importantes.
- Se quiser impedir novos envios após o evento, remova as políticas anônimas de INSERT (no Supabase > SQL Editor) ou desabilite o formulário no HTML, lembrando que esconder o formulário sozinho não bloqueia o endpoint do banco.

## ONDE ALTERAR CADA COISA
- Nomes, data, local, hora, WhatsApp, chave Pix, links Mercado Pago e chaves Supabase: `config.js`.
- História, títulos e textos: `index.html`.
- Cores, fontes, espaçamentos e elementos visuais: `styles.css`.
- Comportamento e envio de fotos: `app.js`.
- Configuração do banco e moderação: `CONFIGURAR-SUPABASE.sql`.
- Ícones e ilustrações: pasta `assets/`.

## TESTE RÁPIDO ANTES DE DIVULGAR
- [ ] Nomes corretos em todas as seções.
- [x] Data, endereço e link de rota configurados.
- [x] Entrada dos convidados às 10h e cerimônia às 11h.
- [ ] Rodar `CONFIGURAR-RSVP.sql` no Supabase (ou configurar WhatsApp como alternativa).
- [ ] Testar uma confirmação de Sim e uma de Não no site publicado, e conferir no Table Editor.
- [ ] WhatsApp com DDI 55 + DDD + número correto, se quiser usar confirmação por mensagem.
- [ ] Chave Pix, titular e cidade preenchidos; QR Code e Pix Copia e Cola testados no banco.
- [ ] 6 links fixos e o link de valor livre criados na conta Mercado Pago e inseridos em `config.js`.
- [ ] Testar os sete botões do site, valores, nome do recebedor e aprovação no painel Mercado Pago.
- [ ] Supabase conectado e formulário testado com um post.
- [ ] Post aprovado no Supabase e visível ao atualizar o site.
- [ ] Link do Netlify abre no celular fora da rede Wi-Fi.

Sites úteis:
- https://docs.netlify.com/deploy/create-deploys/
- https://supabase.com/docs/guides/storage/quickstart
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://registro.br/dominio


## PIX COM QR CODE E COPIA E COLA — versão fúcsia v3

A janela de Pix agora é como o exemplo do casamento Raissa & Henzo: QR Code, código Pix copia e cola, botão **COPIAR CÓDIGO PIX**, botão **VOLTAR** e agradecimento. Não é uma simples cópia da chave: o site gera um **BR Code estático** com valor já preenchido para o presente selecionado (inclusive em "Outro valor"). O QR e o código representam o MESMO pagamento e são gerados localmente no navegador, sem API paga e sem enviar dados para serviço de QR externo.

**Você ainda não cadastrou o Pix**, por isso o botão fica desabilitado. Quando tiver sua chave aleatória, abra `config.js` e preencha os três campos (não troque nomes das propriedades):

```js
  pixChave: 'SUA-CHAVE-ALEATORIA-DO-BANCO',
  pixTitular: 'NOME COMPLETO DO TITULAR',
  pixCidade: 'SAO PAULO',
```

- `pixChave` deve ser uma chave Pix **real e ativa** no banco. O exemplo acima NÃO é uma chave válida.
- `pixTitular` deve ser o nome do titular da conta que recebe, até **25 caracteres**, e `pixCidade` deve ser a cidade desse titular, até **15 caracteres**. Para o BR Code use letras sem acentos; o site também normaliza acentos automaticamente.
- Se nome exceder 25 caracteres, use abreviação apropriada e confirme no banco. Se a cidade for longa demais, use abreviação apropriada (não deixe o campo em branco).
- No app do seu banco, faça um **teste de leitura de QR e Pix Copia e Cola** com um valor pequeno antes de divulgar. Confira que o beneficiário e valor exibidos são os esperados. O nome oficial mostrado pelo banco vem da chave registrada, não do texto do site.
- A **chave aleatória Pix é pública** no site para permitir o recebimento. NÃO coloque senhas bancárias, dados do cartão ou tokens/credenciais privadas.
- O QR Code gerado é estático e **pode ser usado mais de uma vez**. O site NÃO sabe automaticamente se o convidado pagou. Verifique os recebimentos pelo extrato bancário. Para comprovante/confirmar automaticamente, seria necessária integração de backend com API do banco/provedor.
- Se ainda não criou a chave: no aplicativo do banco, abra **Pix → Minhas chaves → Cadastrar → Chave aleatória** (menus variam). Copie a chave gerada e preencha `config.js`.
- A implementação de QR é local em `qr-local.js` (biblioteca com licença MIT; ver `assets/QR-LICENSE.txt`), sem dependência de sites geradores de QR Code. Para hospedagem, envie toda a pasta, incluindo esse arquivo.
- Ao alterar `config.js`, publique novamente o site no Netlify. O cartão continua sendo processado exclusivamente pelo **Mercado Pago**, através dos links oficiais que você configurar.


### Nome de quem contribuiu (Pix versus cartão)
No Pix direto do site não há pergunta de nome: o convidado usa o QR Code ou o Pix Copia e Cola e o casal verifica quem enviou pelo extrato do banco. No cartão, o site solicita **nome de quem está presenteando**, que pode ser diferente do titular do cartão. O nome só é salvo e vinculado ao pagamento no modo **checkout integrado** (`notificacoesAtivas: true` com backend e credenciais configurados). O webhook oficial do Mercado Pago informa a aprovação, que gera o aviso no WhatsApp. Links manuais de cobrança **não** associam esse nome ao pagamento automaticamente.
