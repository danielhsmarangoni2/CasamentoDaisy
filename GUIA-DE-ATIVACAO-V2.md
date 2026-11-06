# ATUALIZAÇÃO V4 — convites personalizados

Antes de publicar, consulte `GUIA-V4-CONVITES-QR.md`. A versão V4 exige `CONFIGURAR-CONVITES-V4.sql` após as migrações V3 e o envio do projeto completo ao Netlify, com funções de backend.

---

# Daisy e Vinícius — Versão 2 | LEIA PRIMEIRO

Data: **domingo, 23/05/2027**. Local: **Mansão Victória, Rua Orfanato, 440, Vila Prudente, São Paulo**. **Entrada dos convidados: 10h. Cerimônia: 11h.**

## O que já está implementado no código

1. **Painel de gestão (`/admin.html`)**: login Supabase Auth e tabela de administradores autorizados; resumo de confirmações e valores de cartão efetivamente aprovados; pesquisa de convidados, exportação CSV e moderação de fotos/recados.
2. **Presentes**: valores predefinidos e livre. Pix direto por QR Code/copia e cola **sem pedir nome**; cartão solicita obrigatoriamente o nome de quem presenteia. Ao ativar checkout integrado, relaciona o nome à transação confirmada pelo Mercado Pago. Sem o checkout integrado, links manuais não permitem identificar automaticamente o presenteador.
3. **Álbum**: fotos em bucket **privado**, comentários pendentes e links de fotos aprovadas temporários. Aprovação, ocultação e exclusão pelo painel. A publicação de fotos com esta versão exige configurar Turnstile (chave pública e chave secreta).
4. **Celular**: menu responsivo, atalhos para seções e link `casamento.ics` para adicionar ao calendário.
5. **Configurações no painel**: campo para número de destino dos avisos WhatsApp e chave Pix aleatória, nome do titular e cidade. O telefone não é entregue aos visitantes. A chave Pix precisa ser publicada aos visitantes para gerar códigos de pagamento.
6. **Health check**: funções para consultar status e monitor programado de 15 em 15 minutos (dependem da publicação via Netlify Functions).

## O que NÃO está ativo ainda

O ZIP **não está publicado** nem conectado às suas contas. Não envia WhatsApp, não processa pagamentos e não salva confirmações/fotos reais sem as configurações. Só confirme pagamento com o registro oficial do Mercado Pago ou do seu banco. Entrada às 10h e cerimônia às 11h já estão configuradas; texto “Nossa história” é Lorem ipsum.

## Como testar antes de publicar

- `public/admin-demo.html`: painel **fictício**, sem login real e sem alterar dados. Teste suas abas e a moderação. É apenas uma demonstração.
- `public/index.html`: parte pública do site. A prévia local pode não carregar tudo dependendo do navegador; as funções e dados reais exigem hospedagem.
- Uma prévia do painel em arquivo único também acompanha a entrega separadamente.

## Como ativar corretamente

**1. Supabase:** crie um projeto e execute no SQL Editor, na seguinte ordem:

1. `CONFIGURAR-SUPABASE.sql`
2. `CONFIGURAR-RSVP.sql`
3. `CONFIGURAR-ALERTAS.sql`
4. `CONFIGURAR-PAINEL-E-ALBUM.sql` — IMPORTANTÍSSIMO para bucket privado e tabela de configurações.

Crie um usuário em **Authentication → Users**. Obtenha seu UUID e autorize-o apenas uma vez com:

```sql
insert into public.administradores_casamento (id)
values ('COLE-O-UUID-DO-SEU-USUARIO-AQUI')
on conflict do nothing;
```

**2. Configuração pública:** abra `public/config.js` e preencha apenas `supabaseUrl` e `supabaseAnonKey`. Não coloque credenciais secretas aqui. Ative `notificacoesAtivas: true` **somente após** preparar o banco, funções, Mercado Pago e WhatsApp. O número e a chave Pix serão preenchidos no painel, não nesse arquivo.

**3. Netlify:** esta versão usa funções backend e não deve ser publicada arrastando somente `public/` ou um `index.html` no Netlify Drop. Envie o **projeto inteiro** (contendo `netlify.toml`, `netlify/functions/` e `public/`) via repositório Git conectado ao Netlify ou Netlify CLI; certifique-se de que o diretório publicado é `public` e a pasta das funções é `netlify/functions`.

**4. Variáveis secretas** no Netlify (`Site configuration → Environment variables`): use `EXEMPLO-VARIAVEIS-DE-AMBIENTE.txt` para os nomes exatos. Nunca compartilhe tokens. Inclua Supabase service_role, Mercado Pago Access Token + secret do webhook, Meta WhatsApp Cloud API (token, número emissor, template aprovado) e endereço do site. A Meta pode cobrar por mensagens de modelos aprovados.

**5. Checkout Mercado Pago**: configure a integração Checkout Pro e o webhook de pagamento no endereço `https://SEU-DOMINIO/.netlify/functions/mp-webhook`. O aviso de cartão só ocorrerá após pagamento aprovado e validação com a API. Chave Pix própria **não** envia alerta automático e não entra no total de cartão do painel.

**6. Fotos com moderação:** configure o Cloudflare Turnstile: `TURNSTILE_SECRET_KEY` nas variáveis do Netlify e a chave pública `turnstileSiteKey` em `public/config.js`. Sem isso, upload de foto ficará indisponível por segurança. Recados de texto podem ser salvos depois de conectar o Supabase.

**7. Painel:** acesse `https://SEU-DOMINIO/admin.html`, faça login com seu usuário autorizado, abra **Configurações** e preencha o número de WhatsApp destinatário e a chave Pix aleatória com titular e cidade. Salve. Para receber avisos, também precisa configurar o número **emissor** na plataforma oficial da Meta.

**8. Teste antes do convite:** login admin; RSVP sim/não; upload e aprovação; Pix QR Code de teste pequeno com conferência do recebedor/valor; checkout de teste e webhook; notificação real; celular; `/.netlify/functions/health`. Não trate o retorno do checkout como pagamento confirmado.

## Limitações e cuidados

- A hospedagem pode ser gratuita dentro dos limites dos provedores; SMS/WhatsApp, cartão e serviços adicionais podem ter tarifas.
- Fotos privadas ficam protegidas por URLs temporárias, mas após aprovadas qualquer visitante do site poderá vê-las.
- O painel não lista pagamentos Pix direto: confira pelo extrato bancário.
- O total das contribuições no painel considera apenas transações de cartão aprovadas no checkout integrado.
- O número do WhatsApp de destino foi informado na conversa; para respeitar a privacidade, cadastre-o diretamente na área administrativa em produção.
- Não use instruções antigas de "arrastar só o HTML" para esta V2: elas não ativam o backend.

Leia também `GUIA-INTEGRACAO-WHATSAPP.md` para detalhes dos tokens, webhook e templates.
