# Requirements Document

## Project Description (Input)
**Quem tem o problema:** a coordenação e os catequistas da catequese de adultos. A chamada é feita em papel e a frequência não é acompanhada, então a coordenação não identifica a tempo quem está se afastando.

**Situação atual:** a v0.6.0 entregou turmas com catequizandos inscritos (`gestao-turmas`), o programa comum de temas e os encontros de cada turma, com situação planejado, realizado ou cancelado (`programa-catequese`).

**O que deve mudar:**
- O catequista registra a presença (presente, ausente ou justificado) de cada catequizando da turma em um encontro, inclusive pelo celular, e pode corrigir a chamada depois.
- O sistema calcula o percentual de frequência por catequizando e por turma e destaca quem está abaixo de um limite.
- Todas as turmas seguem o mesmo programa. Quando o catequizando falta, ele deve repor o tema assistindo ao encontro de outra turma. O catequista dessa outra turma registra o catequizando como **visitante**.

**Fora do escopo:** exportação e relatórios em PDF, notificações automáticas, check-in por QR code, relatórios avançados e certificados.

**Decisões de escopo (2026-10-05):**
- **Justificado:** conta como ausência no percentual de frequência. O status serve de registro (o motivo da falta é conhecido), mas não melhora o percentual.
- **Limite:** um único limite para todo o sistema, com padrão de 75%, editável pela coordenação.
- **Quando fazer a chamada:** só em encontro planejado com data igual ou anterior à data atual, em turma aberta. Salvar a chamada marca o encontro como realizado.
- **Visitante e a falta de origem:** a falta no encontro da própria turma continua valendo na frequência. A presença como visitante só marca o tema como cumprido no programa do catequizando e não entra em nenhuma frequência (da turma visitada nem da de origem).
- **Alerta:** olha somente a frequência na própria turma. Reposição não tira ninguém do alerta; ela aparece à parte, no progresso do programa.

## Introduction
Esta spec registra a **presença** nos encontros e acompanha a **frequência** dos catequizandos. O catequista faz a chamada do encontro da sua turma, a coordenação faz a de qualquer turma, e o sistema calcula o percentual de frequência e alerta quando ele fica abaixo do limite. A spec também registra os **visitantes**, catequizandos de outra turma que repõem um tema.

Ao longo do documento:
- **chamada** é o conjunto de presenças de um encontro;
- **inscrito da turma** é o catequizando com inscrição vigente na turma na data do encontro (`gestao-turmas`);
- **presença** é o registro de um catequizando num encontro, com um dos status presente, ausente ou justificado;
- **visitante** é um catequizando inscrito em outra turma aberta que assiste ao encontro para repor o tema, e é registrado só como presente;
- **frequência** é o percentual `presentes ÷ (presentes + ausentes + justificados)`, calculado sobre os encontros realizados da turma em que o catequizando constava na chamada;
- **limite de frequência** é o percentual mínimo esperado; abaixo dele o catequizando fica em alerta;
- **tema cumprido** é um tema ativo do programa em que o catequizando esteve presente, na própria turma ou como visitante;
- **turma aberta**, **catequista responsável**, **encontro realizado** e **regra de acesso por turma** têm o sentido definido em `gestao-turmas` e `programa-catequese`.

## Boundary Context
- **In scope**:
  - chamada por encontro, com correção posterior;
  - registro de visitantes para reposição de tema;
  - frequência por catequizando e por turma;
  - limite de frequência configurável e alerta de baixa frequência;
  - tema cumprido e temas pendentes por catequizando, incluindo reposições.
- **Out of scope**:
  - criação, edição, cancelamento e reabertura de encontros, e cadastro de temas (`programa-catequese`);
  - inscrição e desligamento de catequizandos (`gestao-turmas`);
  - exportação ou PDF, notificações automáticas, check-in por QR code;
  - relatórios avançados e certificados;
  - alerta por temas pendentes, sem relação com o percentual.
- **Adjacent expectations**:
  - A regra de acesso por turma continua valendo: o catequista só vê e faz chamada nas turmas em que é responsável.
  - Esta spec abre uma única exceção de leitura: ao registrar um visitante, o catequista vê o nome e a turma de origem de catequizandos de outras turmas abertas, e nada mais da ficha deles.
  - Inativar catequizando, encerrar turma e reabrir encontro são decididos por outras specs; aqui só se define o efeito sobre as presenças e a frequência.
  - A situação "realizado" do encontro continua pertencendo a `programa-catequese`; esta spec apenas a aciona ao salvar a chamada.

## Requirements

### Requirement 1: Acesso
**Objective:** Como coordenação, quero que cada pessoa registre e consulte só o que lhe cabe, para manter a chamada confiável e proteger os dados dos catequizandos.

#### Acceptance Criteria
1. The Sistema shall permitir que a coordenação faça e corrija a chamada de encontros de todas as turmas, e que o catequista faça e corrija a chamada dos encontros das turmas em que é responsável.
2. The Sistema shall permitir que a coordenação consulte a frequência de todas as turmas e que o catequista consulte a das turmas em que é responsável.
3. The Sistema shall permitir que somente a coordenação altere o limite de frequência.
4. If um catequista acessar a chamada ou a frequência de uma turma em que não é responsável, the Sistema shall exibir a página de "Acesso negado" sem alterar nenhum dado.
5. If uma ação de chamada, de visitante ou de limite for acionada diretamente, sem passar pela interface, por um usuário sem permissão, the Sistema shall rejeitá-la sem alterar nenhum dado.

### Requirement 2: Chamada do encontro
**Objective:** Como catequista, quero registrar a presença de cada catequizando no encontro, para substituir a chamada em papel.

#### Acceptance Criteria
1. When um usuário autorizado abrir a chamada de um encontro planejado, com data igual ou anterior à data atual, de uma turma aberta, the Sistema shall listar os inscritos da turma em ordem alfabética, sem nenhum status pré-selecionado.
2. The Sistema shall permitir marcar cada inscrito como presente, ausente ou justificado, e oferecer a ação "Marcar todos como presentes".
3. When um usuário autorizado salvar uma chamada com todos os inscritos marcados, the Sistema shall registrar as presenças, marcar o encontro como realizado e exibir a confirmação "Chamada salva".
4. If algum inscrito não estiver marcado, the Sistema shall impedir o salvamento, indicar quais inscritos faltam e não alterar nenhum dado.
5. If o encontro estiver cancelado, tiver data futura ou for de uma turma encerrada, the Sistema shall não oferecer a chamada e informar o motivo.
6. If a turma não tiver inscritos na data do encontro, the Sistema shall impedir salvar a chamada e informar que não há catequizandos para registrar.
7. The Sistema shall exibir, no topo da chamada, a turma, a data, o horário e o tema do encontro (ou "Sem tema do programa") e, ao lado de cada status, o total de marcados por status.
8. The Sistema shall oferecer o acesso à chamada a partir do cronograma da turma e da página da turma, destacando o encontro de hoje que ainda não teve chamada.

### Requirement 3: Correção da chamada
**Objective:** Como catequista, quero corrigir uma chamada já salva, para ajustar erros sem perder o histórico.

#### Acceptance Criteria
1. When um usuário autorizado abrir a chamada de um encontro realizado de uma turma aberta, the Sistema shall exibir os status já registrados e permitir alterá-los.
2. When um usuário autorizado salvar alterações válidas numa chamada, the Sistema shall atualizar as presenças, recalcular a frequência e exibir a confirmação "Chamada atualizada".
3. When um catequizando se inscrever na turma depois de a chamada ter sido salva, the Sistema shall permitir incluí-lo na correção da chamada se a inscrição dele estiver vigente na data do encontro.
4. While um encontro realizado tiver sido reaberto para planejado, the Sistema shall manter as presenças já registradas, não contá-las na frequência e exibi-las preenchidas na chamada seguinte.
5. If o encontro reaberto for salvo de novo, the Sistema shall tratá-lo como uma nova chamada, com as presenças preenchidas já registradas, e marcá-lo como realizado.
6. The Sistema shall nunca excluir a presença de um inscrito da turma; para desfazer um registro, o usuário altera o status.

### Requirement 4: Visitante para reposição de tema
**Objective:** Como catequista, quero registrar o catequizando de outra turma que veio repor um tema, para que a reposição conte no programa dele.

#### Acceptance Criteria
1. Where o encontro tiver tema do programa, the Sistema shall oferecer, na chamada, a ação "Adicionar visitante".
2. When o usuário buscar um visitante por nome, sem diferenciar maiúsculas, minúsculas nem acentos, the Sistema shall listar apenas catequizandos ativos com inscrição vigente em outra turma aberta, exibindo somente o nome e a turma de origem.
3. When um usuário autorizado confirmar o visitante, the Sistema shall registrá-lo como presente no encontro e exibi-lo na chamada, identificado como "Visitante" e com a turma de origem.
4. If o encontro não tiver tema do programa, the Sistema shall não oferecer o registro de visitante.
5. If o catequizando já for visitante no mesmo encontro, the Sistema shall impedir o registro duplicado e informar que ele já consta na chamada.
6. When um usuário autorizado remover um visitante da chamada, the Sistema shall excluir esse registro e recalcular o progresso do programa do catequizando.
7. The Sistema shall não incluir visitantes na frequência da turma visitada nem na da turma de origem, e não oferecer a eles os status ausente ou justificado.
8. The Sistema shall não alterar a inscrição do visitante, que continua inscrito na turma de origem.
9. When o catequista abrir a chamada de um encontro, the Sistema shall exibir os visitantes junto da lista dos inscritos, separados dela.

### Requirement 5: Frequência do catequizando
**Objective:** Como catequista ou coordenação, quero ver a frequência de cada catequizando, para saber quem está se afastando.

#### Acceptance Criteria
1. The Sistema shall calcular a frequência de um catequizando numa turma dividindo o número de presenças com status presente pelo total de registros de presente, ausente ou justificado dele nos encontros realizados dessa turma, tratando justificado como ausência.
2. The Sistema shall considerar, para cada catequizando, apenas os encontros realizados em que ele constava na chamada; encontros anteriores à sua entrada na turma não entram no cálculo.
3. The Sistema shall exibir a frequência como percentual inteiro arredondado para o inteiro mais próximo, junto da contagem de presentes, ausentes e justificados.
4. If o catequizando não tiver nenhum encontro realizado em que conste na chamada, the Sistema shall exibir "Sem encontros registrados" no lugar do percentual.
5. When um usuário autorizado abrir uma turma, the Sistema shall listar os inscritos vigentes com a frequência de cada um, com a opção de ordenar por nome ou por menor frequência.
6. When um usuário autorizado abrir a ficha de um catequizando, the Sistema shall exibir a frequência dele em cada turma em que esteve inscrito, com a turma atual em destaque.
7. When um usuário autorizado abrir a ficha de um catequizando, the Sistema shall exibir a lista das presenças dele (data, tema e status), com a mais recente primeiro.
8. The Sistema shall aplicar as mesmas regras de cálculo em todas as telas, de modo que o mesmo catequizando mostre o mesmo percentual em qualquer lugar.

### Requirement 6: Frequência da turma
**Objective:** Como catequista ou coordenação, quero ver a frequência da turma, para acompanhar a assiduidade do grupo.

#### Acceptance Criteria
1. The Sistema shall calcular a frequência da turma dividindo o total de presenças com status presente pelo total de registros de presente, ausente ou justificado de todos os catequizandos nos encontros realizados da turma, tratando justificado como ausência e excluindo visitantes.
2. When um usuário autorizado abrir a página da turma, the Sistema shall exibir a frequência da turma e a quantidade de catequizandos em alerta.
3. When um usuário autorizado abrir o cronograma de uma turma, the Sistema shall exibir, em cada encontro realizado, a quantidade de presentes, ausentes, justificados e visitantes.
4. If a turma não tiver nenhum encontro realizado com chamada, the Sistema shall exibir "Sem encontros registrados" no lugar do percentual.
5. The Sistema shall manter a frequência de uma turma encerrada consultável.

### Requirement 7: Limite e alerta de baixa frequência
**Objective:** Como coordenação, quero identificar a tempo quem está abaixo do limite, para fazer o acompanhamento pastoral.

#### Acceptance Criteria
1. The Sistema shall usar o limite de frequência de 75% até que a coordenação defina outro valor.
2. When a coordenação salvar um novo limite entre 1 e 100, em número inteiro, the Sistema shall aplicá-lo a todas as turmas e exibir a confirmação "Limite salvo".
3. If o valor do limite for vazio, não inteiro ou fora do intervalo de 1 a 100, the Sistema shall impedir o salvamento e exibir uma mensagem em pt-BR junto ao campo.
4. While a frequência de um catequizando com inscrição vigente for menor que o limite, comparada sem arredondamento, the Sistema shall sinalizá-lo como "Baixa frequência" na turma, na ficha e na lista da coordenação.
5. The Sistema shall não sinalizar catequizando sem encontros registrados.
6. When a coordenação acessar a área "Frequência", the Sistema shall listar os catequizandos em alerta de todas as turmas abertas, com nome, turma, percentual, presentes, ausentes e justificados, ordenados do menor para o maior percentual.
7. When o catequista acessar a área "Frequência", the Sistema shall listar somente os catequizandos em alerta das turmas em que é responsável.
8. If nenhum catequizando estiver em alerta, the Sistema shall exibir uma mensagem de estado vazio positiva.
9. The Sistema shall identificar o alerta por texto e ícone, e não apenas por cor.
10. The Sistema shall exibir o limite em vigor na tela da área "Frequência".
11. When a coordenação alterar o limite, the Sistema shall recalcular os alertas imediatamente.
12. The Sistema shall disponibilizar o item de menu "Frequência" para a coordenação e para o catequista.

### Requirement 8: Progresso do programa do catequizando
**Objective:** Como catequista ou coordenação, quero saber quais temas cada catequizando já cumpriu, inclusive por reposição, para orientar a reposição de quem faltou.

#### Acceptance Criteria
1. The Sistema shall considerar tema cumprido o tema ativo do programa em que o catequizando tenha presença com status presente em encontro realizado, na própria turma ou como visitante em outra turma.
2. When um usuário autorizado abrir a ficha de um catequizando, the Sistema shall exibir o progresso dele no formato "{cumpridos} de {total} temas" e a lista dos temas pendentes, na ordem do programa.
3. The Sistema shall identificar, em cada tema cumprido, se foi cumprido na turma ou por reposição, com a turma visitada e a data.
4. The Sistema shall não considerar cumprido um tema em que o catequizando só tem ausente ou justificado.
5. When um usuário autorizado abrir um encontro de uma turma, the Sistema shall oferecer a lista dos inscritos da turma que ainda não cumpriram o tema do encontro.
6. The Sistema shall não contar temas desativados no progresso.
7. The Sistema shall não alterar a frequência por causa de uma reposição, nem remover uma falta já registrada na turma de origem.

### Requirement 9: Efeitos de turma encerrada, inativação e desligamento
**Objective:** Como coordenação, quero que o histórico de presenças seja preservado quando a turma ou o cadastro mudam, para consulta futura.

#### Acceptance Criteria
1. While a turma estiver encerrada, the Sistema shall impedir fazer ou corrigir chamada e registrar ou remover visitantes nos encontros dela.
2. While um catequizando for visitante num encontro de turma encerrada, the Sistema shall manter esse registro e o tema cumprido dele.
3. When um catequizando for desligado de uma turma, transferido ou inativado, the Sistema shall preservar as presenças dele e continuar exibindo a frequência dele nessa turma na ficha.
4. When um catequizando for desligado ou inativado, the Sistema shall removê-lo da lista de inscritos vigentes e dos alertas de baixa frequência.
5. If um catequizando inativado ou desligado tiver visitas registradas, the Sistema shall manter essas visitas e o tema cumprido.
6. The Sistema shall não excluir presenças ao inativar catequizandos, desligá-los, transferi-los ou encerrar turmas.

### Requirement 10: Interface
**Objective:** Como catequista, quero fazer a chamada no celular durante o encontro, para registrar a presença na hora.

#### Acceptance Criteria
1. The Sistema shall exibir todas as páginas de chamada e de frequência em pt-BR, seguindo o design system do projeto.
2. The Sistema shall apresentar a chamada em lista de uma coluna, com os controles de status de cada catequizando acessíveis ao toque, sem rolagem horizontal em telas a partir de 360 px de largura.
3. The Sistema shall tornar todas as páginas de chamada e de frequência operáveis apenas com o teclado.
4. The Sistema shall identificar cada status de presença por texto e ícone, e não apenas por cor.
5. The Sistema shall exibir datas no formato brasileiro (dd/mm/aaaa), com o dia da semana, e horários no formato 24 h (por exemplo, "19:30").
6. If o salvamento da chamada falhar, the Sistema shall exibir uma mensagem de erro, manter na tela os status já marcados e permitir tentar de novo.
