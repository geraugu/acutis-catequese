# Requirements Document

## Project Description (Input)
**Quem tem o problema:** a coordenação e os catequistas da catequese de adultos. A catequese acontece em turmas, mas o sistema não registra quais catequistas conduzem cada turma nem quais catequizandos participam dela.

**Situação atual:** a v0.3.0 entregou a gestão da equipe (catequistas e coordenação) e o cadastro de catequizandos, com estados pendente, ativo e inativo, e fichas pendentes confirmadas ou recusadas pela coordenação. Esses cadastros são independentes, sem nenhum vínculo com turmas. O catequista ainda não tem acesso a nenhum catequizando.

**O que deve mudar:**
- A coordenação cria, edita e encerra turmas, com nome, ciclo/ano, dia e horário e local.
- A coordenação designa os catequistas responsáveis por cada turma.
- A coordenação inscreve catequizandos numa turma e os desliga dela, registrando as datas de entrada e de saída.
- O catequista vê apenas as próprias turmas e os catequizandos inscritos nelas.

**Fora do escopo:** encontros e programa da turma (`programa-catequese`), presença (`controle-presenca`) e o link público de autocadastro por turma (`autocadastro-catequizandos`, que vai depender desta spec).

**Restrições:**
- A regra de autorização por turma (quem pode ver o quê) deve ficar reutilizável, porque as specs de encontros e de presença vão usá-la.
- A inativação de catequistas e de catequizandos, que vem das specs de cadastro, afeta as designações e as inscrições. O comportamento exato será definido nos requisitos.
- Um catequizando fica inscrito em no máximo uma turma aberta por vez.
- Reutilizar `requireRole`, os módulos compartilhados e os componentes comuns. Seguir o design system "Acolhedor", com a interface em pt-BR.

**Decisões de escopo (2026-10-01):**
- **Inscrição única:** o catequizando fica inscrito em uma única turma aberta. Todas as turmas seguem o mesmo programa, e ele pode assistir a encontros de outra turma para repor temas. Essa reposição pertence às specs `programa-catequese` e `controle-presenca`, não a esta.
- **Inativação:** inativar um catequizando o desliga da turma, e inativar um catequista o remove das turmas que ele conduz. O histórico é preservado.
- **Acesso do catequista:** o catequista só consulta as próprias turmas e as fichas dos catequizandos inscritos nelas. Inscrever e desligar são ações da coordenação.
- **Capacidade:** a turma pode ter um número opcional de vagas. Inscrever numa turma lotada gera um aviso, e a coordenação pode confirmar mesmo assim.
- **Encerramento:** encerrar uma turma desliga todos os inscritos. A turma encerrada não pode ser reaberta e fica só para consulta.

## Introduction
Esta spec organiza a catequese em **turmas**. A coordenação cria as turmas de cada ciclo, designa os catequistas responsáveis, inscreve e desliga catequizandos e encerra as turmas ao fim do ciclo. Cada catequista passa a ver as próprias turmas e as fichas dos catequizandos inscritos nelas, somente para consulta.

Ao longo do documento:
- **turma aberta** é uma turma que ainda não foi encerrada;
- **inscrição vigente** é uma inscrição sem data de saída;
- **catequista responsável** é um membro da equipe com papel catequista designado para conduzir a turma.

## Boundary Context
- **In scope**:
  - criação, edição, listagem e encerramento de turmas;
  - capacidade opcional (vagas), com aviso de lotação;
  - designação e remoção de catequistas responsáveis;
  - inscrição, desligamento e transferência de catequizandos, com datas de entrada e de saída;
  - histórico de inscrições do catequizando;
  - efeitos da inativação de catequistas e de catequizandos sobre as turmas;
  - visão "Minhas turmas" do catequista, com consulta das fichas;
  - regra de acesso por turma, reutilizável pelas próximas specs.
- **Out of scope**:
  - encontros, temas e cronograma (`programa-catequese`);
  - chamada, frequência e reposição de temas em outra turma (`controle-presenca`);
  - link público de autocadastro da turma (`autocadastro-catequizandos`);
  - edição de fichas pelo catequista;
  - reabertura de turma encerrada.
- **Adjacent expectations**:
  - As specs `programa-catequese` e `controle-presenca` vão reutilizar a regra de acesso por turma.
  - A reposição de temas em outra turma não altera a inscrição: o catequizando continua inscrito na turma de origem.
  - As regras de inativação vêm de `cadastro-catequistas` e `cadastro-catequizandos` e continuam valendo. Esta spec só acrescenta o efeito delas sobre as turmas.
  - A spec `autocadastro-catequizandos` poderá usar a lotação da turma para deixar de aceitar fichas pelo link.
  - A ficha que o catequista consulta é a mesma mantida pela coordenação em `cadastro-catequizandos`.

## Requirements

### Requirement 1: Acesso por papel e por turma
**Objective:** Como coordenação, quero que cada pessoa veja apenas as turmas que lhe cabem, para proteger os dados dos catequizandos.

#### Acceptance Criteria
1. The Sistema shall permitir que a coordenação veja e gerencie todas as turmas.
2. The Sistema shall permitir que o catequista veja apenas as turmas em que é catequista responsável, somente para consulta.
3. If um catequista acessar uma turma em que não é responsável, ou a ficha de um catequizando que não está inscrito em nenhuma turma dele, the Sistema shall exibir a página de "Acesso negado".
4. If uma ação de gestão de turmas for acionada diretamente, sem passar pela interface, por um usuário sem papel coordenação, the Sistema shall rejeitá-la sem alterar nenhum dado.
5. The Sistema shall disponibilizar o item de menu "Turmas" para a coordenação e o item "Minhas turmas" para o catequista.

### Requirement 2: Cadastro e edição de turma
**Objective:** Como coordenação, quero criar e manter as turmas de cada ciclo, para organizar a catequese.

#### Acceptance Criteria
1. When a coordenação enviar uma turma com nome, ciclo (ano), dia da semana, horário e local válidos, the Sistema shall criar a turma aberta e exibir a confirmação "Turma criada".
2. The Sistema shall exigir nome, ciclo, dia da semana e horário, e tratar local e observações como opcionais.
3. If algum campo obrigatório estiver vazio ou inválido, the Sistema shall impedir o salvamento e exibir, junto a cada campo, uma mensagem em pt-BR indicando o problema.
4. If já existir uma turma aberta com o mesmo nome no mesmo ciclo, the Sistema shall impedir o salvamento e informar que o nome já está em uso nesse ciclo.
5. When a coordenação salvar alterações válidas numa turma aberta, the Sistema shall atualizar a turma e exibir a confirmação "Alterações salvas".
6. The Sistema shall aceitar como ciclo um ano entre 2000 e o ano seguinte ao atual.

### Requirement 3: Lista de turmas
**Objective:** Como coordenação, quero ver as turmas de forma organizada, para acompanhar a catequese de cada ciclo.

#### Acceptance Criteria
1. When a coordenação acessar a área "Turmas", the Sistema shall listar as turmas abertas do ciclo mais recente, exibindo nome, ciclo, dia e horário, local, catequistas responsáveis e quantidade de inscritos vigentes.
2. When a coordenação escolher o filtro de situação (abertas, encerradas ou todas) ou o filtro de ciclo, the Sistema shall exibir apenas as turmas correspondentes.
3. The Sistema shall manter os filtros no endereço da página, de modo que recarregar ou compartilhar o endereço mostre o mesmo resultado.
4. If nenhuma turma corresponder aos filtros, the Sistema shall exibir uma mensagem de estado vazio com a opção de limpar os filtros.
5. The Sistema shall ordenar as turmas por dia da semana, horário e nome.

### Requirement 4: Catequistas responsáveis
**Objective:** Como coordenação, quero designar quem conduz cada turma, para que cada catequista saiba pelo que responde.

#### Acceptance Criteria
1. When a coordenação designar um membro ativo com papel catequista para uma turma aberta, the Sistema shall incluí-lo como catequista responsável e exibir a confirmação "Catequista designado".
2. The Sistema shall oferecer para designação apenas membros ativos com papel catequista que ainda não são responsáveis pela turma.
3. The Sistema shall permitir mais de um catequista responsável por turma e o mesmo catequista em mais de uma turma.
4. When a coordenação remover um catequista responsável, após confirmação explícita, the Sistema shall retirá-lo da turma e exibir a confirmação "Catequista removido".
5. While uma turma aberta não tiver nenhum catequista responsável, the Sistema shall sinalizar a turma como "Sem catequista" na lista e na página da turma.
6. When um membro da equipe for inativado ou deixar de ter o papel catequista, the Sistema shall removê-lo das turmas em que era responsável.

### Requirement 5: Inscrição de catequizandos
**Objective:** Como coordenação, quero inscrever catequizandos nas turmas, para saber quem participa de cada uma.

#### Acceptance Criteria
1. When a coordenação inscrever um catequizando ativo numa turma aberta, the Sistema shall registrar a inscrição com a data de entrada informada (por padrão, a data atual) e exibir a confirmação "Catequizando inscrito".
2. The Sistema shall oferecer para inscrição apenas catequizandos ativos, com busca por nome sem diferenciar maiúsculas, minúsculas nem acentos.
3. If o catequizando já tiver uma inscrição vigente em outra turma, the Sistema shall impedir a inscrição, informar a turma atual e oferecer a transferência.
4. When a coordenação confirmar a transferência, the Sistema shall encerrar a inscrição na turma anterior e criar a nova inscrição, ambas com a data da transferência.
5. If a data de entrada for futura ou anterior à data de nascimento do catequizando, the Sistema shall impedir a inscrição e informar que a data é inválida.
6. The Sistema shall exibir, na página do catequizando, a turma atual e o histórico de inscrições com as datas de entrada e de saída.

### Requirement 6: Desligamento de catequizandos
**Objective:** Como coordenação, quero desligar um catequizando da turma sem perder o histórico, para refletir quem deixou de participar.

#### Acceptance Criteria
1. When a coordenação confirmar o desligamento de um catequizando, the Sistema shall registrar a data de saída informada (por padrão, a data atual) e exibir a confirmação "Catequizando desligado".
2. The Sistema shall pedir confirmação explícita antes do desligamento, nomeando o catequizando e a turma.
3. If a data de saída for anterior à data de entrada ou futura, the Sistema shall impedir o desligamento e informar que a data é inválida.
4. The Sistema shall nunca excluir uma inscrição. Uma inscrição encerrada permanece no histórico.
5. When um catequizando for inativado, the Sistema shall encerrar a inscrição vigente dele com a data da inativação.

### Requirement 7: Página da turma
**Objective:** Como coordenação e catequista, quero ver tudo de uma turma num só lugar, para acompanhar quem participa.

#### Acceptance Criteria
1. When um usuário autorizado abrir uma turma, the Sistema shall exibir nome, ciclo, dia e horário, local, observações, situação (aberta ou encerrada), catequistas responsáveis e a lista dos inscritos vigentes em ordem alfabética, com idade e telefone.
2. The Sistema shall oferecer a lista dos inscritos anteriores (com inscrição encerrada) separada dos inscritos vigentes.
3. Where o usuário for coordenação e a turma estiver aberta, the Sistema shall oferecer as ações editar, designar ou remover catequista, inscrever, desligar e encerrar.
4. Where o usuário for catequista, the Sistema shall exibir a página sem nenhuma ação de alteração.
5. The Sistema shall oferecer o telefone de cada inscrito como link de ligação e de conversa no WhatsApp.
6. If a turma não existir, the Sistema shall exibir a página "Turma não encontrada" com link para a lista.

### Requirement 8: Encerramento de turma
**Objective:** Como coordenação, quero encerrar a turma ao fim do ciclo, preservando o histórico.

#### Acceptance Criteria
1. When a coordenação confirmar o encerramento de uma turma aberta, the Sistema shall marcá-la como encerrada, encerrar todas as inscrições vigentes com a data do encerramento e exibir a confirmação "Turma encerrada".
2. The Sistema shall pedir confirmação explícita antes de encerrar, informando quantos catequizandos serão desligados.
3. While uma turma estiver encerrada, the Sistema shall impedir edição, designações, inscrições e desligamentos nela.
4. The Sistema shall manter a turma encerrada consultável, com catequistas e inscrições históricas.

### Requirement 9: Minhas turmas (catequista)
**Objective:** Como catequista, quero ver minhas turmas e meus catequizandos, para preparar os encontros e entrar em contato com eles.

#### Acceptance Criteria
1. When um catequista acessar "Minhas turmas", the Sistema shall listar as turmas abertas em que é responsável, com dia, horário, local e quantidade de inscritos vigentes.
2. If o catequista não for responsável por nenhuma turma aberta, the Sistema shall exibir uma mensagem informando que ainda não há turmas designadas para ele.
3. When o catequista abrir a ficha de um catequizando com inscrição vigente numa turma dele, the Sistema shall exibir os dados da ficha somente para consulta.
4. When a designação de um catequista for removida, the Sistema shall deixar de exibir para ele a turma e as fichas dos catequizandos dela a partir da próxima página acessada.

### Requirement 10: Interface
**Objective:** Como coordenação e catequista, quero usar as turmas no celular, para consultar durante os encontros.

#### Acceptance Criteria
1. The Sistema shall exibir todas as páginas de turmas em pt-BR, seguindo o design system do projeto.
2. The Sistema shall tornar todas as páginas de turmas operáveis apenas com o teclado.
3. The Sistema shall exibir todas as páginas de turmas sem rolagem horizontal em telas a partir de 360 px de largura.
4. The Sistema shall exibir datas no formato brasileiro (dd/mm/aaaa) e horários no formato 24 h (por exemplo, "19:30").

### Requirement 11: Capacidade da turma
**Objective:** Como coordenação, quero registrar quantas vagas a turma comporta, para acompanhar a lotação sem impedir exceções.

#### Acceptance Criteria
1. The Sistema shall aceitar no cadastro e na edição da turma um número opcional de vagas, inteiro entre 1 e 500. Um campo vazio significa sem limite.
2. If o número de vagas for informado fora do intervalo ou não for inteiro, the Sistema shall impedir o salvamento e informar o intervalo aceito.
3. Where a turma tiver vagas definidas, the Sistema shall exibir na lista e na página da turma a ocupação no formato "{inscritos} de {vagas} vagas".
4. While a quantidade de inscritos vigentes for igual ou maior que o número de vagas, the Sistema shall sinalizar a turma como "Lotada" na lista e na página da turma.
5. When a coordenação tentar inscrever ou transferir um catequizando para uma turma lotada, the Sistema shall não gravar e exibir o aviso "Turma lotada ({inscritos} de {vagas} vagas)" com a opção "Inscrever mesmo assim".
6. When a coordenação confirmar "Inscrever mesmo assim", the Sistema shall registrar a inscrição (ou a transferência) normalmente.
7. If a coordenação reduzir o número de vagas para menos que os inscritos vigentes, the Sistema shall salvar a alteração, manter todos os inscritos e passar a sinalizar a turma como "Lotada".
