# Implementation Plan

- [ ] 1. Base compartilhada e dados

- [x] 1.1 Extrair busca e telefone para o módulo compartilhado
  - Mover `normalizarBusca`, `filtrarPorTermo`, `paginar` e `Pagina` para `compartilhado/busca`, e o telefone inteiro para `compartilhado/telefone`. A equipe mantém `filtrarMembros` e os próprios tipos, e passa a importar o restante do compartilhado. Nenhuma mudança de comportamento.
  - Mover os testes unitários correspondentes para `tests/unit/compartilhado/` e ajustar os imports dos testes da equipe.
  - Pronto quando: nenhum arquivo importa `equipe/domain/telefone` e `npm run test:unit`, `npm run test:integration`, lint, typecheck e `format:check` passam sem mudança de resultado.
  - _Boundary: compartilhado/busca, compartilhado/telefone, equipe/domain_
  - _Requirements: 2.6, 5.2, 5.7_

- [x] 1.2 (P) Criar os componentes comuns de aviso, paginação e confirmação
  - Criar `Aviso({ mensagem })`, `Paginacao({ base, pagina, totalPaginas, parametros })` e `Confirmacao` (botão com `<dialog>`, "Cancelar" com foco inicial, Esc fecha, estilo de perigo opcional, alerta de erro, `useId` no título e CSS Module próprio), conforme o design.
  - Pronto quando: os testes de componente mostram o aviso com role=status e nada quando a mensagem é nula, as URLs da paginação omitindo parâmetros vazios e `pagina=1`, e o diálogo com o título, o foco inicial em "Cancelar", confirmar chamando a ação e o erro exibido como alerta.
  - _Boundary: components/comum_
  - _Requirements: 5.5, 5.7, 7.3, 8.3_

- [ ] 1.3 Migrar a equipe para os componentes comuns
  - As páginas da equipe usam `Aviso` e `Paginacao` comuns, resolvendo a mensagem com `mensagemDeAviso` da equipe, e `AcoesSituacao` compõe `Confirmacao` mantendo os mesmos textos. Remover `components/equipe/aviso` e `paginacao`, e ajustar os testes da equipe só nos imports ou props.
  - Pronto quando: nenhum arquivo importa os componentes removidos, os testes unitários da equipe passam, o build passa e `npm run test:e2e` segue verde sem mudança nos cenários da equipe.
  - _Boundary: components/equipe, app/(interno)/coordenacao/equipe_
  - _Depends: 1.1, 1.2_
  - _Requirements: 5.5, 7.3_

- [ ] 1.4 (P) Implementar as datas civis
  - Criar em `compartilhado/datas` o tipo `DataCivil` e as funções `dataCivilSchema`, `hojeCivil` (fuso de São Paulo), `calcularIdade`, `compararDatas` e `formatarData` (dd/mm/aaaa), conforme o design.
  - Pronto quando: os testes unitários cobrem aniversário hoje, ontem e amanhã, 29/02, datas impossíveis recusadas, formatação e `hojeCivil` às 23h30 de São Paulo.
  - _Boundary: compartilhado/datas_
  - _Requirements: 2.4, 2.5, 3.3, 9.4_

- [ ] 1.5 (P) Criar as tabelas de catequizando e sacramentos
  - Criar os enums `EstadoCatequizando` e `Sacramento` e os modelos `Catequizando` e `SacramentoRecebido`, com migração e `prisma generate`. Incluir as duas tabelas no TRUNCATE da integração e do e2e.
  - Pronto quando: a migração aplica nos bancos de dev e de teste, e um teste de integração grava um catequizando com um sacramento, lê a data de volta sem deslocamento de dia e confirma que a limpeza zera as tabelas.
  - _Boundary: prisma/schema, tests/integration/setup, tests/e2e/preparar-banco_
  - _Requirements: 3.1, 7.1, 7.5_

- [ ] 2. Domínio dos catequizandos (regras puras)

- [ ] 2.1 Implementar o schema da ficha
  - Criar `criarFichaSchema({ hoje, idadeMinima })` e `lerFichaDoFormulario`, com os sacramentos, as mensagens pt-BR, `IDADE_MINIMA_PADRAO = 16`, `SACRAMENTOS` e os rótulos.
  - Pronto quando: os testes unitários cobrem os obrigatórios, a data futura, 15 anos e 364 dias recusado e 16 anos exatos aceito, uma idade mínima customizada, o e-mail normalizado ou vazio, o sacramento não recebido descartando data e paróquia, a data do sacramento inválida e a leitura dos checkboxes do formulário.
  - _Boundary: catequizandos/domain/ficha_
  - _Depends: 1.1, 1.4_
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 6.4_

- [ ] 2.2 (P) Implementar os estados e as transições
  - Criar `ESTADOS`, `FiltroEstado`, `transicao`, `operacoesDisponiveis` e `ROTULO_ESTADO`.
  - Pronto quando: os testes unitários cobrem a tabela completa de transições (as válidas e as nulas) e as operações disponíveis de cada estado.
  - _Boundary: catequizandos/domain/estado_
  - _Requirements: 6.5, 7.1, 7.2, 7.4, 8.1, 8.3_

- [ ] 2.3 Implementar a busca e a detecção de duplicidade
  - Criar `filtrarCatequizandos` (termo, estado e sem sacramento, em ordem pt-BR) e `chaveDuplicidade`/`encontrarDuplicado` sobre o compartilhado.
  - Pronto quando: os testes unitários mostram que "jose" encontra "José", que um trecho do telefone encontra, que os filtros de estado e de "sem crisma" funcionam, e que a duplicidade ignora caixa e acento e respeita `ignorarId`.
  - _Boundary: catequizandos/domain/busca, catequizandos/domain/duplicidade_
  - _Depends: 1.1, 1.4, 2.2_
  - _Requirements: 4.1, 5.1, 5.2, 5.3, 5.4_

- [ ] 2.4 (P) Implementar as mensagens dos catequizandos
  - Definir os códigos de aviso e os textos da tabela do design, as constantes de erro e `mensagemDeAviso`, que aceita só códigos conhecidos.
  - Pronto quando: os testes unitários cobrem cada código e mostram que um código desconhecido, vazio ou herdado do protótipo resulta em null.
  - _Boundary: catequizandos/mensagens_
  - _Requirements: 2.8, 4.1, 6.3, 7.2, 7.4, 8.1, 8.2, 8.3_

- [ ] 3. Operações no servidor

- [ ] 3.1 Implementar o repositório dos catequizandos
  - Implementar `listarCatequizandos`, `obterCatequizando` (id que não é UUID trata como inexistente), `criarCatequizando`, `atualizarFicha` (em transação, substituindo os sacramentos), `mudarEstado` condicional e `contarPendentes`, convertendo `@db.Date` para `DataCivil`.
  - Pronto quando: os testes de integração mostram criar e ler com sacramentos e datas preservadas, a atualização substituindo os sacramentos, `mudarEstado` devolvendo false quando o estado de origem já mudou, a contagem de pendentes e um id inválido resultando em null.
  - _Boundary: catequizandos/repositorio_
  - _Depends: 1.5, 2.1, 2.2_
  - _Requirements: 2.1, 5.8, 6.1, 7.1, 7.5_

- [ ] 3.2 Implementar as ações de cadastrar e editar
  - Implementar `EstadoFicha`, `criarCatequizandoAction` (com duplicidade e `confirmarDuplicidade`) e `editarCatequizandoAction` (sem mudar o estado), seguindo o padrão da equipe: `requireRole` primeiro e redirect fora do try/catch.
  - Pronto quando: os testes de integração mostram que um catequista é redirecionado sem gravar nada; que o cadastro válido redireciona com `cadastrado` e grava o estado ativo; que um duplicado sem confirmação não grava e com confirmação grava; que os erros por campo trazem os valores; e que a edição de uma ficha pendente salva sem mudar o estado.
  - _Boundary: catequizandos/actions_
  - _Depends: 2.3, 2.4, 3.1_
  - _Requirements: 1.3, 2.1, 2.3, 2.8, 4.1, 4.2, 4.3, 6.3, 6.4, 8.4_

- [ ] 3.3 Implementar as ações de estado
  - Implementar `inativarCatequizandoAction`, `reativarCatequizandoAction`, `confirmarFichaAction` (que revalida a ficha gravada) e `recusarFichaAction`, com `transicao` e `mudarEstado`.
  - Pronto quando: os testes de integração mostram inativar e reativar; confirmar uma pendente válida; recusar a confirmação de uma pendente com idade abaixo do mínimo, sem mudar o estado; recusar uma ficha deixando-a inativa e mantendo a linha; reativar alguém já ativo devolvendo erro; e um catequista sendo rejeitado.
  - _Boundary: catequizandos/actions_
  - _Depends: 3.2_
  - _Requirements: 1.3, 7.2, 7.4, 7.5, 8.1, 8.2, 8.3_

- [ ] 4. Interface dos catequizandos

- [ ] 4.1 (P) Construir a lista e a busca dos catequizandos
  - `ListaCatequizandos` (nome como link, idade, telefone formatado, selos de sacramento com texto acessível, estado e estado vazio com "Limpar busca") e `BuscaCatequizandos` (GET com `q`, `estado` e `sem`, com rótulos visíveis). Estilos da lista no CSS global, sem rolagem a 360 px.
  - Pronto quando: os testes de componente mostram os dados formatados, os selos, o estado vazio e a busca com os valores atuais.
  - _Boundary: components/catequizandos (lista, busca), globals.css (lista)_
  - _Depends: 1.1, 1.4, 2.2, 2.3, 3.1_ (a 3.1 fornece o tipo `CatequizandoResumo`, usado só via `import type`)
  - _Requirements: 3.5, 5.1, 5.3, 5.4, 5.5, 5.6, 9.3_

- [ ] 4.2 Construir o formulário da ficha
  - `FormularioFicha` nos modos de criação e edição, com um fieldset por sacramento, a dica das observações, os erros ligados aos campos, os valores reapresentados, o botão desabilitado durante o envio e o aviso de duplicidade com link e "Salvar mesmo assim". Estilos do formulário no CSS global.
  - Pronto quando: os testes de componente mostram `aria-describedby` nos erros, os campos de sacramento, a dica, o aviso de duplicidade enviando `confirmarDuplicidade=1` e os valores preservados.
  - _Boundary: components/catequizandos (formulario-ficha), globals.css (ficha)_
  - _Depends: 2.1, 3.2, 4.1_
  - Sem (P): edita o `globals.css`, assim como a 4.1.
  - _Requirements: 2.2, 2.3, 2.9, 3.1, 3.2, 4.1, 4.2, 4.3, 9.2, 9.3_

- [ ] 4.3 (P) Construir as ações de estado
  - `AcoesEstado` usa `Confirmacao` e mostra só as operações do estado atual: "Inativar" e "Recusar ficha" com estilo de perigo, "Reativar" e "Confirmar ficha" sem.
  - Pronto quando: os testes de componente mostram as ações certas para cada estado, o título com o nome do catequizando e que confirmar chama a action correspondente.
  - _Boundary: components/catequizandos (acoes-estado)_
  - _Depends: 1.2, 2.2, 3.3_
  - _Requirements: 6.5, 7.3, 8.3_

- [ ] 4.4 Integração: menu, lista, cadastro e página do catequizando
  - Item "Catequizandos" no menu da coordenação, com os testes do menu e do app-shell. Páginas da lista (filtros da URL validados, contador de pendentes com atalho, aviso e paginação comum), do cadastro, do detalhe (lista de definição, idade, sacramentos, links de ligação e WhatsApp, aviso e ações), da edição e de "não encontrado". Todas exigem coordenação com o caminho exato. Estilos da página do catequizando.
  - Pronto quando: os testes do menu passam, o build passa e, verificando no navegador, a coordenação cadastra, busca, filtra, edita, inativa e reativa um catequizando, e a página de uma ficha pendente mostra "Confirmar ficha" e "Recusar ficha". A evidência automatizada desses fluxos fica com o e2e da 5.1.
  - _Boundary: menu-por-papel, app/(interno)/coordenacao/catequizandos, globals.css (página)_
  - _Depends: 1.2, 1.3, 4.1, 4.2, 4.3_
  - _Requirements: 1.1, 1.2, 5.1, 5.5, 5.7, 5.8, 6.1, 6.2, 6.5, 6.6, 8.1, 8.3, 9.1, 9.4_

- [ ] 5. Validação ponta a ponta

- [ ] 5.1 Escrever os testes e2e dos catequizandos
  - Cenários: cadastrar com crisma recebida e ver "Catequizando cadastrado" com a idade e os links; busca sem acento e filtro "sem crisma" refletidos na URL; aviso de duplicidade e "Salvar mesmo assim"; inativar pelo diálogo; uma ficha pendente, criada no preparo do teste, aparecendo no contador e sendo confirmada; catequista vendo "Acesso negado"; sem rolagem horizontal a 360 px na lista, no formulário e na página; id inexistente mostrando "Catequizando não encontrado". Usar nomes únicos por teste.
  - Pronto quando: `npm run test:e2e` passa com todos os cenários da fundação, da equipe e desta spec, e `npm run format:check` passa.
  - _Depends: 4.4_
  - _Requirements: 1.2, 2.8, 3.5, 4.1, 4.2, 5.2, 5.4, 5.5, 5.8, 6.1, 6.2, 6.6, 7.2, 7.3, 8.1, 9.3_

## Implementation Notes
