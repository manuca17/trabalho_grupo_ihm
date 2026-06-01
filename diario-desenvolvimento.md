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

## Sessão 1 - 01 de junho de 2026 - Guilherme Maciel 33245


Atividades Realizadas:

- Criação do tabs4 e do tab5.
- Configuração da Barra de Navegação Central (Tabs): Criação e expansão da barra de menus inferior para suportar a navegação global por 5 abas distintas (tab1 a tab5)
- Transformei o layout de mensagens no tab4 para Ionic/Angular.
- Atualizei os ficheiros:
        tab4.page.ts
        tab4.page.html
        tab4.page.scss
- Corrigi a navegação das abas para que o botão “Mensagens” abrisse a tab4.

Problemas:

- A app continuava a mostrar a aba antiga porque o botão de mensagens em tabs.page.html ainda apontava para tab3.
- A lógica de destaque de aba em tabs.page.ts também não estava a reconhecer /tabs/tab4 como a aba de mensagens.
- Erro de Rota Raiz "Cannot GET /": Após a reorganização das pastas das abas, o browser apresentou um ecrã totalmente em branco com a falha de requisição HTTP na raiz do projeto.
- Componente Standalone: Falha de compilação do Angular ao tentar inicializar o ionic serve. O terminal reportou que as novas abas tab4 e tab5 eram componentes Standalone e não podiam ser declaradas na lista de declarations de um NgModule.

Soluções:

- Configuro-se uma rota vazia padrão que carrega o módulo principal das abas por lazy loading e adicionou-se um mecanismo de fallback com o seletor curinga ().
- Removeu-se a propriedade standalone: true e os seus respetivos imports de     componentes do decorador @Component, adicionando a flag standalone: false
- Mudei o routerLink do botão Mensagens para ['/tabs/tab4'].
- Atualizei getActiveNav() para tratar /tabs/tab4 como messages.
- Mantive a navegação das abas consistente com o novo tab das mensagens.

Decisões:

- Optou-se por desativar o modo standalone das novas páginas geradas automaticamente pelo Ionic CLI.
- Decidi usar tab4 como a nova tela de mensagens, de forma a deixara a tab3 ignorada para essa função.
- Preferi corrigir a navegação diretamente em vez de mover o conteúdo para a tab3.