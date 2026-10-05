# Implementation Plan

- [x] 1. Base de dados

- [x] 1.1 Criar as tabelas de presença e de limite de frequência
  - Criar o enum `StatusPresenca`, os modelos `Presenca` e `LimiteFrequencia` e os campos de relação `presencas` em `Turma`, `Encontro` e `Catequizando` (mais a relação nomeada `PresencaOrigem` em `Turma`), com a migração `*_presenca` contendo o SQL das restrições `presenca_visitante_ck`, `presenca_origem_ck` e `limite_frequencia_ck`, conforme o design. Rodar `npm run db:generate` depois de migrar.
  - Incluir `presenca` e `limite_frequencia` no TRUNCATE de `tests/integration/setup.ts` e `tests/e2e/preparar-banco.ts`.
  - Criar `tests/integration/presenca/helpers.ts` com criadores de turma, inscrição (com datas de entrada e saída), catequizando, tema, encontro e presença.
  - Pronto quando: a migração aplica nos bancos de dev e de teste; um teste de integração grava uma presença, recusa a segunda presença do mesmo catequizando no mesmo encontro, recusa visitante ausente ou justificado, visitante sem turma de origem, visitante com origem igual à turma do encontro, presença comum com turma de origem e limite fora de 1 a 100 ou com `id` diferente de 1; recusa apagar encontro, turma e catequizando com presenças (chaves `Restrict`); e a limpeza zera as tabelas.
  - _Requirements: 3.6, 4.5, 4.7, 7.1, 9.2, 9.3, 9.5, 9.6_

- [x] 2. Domínio da presença (regras puras)

- [x] 2.1 (P) Implementar o cálculo de frequência, o limite e o alerta
  - Criar `STATUS_PRESENCA`, `LIMITE_PADRAO` (75), `contarPresencas`, `somarContagens`, `calcularFrequencia`, `emAlerta`, `limiteSchema` e `ordenarPorFrequencia`, com justificado contando como ausência e alerta comparado em inteiros, sem arredondar.
  - Pronto quando: os testes unitários cobrem 1 presente, 1 justificado e 2 ausentes igual a 25%; total 0 com percentual `null` e alerta falso; 2 de 3 exibido como 67% e em alerta com limite 67; 3 de 4 sem alerta com limite 75; soma de contagens; ordenação com menor percentual primeiro, sem encontros por último e desempate por nome; e `limiteSchema` recusando vazio, 0, 101 e 70,5 com mensagem em pt-BR.
  - _Boundary: presenca/domain/frequencia_
  - _Requirements: 5.1, 5.3, 5.4, 5.8, 6.1, 6.4, 7.1, 7.3, 7.4, 7.5, 8.7_

- [x] 2.2 Implementar as regras da chamada
  - Criar `disponibilidadeDaChamada`, `inscritoNaData`, `montarLinhas`, `lerMarcacoes`, `validarMarcacoes` e `podeGerenciarVisitantes`, com as mensagens em pt-BR do design.
  - Pronto quando: os testes unitários cobrem cada motivo sem chamada (turma encerrada, cancelado, data futura) na ordem de precedência, planejado até hoje como `nova` e realizado como `correcao`; `inscritoNaData` com entrada e saída iguais à data do encontro (saída exclusiva) e com transferência no mesmo dia; `montarLinhas` com registro existente, inscrito novo sem status e visitante fora da lista; `validarMarcacoes` com faltantes, lista vazia e ids desconhecidos ignorados; e `podeGerenciarVisitantes` falso sem tema, com turma encerrada e sem chamada disponível.
  - _Depends: 2.1_
  - _Boundary: presenca/domain/chamada_
  - _Requirements: 2.1, 2.4, 2.5, 2.6, 3.1, 3.3, 3.5, 4.1, 4.4, 9.1_

- [x] 2.3 (P) Implementar o progresso do catequizando no programa
  - Criar `calcularProgressoCatequizando`, devolvendo temas cumpridos (com turma, data e se foi reposição), total e pendentes na ordem do programa.
  - Pronto quando: os testes unitários mostram presença na própria turma e como visitante contando, o tema repetido valendo a data mais antiga, tema desativado fora do total e dos cumpridos, e lista de pendentes na ordem do programa.
  - _Boundary: presenca/domain/progresso-catequizando_
  - _Requirements: 8.1, 8.3, 8.4, 8.6_

- [x] 2.4 (P) Criar as mensagens da presença
  - Criar os códigos de aviso (`chamada-salva`, `chamada-atualizada`, `visitante-adicionado`, `visitante-removido`, `limite-salvo`), as mensagens de erro do design e `mensagemDeAviso`, no padrão dos outros módulos.
  - Pronto quando: os testes unitários mostram o texto de cada código ("Chamada salva", "Chamada atualizada", "Limite salvo"), `null` para códigos desconhecidos e não string, e as mensagens de turma encerrada, situação alterada, visitante duplicado e visitante sem tema.
  - _Boundary: presenca/mensagens_
  - _Requirements: 2.3, 3.2, 4.3, 4.5, 4.6, 7.2_

- [ ] 3. Persistência e autorização

- [x] 3.1 Implementar o repositório da chamada e dos visitantes
  - Implementar `dadosDoEncontro`, `inscritosNaData`, `presencasDoEncontro`, `salvarChamada` (transação com `upsert` das marcações e `updateMany` condicional de planejado para realizado em modo `nova`), `buscarVisitantes`, `adicionarVisitante` (lendo a inscrição vigente na mesma transação) e `removerVisitante`.
  - Pronto quando: os testes de integração mostram `salvarChamada` gravando todas as presenças e marcando o encontro como realizado; a correção atualizando sem mudar a situação; duas chamadas concorrentes com um só vencedor e a outra recebendo "situacao-mudou" sem gravar nada; encontro reaberto mantendo as linhas; inscritos na data respeitando entrada e saída exclusiva; a busca de visitantes devolvendo só id, nome e turma de origem de ativos inscritos em outra turma aberta e excluindo quem já consta no encontro; `adicionarVisitante` recusando duplicado e catequizando sem inscrição em outra turma aberta; e `removerVisitante` só apagando linhas de visitante e nunca mexendo na inscrição.
  - _Depends: 1.1_
  - _Boundary: presenca/repositorio_
  - _Requirements: 2.1, 2.3, 3.2, 3.3, 3.4, 3.6, 4.2, 4.3, 4.5, 4.6, 4.7, 4.8, 9.2_

- [ ] 3.2 Implementar os agregados de frequência e de progresso no repositório
  - Implementar `resumoPorEncontro`, `frequenciaDaTurma`, `frequenciaPorTurma`, `presencasDoCatequizando`, `cumpridosDoCatequizando`, `temasAtivosNumerados`, `inscritosSemOTema` e `alertasDeFrequencia`, sempre contando só encontros realizados e, na frequência, só quem não é visitante.
  - Pronto quando: os testes de integração mostram a frequência por catequizando e por turma sem visitantes e sem encontros reabertos, o catequizando que entrou depois contando só os encontros em que constava na chamada, a falta de origem continuando depois de uma reposição, o progresso contando só status presente (na turma ou como visitante), `inscritosSemOTema` listando só quem ainda não cumpriu, os alertas só de inscrição vigente em turma aberta e ordenados do menor para o maior percentual (restritos às turmas informadas), a frequência de turma encerrada e de catequizando desligado continuando consultável, e nenhuma presença removida ao desligar, transferir, inativar ou encerrar turma.
  - _Depends: 3.1_
  - _Boundary: presenca/repositorio_
  - _Requirements: 3.4, 5.2, 5.6, 5.7, 6.1, 6.3, 6.5, 7.6, 7.7, 8.2, 8.4, 8.5, 8.7, 9.3, 9.4, 9.5_

- [ ] 3.3 Implementar o limite de frequência e as turmas do usuário
  - Implementar `obterLimite` (75 quando não há linha), `salvarLimite` (`upsert` da linha única) e `turmasDoUsuario` (todas para a coordenação; para o catequista, as turmas abertas em que é responsável).
  - Pronto quando: os testes de integração mostram o limite padrão sem linha, o novo valor lido de volta, o segundo salvamento atualizando a mesma linha, um valor fora de 1 a 100 recusado pelo banco, e `turmasDoUsuario` devolvendo só as turmas abertas com designação vigente do catequista.
  - _Depends: 3.2_
  - _Boundary: presenca/repositorio_
  - _Requirements: 1.2, 7.1, 7.2, 7.7, 7.11_

- [ ] 3.4 Implementar a autorização do módulo
  - Implementar `autorizarTurma`, `autorizarCatequizando` (usando `podeVerCatequizando`) e `exigirCoordenacao`, reavaliados a cada chamada, com `redirect("/acesso-negado")` antes de qualquer leitura de dados.
  - Pronto quando: os testes de integração mostram a coordenação passando em qualquer turma, o catequista responsável passando, o catequista de outra turma e o de turma que deixou de conduzir sendo enviados a "Acesso negado", id inválido negando sem lançar, e `exigirCoordenacao` recusando o catequista.
  - _Depends: 3.3_
  - _Boundary: presenca/autorizacao_
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 4. Server Actions da presença

- [ ] 4.1 Implementar a ação de salvar a chamada
  - `salvarChamadaAction`: autoriza, recalcula no servidor os inscritos na data, verifica disponibilidade e marcações, grava em transação e redireciona para a base validada com o aviso `chamada-salva` ou `chamada-atualizada`. Em erro, devolve as marcações já feitas e os faltantes; redirect fora do try/catch e log só com ids.
  - Pronto quando: os testes de integração mostram salvar com todos marcados registrando as presenças, marcando o encontro como realizado e redirecionando com o aviso; faltantes devolvidos sem gravar nada; recusa de data futura, encontro cancelado, turma encerrada e turma sem inscritos; correção de encontro realizado com o aviso de atualização; novo inscrito entrando na correção; encontro reaberto salvo de novo como nova chamada preenchida; ação direta por catequista de outra turma e por usuário sem papel rejeitada sem alterar dados; e falha inesperada devolvendo a mensagem padrão com as marcações preservadas.
  - _Depends: 2.2, 2.4, 3.4_
  - _Boundary: presenca/actions_
  - _Requirements: 1.5, 2.3, 2.4, 2.5, 2.6, 3.2, 3.5, 9.1, 10.6_

- [ ] 4.2 Implementar as ações de visitante
  - `adicionarVisitanteAction` e `removerVisitanteAction`, com a mesma autorização, a verificação de `podeGerenciarVisitantes` e os avisos `visitante-adicionado` e `visitante-removido`.
  - Pronto quando: os testes de integração mostram o visitante registrado como presente com a turma de origem e a inscrição dele intacta, a recusa sem tema, em turma encerrada, em encontro cancelado e duplicado, a remoção apagando só o registro de visitante e o progresso do catequizando recalculado, e a rejeição de ação direta sem permissão.
  - _Depends: 4.1_
  - _Boundary: presenca/actions_
  - _Requirements: 4.1, 4.3, 4.4, 4.5, 4.6, 4.8, 9.1_

- [ ] 4.3 Implementar a ação do limite de frequência
  - `salvarLimiteAction`, só para a coordenação, validando com `limiteSchema` e redirecionando com o aviso `limite-salvo`.
  - Pronto quando: os testes de integração mostram o limite salvo e lido de volta, mensagens junto ao campo para vazio, não inteiro e fora de 1 a 100, o catequista rejeitado sem alterar o valor, e os alertas recalculados com o novo limite na leitura seguinte.
  - _Depends: 4.2_
  - _Boundary: presenca/actions_
  - _Requirements: 1.3, 7.2, 7.3, 7.11_

- [ ] 5. Componentes de interface

- [ ] 5.1 Criar os estilos e a tela de chamada
  - Seguir `.kiro/steering/design-system.md`. Criar em `globals.css` os estilos da chamada, dos alertas e dos blocos de frequência usados por todos os componentes de presença. Criar `status-presenca` (rótulo e ícone por status) e `chamada-form` (cliente): uma coluna de linhas, grupo de rádios nativos por inscrito, área de toque mínima de 44 px, "Marcar todos como presentes", totais por status atualizados ao marcar, faltantes destacados e marcações mantidas depois de erro.
  - Pronto quando: os testes de componente mostram a lista sem nenhum status pré-selecionado, "Marcar todos como presentes" marcando todos, os totais mudando ao marcar, os faltantes destacados com a mensagem, as marcações mantidas após um estado de erro, cada status com texto e ícone, e a navegação só com teclado entre os rádios.
  - _Boundary: components/presenca, globals.css_
  - _Requirements: 2.2, 2.4, 2.7, 3.1, 4.9, 10.2, 10.3, 10.4, 10.6_

- [ ] 5.2 Criar a lista de visitantes, a busca de visitante e a lista de quem ainda não viu o tema
  - `lista-visitantes` com a turma de origem e a remoção com `Confirmacao`, `busca-visitante` (formulário GET por nome com confirmação) e `sem-tema-do-encontro`.
  - Pronto quando: os testes de componente mostram o visitante identificado como "Visitante" com a turma de origem e separado dos inscritos, a busca exibindo só nome e turma de origem, o estado vazio da busca, a confirmação nomeando o visitante antes de remover e a lista dos inscritos que ainda não cumpriram o tema.
  - _Depends: 5.1_
  - _Boundary: components/presenca_
  - _Requirements: 4.2, 4.3, 4.6, 4.9, 8.5_

- [ ] 5.3 Criar o resumo da chamada e o bloco da chamada de hoje
  - `resumo-chamada` ("N presentes · N ausentes · N justificados · N visitantes") e `chamada-de-hoje`, que destaca o encontro de hoje ainda sem chamada com o link para fazê-la.
  - Pronto quando: os testes de componente mostram o resumo só para encontro realizado, o bloco aparecendo apenas com encontro planejado de hoje, o link para a chamada e a ausência do bloco em turma encerrada.
  - _Depends: 5.2_
  - _Boundary: components/presenca_
  - _Requirements: 2.8, 6.3_

- [ ] 5.4 Criar o bloco de frequência da turma
  - `frequencia-turma`: percentual da turma, quantidade de catequizandos em alerta e tabela dos inscritos vigentes com percentual, contagens e "Baixa frequência" (texto e ícone), com ordenação por nome ou por menor frequência.
  - Pronto quando: os testes de componente mostram "Sem encontros registrados" no lugar do percentual, o alerta só para quem está abaixo do limite, a ordenação por menor frequência com sem-encontros por último, o texto do alerta além da cor e o bloco consultável numa turma encerrada.
  - _Depends: 5.3_
  - _Boundary: components/presenca_
  - _Requirements: 5.4, 5.5, 6.2, 6.4, 6.5, 7.4, 7.9_

- [ ] 5.5 Criar o bloco de frequência da ficha do catequizando
  - `frequencia-catequizando`: frequência por turma com a turma atual em destaque, lista das presenças (data, tema e status, a mais recente primeiro) e progresso "{cumpridos} de {total} temas" com temas pendentes e a origem de cada cumprimento.
  - Pronto quando: os testes de componente mostram a frequência de cada turma em que esteve inscrito, a turma atual em destaque, as presenças em ordem decrescente com datas e horários no formato brasileiro, o tema cumprido por reposição identificado com a turma visitada e a lista de pendentes na ordem do programa.
  - _Depends: 5.4_
  - _Boundary: components/presenca_
  - _Requirements: 5.6, 5.7, 8.2, 8.3, 10.5_

- [ ] 5.6 Criar a lista de alertas e o formulário do limite
  - `alertas-frequencia` (nome, turma, percentual, contagens, em ordem crescente, com estado vazio positivo e alerta por texto e ícone) e `formulario-limite` (campo do limite com erro junto ao campo).
  - Pronto quando: os testes de componente mostram a lista ordenada, a mensagem positiva quando ninguém está em alerta, o limite em vigor exibido, o erro do campo com valor inválido e o formulário ausente para quem não é coordenação.
  - _Depends: 5.5_
  - _Boundary: components/presenca_
  - _Requirements: 7.2, 7.3, 7.6, 7.7, 7.8, 7.9, 7.10_

- [ ] 6. Páginas e integração

- [ ] 6.1 Criar a página de chamada e as rotas dos dois papéis
  - Criar `PaginaChamada` em `_presenca/paginas.tsx` (turma, data com dia da semana, horário e tema no topo; formulário de chamada; visitantes; quem ainda não viu o tema; mensagem de indisponibilidade com o motivo) e as rotas `coordenacao` e `catequista` de `…/encontros/[encontroId]/chamada`, cada uma com `requireRole` e o caminho exato.
  - Pronto quando: os testes de integração e de componente mostram a página abrindo para o catequista responsável e para a coordenação, "Acesso negado" para o catequista de outra turma, os inscritos listados sem status em encontro planejado até hoje, os status preenchidos em encontro realizado, o motivo exibido para cancelado, data futura e turma encerrada, e encontro de outra turma na URL resultando em não encontrado.
  - _Depends: 5.2, 4.1_
  - _Boundary: app/_presenca, rotas de chamada_
  - _Requirements: 1.4, 2.1, 2.5, 2.7, 3.1, 3.5, 9.1, 10.1, 10.5_

- [ ] 6.2 Criar a página de visitantes e as rotas dos dois papéis
  - Criar `PaginaVisitantes` (busca, lista de visitantes e remoção) e as rotas de `…/chamada/visitantes`, ligadas à chamada por um link que só aparece quando a ação "Adicionar visitante" é permitida.
  - Pronto quando: os testes mostram a página recusando encontro sem tema e turma encerrada com a mensagem do motivo, o link na chamada aparecendo só com tema, a busca e o registro funcionando pelo formulário e o catequista sem acesso à turma enviado a "Acesso negado".
  - _Depends: 6.1, 4.2_
  - _Boundary: app/_presenca, rotas de visitantes_
  - _Requirements: 4.1, 4.4, 4.9_

- [ ] 6.3 Criar a área "Frequência" e as rotas dos dois papéis
  - Criar `PaginaFrequencia` com o limite em vigor, a lista de alertas (todas as turmas abertas para a coordenação; só as turmas do catequista) e, só para a coordenação, o formulário do limite; criar as rotas `coordenacao/frequencia` e `catequista/frequencia`.
  - Pronto quando: os testes mostram a coordenação vendo alertas de todas as turmas e o formulário, o catequista vendo só as suas turmas e nenhum formulário, e o limite alterado refletido nos alertas na mesma carga seguinte.
  - _Depends: 5.6, 4.3_
  - _Boundary: app/_presenca, rotas de frequência_
  - _Requirements: 1.2, 7.6, 7.7, 7.10, 7.11, 10.1_

- [ ] 6.4 Incluir o item "Frequência" no menu
  - Acrescentar "Frequência" ao menu da coordenação e do catequista, atualizando os testes do menu e do app-shell.
  - Pronto quando: os testes de `menu-por-papel` e de `app-shell` mostram o item "Frequência" com o destino do papel para os dois perfis, e a rota de cada papel abre com o menu ativo.
  - _Depends: 6.3_
  - _Boundary: components/layout_
  - _Requirements: 7.12_

- [ ] 6.5 Integrar a chamada ao cronograma da turma
  - Acrescentar a `components/programa/cronograma.tsx` a prop opcional `complemento`, renderizada em cada linha sem alterar o comportamento atual quando ausente, e usá-la em `_encontros/paginas.tsx` para exibir o link "Fazer chamada" (ou "Corrigir chamada") e o resumo de cada encontro realizado.
  - Pronto quando: os testes de componente do programa seguem verdes sem a prop, o cronograma mostra o link de chamada para encontros disponíveis, o resumo de presentes, ausentes, justificados e visitantes nos realizados, e nenhuma ação de chamada para turma encerrada ou para quem só consulta.
  - _Depends: 5.3, 6.1_
  - _Boundary: components/programa/cronograma, app/_encontros_
  - _Requirements: 2.8, 3.4, 6.3_

- [ ] 6.6 Integrar a frequência às páginas da turma e à ficha do catequizando
  - Incluir `ChamadaDeHoje` e `FrequenciaTurma` nas páginas da turma de `coordenacao` e `catequista`, e `FrequenciaCatequizando` nas fichas de catequizando dos dois papéis, usando `autorizarCatequizando` na ficha.
  - Pronto quando: os testes de integração mostram a página da turma com o encontro de hoje destacado e a frequência da turma, a ordenação por `?ordem=`, a ficha com frequência por turma, presenças e progresso, o catequista vendo a ficha só de catequizando inscrito numa turma dele e "Acesso negado" nos demais casos.
  - _Depends: 5.5, 3.4_
  - _Boundary: app/(interno) páginas de turma e de catequizando_
  - _Requirements: 2.8, 5.5, 5.6, 6.2, 8.2_

- [ ] 7. Validação ponta a ponta

- [ ] 7.1 Testar o fluxo da chamada no celular
  - Em `tests/e2e/presenca.spec.ts`, com viewport de 360 px e o catequista autenticado: abrir o encontro de hoje, "Marcar todos como presentes", ajustar dois status, salvar, ver "Chamada salva", o encontro realizado e a frequência na página da turma; depois corrigir um status e ver "Chamada atualizada".
  - Pronto quando: o teste passa em `npm run test:e2e`, sem rolagem horizontal, e a chamada é concluída só com teclado em um segundo caso.
  - _Depends: 6.6, 6.5_
  - _Requirements: 2.2, 2.3, 2.7, 3.2, 10.2, 10.3_

- [ ] 7.2 Testar a reposição por visitante
  - O catequista de outra turma registra um visitante no encontro com tema, e o teste confirma o tema cumprido por reposição na ficha, a frequência da turma de origem inalterada com a falta mantida e a remoção do visitante desfazendo o cumprimento.
  - Pronto quando: o teste e2e passa, e a busca mostra apenas nome e turma de origem do catequizando de outra turma.
  - _Depends: 7.1_
  - _Requirements: 4.2, 4.3, 4.6, 4.7, 8.1, 8.3, 8.7_

- [ ] 7.3 Testar o limite, os alertas e o acesso
  - A coordenação muda o limite para 100 e os catequizandos com qualquer falta aparecem em "Frequência" com "Baixa frequência"; o catequista vê só os alertas das suas turmas e recebe "Acesso negado" ao abrir a chamada de turma alheia; a turma encerrada permite consultar a frequência e não oferece chamada.
  - Pronto quando: o teste e2e passa cobrindo esses quatro comportamentos.
  - _Depends: 7.2_
  - _Requirements: 1.4, 7.2, 7.4, 7.6, 7.7, 9.1_

## Implementation Notes
- 3.1: `adicionarVisitante` (repositório) não confere que o encontro pertence à turma nem se o catequizando já era inscrito na data; as ações 4.2 devem validar com `dadosDoEncontro` e `inscritosNaData` antes de chamá-lo.
- 3.1: `salvarChamada` ignora marcações de quem já é visitante no encontro e não apaga presenças; em modo `nova` faz a transição condicional antes dos upserts, dentro da transação.
- 3.1: o índice `inscricao_vigente_unica` permite uma só inscrição vigente por catequizando; nos testes, "já consta como inscrito" usa inscrição com saída posterior à data do encontro.
