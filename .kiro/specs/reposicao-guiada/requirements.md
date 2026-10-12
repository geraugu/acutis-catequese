# Requirements Document

## Project Description (Input)
**Quem tem o problema:** a coordenação e os catequistas, que acompanham catequizandos adultos faltosos; e o próprio catequizando, que precisa repor temas perdidos.

**Situação atual:** o progresso do catequizando já mostra os temas cumpridos e pendentes, e a reposição como visitante já existe, mas é feita de forma manual, encontro a encontro: o catequista da turma visitada busca o aluno na chamada. Não há como saber, a partir do aluno, em quais turmas e datas futuras cada tema pendente será trabalhado. As turmas de um ciclo repõem nas do outro (Cristo Rei ↔ Páscoa) e também no dia seguinte da mesma caminhada (segunda ↔ terça).

**O que deve mudar:** oferecer a visão "o que falta" de cada catequizando, listando para cada tema pendente as turmas e datas futuras (encontros planejados com aquele tema, em turmas abertas) em que ele pode repor, e permitir agendar a reposição como visitante a partir dessa visão.

**Decisões de escopo (2026-10-12):**
- **Agendar = reserva prévia:** a coordenação ou o catequista reserva para o catequizando um encontro futuro de outra turma. A reserva aparece na chamada da turma visitada, e o catequista confirma presente ou ausente no dia. Antes disso, a reserva pode ser cancelada.
- **Acesso:** a coordenação vê e reserva para todos os catequizandos; o catequista, só para os catequizandos das turmas em que é responsável.

## Introduction
Esta spec entrega a **reposição guiada**: a visão "o que falta" de cada catequizando, que lista os temas que ele precisa repor e, para cada um, as turmas e datas futuras em que pode fazê-lo, e a **reserva** do encontro de reposição. Ela se apoia no progresso por tema e no visitante já entregues em `controle-presenca`, e não altera a frequência nem o alerta.

Ao longo do documento:
- **tema a repor** é um tema ativo ainda não cumprido pelo catequizando que já foi trabalhado em encontro realizado da turma em que ele está inscrito;
- **tema cumprido**, **visitante**, **frequência**, **turma aberta**, **encontro planejado** e **encontro realizado** têm o sentido definido em `controle-presenca`, `gestao-turmas` e `programa-catequese`;
- **turma de origem** é a turma em que o catequizando tem inscrição vigente;
- **opção de reposição** é um encontro planejado, com o tema a repor, numa turma aberta diferente da de origem e com data igual ou posterior à data atual;
- **reserva** é a escolha de uma opção de reposição para um catequizando, com situação reservada, compareceu, não compareceu ou cancelada.

## Boundary Context
- **In scope**:
  - visão "o que falta" por catequizando, com os temas a repor e suas opções de reposição;
  - reserva e cancelamento da reposição;
  - exibição da reserva na chamada da turma visitada e confirmação de comparecimento;
  - efeito de encontro cancelado, saída do catequizando e encerramento de turma sobre as reservas.
- **Out of scope**:
  - criar ou alterar encontros, temas e inscrições (`programa-catequese`, `gestao-turmas`);
  - notificações automáticas ao catequizando ou ao catequista;
  - limite de vagas em encontros de reposição;
  - acesso do próprio catequizando à visão (não há conta de acesso para catequizandos);
  - relatório consolidado de reposições pendentes por turma.
- **Adjacent expectations**:
  - A presença como visitante continua sendo a de `controle-presenca`: marca o tema como cumprido e não entra em nenhuma frequência, e a reposição não tira ninguém do alerta de baixa frequência.
  - A regra de acesso por turma continua valendo; a única leitura nova de dados de outras turmas é a de nome, data, horário e tema dos encontros que são opções de reposição, e a do nome e da turma de origem do catequizando com reserva na chamada.
  - O registro direto de visitante na chamada, sem reserva, continua existindo.

## Requirements

### Requirement 1: Acesso
**Objective:** Como coordenação, quero que cada pessoa veja e reserve só o que lhe cabe, para proteger os dados dos catequizandos.

#### Acceptance Criteria
1. The Sistema shall permitir que a coordenação veja a visão "o que falta" e reserve ou cancele reposições de qualquer catequizando.
2. The Sistema shall permitir que o catequista veja a visão "o que falta" e reserve ou cancele reposições apenas de catequizandos com inscrição vigente em turma em que ele é responsável.
3. If o catequista tentar acessar a visão de catequizando fora das suas turmas, then the Sistema shall negar o acesso sem revelar dados do catequizando.
4. The Sistema shall exigir usuário autenticado para a visão e para a reserva.

### Requirement 2: Temas a repor
**Objective:** Como coordenação ou catequista, quero ver o que falta para cada catequizando, para saber quais temas ele ainda precisa repor.

#### Acceptance Criteria
1. When a coordenação ou o catequista abrir a visão de um catequizando, the Sistema shall listar os temas a repor na ordem do programa, com o número e o título de cada tema.
2. The Sistema shall considerar tema a repor apenas o tema ativo que já foi trabalhado em encontro realizado da turma de origem e que o catequizando ainda não cumpriu, na própria turma ou como visitante.
3. The Sistema shall tratar como cumprido o tema em que o catequizando tem presença como presente em encontro realizado, inclusive como visitante.
4. The Sistema shall não listar como tema a repor um tema que ainda não foi trabalhado na turma de origem.
5. When o catequizando não tiver tema a repor, the Sistema shall informar que não há reposição pendente.
6. While o catequizando não tiver inscrição vigente em turma, the Sistema shall informar que não há turma de origem e não listar temas a repor.

### Requirement 3: Opções de reposição
**Objective:** Como coordenação ou catequista, quero ver em que turmas e datas cada tema pode ser reposto, para escolher o encontro mais conveniente.

#### Acceptance Criteria
1. When a visão listar um tema a repor, the Sistema shall exibir as suas opções de reposição em ordem crescente de data, com nome da turma, dia da semana, data e horário.
2. The Sistema shall considerar opção de reposição apenas encontro planejado, com o tema a repor, em turma aberta diferente da turma de origem e com data igual ou posterior à data atual.
3. The Sistema shall incluir como opção tanto turmas de outro ciclo quanto outras turmas do mesmo ciclo, como a do dia seguinte.
4. The Sistema shall não exibir como opção um encontro em que o catequizando já tenha presença ou reserva ativa.
5. If um tema a repor não tiver nenhuma opção de reposição, then the Sistema shall informar que não há encontro futuro com esse tema.
6. While um tema a repor tiver reserva ativa, the Sistema shall exibir a reserva (turma, data e horário) em destaque no lugar das opções.

### Requirement 4: Reserva da reposição
**Objective:** Como coordenação ou catequista, quero reservar o encontro de reposição para o catequizando, para que a turma visitada saiba que ele virá.

#### Acceptance Criteria
1. When a coordenação ou o catequista reservar uma opção de reposição, the Sistema shall registrar a reserva como reservada e exibi-la na visão do catequizando.
2. The Sistema shall permitir no máximo uma reserva ativa por tema a repor de cada catequizando.
3. If o catequizando já tiver reserva ativa ou encontro da própria turma na data da opção, then the Sistema shall recusar a reserva e informar o conflito de data.
4. If a opção deixar de estar disponível antes de a reserva ser confirmada (encontro cancelado, realizado, turma encerrada ou data passada), then the Sistema shall recusar a reserva e informar que a opção não está mais disponível.
5. When a coordenação ou o catequista da turma de origem cancelar uma reserva reservada, the Sistema shall marcá-la como cancelada e voltar a exibir as opções do tema.
6. The Sistema shall não alterar a inscrição, a frequência nem o alerta de baixa frequência do catequizando ao reservar ou cancelar.

### Requirement 5: Reserva na chamada da turma visitada
**Objective:** Como catequista da turma visitada, quero ver quem virá repor e confirmar o comparecimento, para que a presença do visitante seja registrada corretamente.

#### Acceptance Criteria
1. While o encontro tiver reservas ativas, the Sistema shall exibir na chamada, separado dos inscritos, cada catequizando com reserva, com o nome e a turma de origem.
2. When o catequista ou a coordenação confirmar o comparecimento de um catequizando com reserva, the Sistema shall registrá-lo como visitante presente e marcar a reserva como compareceu.
3. When o catequista ou a coordenação marcar a ausência de um catequizando com reserva, the Sistema shall marcar a reserva como não compareceu, manter o tema como a repor e não registrar presença em nenhuma frequência.
4. When a chamada for salva com reserva ainda sem confirmação, the Sistema shall marcar essa reserva como não compareceu.
5. The Sistema shall não contar o visitante nem a reserva na frequência da turma visitada nem na da turma de origem.
6. The Sistema shall continuar permitindo registrar visitante diretamente na chamada, sem reserva prévia.

### Requirement 6: Mudanças que afetam a reserva
**Objective:** Como coordenação, quero que as reservas acompanhem as mudanças de encontros e turmas, para não manter reposição que não pode mais acontecer.

#### Acceptance Criteria
1. When o encontro de uma reserva ativa for cancelado, the Sistema shall marcar a reserva como cancelada e voltar a exibir as opções do tema.
2. When o catequizando sair da turma de origem, for inativado ou a turma visitada for encerrada, the Sistema shall cancelar as suas reservas ativas.
3. When o encontro de uma reserva ativa tiver o tema trocado ou retirado, the Sistema shall cancelar a reserva e informar o motivo na visão do catequizando.
4. The Sistema shall manter na visão do catequizando o histórico das reservas, com situação, turma, data e, quando cancelada, o motivo.

### Requirement 7: Uso pelo celular
**Objective:** Como catequista, quero consultar e reservar pelo celular, para resolver a reposição na própria turma.

#### Acceptance Criteria
1. The Sistema shall exibir a visão "o que falta", as opções e a reserva de forma utilizável em tela de celular, sem rolagem horizontal.
2. When uma reserva for criada ou cancelada, the Sistema shall confirmar o resultado ao usuário e atualizar a visão sem exigir recarregar a página.
