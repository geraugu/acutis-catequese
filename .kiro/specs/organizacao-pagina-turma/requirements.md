# Requirements Document

## Project Description (Input)
**Quem tem o problema:** a coordenação e os catequistas da catequese de adultos. A página de uma turma selecionada virou uma coluna longa com muitos blocos empilhados, e fica difícil achar o que se procura, principalmente no celular.

**Situação atual:** a página `/{papel}/turmas/[id]` concentra, na coordenação, oito blocos: dados, próximo encontro e chamada de hoje, frequência, Editar e Encerrar, link de autocadastro, catequistas, inscrição e inscritos. O catequista vê uma versão menor, só de consulta. O cronograma de encontros, as fichas pendentes, a chamada e os visitantes já são páginas separadas.

**O que deve mudar:**
- A página da turma ganha um cabeçalho e uma **barra de abas**, e cada aba mostra só o seu conteúdo.
- As abas são: **Resumo**, **Inscritos**, **Frequência**, **Encontros** e **Equipe e link**.
- Cada aba é uma página própria, com endereço próprio (decisão: abas por rota, e não por parâmetro na mesma página).
- A organização é a mesma para a coordenação e para o catequista; cada papel vê só o que já lhe cabe.
- As ações que hoje voltam para a página principal passam a voltar para a aba onde o usuário estava.

**Fora do escopo:** novas funcionalidades ou dados em qualquer aba, mudanças de regra de negócio, de acesso ou de cálculo, e a lista de turmas.

**Decisões de escopo (2026-10-05):**
- **Abas por rota:** layout compartilhado com cabeçalho e barra de abas; cada aba é uma página.
- **Páginas de tarefa sem abas:** fazer a chamada, visitantes, criar e editar encontro, editar turma, fila de fichas pendentes e revisão de ficha ficam sem cabeçalho nem abas, com um link de volta para a página de origem.
- **Indicador de pendentes:** a aba "Equipe e link" mostra a quantidade de fichas de autocadastro pendentes quando ela é maior que zero.
- **Abas no celular:** a barra quebra em linhas; não rola na horizontal.
- **Release:** entrega na v0.8.0 (a v0.7.0 já foi publicada).

## Introduction
Esta spec reorganiza a **página da turma** em abas, sem mudar o que cada bloco faz. O usuário abre uma turma, vê o cabeçalho com o nome dela e uma barra de abas, e navega entre Resumo, Inscritos, Frequência, Encontros e Equipe e link.

Ao longo do documento:
- **página da turma** é qualquer uma das cinco páginas de aba de uma turma;
- **cabeçalho da turma** é a área com o link de volta para as turmas e o nome da turma;
- **página de tarefa** é uma página de uma ação sobre a turma (chamada, visitantes, criar ou editar encontro, editar turma, fila de fichas pendentes e revisão de ficha), que não mostra o cabeçalho nem as abas;
- **página de origem** é a página para a qual uma página de tarefa volta (uma aba ou outra página de tarefa);
- **turma aberta**, **turma encerrada**, **catequista responsável**, **inscrito** e **regra de acesso por turma** têm o sentido definido em `gestao-turmas`.

## Boundary Context
- **In scope**:
  - cabeçalho, barra de abas e as cinco páginas de aba, nas duas visões (coordenação e catequista);
  - distribuição dos blocos atuais da página da turma pelas abas;
  - indicador de fichas pendentes na aba "Equipe e link";
  - link de volta nas páginas de tarefa;
  - retorno das ações da turma para a aba correspondente;
  - uso no celular, a partir de 360 px.
- **Out of scope**:
  - criar ou alterar funcionalidades, dados, regras de negócio, de acesso ou de cálculo de qualquer bloco;
  - redesenhar a lista de turmas, o formulário da turma e as páginas de tarefa além do link de volta;
  - novas abas além das cinco.
- **Adjacent expectations**:
  - Os blocos mantêm o comportamento e as regras de origem: turmas e inscrições (`gestao-turmas`), cronograma e próximo encontro (`programa-catequese`), link e fichas pendentes (`autocadastro-catequizandos`), frequência e chamada de hoje (`controle-presenca`).
  - A regra de acesso por turma continua valendo em cada aba e em cada página de tarefa.

## Requirements

### Requirement 1: Cabeçalho e barra de abas
**Objective:** Como coordenação ou catequista, quero ver o nome da turma e navegar por abas, para achar rápido o que procuro sem rolar uma página longa.

#### Acceptance Criteria
1. When um usuário autorizado abrir uma turma, the Sistema shall exibir o cabeçalho da turma, com o link "← Voltar para as turmas" e o nome da turma, e a barra de abas.
2. The Sistema shall exibir as abas "Resumo", "Inscritos", "Frequência", "Encontros" e "Equipe e link", nessa ordem, para a coordenação e para o catequista.
3. When um usuário autorizado abrir o endereço principal da turma, the Sistema shall exibir a aba "Resumo".
4. The Sistema shall identificar a aba atual por texto e atributo de navegação, e não apenas por cor.
5. The Sistema shall dar a cada aba um endereço próprio, de modo que recarregar a página ou compartilhar o endereço mostre a mesma aba da mesma turma.
6. While houver fichas de autocadastro pendentes na turma, the Sistema shall exibir a quantidade ao lado do nome da aba "Equipe e link", em todas as abas; se não houver nenhuma, the Sistema shall exibir o nome sem número.
7. The Sistema shall exibir o mesmo cabeçalho e a mesma barra de abas ao trocar de aba.

### Requirement 2: Aba Resumo
**Objective:** Como coordenação ou catequista, quero um resumo da turma, para saber de relance como ela está e qual é o próximo passo.

#### Acceptance Criteria
1. The Sistema shall exibir na aba "Resumo" os dados da turma (nome, ciclo, dia e horário, local, observações, vagas e situação).
2. The Sistema shall exibir na aba "Resumo" o próximo encontro, com link para a aba "Encontros", ou a mensagem de que não há próximo encontro.
3. Where houver um encontro planejado com a data de hoje numa turma aberta, the Sistema shall exibir na aba "Resumo" o bloco "Encontro de hoje", com o link para fazer a chamada.
4. While a turma estiver aberta, the Sistema shall exibir as ações "Editar" e "Encerrar" na aba "Resumo" somente para a coordenação.
5. While a turma estiver encerrada, the Sistema shall exibir a aba "Resumo" sem ações de alteração.

### Requirement 3: Aba Inscritos
**Objective:** Como coordenação ou catequista, quero ver e gerenciar os inscritos numa aba só, para acompanhar quem participa da turma.

#### Acceptance Criteria
1. The Sistema shall exibir na aba "Inscritos" a lista dos inscritos vigentes, em ordem alfabética, e, separada dela, a lista dos inscritos anteriores.
2. While a turma estiver aberta, the Sistema shall exibir na aba "Inscritos" a ação "Inscrever catequizando", com busca por nome, e a ação de desligar cada inscrito, somente para a coordenação.
3. When a coordenação buscar um catequizando para inscrever, the Sistema shall exibir os resultados na própria aba "Inscritos".
4. The Sistema shall exibir para o catequista a aba "Inscritos" somente para consulta, sem ações de inscrever nem de desligar.
5. While a turma estiver encerrada, the Sistema shall exibir a aba "Inscritos" sem ações de alteração.

### Requirement 4: Aba Frequência
**Objective:** Como coordenação ou catequista, quero ver a frequência da turma, para identificar quem está se afastando.

#### Acceptance Criteria
1. The Sistema shall exibir na aba "Frequência" a frequência da turma, a quantidade de catequizandos em baixa frequência e a lista dos inscritos vigentes com o percentual de cada um.
2. When o usuário escolher ordenar por nome ou por menor frequência, the Sistema shall reordenar a lista na própria aba "Frequência".
3. The Sistema shall manter a aba "Frequência" consultável numa turma encerrada.
4. If a turma não tiver nenhum encontro realizado com chamada, the Sistema shall exibir "Sem encontros registrados" no lugar do percentual.

### Requirement 5: Aba Encontros
**Objective:** Como coordenação ou catequista, quero acessar o cronograma da turma dentro da página dela, para ver e planejar os encontros sem perder o contexto.

#### Acceptance Criteria
1. The Sistema shall exibir na aba "Encontros" o cronograma da turma, com a lista cronológica dos encontros, o próximo encontro em destaque, o progresso no programa e as ações de encontro que o usuário já tem.
2. When o usuário abrir a aba "Encontros", the Sistema shall exibir o cabeçalho da turma e a barra de abas com "Encontros" como aba atual.
3. While a turma estiver encerrada, the Sistema shall exibir a aba "Encontros" somente para consulta.

### Requirement 6: Aba Equipe e link
**Objective:** Como coordenação ou catequista, quero ver os catequistas e o link de autocadastro numa aba só, para cuidar de quem conduz a turma e de quem chega por ela.

#### Acceptance Criteria
1. The Sistema shall exibir na aba "Equipe e link" os catequistas responsáveis pela turma, ou a mensagem de que nenhum foi designado.
2. While a turma estiver aberta, the Sistema shall exibir na aba "Equipe e link" as ações de designar e de remover catequista somente para a coordenação.
3. The Sistema shall exibir na aba "Equipe e link" o bloco do link de autocadastro, com as mesmas ações e informações que ele oferecia na página da turma para cada papel.
4. When houver fichas pendentes, the Sistema shall exibir na aba "Equipe e link" a quantidade e o link para a fila de fichas pendentes.
5. While a turma estiver encerrada, the Sistema shall exibir a aba "Equipe e link" sem ações de alteração.

### Requirement 7: Páginas de tarefa
**Objective:** Como coordenação ou catequista, quero que as páginas de uma tarefa fiquem limpas, para me concentrar nela, principalmente a chamada no celular.

#### Acceptance Criteria
1. The Sistema shall exibir as páginas de fazer a chamada, de visitantes, de criar encontro, de editar encontro, de editar turma, da fila de fichas pendentes e de revisão de ficha sem o cabeçalho da turma e sem a barra de abas.
2. The Sistema shall exibir em cada página de tarefa um link de volta para a página de origem: "Voltar para Encontros" nas páginas de chamada, de criar encontro e de editar encontro; "Voltar para a chamada" na página de visitantes; "Voltar para Equipe e link" na fila de fichas pendentes; "Voltar para as fichas pendentes" na revisão de ficha; "Voltar para Resumo" na edição da turma.
3. When o usuário usar o link de volta, the Sistema shall exibir a página de origem da mesma turma.

### Requirement 8: Retorno das ações
**Objective:** Como coordenação, quero que depois de uma ação eu volte para a aba onde o resultado aparece, para ver a confirmação sem procurar.

#### Acceptance Criteria
1. When a coordenação criar, editar ou encerrar uma turma, the Sistema shall exibir a aba "Resumo" da turma com a mensagem de confirmação.
2. When a coordenação inscrever ou desligar um catequizando, the Sistema shall exibir a aba "Inscritos" com a mensagem de confirmação.
3. When a coordenação designar ou remover um catequista, the Sistema shall exibir a aba "Equipe e link" com a mensagem de confirmação.
4. When um usuário autorizado gerar, desativar, regenerar ou alterar a expiração do link de autocadastro, the Sistema shall exibir a aba "Equipe e link" com a mensagem de confirmação.
5. When um usuário autorizado confirmar uma ficha pendente, the Sistema shall exibir a aba "Inscritos" da turma com a mensagem de confirmação.
6. The Sistema shall manter o retorno atual das ações de encontro, de chamada, de visitantes e de corrigir ou descartar uma ficha pendente, que continuam voltando para a sua própria página.
7. The Sistema shall exibir a mensagem de confirmação no topo da aba para a qual a ação volta, logo abaixo do cabeçalho e da barra de abas.

### Requirement 9: Acesso
**Objective:** Como coordenação, quero que a reorganização não mude quem pode ver ou fazer o quê, para manter a segurança dos dados.

#### Acceptance Criteria
1. The Sistema shall aplicar a regra de acesso por turma em cada aba e em cada página de tarefa, de modo que abrir diretamente o endereço de uma aba também seja verificado.
2. If um catequista abrir qualquer aba ou página de tarefa de uma turma em que não é responsável, the Sistema shall exibir a página de "Acesso negado" sem exibir nenhum dado da turma.
3. If a coordenação abrir o endereço de uma turma que não existe, the Sistema shall exibir a página de "não encontrado"; se um catequista abrir esse endereço, the Sistema shall exibir a página de "Acesso negado", sem revelar se a turma existe.
4. The Sistema shall exibir, para cada papel, somente as ações que ele já tinha na página da turma, sem acrescentar nenhuma.
5. The Sistema shall exibir a mesma estrutura de abas para a coordenação e para o catequista, com o conteúdo de cada aba ajustado ao papel.

### Requirement 10: Continuidade
**Objective:** Como usuário, quero que nada do que eu fazia na página da turma se perca nem quebre, para continuar trabalhando como antes.

#### Acceptance Criteria
1. The Sistema shall manter disponível, em alguma aba, tudo o que a página da turma oferecia antes da reorganização.
2. The Sistema shall manter funcionando os endereços já existentes do cronograma, da chamada, dos visitantes, da fila de fichas pendentes e da revisão de ficha.
3. When o usuário chegar à turma por um link existente no sistema (lista de turmas, "Minhas turmas", ficha do catequizando, lista de alertas de frequência ou aviso de confirmação), the Sistema shall exibir a turma com a aba "Resumo" ou com a aba indicada pelo link.
4. If o endereço principal da turma receber parâmetros que passaram a pertencer a outra aba, the Sistema shall ignorá-los e exibir a aba "Resumo".

### Requirement 11: Interface
**Objective:** Como coordenação ou catequista, quero usar as abas no celular e com o teclado, para trabalhar durante o encontro.

#### Acceptance Criteria
1. The Sistema shall exibir a barra de abas e o conteúdo de cada aba em pt-BR, seguindo o design system do projeto.
2. The Sistema shall exibir a barra de abas, em telas a partir de 360 px, com todas as abas visíveis, quebrando em linhas quando não couberem numa só, e sem rolagem horizontal da página.
3. The Sistema shall permitir navegar pela barra de abas e trocar de aba apenas com o teclado, com o foco visível.
4. The Sistema shall dar a cada aba uma área de toque de pelo menos 44 px de altura.
5. The Sistema shall exibir datas no formato brasileiro (dd/mm/aaaa) e horários no formato 24 h em todas as abas.
