# Atualização de horários · 23/05/2027

**Entrada dos convidados:** 10h. **Cerimônia:** 11h. **Local:** Mansão Victória, Rua Orfanato, 440, Vila Prudente, São Paulo. A contagem regressiva usa 11h; `casamento.ics` adiciona dois compromissos de horário ao calendário (entrada e cerimônia). Os convites enviados pelo WhatsApp apresentam os dois horários.

---

# ATUALIZAÇÃO V4 — convites personalizados

Antes de publicar, consulte `GUIA-V4-CONVITES-QR.md`. A versão V4 exige `CONFIGURAR-CONVITES-V4.sql` após as migrações V3 e o envio do projeto completo ao Netlify, com funções de backend.

---

# Daisy e Vinícius — Guia principal V3

**Comece por [`GUIA-V3-FINANCEIRO-BACKUP.md`](GUIA-V3-FINANCEIRO-BACKUP.md).**

Para a ativação inicial, leia também [`GUIA-DE-ATIVACAO-V2.md`](GUIA-DE-ATIVACAO-V2.md) e siga os scripts SQL da V2 em ordem antes de instalar a migração da V3.

O site ainda não está publicado ou conectado às contas reais.

## V5 — Importação de famílias por planilha

A aba **Convites e QR** agora permite importar um CSV com nomes de famílias e contagem de adultos e crianças. Não é necessário alterar o banco de dados além das migrações já exigidas pela V4. Use o arquivo `modelo_familias_convidados_daisy_e_vinicius.xlsx` para preencher os dados, salve a aba Cadastro como CSV UTF-8 e siga `GUIA-V5-PLANILHA-FAMILIAS.md`.

## Convites com arte PNG – V5.4

Veja `MELHORIAS-CONVITES-PERSONALIZADOS-V5.4.md`: criação automática de card familiar, download PNG e compartilhamento, inclusive para importações CSV.

**V5.5:** Novo convite interativo com animação de envelope, sem quantidade de convidados visível na arte. Veja `MELHORIAS-CONVITE-INTERATIVO-V5.5.md`.
