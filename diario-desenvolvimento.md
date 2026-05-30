# Diário de Desenvolvimento

## Sessão 1 - 30 de maio de 2026 - Manuel Ferreira 33196

Objetivo:
Implementar e fechar a versão funcional da app para os cenários de nova oferta e negociação de troca.

Atividades realizadas:

- Reestruturei o starter Tabs do Ionic para uma navegação centrada em Inventário, Adicionar Oferta e Negociações.
- Implementei routing com `Router` e `ActivatedRoute`, incluindo passagem de parâmetros entre páginas e páginas de detalhe lazy-loaded.
- Criei modelos, services e organização base em `core`, com separação entre dados, device, storage, strings e marketplace.
- Adicionei persistência local com Ionic Storage para ofertas e conversas.
- Criei ficheiros JSON para catálogo de moedas, conversas iniciais e strings da interface.
- Desenvolvi o formulário reativo de registo de nova oferta com quantidade, preço, descrição e opção de troca.
- Implementei captura guiada de três fotografias da moeda e análise local de luminosidade.
- Criei o fluxo de detalhe da oferta e o chat interno de negociação entre Carlos e Maria.
- Adicionei atualização automática do estado para "Trocado" após aceitação da negociação.
- Personalizei o aspeto visual global com cores próprias, fontes importadas, CSS Custom Properties, tab bar e assets SVG.
- Configurei integração com Capacitor para privilegiar orientação portrait em dispositivo físico.
- Validei a app com `npm run build` e sincronizei o projeto com `npx cap sync`.

Problemas:

- O projeto partia do starter vazio do Ionic e não tinha estrutura funcional para os cenários pedidos.
- Foi necessário garantir que a solução funcionasse sem backend nesta fase.

Solução:

- Estruturei a aplicação por módulos, pages, services, assets e dados JSON.
- Mantive a persistência e simulação de fluxo com Ionic Storage e dados locais.
- Desenvolvi uma identidade visual própria e coerente com o tema numismático.

Decisões:

- Adiar qualquer backend para uma fase posterior.
- Concentrar esta entrega em frontend funcional e estável para os cenários 2 e 3.
- Usar Storage e dados locais para garantir demonstração imediata da app.
