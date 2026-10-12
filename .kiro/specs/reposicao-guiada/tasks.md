# Implementation Plan

- [ ] 1. Base de dados

- [x] 1.1 Criar a tabela de reservas de reposição
  - Criar o enum `SituacaoReserva` (reservada, compareceu, nao_compareceu, cancelada), o modelo `ReservaReposicao` e os campos de relação em `Catequizando`, `Tema`, `Encontro` e `Turma` (a turma de origem como relação nomeada), com a migração `*_reposicao`.
  - Criar em SQL manual o índice único parcial `reserva_ativa_unica` em catequizando e tema, onde a situação é `reservada`, e os índices por catequizando e por encontro.
  - Incluir `reserva_reposicao` no TRUNCATE de `tests/integration/setup.ts` e `tests/e2e/preparar-banco.ts`.
  - Criar `tests/integration/presenca/helpers-reposicao.ts` com criadores de turma, inscrição, tema, encontro realizado e planejado, presença e reserva.
  - Pronto quando: a migração aplica nos bancos de dev e de teste; um teste de integração grava uma reserva, recusa uma segunda reserva `reservada` do mesmo catequizando e tema e aceita uma nova depois de a primeira virar `cancelada`.
  - _Requirements: 4.1, 4.2_

- [ ] 2. Domínio da reposição (regras puras)

- [x] 2.1 Implementar os temas a repor, as opções e o conflito de data
  - Criar `temasARepor` (pendentes que já foram trabalhados na origem, na ordem do programa), `opcoesDoTema` (candidatos do tema por data e turma, sem os encontros com presença ou reserva ativa, com a marca de conflito) e `conflitoDeData`.
  - Pronto quando: os testes unitários cobrem tema cumprido fora da lista, tema ainda não trabalhado fora da lista, ordem do programa mantida, opções por data crescente e desempate por turma, encontro com presença ou reserva ativa excluído, conflito com encontro da origem e com outra reserva na mesma data, e lista vazia sem erro.
  - _Boundary: presenca/domain/reposicao_
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.3_

- [x] 2.2 Implementar a situação efetiva da reserva
  - Criar `situacaoEfetiva`, que deriva `cancelada` com o motivo para reserva `reservada` quando o encontro foi cancelado, o tema do encontro mudou ou foi retirado, a inscrição de origem terminou, o catequizando foi inativado ou a turma visitada foi encerrada.
  - Manter `compareceu` e `nao_compareceu` sem alteração, e `cancelada` persistida como `cancelada-por-usuario` ou com o motivo gravado.
  - Pronto quando: os testes unitários cobrem cada motivo isoladamente, a precedência quando há mais de um, e as situações `compareceu` e `nao_compareceu` intocadas.
  - _Depends: 2.1_
  - _Boundary: presenca/domain/reposicao_
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 2.3 (P) Criar as mensagens da reposição
  - Acrescentar aos códigos de aviso `reserva-criada`, `reserva-cancelada` e `ausencia-marcada`, e as mensagens de erro de opção indisponível, conflito de data, tema já reservado e catequizando sem turma de origem.
  - Pronto quando: os testes unitários mostram o texto de cada código novo, `null` para códigos desconhecidos e as quatro mensagens de erro em pt-BR.
  - _Boundary: presenca/mensagens_
  - _Requirements: 4.3, 4.4, 7.2_

- [ ] 3. Persistência

- [x] 3.1 Implementar as leituras da reposição no repositório
  - Implementar `temasTrabalhados`, `candidatosDeReposicao` (encontros planejados, futuros, de turmas abertas fora da origem, com algum dos temas), `visaoOQueFalta`, `reservasDoCatequizando` e `reservasDoEncontro`, aplicando `situacaoEfetiva` ao ler.
  - Reaproveitar `cumpridosDoCatequizando` e `temasAtivosNumerados` do repositório existente.
  - Pronto quando: os testes de integração mostram só temas trabalhados na origem, o tema cumprido por visitante fora da lista, as opções de outras turmas e do dia seguinte, encontro passado, cancelado ou de turma encerrada fora das opções, e a reserva obsoleta aparecendo como cancelada com o motivo e o histórico completo.
  - _Depends: 1.1, 2.2_
  - _Boundary: presenca/reposicao-repositorio_
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 5.1, 6.1, 6.2, 6.3, 6.4_

- [ ] 3.2 Implementar as escritas da reserva
  - Implementar `reservar` em transação: revalida o encontro, grava como cancelada as reservas obsoletas do catequizando, recusa conflito de data e insere, convertendo o erro do índice único em "já reservada".
  - Implementar `cancelar` (só `reservada`) e `marcarNaoCompareceu`, sem escrever em presença, inscrição ou encontro.
  - Pronto quando: os testes de integração mostram reserva criada, opção indisponível, conflito de data, duas reservas simultâneas do mesmo tema com uma só vencedora, reserva obsoleta não bloqueando a nova, cancelamento, ausência marcada sem criar presença, e frequência e inscrição inalteradas.
  - _Depends: 3.1_
  - _Boundary: presenca/reposicao-repositorio_
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.3, 6.1, 6.2, 6.3_

- [ ] 3.3 Integrar a reserva ao visitante e à chamada existentes
  - Fazer `adicionarVisitante` marcar a reserva do encontro como `compareceu` na mesma transação; `removerVisitante` devolver `compareceu` para `reservada`; `salvarChamada` marcar as `reservada` do encontro como `nao_compareceu` na mesma transação.
  - Manter o comportamento atual quando o catequizando não tem reserva.
  - Pronto quando: os testes de integração mostram visitante com reserva virando `compareceu`, visitante direto sem reserva igual ao atual, remoção devolvendo a reserva, chamada salva marcando as pendentes como `nao_compareceu` sem criar presença, e a frequência da turma visitada e da origem inalterada.
  - _Depends: 3.2_
  - _Boundary: presenca/repositorio_
  - _Requirements: 5.2, 5.4, 5.5, 5.6_

- [ ] 4. Ações e autorização

- [ ] 4.1 Implementar as ações de reposição
  - Implementar `reservarReposicaoAction`, `cancelarReservaAction` e `naoCompareceuAction`, validando UUIDs e reavaliando sessão e acesso a cada chamada (catequizando para reservar e cancelar; turma visitada para marcar ausência).
  - Retornar o estado com mensagens de erro e revalidar a página para atualizar a tela sem recarregar.
  - Pronto quando: os testes de integração mostram a coordenação reservando para qualquer catequizando, o catequista só para os das suas turmas, acesso negado sem dados para os demais, ausência sem sessão recusada, e o aviso correspondente após reservar e cancelar.
  - _Depends: 3.3, 2.3_
  - _Boundary: presenca/reposicao-actions_
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.5, 5.3, 7.2_

- [ ] 5. Interface

- [ ] 5.1 Criar os estilos e os componentes da visão "o que falta"
  - Acrescentar a `globals.css` os estilos da lista de temas, das opções, da reserva em destaque, do histórico e do bloco de reservas da chamada, utilizáveis em tela de celular.
  - Criar `OQueFalta` (temas a repor com número e título, opções com turma, dia, data e horário, reserva em destaque, estados vazios) e `HistoricoReservas` (situação, turma, data e motivo).
  - Pronto quando: os testes de componente mostram a lista na ordem do programa, a mensagem de nenhuma pendência, a de sem turma de origem, a de tema sem encontro futuro, a reserva no lugar das opções, a opção em conflito desabilitada e o histórico com o motivo.
  - _Depends: 2.3_
  - _Boundary: components/presenca_
  - _Requirements: 2.1, 2.5, 2.6, 3.5, 3.6, 6.4, 7.1_

- [ ] 5.2 (P) Criar o bloco de reservas da chamada
  - Criar `ReservasDaChamada`, listando separadamente dos inscritos cada catequizando com reserva, com nome e turma de origem, e as ações confirmar presente (visitante existente) e marcar ausência.
  - Pronto quando: os testes de componente mostram o bloco só quando há reservas, o nome e a origem de cada uma, os dois botões, e a situação já resolvida de quem compareceu ou não compareceu.
  - _Depends: 5.1_
  - _Boundary: components/presenca_
  - _Requirements: 5.1, 5.2, 5.3, 7.1_

- [ ] 5.3 Criar a página "o que falta" e as rotas por papel
  - Criar `PaginaReposicao` compartilhada e as rotas de coordenação e de catequista em `catequizandos/[id]/reposicao`, com autorização antes de qualquer leitura.
  - Acrescentar o link "O que falta" na frequência do catequizando e na tabela de frequência da turma.
  - Pronto quando: a coordenação abre a página de qualquer catequizando; o catequista abre a de catequizando da sua turma e é enviado a "acesso negado" nos demais; sem sessão vai ao login; e o link aparece nas duas telas.
  - _Depends: 5.1, 4.1_
  - _Boundary: app/_presenca, app/coordenacao, app/catequista_
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 3.6_

- [ ] 5.4 Integrar o bloco de reservas à página da chamada
  - Exibir `ReservasDaChamada` na página de chamada, lendo as reservas do encontro, com os avisos de confirmação.
  - Pronto quando: a chamada de um encontro com reserva mostra o catequizando e a turma de origem, confirmar presente o move para os visitantes e marcar ausência o mantém fora da frequência; sem reserva a página fica igual à anterior.
  - _Depends: 5.2, 4.1_
  - _Boundary: app/_presenca_
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 6. Validação

- [ ] 6.1 Cobrir o fluxo completo com testes e2e
  - Cobrir, em viewport de celular, a coordenação reservando em outra turma, o catequista da turma visitada confirmando presente, o tema saindo da lista, o cancelamento voltando as opções e o catequista fora da turma sendo negado.
  - Pronto quando: o e2e passa de ponta a ponta e verifica ausência de rolagem horizontal nas telas novas.
  - _Depends: 5.3, 5.4_
  - _Requirements: 1.2, 3.6, 4.1, 4.5, 5.2, 7.1_

- [ ] 6.2 Verificar a regressão do módulo de presença
  - Executar o typecheck, o lint, os testes unitários e de integração e o e2e existentes de presença.
  - Pronto quando: todos passam sem alterar frequência, alerta, chamada ou visitante existentes.
  - _Depends: 6.1_
  - _Requirements: 4.6, 5.5, 5.6_

## Implementation Notes
- Ids no banco são TEXT (uuid string) em todas as tabelas, inclusive `reserva_reposicao`; o índice parcial `reserva_ativa_unica` é SQL manual (o Prisma pode propor removê-lo em `migrate dev`, como já ocorre com `link_ativo_unico`).
- `situacaoEfetiva` aceita `motivoGravado?` no contexto: o repositório (3.1) deve passar `motivoCancelamento` da reserva `cancelada`. Precedência: encontro-cancelado > tema-alterado (inclui tema retirado) > saiu-da-turma > catequizando-inativo > turma-encerrada.
- Helpers de teste de reposição: `tests/integration/presenca/helpers-reposicao.ts` (reexporta os de `helpers.ts`).
- Leituras (3.1): `visaoOQueFalta` devolve `opcoes = []` quando o tema tem reserva ativa; `reservasDoEncontro` devolve todas as situações (a UI do bloco da chamada filtra `situacao === "reservada"` para ações); `reservasDoCatequizando` vem da mais recente. Inativar o catequizando fecha as inscrições por gatilho, então a reserva aparece como `saiu-da-turma` (o motivo `catequizando-inativo` é praticamente inalcançável; a UI trata ambos como "saiu da turma").
