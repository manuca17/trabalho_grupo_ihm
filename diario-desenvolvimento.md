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

## Sessão 2 - 1 de junho de 2026 - Manuel Ferreira 33196

Objetivo:
 Evoluir a interface principal com uma nova home, navbar inferior e sistema de tema visual mais consistente.

Atividades realizadas:
- Reestruturei a home screen de `tab1` para um layout mais moderno com hero, moedas em destaque, adicionadas recentemente e ações rápidas.
- Substituí a tab bar padrão do Ionic por uma navbar inferior customizada com cinco botões: Início, Pesquisar, Adicionar, Mensagens e Perfil.
- Introduzi um sistema global de tokens de tema em `global.scss`, com variáveis para cores, superfícies, bordas, tipografia e suporte a modo escuro via classe `.dark`.
- Refatorei os estilos principais das páginas de inventário, adicionar oferta, negociações e detalhes para passarem a usar esse sistema de tema.
- Sincronizei as alterações com o projeto Android através de `npx cap sync android` e validei repetidamente o frontend com `npm run build`.

Problemas:
- A navbar personalizada e partes do markup foram revertidas em alguns momentos e tiveram de ser repostas.
- O build web passou a acusar warnings de budget em SCSS e o aviso CommonJS do `localforage`.

Solução:

- Reapliquei a navbar custom e a nova home sempre que houve regressões locais em ficheiros.
- Centralizei o tema em variáveis globais para reduzir inconsistências e facilitar manutenção visual.

Decisões:

- Manter a prioridade na entrega funcional do frontend, sem abrir novas frentes como backend.
- Usar um sistema de tema baseado em CSS variables em vez de depender de Tailwind, para ficar alinhado com Ionic/Angular.
- Preservar a navegação atual por tabs e adaptar o visual sem reestruturar toda a arquitetura da app.

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

## Sessão 3 - 4 de junho de 2026 - Manuel Ferreira

Objetivo:
Integrar a aplicação com o Firebase (Firestore e Auth) para persistência real de dados e chat em tempo real. Corrigir bugs de persistência de ofertas e autenticação.

Atividades realizadas:

- **Integração Firebase/AngularFire:** Configurei `provideFirebaseApp`, `provideAuth`, `provideFirestore` e `provideStorage` no `app.module.ts` usando as credenciais do projeto Firebase `projeto-c6e57`.

- **Remoção de botão "Ver negociações relacionadas":** Em `offer-detail.page.html`, removi o botão que estava a causar confusão na navegação, mantendo apenas "Iniciar Negociação" como ação principal.

- **Separação de fotos para Ionic Storage:** Modifiquei o fluxo de `publishOffer()` no `marketplace.service.ts` para guardar as `dataUrl` das fotos no Ionic Storage (com key `offer_photos_{offerId}`) em vez de as enviar para o Firestore, evitando o limite de 1MB por documento. Apenas metadados das fotos (`kind`, `label`, `brightness`) são persistidos no Firestore.

- **Carregamento de fotos do armazenamento local:** Em `offer-detail.page.ts`, adicionei lógica para carregar as fotos do Ionic Storage através de `marketplaceService.getOfferPhotos()` quando o utilizador abre o detalhe de uma oferta.

- **Correção de persistência de autenticação (Auth):** No `auth.service.ts`, substituí `firstValueFrom(authState(...))` por `onAuthStateChanged()` com callback único, resolvendo o problema de o `authState()` emitir `null` imediatamente antes do SDK restaurar a sessão. Adicionei também `setPersistence(this.firebaseAuth, browserLocalPersistence)` no construtor para forçar o Firebase Auth a guardar o token em `localStorage` (mais fiável no Capacitor WebView que o IndexedDB).

- **Adição de campos de metadados ao modelo Offer:** Em `offer.model.ts`, adicionei os campos `title`, `era`, `condition` e `realValue` para guardar os dados do formulário de criação de moeda personalizada.

- **Atualização dos mappers Firestore:** Em `marketplace.firestore.mapper.ts`, atualizei o DTO (`FirestoreOfferDto`) e as funções `mapOfferFromFirestore`/`mapOfferToFirestore` para incluir os novos campos (`title`, `era`, `condition`, `realValue`).

- **Expansão do `publishOffer()`:** Em `marketplace.service.ts`, o método `publishOffer()` passou a aceitar e persistir todos os campos do formulário (`title`, `era`, `condition`, `realValue`). A persistência do Firestore foi separada em blocos try/catch independentes para ofertas e negociações, para que a falha de um não bloqueie o outro.

- **Correção do `startOffersListener`:** O listener de ofertas em tempo real passou a fazer merge de ofertas locais + remotas (em vez de substituir), permitindo que ofertas criadas localmente mas ainda não persistidas no Firestore continuem visíveis.

- **Correção do `startNegotiationsListener`:** Corrigido erro de variável (`remoteThreads` → `threads`) no listener de negociações.

- **Geração de `coinId` único:** Em `tab2.page.ts`, o `coinId` passou a ser gerado como `custom-coin-{timestamp}` em vez de usar um ID de catálogo existente, permitindo que moedas personalizadas tenham identificadores únicos.

- **Reescrita do `myCoins$`:** Em `tab5.page.ts`, o `myCoins$` foi reescrito para mostrar **todas as ofertas do próprio utilizador** (filtradas por `ownerId === profile.id`), não apenas as que têm correspondência no catálogo. Para moedas sem correspondência no catálogo, é criada uma Coin virtual com os metadados guardados na oferta (`offer.title` → nome, `offer.era` → período, `offer.condition` → conservação, `offer.realValue` → valor estimado).

- **Adição de `getPriceLabel`:** Adicionado método `getPriceLabel()` em `tab5.page.ts` para formatar o preço das moedas no perfil.

- **Correção de template HTML:** Em `tab5.page.html`, corrigido erro de fecho do `<ion-content>` causado por mau aninhamento de `<ng-template>`.

- **Aumento de budget CSS:** Em `angular.json`, aumentei o `maximumWarning` de `2kb` para `20kb` e o `maximumError` de `6kb` para `50kb` nos `anyComponentStyle` budgets para acomodar os ficheiros SCSS das páginas.

- **Adição de error handling no Tab2:** Em `tab2.page.ts`, o `publishOffer()` agora mostra um `alert()` ao utilizador em caso de erro, com instruções para verificar a consola do navegador.

Problemas:

- O `authState()` do AngularFire emite `null` imediatamente antes do Firebase SDK restaurar a sessão persistida, fazendo o `authGuard` redirecionar para login sempre que a app reiniciava.
- As fotos em base64 ultrapassavam o limite de 1MB do Firestore.
- A moeda personalizada descrita no formulário (com título, era, condição, valor real) nunca era guardada — os campos eram ignorados pelo `publishOffer()`.
- O `myCoins$` só mostrava moedas do catálogo, nunca as moedas personalizadas criadas pelo utilizador.
- O listener de ofertas substituía todas as ofertas pelas do Firestore, removendo ofertas locais não persistidas.
- O template HTML do tab5 tinha um problema de fecho do `<ion-content>` que impedia a compilação.

Solução:

- Substituí `firstValueFrom(authState())` por `onAuthStateChanged()` com callback único para aguardar o estado real do Firebase Auth.
- Adicionei `browserLocalPersistence` para garantir que o token de autenticação é guardado em localStorage.
- Separei as fotos (Ionic Storage) dos metadados (Firestore) para evitar o limite de tamanho de documento.
- Adicionei os campos `title`, `era`, `condition`, `realValue` ao modelo Offer e aos mappers Firestore.
- Reescrito `myCoins$` para filtrar ofertas por `ownerId` e criar Coins virtuais quando necessário.
- Gerado `coinId` único para moedas personalizadas em vez de reutilizar IDs do catálogo.
- Corrigido os listeners para fazer merge de dados locais + remotos.

Decisões:

- Manter as fotos no Ionic Storage em vez de Firebase Storage para simplificar a arquitetura.
- Persistir metadados no Firestore para permitir sincronização entre dispositivos após login.
- Usar `onAuthStateChanged` em vez de `authState()` para maior controlo sobre o ciclo de vida da autenticação.
- Aumentar os budgets de CSS em vez de reduzir estilos, para preservar a identidade visual da app.
