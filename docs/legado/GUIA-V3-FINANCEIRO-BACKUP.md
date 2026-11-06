# Daisy e Vinícius — V3: relatório financeiro, backup e auditoria

**Data:** 23/05/2027, Mansão Victória, São Paulo. Este projeto ainda não foi publicado nem recebeu credenciais reais. O modo de demonstração usa apenas dados fictícios.

## 1. Preparação do Supabase (obrigatório)

Se estiver começando do zero, execute os scripts da versão 2 **nesta ordem**:

1. `CONFIGURAR-SUPABASE.sql`
2. `CONFIGURAR-RSVP.sql`
3. `CONFIGURAR-ALERTAS.sql`
4. `CONFIGURAR-PAINEL-E-ALBUM.sql`
5. **`CONFIGURAR-FINANCEIRO-BACKUP-AUDITORIA.sql`** (NOVO V3)

Se já executou todos os scripts da V2, execute somente o quinto. Os novos campos financeiros, auditoria e tabelas dos backups passarão a existir. Não execute nenhuma migração sem antes salvar os dados já existentes.

### Administração

Cadastre usuário no Supabase Auth e autorize UUID na `administradores_casamento`, conforme o guia da V2. Para entrar, navegue em `/admin.html`. Agora há a aba **Backup e auditoria** e um relatório financeiro completo em **Contribuições**.

A auditoria registra com identificação do administrador a atualização das configurações e a aprovação, ocultação ou exclusão de publicações; também registra alterações de status de pagamentos confirmadas pelo webhook. Os registros são somente acrescentados pelo backend. A chave Pix, números completos e segredos NÃO são adicionados aos detalhes da auditoria.

## 2. Relatórios financeiros

- Total bruto **aprovado** pelo Mercado Pago, taxas realmente informadas pelo provedor e líquido informado.
- Pagamentos iniciados/pendentes e estornos/contestações aparecem separados, sem aumentar o recebido aprovado.
- Filtros por período e situação, gráfico por mês e exportação CSV. Identifica o nome informado pelo convidado no cartão.
- Campos reais do Mercado Pago: `fee_details` e `transaction_details.net_received_amount`, quando disponíveis. Caso ausentes, a coluna fica `—` (não presumimos um percentual).
- A base do relatório é `contribuicoes_casamento`, atualizada pela função `mp-webhook` depois de validar assinatura e consultar a API do Mercado Pago.
- Pix feito pela chave do banco é recebido **fora** do Mercado Pago: não aparece nesses totais; confira pelo extrato bancário, como solicitado.
- **Atenção:** se o webhook for ativado sem executar a migração V3, as atualizações de pagamentos falharão. Execute a migração antes da publicação.

## 3. Exportação manual pelo painel (sem configurar R2)

Na aba **Backup e auditoria**, clique em **Exportar dados agora**. Com login de administrador, o servidor gera uma exportação JSON de tabelas de RSVP, presentes, mural, configurações e auditoria, incluindo todos os registros até os limites do endpoint. O navegador salva localmente; escolha um lugar privado e faça também cópia em outro dispositivo. O JSON pode conter dados pessoais e chave Pix. **Não compartilhe publicamente.** A exportação NÃO inclui os bytes das fotos.

## 4. Backup automático externo criptografado (opcional, recomendado)

O plano gratuito do Supabase não faz backup automático do banco. A V3 disponibiliza rotinas agendadas do Netlify que guardam uma **exportação lógica de dados criptografada** e os arquivos enviados pelos convidados em **Cloudflare R2**, um serviço diferente do Supabase. Não é um backup completo do servidor PostgreSQL; os scripts SQL deste projeto continuam necessários para restaurar o esquema.

Crie uma conta Cloudflare, um bucket **privado** R2 e uma chave de API R2/S3 limitada a esse bucket. Cadastre nas variáveis de ambiente de Funções do Netlify:

```
R2_ACCOUNT_ID=...       # ID da conta, 32 caracteres hexadecimais
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=seu-bucket-privado
BACKUP_ENCRYPTION_KEY=... # 32 bytes aleatórios em base64
```

Gere a chave com `node -p "require('node:crypto').randomBytes(32).toString('base64')"`. **Guarde uma segunda cópia segura da chave fora do Netlify.** Se ela for perdida, não será possível decifrar o backup. Não adicione as credenciais ao arquivo `public/config.js` nem a nenhum repositório.

As funções configuradas em `netlify.toml` são:

- `backup-daily` — todos os dias à **00:00 de São Paulo**, equivalente a 03:00 UTC em 2026/2027, copia os dados para `daisy-e-vinicius/dados/...dvenc` no R2.
- `backup-photos` — a cada hora, 15 minutos após a hora cheia, copia até **6 fotos pendentes** para `daisy-e-vinicius/fotos/...dvenc` no R2. Elas são criptografadas individualmente para não expor fotografias no bucket.

As rotinas só são executadas automaticamente em uma publicação de produção no Netlify e dependem da disponibilidade dos serviços, limites de tempo e uso. Não são garantia de backup instantâneo: fotos enviadas e removidas antes da execução podem não ser copiadas. Acompanhe o histórico na aba **Backup e auditoria**, e faça exportações manuais regulares. Em caso de erro, a tela registra a falha quando o banco ainda estiver disponível.

**Sem configurar as cinco variáveis R2**, as rotinas não salvam nada e o painel informará **Configuração pendente**. Isso é normal no modo de prévia.

## 5. Recuperação de uma cópia (procedimento manual)

1. Baixe o arquivo `.dvenc` diretamente da área privada do R2 (não é um link público).
2. Num computador seguro, decifre com `BACKUP_ENCRYPTION_KEY='SUA_CHAVE' node DECRIPTAR-BACKUP.mjs copia.dvenc dados.json`. Para fotos, use como segundo argumento um arquivo `.jpg`.
3. Para recuperar o banco, crie um novo projeto Supabase, execute os scripts SQL na ordem acima, e importe os registros JSON respeitando suas dependências e regras. **A V3 não restaura automaticamente dados sobrepostos**: faça a recuperação assistida antes de alterar dados em produção.
4. Reenvie os JPGs recuperados para seus caminhos originais no bucket privado `casamento-fotos`, conservando as referências `foto_path`.
5. Verifique as listas e aprovações, o checkout e a conta emissora WhatsApp; não assuma que a recuperação do banco restaura credenciais, tokens ou usuários Auth automaticamente.

## 6. Testes antes do casamento

- Abra `public/admin-demo.html` para visualizar relatórios financeiros, backup e auditoria com dados fictícios.
- Configure o Supabase e teste o login real no Netlify, sem compartilhar tokens.
- No Mercado Pago, crie pagamentos de teste e confira valores aprovados, taxas, valor líquido e repetição de webhooks. Verifique também uma situação de estorno.
- Ative R2 e execute manualmente `backup-daily` e `backup-photos` no painel de Funções do Netlify (Run now). Confirme que os arquivos cifrados estão no bucket e podem ser decifrados com a chave.
- Teste uma exportação JSON e um download CSV com dados fictícios. Mantenha cópias fora do Supabase.

**Privacidade:** o painel e suas exportações exibem dados pessoais dos convidados. Somente administradores autenticados devem ter acesso. Cuide dos backups como documentos confidenciais.
