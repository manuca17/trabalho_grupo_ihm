# Diário de Desenvolvimento

Nota:
Este diário serve também como referência para uma eventual reconstrução posterior do histórico Git por sessões, caso isso seja solicitado pelo docente. Nesse caso, a reconstrução deve ser identificada explicitamente como tal.

## Sessão 1 - 15 de maio de 2026

Objetivo:
Analisar os requisitos dos cenários de registo de oferta e negociação.

Atividades realizadas:

- Revi os requisitos obrigatórios e adicionais aplicáveis à app móvel.
- Decidi reutilizar o starter Tabs do Ionic como base da navegação.
- Defini que nesta fase não seria implementado backend, ficando a persistência local com Ionic Storage.

Problemas:

- O projeto estava no estado inicial do starter e sem estrutura de domínio.

Solução:

- Planeei a separação em módulos, pages lazy-loaded, services e assets JSON.

Decisões:

- Trabalhar primeiro o frontend funcional dos cenários 2 e 3.

## Sessão 2 - 16 de maio de 2026

Objetivo:
Estruturar os modelos, services e fontes de dados iniciais.

Atividades realizadas:

- Criei modelos TypeScript para moedas, ofertas, fotografias e negociações.
- Criei ficheiros JSON para catálogo de moedas, conversas iniciais e strings da interface.
- Estruturei services para conteúdo, storage e marketplace.

Problemas:

- Era necessário evitar hardcode de conteúdo nos componentes.

Solução:

- Centralizei os dados em `assets/data` e nos respetivos services.

Decisões:

- Isolar também as strings da app para facilitar futura internacionalização.

## Sessão 3 - 17 de maio de 2026

Objetivo:
Implementar a navegação principal e as páginas de detalhe.

Atividades realizadas:

- Rebatizei os tabs para Inventário, Adicionar e Chat.
- Criei páginas lazy-loaded para detalhe da moeda, detalhe da oferta e detalhe da negociação.
- Implementei navegação com `Router` e leitura de parâmetros com `ActivatedRoute`.

Problemas:

- O starter não tinha navegação funcional além dos tabs.

Solução:

- Acrescentei rotas próprias fora dos tabs para demonstrar routing real.

Decisões:

- Passar `coinId`, `offerId`, `threadId` e query params entre páginas para evidenciar os requisitos de navegação.

## Sessão 4 - 18 de maio de 2026

Objetivo:
Construir o registo de nova oferta no smartphone.

Atividades realizadas:

- Implementei um formulário reativo com quantidade, valor, descrição e opção de troca.
- Preparei a captura guiada de três fotografias da moeda.
- Adicionei análise local de luminosidade para alertar o utilizador sobre pouca luz.

Problemas:

- Era necessário manter uma experiência funcional tanto em web como em dispositivo móvel.

Solução:

- Defini uma estratégia com Capacitor Camera em dispositivos nativos e fallback local quando necessário.

Decisões:

- Publicar a oferta localmente e redirecionar para um resumo imediatamente após submissão.

## Sessão 5 - 19 de maio de 2026

Objetivo:
Implementar a negociação de troca e o chat interno.

Atividades realizadas:

- Criei a lista de negociações ativas com indicadores de estado e mensagens por ler.
- Implementei o chat interno local entre Carlos e Maria.
- Adicionei a ação para concluir a negociação e marcar a moeda como trocada.

Problemas:

- Sem backend, o fluxo precisava de parecer consistente e persistir entre sessões.

Solução:

- Guardei o estado das conversas e ofertas com Ionic Storage.

Decisões:

- Atualizar automaticamente o estado para "Trocado" após aceitação no chat.

## Sessão 6 - 20 de maio de 2026

Objetivo:
Personalizar a interface e reforçar os requisitos visuais e de dispositivo.

Atividades realizadas:

- Criei uma paleta global com CSS Custom Properties.
- Ajustei estilos globais, cartões, chips, cabeçalhos e tab bar.
- Adicionei controlo de orientação com Capacitor para privilegiar portrait em dispositivo físico.

Problemas:

- O tema base do Ionic era demasiado genérico para o contexto da app.

Solução:

- Desenvolvi uma linguagem visual inspirada em metais, pergaminho e coleção numismática.

Decisões:

- Usar assets SVG locais para manter consistência visual e independência de serviços externos.

## Sessão 7 - 21 de maio de 2026

Objetivo:
Fechar documentação e preparar a apresentação.

Atividades realizadas:

- Criei o ficheiro de apoio humano/IA com o resumo claro do que foi feito.
- Revisei comentários, organização de módulos e consistência do código.
- Preparei a validação final da build para demonstração.

Problemas:

- O Figma não estava acessível nesta sessão por limitação técnica do ambiente.

Solução:

- Mantive uma identidade visual própria sem comprometer os requisitos funcionais.

Decisões:

- Validar a app em build e recomendar teste final em dispositivo físico com `ionic cap run`.
