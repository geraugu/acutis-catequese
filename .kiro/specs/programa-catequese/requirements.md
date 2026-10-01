# Requirements Document

## Project Description (Input)
**Quem tem o problema:** a coordenação e os catequistas da catequese de adultos. Eles planejam os encontros de cada turma, mas o programa da catequese (a sequência de temas e os encontros em que cada tema é dado) não é registrado no sistema.

**Situação atual:** a v0.4.0 entregou a gestão de turmas, com catequistas responsáveis, inscrições e a regra de acesso por turma. As turmas ainda não têm encontros, e não existe um programa de temas.

**O que deve mudar:**
- A coordenação mantém o **programa comum**: uma lista única e ordenada de temas, com título e descrição, seguida por todas as turmas.
- Cada turma ganha um cronograma de encontros, com data, horário e o tema do programa trabalhado. O encontro tem situação planejado, realizado ou cancelado.
- A coordenação gerencia os encontros de todas as turmas. O catequista gerencia os encontros das turmas em que é responsável, usando a regra de acesso por turma de `gestao-turmas`.
- A listagem é cronológica, com os próximos encontros em destaque.
- Como os encontros apontam para um tema do programa, encontros de turmas diferentes sobre o mesmo tema ficam identificáveis como equivalentes. A spec `controle-presenca` vai usar isso para a reposição de temas em outra turma.

**Fora do escopo:** registro de presença e reposição (`controle-presenca`), materiais e anexos, integração com calendário externo.

**Decisões de escopo (2026-10-01):**
- **Programa comum:** substitui o item "biblioteca de temas reutilizável entre turmas" que o brief deixava fora do escopo. O programa é único, não varia por ciclo.
- **Quem edita:** a coordenação em todas as turmas; o catequista nas turmas em que é responsável. Diferente de `gestao-turmas`, em que o catequista só consulta.
- **Realizado:** a coordenação ou o catequista marca o encontro como realizado; não há mudança automática pela data.
- **Tema opcional:** um encontro pode não ter tema do programa (retiro, celebração). Só encontros com tema contam para o programa.
- **Retirar tema:** tema já usado em encontros só pode ser desativado; tema nunca usado pode ser excluído.
- **Tema repetido na turma:** permitido, com aviso e confirmação.

## Introduction
Esta spec registra o **programa da catequese**. A coordenação mantém uma lista única e ordenada de temas, seguida por todas as turmas. Cada turma ganha um cronograma de encontros, com data, horário, tema do programa (opcional) e situação. A coordenação gerencia os encontros de todas as turmas, e o catequista gerencia os das turmas em que é responsável.

Ao longo do documento:
- **programa** é a lista única e ordenada de temas da catequese;
- **tema ativo** é um tema do programa que pode ser escolhido para novos encontros;
- **encontro** é uma reunião de uma turma numa data, com situação planejado, realizado ou cancelado;
- **turma aberta**, **catequista responsável** e **regra de acesso por turma** têm o sentido definido em `gestao-turmas`.

## Boundary Context
- **In scope**:
  - cadastro, edição, ordenação, desativação e exclusão de temas do programa;
  - criação, edição, cancelamento, marcação como realizado e listagem de encontros por turma;
  - progresso da turma no programa;
  - consulta do programa e dos encontros pelos catequistas;
  - identificação de encontros equivalentes (mesmo tema) entre turmas.
- **Out of scope**:
  - chamada, frequência e reposição de temas (`controle-presenca`);
  - materiais e anexos;
  - integração com calendário externo;
  - programas diferentes por ciclo ou por turma;
  - mudança automática de situação pela data.
- **Adjacent expectations**:
  - A regra de acesso por turma vem de `gestao-turmas` e continua valendo: o catequista só vê e gerencia encontros das turmas em que é responsável.
  - A spec `controle-presenca` vai registrar presença em encontros e usar o tema para reconhecer a reposição em outra turma. Esta spec só garante que encontros sobre o mesmo tema sejam identificáveis.
  - Uma turma encerrada (`gestao-turmas`) fica só para consulta, inclusive seus encontros.

## Requirements

### Requirement 1: Acesso
**Objective:** Como coordenação, quero que cada pessoa gerencie só o que lhe cabe, para manter o programa e os cronogramas confiáveis.

#### Acceptance Criteria
1. The Sistema shall permitir que somente a coordenação crie, edite, ordene, desative e exclua temas do programa.
2. The Sistema shall permitir que a coordenação e o catequista consultem o programa.
3. The Sistema shall permitir que a coordenação gerencie os encontros de todas as turmas, e que o catequista gerencie os encontros das turmas em que é responsável.
4. If um catequista acessar ou acionar encontros de uma turma em que não é responsável, the Sistema shall exibir a página de "Acesso negado" sem alterar nenhum dado.
5. If uma ação de gestão do programa ou de encontros for acionada diretamente, sem passar pela interface, por um usuário sem permissão, the Sistema shall rejeitá-la sem alterar nenhum dado.
6. The Sistema shall disponibilizar o item de menu "Programa" para a coordenação e para o catequista.

### Requirement 2: Temas do programa
**Objective:** Como coordenação, quero manter a lista de temas da catequese, para que todas as turmas sigam o mesmo programa.

#### Acceptance Criteria
1. When a coordenação enviar um tema com título válido, the Sistema shall criá-lo como tema ativo no fim do programa e exibir a confirmação "Tema criado".
2. The Sistema shall exigir título (de 2 a 120 caracteres) e tratar a descrição (até 2000 caracteres) como opcional.
3. If algum campo for inválido, the Sistema shall impedir o salvamento e exibir, junto ao campo, uma mensagem em pt-BR indicando o problema.
4. If já existir outro tema com o mesmo título, sem diferenciar maiúsculas, minúsculas nem acentos, the Sistema shall impedir o salvamento e informar que o título já está em uso.
5. When a coordenação salvar alterações válidas num tema, the Sistema shall atualizá-lo, refletir o novo título e a nova descrição em todos os encontros que o usam e exibir a confirmação "Alterações salvas".
6. When a coordenação mover um tema para cima ou para baixo, the Sistema shall atualizar a posição dele no programa e manter a numeração dos temas contínua a partir de 1.
7. The Sistema shall exibir o programa em ordem, com número, título, descrição, situação (ativo ou desativado) e a quantidade de encontros que usam cada tema.

### Requirement 3: Desativação e exclusão de temas
**Objective:** Como coordenação, quero retirar temas do programa sem perder o histórico dos encontros.

#### Acceptance Criteria
1. When a coordenação confirmar a desativação de um tema, the Sistema shall marcá-lo como desativado, deixar de oferecê-lo para novos encontros e mantê-lo nos encontros existentes.
2. When a coordenação reativar um tema desativado, the Sistema shall voltar a oferecê-lo para novos encontros.
3. When a coordenação confirmar a exclusão de um tema que nunca foi usado em encontros, the Sistema shall removê-lo do programa e exibir a confirmação "Tema excluído".
4. If a coordenação tentar excluir um tema usado em algum encontro, the Sistema shall impedir a exclusão e oferecer a desativação.
5. The Sistema shall pedir confirmação explícita antes de desativar ou excluir um tema, nomeando o tema.
6. The Sistema shall exibir os temas desativados ao fim do programa, identificados como "Desativado", e não contá-los no progresso das turmas.

### Requirement 4: Cadastro e edição de encontro
**Objective:** Como coordenação ou catequista, quero planejar os encontros da turma, para organizar o cronograma.

#### Acceptance Criteria
1. When um usuário autorizado enviar um encontro com data válida numa turma aberta, the Sistema shall criá-lo como planejado e exibir a confirmação "Encontro criado".
2. The Sistema shall exigir a data, preencher o horário com o horário da turma (que o usuário pode alterar), e tratar tema e observações (até 2000 caracteres) como opcionais.
3. The Sistema shall oferecer como tema apenas temas ativos, na ordem do programa, além da opção "Sem tema do programa".
4. If algum campo for inválido, the Sistema shall impedir o salvamento e exibir, junto ao campo, uma mensagem em pt-BR indicando o problema.
5. If a turma já tiver outro encontro não cancelado com o mesmo tema, the Sistema shall não gravar e exibir o aviso "Este tema já tem encontro nesta turma em {data}" com a opção "Salvar mesmo assim".
6. When o usuário confirmar "Salvar mesmo assim", the Sistema shall gravar o encontro normalmente.
7. If a turma já tiver outro encontro não cancelado na mesma data e horário, the Sistema shall impedir o salvamento e informar que já existe um encontro nesse horário.
8. When um usuário autorizado salvar alterações válidas num encontro planejado, the Sistema shall atualizá-lo e exibir a confirmação "Alterações salvas".
9. While o encontro estiver com um tema desativado, the Sistema shall manter esse tema na edição do encontro, identificado como "Desativado".

### Requirement 5: Situação do encontro
**Objective:** Como coordenação ou catequista, quero registrar o que aconteceu com cada encontro, para acompanhar o andamento do programa.

#### Acceptance Criteria
1. When um usuário autorizado marcar como realizado um encontro planejado com data igual ou anterior à data atual, the Sistema shall mudar a situação para realizado e exibir a confirmação "Encontro realizado".
2. If o usuário tentar marcar como realizado um encontro com data futura, the Sistema shall impedir a mudança e informar que o encontro ainda não aconteceu.
3. When um usuário autorizado confirmar o cancelamento de um encontro planejado, the Sistema shall mudar a situação para cancelado, registrar o motivo opcional informado e exibir a confirmação "Encontro cancelado".
4. When um usuário autorizado reabrir um encontro realizado ou cancelado, the Sistema shall voltar a situação para planejado e exibir a confirmação "Encontro reaberto".
5. The Sistema shall pedir confirmação explícita antes de cancelar ou reabrir um encontro, nomeando a data e o tema.
6. While um encontro planejado tiver data anterior à data atual, the Sistema shall sinalizá-lo como "Aguardando confirmação".
7. The Sistema shall permitir editar data, horário, tema e observações apenas de encontros planejados.
8. The Sistema shall nunca excluir um encontro; um encontro cancelado permanece no cronograma.

### Requirement 6: Cronograma da turma
**Objective:** Como coordenação ou catequista, quero ver os encontros da turma em ordem, para saber o que vem a seguir.

#### Acceptance Criteria
1. When um usuário autorizado abrir o cronograma de uma turma, the Sistema shall listar os encontros em ordem cronológica, com data, horário, número e título do tema (ou "Sem tema do programa") e situação.
2. The Sistema shall destacar o próximo encontro planejado com data igual ou posterior à data atual, identificado como "Próximo encontro".
3. The Sistema shall exibir, na página da turma, o próximo encontro com link para o cronograma.
4. The Sistema shall exibir o progresso da turma no programa no formato "{realizados} de {total} temas", contando os temas ativos com pelo menos um encontro realizado na turma.
5. When o usuário escolher ver os temas pendentes, the Sistema shall listar os temas ativos do programa que ainda não têm encontro realizado na turma, na ordem do programa.
6. If a turma não tiver encontros, the Sistema shall exibir uma mensagem de estado vazio com a opção de criar o primeiro encontro para quem pode gerenciar.
7. Where o usuário não puder gerenciar os encontros da turma, the Sistema shall exibir o cronograma sem nenhuma ação de alteração.

### Requirement 7: Turma encerrada
**Objective:** Como coordenação, quero que o cronograma de uma turma encerrada fique preservado, para consulta futura.

#### Acceptance Criteria
1. While a turma estiver encerrada, the Sistema shall impedir criar, editar, cancelar, reabrir e marcar como realizado os encontros dela.
2. While a turma estiver encerrada, the Sistema shall manter o cronograma e o progresso consultáveis.

### Requirement 8: Encontros equivalentes
**Objective:** Como coordenação, quero saber em que turmas cada tema é dado, para apoiar a reposição de temas entre turmas.

#### Acceptance Criteria
1. The Sistema shall tratar como equivalentes os encontros de turmas diferentes que trabalham o mesmo tema do programa.
2. When a coordenação abrir um tema do programa, the Sistema shall listar os encontros não cancelados de todas as turmas abertas com esse tema, com turma, data, horário e situação, em ordem cronológica.
3. The Sistema shall não tratar como equivalentes encontros sem tema do programa.

### Requirement 9: Interface
**Objective:** Como coordenação e catequista, quero usar o programa e os cronogramas no celular, para consultar durante os encontros.

#### Acceptance Criteria
1. The Sistema shall exibir todas as páginas do programa e dos encontros em pt-BR, seguindo o design system do projeto.
2. The Sistema shall tornar todas as páginas do programa e dos encontros operáveis apenas com o teclado.
3. The Sistema shall exibir todas as páginas do programa e dos encontros sem rolagem horizontal em telas a partir de 360 px de largura.
4. The Sistema shall exibir datas no formato brasileiro (dd/mm/aaaa), com o dia da semana, e horários no formato 24 h (por exemplo, "19:30").
