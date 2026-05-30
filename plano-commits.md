# Plano de Commits Reconstruídos

Este plano organiza o estado atual do projeto em commits progressivos alinhados com o diário de desenvolvimento.

Nota de transparência:
O histórico Git deverá ser reconstruído posteriormente a partir do trabalho já concluído, mantendo correspondência lógica com as sessões registadas em [diario-desenvolvimento.md](diario-desenvolvimento.md).

## Commit 1 - Sessão 1

Mensagem sugerida:
`chore: analisar requisitos e definir estrutura inicial da app`

Âmbito:

- criação ou atualização do diário de desenvolvimento;
- definição documental da abordagem sem backend nesta fase;
- preparação da organização por módulos, pages, services e assets.

## Commit 2 - Sessão 2

Mensagem sugerida:
`feat: criar modelos, services base e dados json da app`

Âmbito:

- [src/app/core/models/coin.model.ts](src/app/core/models/coin.model.ts)
- [src/app/core/models/app-strings.model.ts](src/app/core/models/app-strings.model.ts)
- [src/app/core/services/content.service.ts](src/app/core/services/content.service.ts)
- [src/app/core/services/local-storage.service.ts](src/app/core/services/local-storage.service.ts)
- [src/app/core/services/strings.service.ts](src/app/core/services/strings.service.ts)
- [src/assets/data/coins.json](src/assets/data/coins.json)
- [src/assets/data/conversations.json](src/assets/data/conversations.json)
- [src/assets/data/app-strings.json](src/assets/data/app-strings.json)

## Commit 3 - Sessão 3

Mensagem sugerida:
`feat: implementar routing principal e páginas de detalhe`

Âmbito:

- [src/app/app-routing.module.ts](src/app/app-routing.module.ts)
- [src/app/tab1/tab1.module.ts](src/app/tab1/tab1.module.ts)
- [src/app/tab1/tab1.page.ts](src/app/tab1/tab1.page.ts)
- [src/app/tab1/tab1.page.html](src/app/tab1/tab1.page.html)
- [src/app/tab1/tab1.page.scss](src/app/tab1/tab1.page.scss)
- [src/app/pages/coin-detail/coin-detail-routing.module.ts](src/app/pages/coin-detail/coin-detail-routing.module.ts)
- [src/app/pages/coin-detail/coin-detail.module.ts](src/app/pages/coin-detail/coin-detail.module.ts)
- [src/app/pages/coin-detail/coin-detail.page.ts](src/app/pages/coin-detail/coin-detail.page.ts)
- [src/app/pages/coin-detail/coin-detail.page.html](src/app/pages/coin-detail/coin-detail.page.html)
- [src/app/pages/coin-detail/coin-detail.page.scss](src/app/pages/coin-detail/coin-detail.page.scss)
- [src/app/pages/offer-detail/offer-detail-routing.module.ts](src/app/pages/offer-detail/offer-detail-routing.module.ts)
- [src/app/pages/offer-detail/offer-detail.module.ts](src/app/pages/offer-detail/offer-detail.module.ts)
- [src/app/pages/offer-detail/offer-detail.page.ts](src/app/pages/offer-detail/offer-detail.page.ts)
- [src/app/pages/offer-detail/offer-detail.page.html](src/app/pages/offer-detail/offer-detail.page.html)
- [src/app/pages/offer-detail/offer-detail.page.scss](src/app/pages/offer-detail/offer-detail.page.scss)
- [src/app/pages/negotiation-detail/negotiation-detail-routing.module.ts](src/app/pages/negotiation-detail/negotiation-detail-routing.module.ts)
- [src/app/pages/negotiation-detail/negotiation-detail.module.ts](src/app/pages/negotiation-detail/negotiation-detail.module.ts)
- [src/app/pages/negotiation-detail/negotiation-detail.page.ts](src/app/pages/negotiation-detail/negotiation-detail.page.ts)
- [src/app/pages/negotiation-detail/negotiation-detail.page.html](src/app/pages/negotiation-detail/negotiation-detail.page.html)
- [src/app/pages/negotiation-detail/negotiation-detail.page.scss](src/app/pages/negotiation-detail/negotiation-detail.page.scss)

## Commit 4 - Sessão 4

Mensagem sugerida:
`feat: criar formulario reativo para registo de nova oferta`

Âmbito:

- [src/app/tab2/tab2.module.ts](src/app/tab2/tab2.module.ts)
- [src/app/tab2/tab2.page.ts](src/app/tab2/tab2.page.ts)
- [src/app/tab2/tab2.page.html](src/app/tab2/tab2.page.html)
- [src/app/tab2/tab2.page.scss](src/app/tab2/tab2.page.scss)

## Commit 5 - Sessão 5

Mensagem sugerida:
`feat: adicionar negociacoes locais e chat interno`

Âmbito:

- [src/app/core/services/marketplace.service.ts](src/app/core/services/marketplace.service.ts)
- [src/app/tab3/tab3.module.ts](src/app/tab3/tab3.module.ts)
- [src/app/tab3/tab3.page.ts](src/app/tab3/tab3.page.ts)
- [src/app/tab3/tab3.page.html](src/app/tab3/tab3.page.html)
- [src/app/tab3/tab3.page.scss](src/app/tab3/tab3.page.scss)

## Commit 6 - Sessão 6

Mensagem sugerida:
`style: personalizar tema global, tabs e orientacao da app`

Âmbito:

- [src/app/app.component.ts](src/app/app.component.ts)
- [src/app/app.module.ts](src/app/app.module.ts)
- [src/app/core/services/device.service.ts](src/app/core/services/device.service.ts)
- [src/app/tabs/tabs.page.html](src/app/tabs/tabs.page.html)
- [src/app/tabs/tabs.page.scss](src/app/tabs/tabs.page.scss)
- [src/global.scss](src/global.scss)
- [src/theme/variables.scss](src/theme/variables.scss)

## Commit 7 - Sessão 7

Mensagem sugerida:
`docs: adicionar diario, apoio humano ia e notas de apresentacao`

Âmbito:

- [apoio-humano-ia.md](apoio-humano-ia.md)
- [diario-desenvolvimento.md](diario-desenvolvimento.md)
- [plano-commits.md](plano-commits.md)
