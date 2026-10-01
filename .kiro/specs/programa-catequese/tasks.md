# Implementation Plan

- [ ] 1. Base de dados e extensões compartilhadas

- [x] 1.1 Criar as tabelas de tema e encontro
  - Criar o enum `SituacaoEncontro`, os modelos `Tema` e `Encontro` e a relação `Turma.encontros` (só campo de relação), com a migração `*_programa` contendo o SQL do índice parcial `encontro_horario_unico`, conforme o design. Rodar `npm run db:generate` depois de migrar.
  - Incluir `encontro` e `tema` no TRUNCATE de `tests/integration/setup.ts` e `tests/e2e/preparar-banco.ts`.
  - Pronto quando: a migração aplica nos bancos de dev e de teste; um teste de integração grava um tema e um encontro, lê a data sem deslocamento de dia, confirma que `tema_chave_unica` e `encontro_horario_unico` recusam duplicidade (e aceitam o segundo encontro quando o primeiro está cancelado), e a limpeza zera as tabelas.
  - _Requirements: 2.1, 2.4, 4.1, 4.7, 5.8_

- [x] 1.2 (P) Acrescentar `formatarDataComDia` às datas civis
  - Em `compartilhado/datas`, criar `formatarDataComDia(data)` no formato "Sábado, 03/10/2026", calculando o dia da semana sem depender de fuso.
  - Pronto quando: os testes unitários de `compartilhado/datas` cobrem um dia de cada semana, 29/02 e a virada de ano, e os testes existentes seguem verdes.
  - _Boundary: compartilhado/datas_
  - _Requirements: 9.4_

- [ ] 2. Domínio do programa (regras puras)

- [x] 2.1 (P) Implementar as regras de tema
  - Criar `criarTemaSchema`, `chaveDoTitulo`, `numerarTemas` e `vizinhoParaMover`, com as mensagens pt-BR do design.
  - Pronto quando: os testes unitários cobrem título vazio, curto e longo, descrição longa, chaves iguais para "Batismo" e "batísmo ", numeração contínua com desativado no meio (desativados ao fim, sem número) e o vizinho nos limites e pulando desativados.
  - _Boundary: programa/domain/tema_
  - _Requirements: 2.2, 2.3, 2.4, 2.6, 2.7, 3.6_

- [x] 2.2 (P) Implementar as regras de encontro
  - Criar `SITUACOES`, `ROTULO_SITUACAO`, `criarEncontroSchema`, `motivoSchema`, `TRANSICOES`, `podeEditar`, `validarRealizacao`, `aguardandoConfirmacao`, `ordenarEncontros` e `proximoEncontro`.
  - Pronto quando: os testes unitários cobrem data obrigatória, horários "7:30" e "24:00" recusados, `temaId` vazio como sem tema, observações e motivo longos, as três transições, edição só de planejado, realização com data futura, hoje e passada, "Aguardando confirmação" e o próximo encontro ignorando cancelados, realizados e datas passadas, desempatando pelo horário.
  - _Boundary: programa/domain/encontro_
  - _Requirements: 4.2, 4.4, 5.1, 5.2, 5.3, 5.4, 5.6, 5.7, 6.1, 6.2_

- [x] 2.3 Implementar o cálculo de progresso
  - Criar `calcularProgresso(temasAtivos, encontros)`.
  - Pronto quando: os testes unitários mostram tema realizado duas vezes contando uma, encontro sem tema e encontros cancelados ou planejados fora da contagem, tema desativado fora do total e pendentes na ordem do programa.
  - _Depends: 2.2_
  - _Boundary: programa/domain/progresso_
  - _Requirements: 3.6, 6.4, 6.5_

- [x] 2.4 (P) Criar as mensagens do programa
  - Criar os códigos de aviso e as constantes da tabela do design, mais `mensagemDeAviso`, no padrão dos outros módulos.
  - Pronto quando: os testes unitários mostram o texto de cada código, `null` para desconhecidos e não string, e `MSG_TEMA_REPETIDO("03/10/2026")` igual a "Este tema já tem encontro nesta turma em 03/10/2026.".
  - _Boundary: programa/mensagens_
  - _Requirements: 2.1, 2.4, 2.5, 3.3, 3.4, 4.1, 4.5, 4.7, 5.1, 5.2, 5.3, 5.4, 7.1_

- [ ] 3. Repositório do programa

- [x] 3.1 Implementar o repositório de temas
  - Implementar `listarTemas` (com contagem de encontros), `obterTema`, `chaveEmUso`, `criarTema` (no fim, em transação), `atualizarTema`, `trocarPosicoes` (transação), `definirAtivo`, `excluirTema` (devolve "excluido", "em-uso" ou "inexistente") e `temasParaSelecao` (ativos, mais o desativado em uso quando pedido).
  - Criar `tests/integration/programa/helpers.ts` para temas, turmas e encontros.
  - Pronto quando: os testes de integração mostram `chaveEmUso` e o índice recusando "Batismo" e "batismo", o tema novo no fim, a troca de posições, a exclusão recusada para tema usado e aceita para não usado, a contagem de encontros e a seleção com o desativado em uso só quando pedido.
  - _Requirements: 2.1, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 4.3, 4.9_

- [x] 3.2 Implementar o repositório de encontros e equivalência
  - Implementar `dadosDaTurma` (lendo a tabela `turma`), `listarEncontros`, `obterEncontro`, `encontroComMesmoTema`, `conflitoDeHorario`, `criarEncontro`, `atualizarEncontro` (só planejado), `mudarSituacao` (update condicional; reabrir limpa o motivo) e `encontrosEquivalentes` (não cancelados, turmas abertas, cronológico).
  - Pronto quando: os testes de integração mostram o tema repetido ignorando cancelados, o conflito de horário (inclusive via índice), a edição recusada fora de planejado, a segunda mudança de situação devolvendo false, a reabertura limpando o motivo e conflitando quando há outro encontro no horário, a equivalência excluindo cancelados e turmas encerradas, e o título novo de um tema aparecendo nos encontros.
  - _Requirements: 2.5, 4.1, 4.5, 4.7, 4.8, 5.1, 5.3, 5.4, 5.7, 5.8, 6.1, 8.1, 8.2, 8.3_

- [ ] 4. Server Actions do programa

- [x] 4.1 Implementar as actions de tema
  - `criarTemaAction`, `editarTemaAction`, `moverTemaAction`, `desativarTemaAction`, `reativarTemaAction` e `excluirTemaAction`, com `requireRole(["coordenacao"])` primeiro, título em uso pela chave (inclusive P2002), `MSG_TEMA_EM_USO` ao excluir tema usado, redirect fora do try/catch e log só com ids e `e.name`.
  - Pronto quando: os testes de integração mostram o catequista rejeitado em todas sem alterar dados, criar e editar com erros de campo e título em uso (acento e caixa diferentes), mover para cima e para baixo, desativar e reativar, e excluir em uso recusado e não usado excluído.
  - _Requirements: 1.1, 1.5, 2.1, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4_

- [x] 4.2 Implementar criar e editar encontro
  - `criarEncontroAction` e `editarEncontroAction` com `requireRole(["catequista"])`, `podeVerTurma` (nega → `/acesso-negado`), validação de `base`, turma inexistente ou encerrada, encontro de outra turma, tema ativo (ou o atual na edição), conflito de horário, tema repetido com `confirmarTemaRepetido=1` e edição só de planejado.
  - Pronto quando: os testes de integração mostram o catequista designado e a coordenação aceitos, o não designado redirecionado sem gravar, turma encerrada recusada, tema desativado recusado na criação e mantido na edição, tema repetido sem e com confirmação, conflito de horário, edição de realizado recusada e `base` inválida caindo na base da coordenação.
  - _Requirements: 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.7, 7.1_

- [x] 4.3 Implementar as mudanças de situação
  - `marcarRealizadoAction`, `cancelarEncontroAction` (motivo) e `reabrirEncontroAction`, usando `TRANSICOES` e `mudarSituacao`, com as mesmas barreiras de acesso, turma encerrada e `base` de 4.2.
  - Pronto quando: os testes de integração mostram realizar com data futura recusado e com data passada aceito, cancelar com motivo, reabrir realizado e cancelado, reabrir com conflito recusado, transição inválida devolvendo `MSG_SITUACAO_MUDOU`, turma encerrada recusando as três e o não designado redirecionado.
  - _Requirements: 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.8, 7.1_

- [ ] 5. Componentes de interface do programa

- [x] 5.1 (P) Criar a lista de temas, o formulário e as ações de tema
  - `ListaTemas({ temas, gestao? })`, `FormularioTema` e `AcoesTema`, conforme o design.
  - Pronto quando: os testes de componente mostram a numeração, o selo "Desativado", "{n} encontros", os botões "Subir" e "Descer" desabilitados nos limites, nenhuma ação sem `gestao`, o excluir só para tema sem encontros, e os erros do formulário associados aos campos.
  - _Boundary: components/programa/lista-temas, components/programa/formulario-tema, components/programa/acoes-tema_
  - _Requirements: 1.2, 2.2, 2.3, 2.6, 2.7, 3.5, 3.6, 9.2_

- [x] 5.2 (P) Criar o cronograma e as ações de encontro
  - `Cronograma({ encontros, hoje, base, acoes? })` e `AcoesEncontro` (realizado, cancelar com motivo, reabrir), com o wrapper que leva erros de campo para o alerta.
  - Pronto quando: os testes de componente mostram a ordem, a data com dia, "Sem tema do programa", os selos "Próximo encontro" e "Aguardando confirmação", o motivo nos cancelados, as ações conforme a situação, nenhuma ação sem `acoes`, o texto das confirmações com data e tema e o motivo enviado no FormData.
  - _Boundary: components/programa/cronograma, components/programa/acoes-encontro_
  - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.7, 9.4_

- [x] 5.3 (P) Criar o formulário de encontro
  - `FormularioEncontro({ modo, acao, temas, valoresIniciais })` com data, horário, `select` de tema com "Sem tema do programa" e o desativado em uso identificado, observações e o alerta de tema repetido com "Salvar mesmo assim" depois do botão principal.
  - Pronto quando: os testes de componente mostram os campos rotulados, o horário inicial, o tema desativado identificado, o alerta e o campo oculto `confirmarTemaRepetido` no reenvio, e os erros associados aos campos.
  - _Boundary: components/programa/formulario-encontro_
  - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.9, 9.2_

- [x] 5.4 (P) Criar progresso, próximo encontro e equivalentes
  - `ProgressoTurma`, `ProximoEncontro` e `EncontrosEquivalentes`, conforme o design.
  - Pronto quando: os testes de componente mostram "{realizados} de {total} temas" com os pendentes em `<details>`, o próximo encontro com data com dia e link para o cronograma (ou "Nenhum encontro planejado"), e a tabela de equivalentes com link para a turma.
  - _Boundary: components/programa/progresso-turma, components/programa/proximo-encontro, components/programa/encontros-equivalentes_
  - _Requirements: 6.3, 6.4, 6.5, 8.2, 9.4_

- [x] 6. Páginas e integração

- [x] 6.1 Criar as páginas do programa
  - `/coordenacao/programa` (aviso, "Novo tema", `ListaTemas` com gestão), `/novo`, `[temaId]` (dados, `AcoesTema`, equivalentes, oferta de desativação quando a exclusão é recusada) com `not-found` "Tema não encontrado", `[temaId]/editar` e `/catequista/programa` (consulta). Acrescentar "Programa" ao menu dos dois papéis, ajustando os testes do menu e do app-shell. Estilos em `globals.css`.
  - Pronto quando: o build passa, os testes do menu confirmam "Programa" nos dois papéis, e um e2e temporário (rodado e apagado) mostra a coordenação criando, reordenando e desativando temas, a página do tema com os equivalentes e o catequista vendo o programa sem ações.
  - _Depends: 4.1, 5.1, 5.4_
  - _Requirements: 1.2, 1.6, 2.1, 2.5, 2.7, 3.3, 3.4, 3.5, 8.2, 9.1, 9.3_

- [x] 6.2 Criar as páginas de encontros da turma
  - Cronograma, `novo` e `[encontroId]/editar` em `/coordenacao/turmas/[id]/encontros` e `/catequista/turmas/[id]/encontros`, com `requireRole` no caminho exato, `podeVerTurma` (nega → `/acesso-negado`), `dadosDaTurma` (inexistente → `notFound()`), `ProgressoTurma`, estado vazio e ações só com a turma aberta. Estilos em `globals.css`.
  - Pronto quando: o build passa e um e2e temporário (rodado e apagado) mostra o catequista designado criando e marcando um encontro, o não designado vendo "Acesso negado" e uma turma encerrada sem ações.
  - _Depends: 4.2, 4.3, 5.2, 5.3, 5.4_
  - _Requirements: 1.3, 1.4, 4.1, 4.8, 5.7, 6.1, 6.4, 6.5, 6.6, 6.7, 7.1, 7.2, 9.1, 9.3_

- [x] 6.3 Mostrar o próximo encontro nas páginas da turma
  - Em `/coordenacao/turmas/[id]` e `/catequista/turmas/[id]`, acrescentar `ProximoEncontro` com link para o cronograma, compondo o repositório do programa na camada app.
  - Pronto quando: as duas páginas mostram o próximo encontro (ou "Nenhum encontro planejado") com o link certo para o cronograma do papel, sem mudar o restante, e o build e os e2e de turmas seguem verdes.
  - _Depends: 3.2, 5.4_
  - _Requirements: 6.3_

- [x] 7. Validação ponta a ponta

- [x] 7.1 Escrever os testes e2e do programa
  - Cenários do design em `tests/e2e/programa.spec.ts`: programa (criar, reordenar, desativar; catequista sem ações); encontro com aviso de tema repetido; realizado e progresso "1 de 2 temas"; cancelar com motivo e reabrir; próximo encontro na página da turma; equivalência entre duas turmas; "Acesso negado" para o não designado; teclado ao criar encontro; sem rolagem horizontal a 360 px no programa, no cronograma e no formulário. Dados com nomes únicos, compatíveis com a execução em paralelo.
  - Pronto quando: `CI=1 npm run test:e2e` passa por inteiro (novos e anteriores), assim como `npm run test:unit`, `npm run test:integration`, lint, typecheck e `format:check`.
  - _Requirements: 1.2, 1.4, 2.6, 3.1, 4.5, 4.6, 5.1, 5.3, 5.4, 6.2, 6.3, 6.4, 8.2, 9.2, 9.3_

## Implementation Notes
- Prisma 7: rodar `npm run db:generate` depois de migrar; migração com SQL manual via `--create-only`. Psql: `docker compose exec postgres psql -U acutis -d acutis_test`.
- Há arquivos de outra sessão em `.kiro/specs/autocadastro-catequizandos/`: nunca incluí-los nos commits desta spec.
- Repositório de temas: `atualizarTema` e `trocarPosicoes` lançam erro do Prisma com id inválido/inexistente — as actions (4.1) devem validar o id ou tratar o erro. `criarTema` pode gerar posições iguais sob concorrência; a ordem desempata por título.
- Repositório de encontros: `criarEncontro` não valida o UUID da turma; as actions chamam `dadosDaTurma` antes. Updates de encontro são condicionais (`updateMany` com a situação no WHERE) e devolvem boolean.
- Arquivos "use server" só exportam actions: toda função exportada vira endpoint público. Helpers puros (ex.: `baseValida`) ficam no domínio; helpers de servidor ficam internos ao arquivo.
- Tarefa 6.1 deve criar no globals.css as classes usadas pelos componentes do programa: cronograma*, selo, acoes-encontro, situacao-planejado/realizado/cancelado.
- FormularioEncontro envia `confirmarTemaRepetido=1` pelo name/value do botão "Salvar mesmo assim" (não input hidden); o e2e (7.1) deve cobrir esse reenvio.
- E2e: depois de ações que redirecionam/atualizam a lista (ex.: Subir), usar `expect.poll` ou asserções auto-retry antes de conferir a nova ordem.
- Páginas de encontros: lógica comum aos dois papéis em `src/app/(interno)/_encontros/paginas.tsx` (pasta privada, fora do File Structure Plan original); as rotas só fazem requireRole e delegam.
- E2e do programa roda em `mode: "serial"` porque temas são globais; o progresso compara "1 de N" com N lido do programa. Só `programa.spec.ts` cria temas.
