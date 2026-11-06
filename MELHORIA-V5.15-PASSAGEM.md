# V5.15 · Passagem animada do convite

- Ao tocar no lacre, a capa se abre (dobras e aba) e o convite sobe por trás dela enquanto a capa se dissolve. Antes, o convite aparecia só depois que a capa sumia.
- Durante a passagem, a cena da capa fica transparente e o botão “Pular animação” some.
- Duração total: cerca de 1,75 s. “Pular animação” continua funcionando.
- Movimento reduzido (`prefers-reduced-motion`): a passagem é pulada.
- Arquivos: `public/convite-interativo.js` (fases e classe `passagem`), `public/convite-v514-passagem.css` (novo), `public/convite-interativo.html` (inclui o CSS novo).

Sem migração de banco. Para ativar: publique `public/`.

## Atualização V5.17 · Capa sem "Nosso casamento"
- A arte da capa (`public/assets/envelope-oficial-fucsia.webp`) tinha o texto "NOSSO CASAMENTO" gravado na imagem. O texto foi apagado e o fundo de papel reconstruído. A versão original está em `docs/legado/assets/envelope-oficial-fucsia-com-texto.webp`.

## Atualização V5.18 · Confirmar presença leva ao fluxo do site
- Em `convite-interativo.html?demo=1`, o botão "Confirmar presença" agora abre `convite-demo.html?convite=demonstracao#confirmacao`, com a seleção de convidados e quantidades. Antes, abria uma simulação simplificada.
- Com o link real do convite (token), o botão já abria `index.html?convite=TOKEN#confirmacao`. Esse comportamento não mudou.
- Os três botões do convite levam às seções do site: "Confirmar presença" → `#confirmacao`, "Como chegar" → `#celebracao` (onde ficam endereço e mapa), "Lista de presentes" → `#presentes`. Com o link real do convite, o token é mantido nos três.

## Atualização V5.19 · História do casal
- A seção "Nossa história" (`public/index.html`) deixou de ter texto de exemplo e passou a ter a história do casal, em parágrafos.
