# V5.15 · Passagem animada do convite

- Ao tocar no lacre, a capa se abre (dobras e aba) e o convite sobe por trás dela enquanto a capa se dissolve. Antes, o convite aparecia só depois que a capa sumia.
- Durante a passagem, a cena da capa fica transparente e o botão “Pular animação” some.
- Duração total: cerca de 1,75 s. “Pular animação” continua funcionando.
- Movimento reduzido (`prefers-reduced-motion`): a passagem é pulada.
- Arquivos: `public/convite-interativo.js` (fases e classe `passagem`), `public/convite-v514-passagem.css` (novo), `public/convite-interativo.html` (inclui o CSS novo).

Sem migração de banco. Para ativar: publique `public/`.

## Atualização V5.17 · Capa sem "Nosso casamento"
- A arte da capa (`public/assets/envelope-oficial-fucsia.webp`) tinha o texto "NOSSO CASAMENTO" gravado na imagem. O texto foi apagado e o fundo de papel reconstruído. A versão original está em `docs/legado/assets/envelope-oficial-fucsia-com-texto.webp`.
