# Importação de famílias por planilha · Daisy e Vinícius V5

## Preparação

- Abra `modelo_familias_convidados_daisy_e_vinicius.xlsx` e preencha **Cadastro**. Não altere os títulos das colunas.
- Use uma linha por família ou grupo, com **1 a 6 adultos** e **0 a 6 crianças** (até 12 pessoas).
- **Família ou grupo:** obrigatório, nome com 3 a 100 caracteres. Evite duplicar famílias.
- A quarta coluna *Total autorizado* é calculada automaticamente e não precisa ser importada.
- No Excel: escolha a aba **Cadastro**, use **Salvar como > CSV UTF-8 (separado por ponto e vírgula)**. O site importa somente `.csv`, não arquivos `.xlsx` diretamente.
- Alternativamente, edite `modelo_importacao_familias.csv` (tem só o cabeçalho), em editor que preserve UTF-8.

## Importar no site

1. Publique a **versão V5 completa** no Netlify, inclusive `netlify/functions/`.
2. Entre no painel `/admin.html` com administrador autenticado.
3. Abra **Convites e QR** > **Importar famílias por planilha**.
4. Selecione seu CSV e clique em **Importar CSV e gerar convites**.
5. O sistema cria os convites em lotes, pula famílias que já existem e mostra um resumo de falhas.
6. **Baixe e guarde imediatamente** o CSV de links exclusivos: os tokens são exibidos apenas na criação e não são recuperáveis pelo painel. Se perder o link, será necessário clicar em **Novo link** e compartilhar novamente.
7. Para ver o QR Code de um convite recém-gerado, use **Ver QR / compartilhar**. O QR aponta para o convite da família.

## Importante: planilha por quantidade, sem nomes

Cada adulto e criança vira uma vaga numerada (Adulto 1, Adulto 2, Criança 1...). O convidado pode confirmar somente as vagas autorizadas. **Não identifica o nome de cada participante**; se quiser nome e sobrenome, use o cadastro manual individual da versão V4.

## Segurança e testes

- Nunca publique o CSV com links das famílias nem compartilhe o painel.
- A importação requer login de administrador; os links são tokens aleatórios de 192 bits armazenados somente como hash.
- Não há novos scripts SQL: a função usa a tabela `convites_casamento` criada pela migração V4.
- Teste primeiro com 2 famílias fictícias no painel demo (`admin-demo.html`), que não grava no banco. Depois, teste com 1 família real em ambiente de homologação.
- Para evitar duplicações, famílias já cadastradas são ignoradas; para mudar uma quantidade, cancele o convite anterior e crie outro com a lista correta.
- O backend permite até 15 famílias por lote e a interface até 200 por arquivo.
