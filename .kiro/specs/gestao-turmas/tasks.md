# Implementation Plan

- [ ] 1. Base de dados e extensões compartilhadas

- [x] 1.1 Criar as tabelas, índices parciais e triggers de turmas
  - Criar os enums `DiaSemana` e `MotivoSaida`, os modelos `Turma`, `Designacao` e `Inscricao` e as relações `User.designacoes` e `Catequizando.inscricoes`, sem mudar colunas existentes. Na migração `*_turmas`, acrescentar o SQL manual dos três índices parciais (`inscricao_vigente_unica`, `designacao_vigente_unica`, `turma_nome_aberta_unica`) e dos triggers `user_remove_designacoes` e `catequizando_desliga_inscricao`, conforme o design. Rodar `prisma generate`.
  - Incluir `turma`, `designacao` e `inscricao` no TRUNCATE de `tests/integration/setup.ts` e `tests/e2e/preparar-banco.ts`.
  - Pronto quando: a migração aplica nos bancos de dev e de teste, um teste de integração grava turma, designação e inscrição e lê `dataEntrada` sem deslocamento de dia, e a limpeza zera as três tabelas.
  - _Requirements: 2.1, 4.3, 5.1, 6.4, 11.1_

- [x] 1.2 (P) Estender o componente comum `Confirmacao` com `children`
  - Aceitar a prop opcional `children`, renderizada dentro do formulário do diálogo, para campos extras (a data de saída). Extensão compatível: os usos atuais não mudam.
  - Pronto quando: o teste de componente mostra um campo passado como filho dentro do formulário e enviado junto na confirmação, e os testes existentes de `Confirmacao`, da equipe e dos catequizandos seguem verdes.
  - _Boundary: components/comum_
  - _Requirements: 6.2_

- [x] 1.3 (P) Extrair o componente de leitura `FichaCatequizando`
  - Extrair da página de detalhe da coordenação (`coordenacao/catequizandos/[id]`) a exibição somente leitura da ficha para `components/catequizandos/ficha-catequizando.tsx`, sem ações embutidas. A página da coordenação passa a usá-lo, mantendo as ações dela fora do componente.
  - Pronto quando: o teste de componente renderiza os dados da ficha sem nenhum botão de alteração, a página de detalhe da coordenação mostra o mesmo conteúdo de antes e os e2e dos catequizandos seguem verdes.
  - _Boundary: components/catequizandos, app/(interno)/coordenacao/catequizandos/[id]_
  - _Requirements: 9.3_

- [ ] 2. Domínio das turmas (regras puras)

- [x] 2.1 (P) Implementar o schema e as regras da turma
  - Criar `DIAS_SEMANA`, `ROTULO_DIA`, `criarTurmaSchema({ anoAtual })` (nome, ciclo, dia, horário "HH:MM", local, observações e vagas opcionais) com as mensagens pt-BR do design, `estaLotada`, `formatarOcupacao`, `formatarHorario` e `ordenarTurmas` (dia, horário, nome).
  - Pronto quando: os testes unitários cobrem obrigatórios vazios, ciclo em 1999, 2000, ano atual + 1 e + 2, horários "7:30" e "24:00" recusados e "07:30" e "23:59" aceitos, vagas vazias = sem limite, 0, 501 e 2,5 recusadas, `estaLotada` com e sem vagas, "12 de 20 vagas" e a ordenação.
  - _Boundary: turmas/domain/turma_
  - _Requirements: 2.2, 2.3, 2.6, 3.5, 10.4, 11.1, 11.2, 11.3, 11.4_

- [x] 2.2 (P) Implementar as regras de inscrição
  - Criar `MOTIVOS_SAIDA`, `ROTULO_MOTIVO`, `validarDataEntrada` e `validarDataSaida`, que devolvem "Data inválida" ou `null`.
  - Pronto quando: os testes unitários mostram a entrada futura ou anterior ao nascimento recusada, a saída futura ou anterior à entrada recusada e a mesma data aceita nos dois casos.
  - _Boundary: turmas/domain/inscricao_
  - _Requirements: 5.5, 6.3_

- [x] 2.3 (P) Implementar a regra pura de acesso e os filtros
  - Criar `podeVerTurmaRegra` e `podeVerCatequizandoRegra` (coordenação sempre pode; catequista só quando o próprio id está na lista) e `cicloPadrao` e `filtrarTurmas` (situação abertas, encerradas ou todas, combinada com ciclo ou "todos").
  - Pronto quando: os testes unitários cobrem coordenação, catequista designado e não designado, `cicloPadrao` com e sem ciclos existentes e cada combinação de situação com ciclo.
  - _Boundary: turmas/domain/acesso, turmas/domain/filtros_
  - _Requirements: 1.1, 1.2, 3.1, 3.2_

- [ ] 2.4 (P) Criar as mensagens das turmas
  - Criar os códigos de aviso da tabela do design, as constantes `MSG_NOME_EM_USO`, `MSG_TURMA_ENCERRADA`, `MSG_JA_INSCRITO`, `MSG_TRANSFERIR`, `MSG_LOTADA`, `MSG_ERRO_INESPERADO` e `mensagemDeAviso`.
  - Pronto quando: os testes unitários mostram o texto de cada código conhecido, `null` para códigos desconhecidos ou não string, e `MSG_LOTADA(20, 20)` igual a "Turma lotada (20 de 20 vagas).".
  - _Boundary: turmas/mensagens_
  - _Requirements: 2.1, 2.4, 2.5, 4.1, 4.4, 5.1, 5.3, 6.1, 8.1, 8.3, 11.5_

- [ ] 3. Repositório e acesso

- [ ] 3.1 Implementar o repositório de turmas e designações
  - Implementar `listarTurmas`, `listarTurmasDoCatequista`, `obterTurma` (id não-UUID → `null`; vigentes e anteriores separados), `nomeEmUso` (sem diferenciar caixa, só entre abertas), `criarTurma`, `atualizarTurma`, `encerrarTurma` (transação que desliga todos os vigentes com motivo `encerramento` e devolve a quantidade), `catequistasElegiveis`, `designar`, `removerDesignacao` e `designadosVigentes`. As leituras consideram só designações vigentes.
  - Pronto quando: os testes de integração mostram `nomeEmUso` ignorando caixa e turmas encerradas, o índice parcial de nome e o de designação recusando duplicidade, `encerrarTurma` desligando todos com o motivo e a data corretos, e os elegíveis excluindo inativos, coordenação e já designados.
  - _Requirements: 2.1, 2.4, 2.5, 3.1, 4.1, 4.2, 4.3, 4.4, 7.1, 7.2, 8.1, 8.4, 9.1_

- [ ] 3.2 Implementar o repositório de inscrições
  - Implementar `catequizandosParaInscricao` (só ativos, busca sem diferenciar caixa nem acentos, com a turma atual), `inscricaoVigente`, `inscrever`, `transferir` (transação: fecha a anterior com motivo `transferencia` e abre a nova com a mesma data), `desligar` (motivo `desligamento`, nunca exclui), `historicoDoCatequizando` e `catequistasDoCatequizando`.
  - Pronto quando: os testes de integração mostram a busca por "jose" encontrando "José", inativos fora da lista, o índice de inscrição vigente única recusando a segunda inscrição, a transferência fechando e abrindo com a mesma data, o desligamento preservando a linha e o histórico em ordem.
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 6.1, 6.4_

- [ ] 3.3 Implementar o acesso por turma no servidor
  - Criar `podeVerTurma(sessao, turmaId)` e `podeVerCatequizando(sessao, catequizandoId)` compondo o repositório com a regra pura, reavaliados a cada chamada.
  - Pronto quando: os testes de integração mostram `true` para coordenação e catequista designado, `false` para catequista não designado, e `false` logo após a remoção da designação ou o desligamento do catequizando.
  - _Requirements: 1.2, 1.3, 9.3, 9.4_

- [ ] 3.4 Verificar os triggers de inativação pelas actions existentes
  - Testes de integração que usam `inativarMembroAction` e `editarMembroAction` (equipe) e `inativarCatequizandoAction` (catequizandos), sem alterar esses módulos.
  - Pronto quando: inativar ou mudar o papel de um catequista remove as designações vigentes dele; inativar um catequizando encerra a inscrição vigente com motivo `inativacao` e a data de hoje em São Paulo; reativar não restaura nada.
  - _Depends: 1.1_
  - _Requirements: 4.6, 6.5_

- [ ] 4. Server Actions de turmas

- [ ] 4.1 Implementar criar, editar e encerrar turma
  - `criarTurmaAction`, `editarTurmaAction` e `encerrarTurmaAction` com `requireRole(["coordenacao"])` primeiro, validação por `criarTurmaSchema`, `MSG_NOME_EM_USO` (inclusive via P2002), recusa com `MSG_TURMA_ENCERRADA` quando a turma já está encerrada, `redirect` fora do try/catch para `/coordenacao/turmas/{id}?aviso=…` e log só com ids e `e.name`. Reduzir as vagas abaixo dos inscritos é permitido.
  - Pronto quando: os testes de integração mostram o catequista rejeitado sem alterar dados, criação e edição com erros de campo e nome em uso, turma encerrada recusando edição e novo encerramento, vagas reduzidas salvas mantendo todos os inscritos, e o encerramento desligando todos.
  - _Requirements: 1.1, 1.4, 2.1, 2.3, 2.4, 2.5, 8.1, 8.3, 11.2, 11.7_

- [ ] 4.2 Implementar designar e remover catequista
  - `designarCatequistaAction` exige que o escolhido esteja em `catequistasElegiveis`; `removerCatequistaAction` encerra a designação. Ambas recusam turma encerrada e seguem o padrão das actions.
  - Pronto quando: os testes de integração mostram o catequista rejeitado, designação válida, não elegível recusado, duplicidade recusada, remoção com o aviso `catequista-removido` e turma encerrada recusando as duas.
  - _Requirements: 1.4, 4.1, 4.2, 4.3, 4.4, 8.3_

- [ ] 4.3 Implementar inscrever, transferir e desligar
  - `inscreverAction`: catequizando ativo, data validada, `MSG_JA_INSCRITO` na mesma turma, `{ lotada }` sem gravar quando lotada e sem `confirmarLotacao=1` (checada antes da transferência), `{ transferir }` quando há vigente em outra turma e sem `confirmarTransferencia=1`, depois `inscrever` ou `transferir`. `desligarAction` valida a data de saída. Ambas recusam turma encerrada.
  - Pronto quando: os testes de integração cobrem inativo recusado, data inválida, já inscrito, transferência sem e com confirmação, lotada sem e com confirmação, lotação e transferência exigindo as duas confirmações, desligamento com data e o catequista rejeitado.
  - _Requirements: 1.4, 5.1, 5.3, 5.4, 5.5, 6.1, 6.3, 8.3, 11.5, 11.6_

- [ ] 5. Componentes de interface das turmas

- [ ] 5.1 (P) Criar a lista e os filtros de turmas
  - `ListaTurmas({ turmas, base })`: nome como link, ciclo, "Quarta-feira, 19:30", local, catequistas ou selo "Sem catequista", inscritos ou "{n} de {v} vagas", selos "Lotada" e "Encerrada". `FiltrosTurmas`: formulário GET com `situacao` e `ciclo`.
  - Pronto quando: os testes de componente mostram cada selo nas condições certas, a ocupação, o link com a base recebida e os filtros pré-selecionados a partir das props.
  - _Boundary: components/turmas/lista-turmas, components/turmas/filtros-turmas_
  - _Requirements: 3.1, 3.2, 3.3, 4.5, 10.4, 11.3, 11.4_

- [ ] 5.2 (P) Criar o formulário de turma
  - `FormularioTurma({ modo, acao, valoresIniciais })` no padrão dos formulários anteriores, com `select` de dia da semana, `input type="time"`, vagas opcionais e erros junto a cada campo.
  - Pronto quando: os testes de componente mostram os campos rotulados, os valores iniciais na edição e as mensagens de erro associadas aos campos (`aria-describedby`).
  - _Boundary: components/turmas/formulario-turma_
  - _Requirements: 2.2, 2.3, 10.1, 10.2, 11.1, 11.2_

- [ ] 5.3 (P) Criar designação de catequista e ações da turma
  - `DesignarCatequista({ acao, elegiveis })` com "Nenhum catequista disponível" quando vazio. `AcoesTurma` com `Confirmacao` para "Encerrar turma" ("{n} catequizandos serão desligados"), "Remover" catequista e "Desligar" catequizando (nomeando catequizando e turma, com o campo data de saída como `children`).
  - Pronto quando: os testes de componente mostram o estado vazio da designação, o texto de cada confirmação com os nomes e a contagem, e a data de saída com padrão hoje enviada junto.
  - _Boundary: components/turmas/designar-catequista, components/turmas/acoes-turma_
  - _Depends: 1.2_
  - _Requirements: 4.1, 4.2, 4.4, 6.1, 6.2, 8.2_

- [ ] 5.4 (P) Criar inscrição e lista de inscritos
  - `InscreverCatequizando`: busca GET com `q`, candidatos com a turma atual, data de entrada (padrão hoje), "Inscrever", alerta de transferência com "Transferir para esta turma" e alerta de lotação com "Inscrever mesmo assim", ambos depois do botão principal, e confirmações já dadas como campos ocultos. `Inscritos({ vigentes, anteriores, hoje, baseFicha, acoes? })`: vigentes em ordem alfabética com idade e links `tel:` e WhatsApp; anteriores à parte com período e motivo; "Desligar" só com `acoes`.
  - Pronto quando: os testes de componente mostram os dois alertas com o botão de confirmação depois do principal, os campos ocultos no reenvio, a ordem alfabética, os links de contato, as datas dd/mm/aaaa e nenhuma ação sem `acoes`.
  - _Boundary: components/turmas/inscrever-catequizando, components/turmas/inscritos_
  - _Requirements: 5.1, 5.2, 5.3, 7.1, 7.2, 7.4, 7.5, 10.4, 11.5_

- [ ] 6. Páginas e integração

- [ ] 6.1 Criar as páginas da coordenação: lista, nova e edição
  - `/coordenacao/turmas` com filtros validados (padrões `abertas` e `cicloPadrao`), aviso, "Nova turma" e estado vazio com "Limpar filtros"; `/nova` e `[id]/editar` com `FormularioTurma`, e a edição de turma encerrada em aviso somente leitura. `requireRole` com o caminho exato e títulos "… — Acutis Catequese". Estilos em `globals.css`.
  - Pronto quando: a coordenação acessa as três páginas no navegador, os filtros persistem na URL após recarregar, o estado vazio aparece com filtros sem resultado e o build passa.
  - _Depends: 4.1, 5.1, 5.2_
  - _Requirements: 1.1, 2.1, 2.5, 3.1, 3.2, 3.3, 3.4, 8.3, 10.1, 10.3_

- [ ] 6.2 Criar a página da turma da coordenação
  - `/coordenacao/turmas/[id]`: dados, situação, ocupação e selos; catequistas com "Remover" e `DesignarCatequista`; `InscreverCatequizando` e `Inscritos` com ações; "Editar" e "Encerrar"; ações ocultas na turma encerrada; `notFound()` com a página "Turma não encontrada" e link para a lista.
  - Pronto quando: a página mostra todas as ações numa turma aberta e nenhuma numa encerrada, o id inexistente mostra "Turma não encontrada" e os avisos de cada action aparecem após o redirect.
  - _Depends: 4.2, 4.3, 5.3, 5.4_
  - _Requirements: 4.5, 7.1, 7.2, 7.3, 7.5, 7.6, 8.4, 11.3, 11.4_

- [ ] 6.3 Criar as páginas do catequista
  - `/catequista/turmas` com `listarTurmasDoCatequista` e o estado vazio "Você ainda não tem turmas designadas."; `/catequista/turmas/[id]` com `podeVerTurma` (nega → `/acesso-negado`) e os mesmos componentes sem ações; `/catequista/catequizandos/[id]` com `podeVerCatequizando` e `<FichaCatequizando>` sem ações. Link para "Minhas turmas" em `/catequista`.
  - Pronto quando: o catequista designado vê a turma e a ficha em modo leitura, o não designado é levado a "Acesso negado" nas duas páginas, e o build passa.
  - _Depends: 1.3, 3.3, 5.1, 5.4_
  - _Requirements: 1.2, 1.3, 7.4, 9.1, 9.2, 9.3, 9.4_

- [ ] 6.4 Integrar a seção "Turma" na página do catequizando e os menus
  - Em `/coordenacao/catequizandos/[id]`, acrescentar a seção "Turma" com a turma atual (link) e o histórico (turma, ciclo, período, motivo). Em `menu-por-papel`, acrescentar "Turmas" para a coordenação e "Minhas turmas" para o catequista, ajustando os testes do menu e do app-shell.
  - Pronto quando: a página do catequizando mostra a turma atual e o histórico, os testes unitários do menu confirmam os itens de cada papel e o build passa.
  - _Depends: 1.3, 3.2_
  - _Requirements: 1.5, 5.6_

- [ ] 7. Validação ponta a ponta

- [ ] 7.1 Escrever os testes e2e das turmas
  - Cenários do design: criar turma, designar catequista e inscrever; turma na página do catequizando; catequista em "Minhas turmas", turma e ficha em leitura; "Acesso negado" para outra turma e ficha de não inscrito; transferência entre turmas; turma de 1 vaga com "Turma lotada" e "Inscrever mesmo assim"; encerrar pelo diálogo; operação só com teclado nos fluxos principais; nenhuma rolagem horizontal a 360 px na lista, na página da turma e em "Minhas turmas".
  - Pronto quando: `npm run test:e2e` passa com os novos cenários e os e2e das specs anteriores continuam verdes, assim como `npm run test:unit`, `npm run test:integration`, lint, typecheck e `format:check`.
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 3.1, 3.3, 4.1, 5.1, 5.4, 5.6, 7.1, 8.1, 8.2, 9.1, 9.3, 10.1, 10.2, 10.3, 11.4, 11.5, 11.6_

## Implementation Notes
- Prisma 7: `migrate dev` não regenera o client; rodar `npm run db:generate` após migrar. Psql no container: usuário `acutis` (`docker compose exec postgres psql -U acutis -d acutis_test`).
