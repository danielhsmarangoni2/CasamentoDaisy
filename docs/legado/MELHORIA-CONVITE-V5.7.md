# Convite interativo V5.7 — envelope com lacre fúcsia

Visual inspirado na referência enviada: papel claro, monograma floral D&V, dobras de envelope e lacre de cera fúcsia. Não utiliza dourado.

## Testar
Abra `public/convite-interativo.html?demo=1&nome=Daniel` depois de hospedar o projeto em Netlify. O modo de demonstração não registra confirmação.

## Fluxo real
O sistema usa a mesma integração de convite e RSVP da versão anterior; os links personalizados existentes continuam com `convite-interativo.html?convite=TOKEN`.

## Segurança
A quantidade autorizada NÃO aparece na abertura nem no convite aberto. O limite permanece no servidor. Sem token válido, a ação de confirmar fica indisponível.

## Observações
Este pacote não altera o banco de dados nem configura serviços externos. O layout e a animação foram atualizados.
