# Implementation Plan

> **Nota:** da tarefa 3.1 até a 5.2 os e2e ficam deliberadamente desatualizados. A cada tarefa, `npm run build`, os testes unitários e os de integração devem ficar verdes (sem rodar e2e). Não fazer merge nem release entre a 3.1 e a 5.2.

- [ ] 1. Fundação: funções, componentes e blocos compartilhados

- [x] 1.1 Criar as funções compartilhadas da turma
  - Criar `_turma/abas-config.ts`, módulo puro (sem importar o DAL nem módulos de servidor), com o tipo `Papel` e a lista `ABAS` (rótulos e segmentos), e `_turma/dados.ts`, que os reexporta e traz `carregarTurmaDaAba` (autoriza com `requireRole` e `podeVerTurma`, redirecionando para "Acesso negado" antes de ler qualquer dado), `cabecalhoDaTurma` (nome, situação e fichas pendentes, com cache de requisição; `null` se a turma não existe) e `avisoDaTurma` (mensagens de turmas e, depois, de autocadastro). Criar `tests/integration/turmas/abas.test.ts`, que as tarefas 2.1 a 2.4 vão acumulando.
  - Pronto quando: testes de integração, em `tests/integration/turmas/abas.test.ts`, mostram a coordenação e o catequista responsável passando, o catequista de outra turma indo a `/acesso-negado` sem nenhuma leitura de dados da turma, id inválido negando sem lançar, `cabecalhoDaTurma` devolvendo nome e contagem de pendentes (e `null` para turma inexistente) e `avisoDaTurma` traduzindo códigos de turmas e de autocadastro, com `null` para desconhecido, vazio e array.
  - _Boundary: app/_turma/dados, app/_turma/abas-config_
  - _Requirements: 1.2, 8.7, 9.1, 9.2_

- [x] 1.2 Criar a barra de abas e o cabeçalho da turma
  - Criar `BarraAbas` (componente cliente que importa `ABAS` de `_turma/abas-config.ts`, nunca de `dados.ts`: `<nav>` com links das cinco abas, aba atual por `useSelectedLayoutSegment` com `aria-current="page"` e destaque que não depende só de cor, contagem de pendentes ao lado de "Equipe e link" com texto oculto para leitor de tela) e `CabecalhoTurma` (link de volta para as turmas ou para "minhas turmas" e o nome da turma), com o bloco "Abas da turma" em `globals.css` (quebra em linhas, altura mínima de 44 px, foco visível, sem rolagem horizontal a partir de 360 px).
  - Pronto quando: testes de componente mostram as cinco abas na ordem com os endereços certos, `aria-current` só na aba do segmento (nulo é Resumo), contagem só em "Equipe e link" e só quando maior que zero, ausência de `role="tablist"`, e o cabeçalho com o link de volta de cada papel; `npm run build` passa.
  - _Depends: 1.1_
  - _Boundary: components/turmas, globals.css_
  - _Requirements: 1.2, 1.4, 1.6, 11.1, 11.2, 11.3, 11.4_

- [x] 1.3 (P) Dividir o bloco de presença da turma em chamada de hoje e frequência
  - Em `_presenca/blocos.tsx`, separar `BlocoFrequenciaDaTurma` em `BlocoChamadaDeHoje` (encontro de hoje e link da chamada) e `BlocoFrequenciaDaTurma` (só a frequência), com `hrefOrdenar` recebido por prop. Para não mudar o comportamento enquanto as abas não existem, as duas páginas atuais da turma passam a chamar os dois blocos, com `hrefOrdenar` apontando para a própria página.
  - Pronto quando: os testes de integração das páginas atuais da turma seguem verdes sem alteração de asserções, `BlocoChamadaDeHoje` aparece só com encontro planejado de hoje em turma aberta, e `BlocoFrequenciaDaTurma` usa o `hrefOrdenar` recebido; `npm run build` passa.
  - _Boundary: app/_presenca/blocos, páginas atuais da turma (integração mínima)_
  - _Requirements: 2.3, 4.1, 4.2_

- [ ] 2. Layout e abas novas

- [x] 2.1 Criar o layout da turma e as rotas de layout dos dois papéis
  - Criar `LayoutDaTurma` em `_turma/layout-turma.tsx` (autoriza, lê nome e pendentes, devolve `notFound` para turma inexistente e renderiza cabeçalho, barra e conteúdo, sem ler `searchParams`), os `(abas)/layout.tsx` finos de coordenação e catequista, e o `not-found.tsx` do segmento `[id]` do catequista (o da coordenação já existe).
  - Pronto quando: testes de integração (acrescentados a `tests/integration/turmas/abas.test.ts`) renderizam o layout com banco real e mostram cabeçalho e barra para coordenação e catequista, a contagem de pendentes na barra, "Acesso negado" para catequista de outra turma antes de exibir qualquer dado, e não encontrado para turma inexistente; `npm run build` passa.
  - _Depends: 1.1, 1.2_
  - _Boundary: app/_turma/layout-turma, rotas (abas)/layout, not-found_
  - _Requirements: 1.1, 1.6, 1.7, 9.1, 9.3, 9.5_

- [x] 2.2 Criar a aba Inscritos e as rotas dos dois papéis
  - Criar `AbaInscritos` em `_turma/abas.tsx` (inscritos vigentes e anteriores; para a coordenação em turma aberta, "Inscrever catequizando" com busca por `?q=` na própria aba e a ação de desligar; para o catequista, só consulta; aviso no topo por `avisoDaTurma`) e as rotas `(abas)/inscritos/page.tsx`, cada uma com `requireRole` e o caminho exato.
  - Pronto quando: testes de integração (acrescentados a `tests/integration/turmas/abas.test.ts`) mostram as duas listas, a busca exibindo os resultados na própria aba, as ações só para a coordenação em turma aberta, turma encerrada e catequista sem ações, "Acesso negado" para catequista de outra turma, e a mensagem de aviso no topo; `npm run build` lista as duas rotas.
  - _Depends: 2.1_
  - _Boundary: app/_turma/abas (AbaInscritos), rotas inscritos_
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.7, 9.4, 11.5_

- [x] 2.3 Criar a aba Frequência e as rotas dos dois papéis
  - Criar `AbaFrequencia` (frequência da turma, quantidade em baixa frequência e lista dos inscritos com o percentual, ordenação por `?ordem=` na própria aba com `hrefOrdenar` para `/frequencia?ordem=`, consultável em turma encerrada) e as rotas `(abas)/frequencia/page.tsx`.
  - Pronto quando: testes de integração (acrescentados a `tests/integration/turmas/abas.test.ts`) mostram o percentual e a lista, a ordenação por nome e por menor frequência com o link da própria aba, "Sem encontros registrados" quando não há chamada, turma encerrada consultável, e "Acesso negado" para catequista de outra turma; `npm run build` lista as duas rotas.
  - _Depends: 2.2, 1.3_
  - _Boundary: app/_turma/abas (AbaFrequencia), rotas frequencia_
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 2.4 Criar a aba Equipe e link e as rotas dos dois papéis
  - Criar `AbaEquipe` (catequistas responsáveis ou mensagem de que nenhum foi designado; designar e remover para a coordenação em turma aberta; bloco do link de autocadastro com as mesmas ações e informações que cada papel já tinha; quantidade de pendentes e link para a fila; aviso no topo com as mensagens de turmas e de autocadastro) e as rotas `(abas)/equipe/page.tsx`.
  - Pronto quando: testes de integração (acrescentados a `tests/integration/turmas/abas.test.ts`) mostram a lista de catequistas, as ações de designar e remover só para a coordenação em turma aberta, o bloco do link para os dois papéis, a quantidade de pendentes com o link da fila, turma encerrada sem ações, e "Acesso negado" para catequista de outra turma; `npm run build` lista as duas rotas.
  - _Depends: 2.3_
  - _Boundary: app/_turma/abas (AbaEquipe), rotas equipe_
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.7_

- [ ] 3. Troca da página principal e do cronograma

- [x] 3.1 Transformar a página principal da turma na aba Resumo
  - Criar `AbaResumo` (dados da turma, próximo encontro com link para Encontros, "Encontro de hoje" com o link da chamada, e "Editar" e "Encerrar" só para a coordenação em turma aberta) e mover com `git mv` (nunca copiar: `(abas)/page.tsx` e `turmas/[id]/page.tsx` são a mesma URL) a página principal de cada papel para `(abas)/page.tsx`, delegando a `AbaResumo` e ignorando `?q` e `?ordem`. Atualizar `tests/integration/presenca/paginas-turma-ficha.test.ts`: trocar os imports de `turmas/[id]/page` por `turmas/[id]/(abas)/page` e passar as asserções de frequência para a aba Frequência; atualizar também os demais testes de integração que liam blocos na página principal.
  - Pronto quando: testes de integração mostram, nos dois papéis, os dados da turma, o próximo encontro, o bloco de hoje, as ações só para a coordenação em turma aberta, turma encerrada sem ações, a página principal ignorando `?q` e `?ordem`, e que os blocos movidos não aparecem mais nela; os testes de integração e unitários seguem verdes e `npm run build` passa, sem rodar e2e. Os e2e que dependem da página principal ficam para o grupo 5.
  - _Depends: 2.4, 1.3_
  - _Boundary: app/_turma/abas (AbaResumo), páginas principais por papel_
  - _Requirements: 1.3, 1.5, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 10.1, 10.3, 10.4_

- [x] 3.2 Mover o cronograma para a aba Encontros
  - Mover com `git mv` (nunca copiar: seria a mesma URL de `encontros/page.tsx`) o `encontros/page.tsx` de cada papel para `(abas)/encontros/page.tsx`, manter os `encontros/not-found.tsx` onde estão (cobrem novo, editar e chamada) e ajustar `PaginaCronograma`: sem o link de volta e sem o título com o nome da turma (agora no cabeçalho), com o título "Encontros" e o botão "Novo encontro". Atualizar os testes de integração do cronograma.
  - Pronto quando: testes de integração mostram o cronograma com o próximo encontro em destaque, o progresso e as ações que o usuário já tinha, turma encerrada só para consulta, o endereço `/encontros` inalterado, e `npm run build` lista a rota dentro do layout; a barra mostra "Encontros" como aba atual; os testes unitários e de integração seguem verdes, sem rodar e2e.
  - _Depends: 3.1_
  - _Boundary: app/_encontros/paginas (PaginaCronograma), rotas encontros_
  - _Requirements: 5.1, 5.2, 5.3, 10.2_

- [ ] 4. Páginas de tarefa e retorno das ações

- [x] 4.1 Ajustar os links de volta das páginas de tarefa
  - Aplicar os textos e destinos do requisito 7.2: "← Voltar para Encontros" na chamada, em novo encontro e em editar encontro; a visitantes continua "Voltar para a chamada"; a fila de fichas pendentes volta para `/equipe` ("Voltar para Equipe e link"); a revisão continua voltando para a fila; a edição da turma passa a "← Voltar para Resumo".
  - Pronto quando: testes de integração mostram cada link com o texto e o destino certos, nenhuma dessas páginas exibe o cabeçalho da turma nem a barra de abas, e os testes de integração seguem verdes, sem rodar e2e; `npm run build` passa.
  - _Depends: 3.2_
  - _Boundary: _encontros/paginas (novo e editar), _presenca/paginas, _pendentes/paginas, editar turma_
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 4.2 (P) Redirecionar as ações da turma para a aba certa
  - Em `turmas/actions.ts`, inscrever e desligar passam a voltar para `/inscritos`; designar e remover catequista para `/equipe`; criar, editar e encerrar continuam na página principal.
  - Pronto quando: testes de integração das ações mostram cada destino com o aviso correspondente, e as ações continuam rejeitadas sem permissão; os testes existentes de turmas seguem verdes com os destinos atualizados.
  - _Depends: 2.4_
  - _Boundary: turmas/actions_
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 4.3 (P) Redirecionar as ações do autocadastro para a aba certa
  - Em `autocadastro/actions.ts`, `paginaDaTurma` recebe a aba: as ações do link (gerar, desativar, regenerar, alterar expiração) voltam para `/equipe`, confirmar ficha volta para `/inscritos`, e corrigir e descartar continuam voltando para a revisão e para a fila; confirmar e descartar passam a revalidar o layout da turma para atualizar a contagem de pendentes.
  - Pronto quando: testes de integração das ações mostram cada destino com o aviso, a revalidação do layout na confirmação e no descarte, e os testes existentes de autocadastro seguem verdes com os destinos atualizados.
  - _Depends: 2.4_
  - _Boundary: autocadastro/actions_
  - _Requirements: 1.6, 8.4, 8.5, 8.6_

- [ ] 5. Atualização dos testes e2e existentes

- [x] 5.1 Atualizar os e2e de turmas e de autocadastro para as abas
  - Em `turmas.spec.ts` e `autocadastro.spec.ts`, navegar até a aba onde cada bloco está agora (Inscritos, Equipe e link) e ajustar os seletores e os destinos esperados após as ações.
  - Pronto quando: os dois specs passam em `npm run test:e2e`, sem enfraquecer as asserções originais.
  - _Depends: 4.2, 4.3_
  - _Boundary: tests/e2e (turmas, autocadastro)_
  - _Requirements: 10.1_

- [x] 5.2 Atualizar os e2e de programa e de presença para as abas
  - Em `programa.spec.ts`, `presenca.spec.ts`, `presenca-visitante.spec.ts` e `presenca-limite.spec.ts`, ajustar a navegação (Resumo, Frequência, Encontros e links de volta) e os seletores.
  - Pronto quando: os quatro specs passam e a suíte e2e completa passa com código de saída 0 em duas execuções seguidas.
  - _Depends: 5.1, 4.1_
  - _Boundary: tests/e2e (programa, presença)_
  - _Requirements: 10.1_

- [ ] 6. Validação ponta a ponta

- [x] 6.1 Testar a navegação por abas, o celular e o teclado
  - Criar `tests/e2e/abas-turma.spec.ts`: a coordenação abre uma turma, percorre as cinco abas conferindo o conteúdo e a aba atual, inscreve um catequizando e volta para Inscritos com a confirmação, designa um catequista e volta para Equipe e link, abre "Fazer chamada" e usa "Voltar para Encontros". Em 360 px, a barra quebra em linhas e nenhuma aba rola na horizontal. Percorrer as abas só com o teclado.
  - Pronto quando: o e2e passa em `npm run test:e2e` e a suíte completa continua com código de saída 0.
  - _Depends: 5.2_
  - _Requirements: 1.1, 1.2, 1.5, 11.2, 11.3_

- [x] 6.2 Testar a visão do catequista e o acesso por aba
  - No mesmo spec, o catequista vê as cinco abas sem ações de alteração, a contagem de pendentes aparece em "Equipe e link", e abrir diretamente cada aba (e a chamada) de uma turma de outro catequista mostra "Acesso negado".
  - Pronto quando: o e2e passa e a suíte e2e completa passa em três execuções seguidas com código de saída 0.
  - _Depends: 6.1_
  - _Requirements: 1.6, 9.1, 9.2, 9.4_

## Implementation Notes

- Mover páginas para o grupo `(abas)` deixa `.next/dev/types/validator.ts` (gerado pelo servidor dev, fora do git) apontando para o caminho antigo e quebra `npm run typecheck`/`build` com TS2307. Corrigir o caminho nesse arquivo (ou apagar `.next/dev/types`) resolve; o servidor dev o regenera.
- Páginas de aba que devolvem `<AbaX/>` async não renderizam com `renderToStaticMarkup`: nos testes de integração, resolver o elemento (`el.type(el.props)`) antes de renderizar.
- E2E em paralelo: helpers que criam tema direto no banco usam `posicao = min - 1` (sempre abaixo dos temas criados pela UI com `max + 1`), e a asserção de total de temas de `programa.spec.ts` usa `toPass()`, porque outros specs criam temas durante o teste.
- E2E só roda com a porta 3000 livre (senão o Playwright reaproveita o servidor dev do usuário, com o banco de desenvolvimento).
- E2E com fichas pendentes: localizadores de "ficha pendente" em `/catequista/turmas` devem ser escopados à turma do próprio teste (specs rodam em paralelo com o mesmo catequista), e fichas temporárias são descartadas em `finally`.
