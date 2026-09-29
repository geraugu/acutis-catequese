# Requirements Document

## Project Description (Input)
**Quem tem o problema:** a coordenação da catequese de adultos e os catequistas da paróquia. Eles precisam de um sistema que proteja os dados pessoais dos catequizandos e dê a cada perfil acesso apenas ao que lhe cabe.

**Situação atual:** o repositório tem somente documentação (steering, roadmap, README e LICENSE). Não existe base técnica (sem `package.json`, código, banco ou testes) nem controle de acesso. Nenhuma outra funcionalidade pode ser construída antes disso.

**O que deve mudar:**
- Existe um projeto Next.js 16 (TypeScript strict) que roda localmente com PostgreSQL via Docker e usa Prisma 7 (adapter-pg).
- As ferramentas de qualidade (ESLint, Prettier, typecheck) e os testes (Vitest e Playwright) estão configurados e rodam no GitHub Actions.
- Um usuário faz login com e-mail e senha (Better Auth) e é direcionado conforme o papel: `coordenacao` ou `catequista`.
- Rotas protegidas bloqueiam usuários não autenticados ou sem permissão, por meio de um helper de autorização reutilizável.
- Há um layout base com navegação por papel e um seed com uma conta inicial de coordenação.

**Fora do escopo:** cadastro de catequistas e criação das contas deles (spec `cadastro-catequistas`), recuperação de senha por e-mail e login social.

**Restrições:**
- PostgreSQL também em desenvolvimento, sem SQLite.
- Nenhum segredo versionado; incluir `.env.example`.
- Interface em pt-BR.

## Introduction
Esta spec estabelece a fundação do **acutis-catequese**:
- o ambiente de desenvolvimento reproduzível e a verificação automática de qualidade a cada alteração;
- o controle de acesso, com login por e-mail e senha, dois papéis (**coordenação** e **catequista**), proteção das áreas do sistema e navegação adequada a cada papel.

Ela não entrega funcionalidades de domínio da catequese. O que entrega é a base sobre a qual todas as specs seguintes serão construídas.

## Boundary Context
- **In scope**:
  - preparação do ambiente local com um comando documentado;
  - verificação automática (qualidade e testes) a cada alteração enviada ao repositório;
  - login e logout;
  - sessão válida até o fechamento do navegador;
  - bloqueio temporário após tentativas falhas;
  - política de senha;
  - dois papéis e proteção de áreas por autenticação e por papel;
  - página inicial e navegação por papel;
  - conta inicial de coordenação criada por carga inicial de dados.
- **Out of scope**:
  - criação, edição e inativação de contas de catequistas (spec `cadastro-catequistas`);
  - troca de senha pelo próprio usuário;
  - recuperação de senha por e-mail;
  - login social;
  - autocadastro;
  - qualquer tela de domínio (catequizandos, turmas, encontros, presença).
- **Adjacent expectations**:
  - As specs seguintes vão depender de três coisas desta: a identificação do usuário logado, o papel dele e o mecanismo de proteção por papel.
  - A spec `cadastro-catequistas` vai criar contas com papel catequista seguindo a política de senha definida aqui.
  - O bloqueio de contas inativas também é da `cadastro-catequistas`. Esta spec só garante que uma conta bloqueada não consegue entrar.

## Requirements

### Requirement 1: Ambiente de desenvolvimento reproduzível
**Objective:** Como desenvolvedor ou avaliador do projeto, quero preparar e executar o sistema localmente seguindo o README, para que qualquer pessoa consiga rodar e avaliar o projeto a partir do repositório.

#### Acceptance Criteria
1. The Sistema shall disponibilizar no README instruções que, seguidas a partir de um clone limpo, deixem a aplicação acessível no navegador local com o banco de dados local pronto.
2. The Sistema shall versionar um arquivo de exemplo de configuração que liste todas as variáveis de ambiente necessárias, sem valores secretos reais.
3. If uma variável de ambiente obrigatória estiver ausente na inicialização, the Sistema shall interromper a inicialização e exibir uma mensagem que identifique a variável ausente.
4. When o comando de carga inicial de dados for executado, the Sistema shall criar a conta inicial de coordenação com as credenciais definidas na configuração de ambiente.
5. When o comando de carga inicial de dados for executado mais de uma vez, the Sistema shall manter uma única conta inicial de coordenação, sem duplicá-la.
6. The Sistema shall não conter segredos (senhas, chaves ou strings de conexão reais) em nenhum arquivo versionado.

### Requirement 2: Verificação automática de qualidade
**Objective:** Como autor do projeto, quero que cada alteração enviada ao repositório seja verificada automaticamente, para garantir qualidade contínua e evidência de testes automatizados.

#### Acceptance Criteria
1. When uma alteração for enviada ao repositório remoto ou um pull request for aberto, the pipeline de integração contínua shall executar análise estática de código, verificação de tipos, testes unitários, testes de integração e testes ponta a ponta.
2. If qualquer verificação falhar, the pipeline de integração contínua shall marcar a execução como falha e identificar a etapa que falhou.
3. The Sistema shall disponibilizar comandos locais documentados para executar cada tipo de verificação separadamente.
4. The Sistema shall ter testes automatizados cobrindo os critérios de aceite dos Requirements 3 a 6.

### Requirement 3: Login com e-mail e senha
**Objective:** Como membro da coordenação ou catequista, quero entrar no sistema com meu e-mail e senha, para acessar as funcionalidades do meu papel com segurança.

#### Acceptance Criteria
1. When um usuário enviar e-mail e senha válidos de uma conta ativa, the Sistema shall autenticar o usuário e redirecioná-lo para a página inicial do seu papel.
2. If o e-mail não existir ou a senha estiver incorreta, the Sistema shall recusar o acesso e exibir a mensagem genérica "E-mail ou senha inválidos", sem indicar qual dos dois está errado.
3. If o e-mail ou a senha não forem preenchidos, the Sistema shall impedir o envio e indicar os campos obrigatórios.
4. If a conta estiver bloqueada ou inativa, the Sistema shall recusar o acesso e exibir uma mensagem informando que o acesso está desabilitado e que a coordenação deve ser procurada.
5. When um usuário já autenticado acessar a página de login, the Sistema shall redirecioná-lo para a página inicial do seu papel.
6. The Sistema shall tratar o e-mail sem diferenciar maiúsculas de minúsculas e ignorar espaços no início e no fim.

### Requirement 4: Proteção contra tentativas repetidas
**Objective:** Como coordenação, quero que tentativas repetidas de senha incorreta sejam bloqueadas temporariamente, para proteger os dados pessoais dos catequizandos contra ataques de força bruta.

#### Acceptance Criteria
1. If ocorrerem 5 tentativas de login falhas para o mesmo e-mail em um intervalo de 15 minutos, the Sistema shall bloquear novas tentativas de login para esse e-mail pelos 15 minutos seguintes.
2. While um e-mail estiver temporariamente bloqueado, the Sistema shall recusar o login mesmo com a senha correta e exibir uma mensagem informando que é preciso aguardar alguns minutos antes de tentar novamente.
3. When o período de bloqueio terminar, the Sistema shall voltar a aceitar tentativas de login para esse e-mail.
4. When um login for bem-sucedido, the Sistema shall zerar a contagem de tentativas falhas desse e-mail.

### Requirement 5: Sessão e logout
**Objective:** Como usuário, quero que minha sessão dure apenas enquanto o navegador estiver aberto e que eu possa sair a qualquer momento, para evitar acesso indevido em computadores compartilhados da paróquia.

#### Acceptance Criteria
1. While o navegador permanecer aberto após o login, the Sistema shall manter o usuário autenticado entre páginas e recarregamentos.
2. When o usuário fechar o navegador e abri-lo novamente, the Sistema shall exigir um novo login.
3. When o usuário acionar "Sair", the Sistema shall encerrar a sessão e redirecioná-lo para a página de login.
4. If uma sessão encerrada for reutilizada (por exemplo, voltando no histórico do navegador), the Sistema shall tratar a requisição como não autenticada.

### Requirement 6: Papéis e controle de acesso
**Objective:** Como coordenação, quero que cada usuário acesse apenas as áreas permitidas ao seu papel, para que catequistas não acessem funções administrativas.

#### Acceptance Criteria
1. The Sistema shall atribuir a cada conta exatamente um papel: coordenação ou catequista.
2. If um usuário não autenticado acessar qualquer área interna, the Sistema shall redirecioná-lo para a página de login e, após o login bem-sucedido, levá-lo à página originalmente solicitada, desde que o papel dele permita.
3. If um usuário autenticado acessar uma área não permitida ao seu papel, the Sistema shall negar o acesso e exibir uma página de "Acesso negado" com link para a página inicial do seu papel.
4. If uma ação protegida for acionada diretamente, sem passar pela interface, por um usuário sem permissão, the Sistema shall rejeitá-la sem executar nenhuma alteração.
5. The Sistema shall permitir que a coordenação acesse todas as áreas destinadas ao papel catequista.

### Requirement 7: Política de senha
**Objective:** Como coordenação, quero uma regra mínima de senha, para reduzir o risco de senhas fracas nas contas que darão acesso aos dados da catequese.

#### Acceptance Criteria
1. The Sistema shall exigir que toda senha definida para uma conta tenha no mínimo 8 caracteres.
2. If uma senha com menos de 8 caracteres for informada na criação de uma conta, the Sistema shall recusar a criação e informar o tamanho mínimo exigido.
3. The Sistema shall armazenar senhas somente em forma irreversível, de modo que nenhuma senha possa ser lida em texto puro.

### Requirement 8: Layout base e navegação por papel
**Objective:** Como usuário autenticado, quero uma estrutura de navegação clara e adequada ao meu papel, para encontrar rapidamente as funcionalidades disponíveis para mim.

#### Acceptance Criteria
1. While o usuário estiver autenticado, the Sistema shall exibir em todas as páginas internas o nome do usuário, o papel dele e a opção "Sair".
2. While o usuário autenticado tiver o papel coordenação, the Sistema shall exibir no menu apenas os itens destinados à coordenação.
3. While o usuário autenticado tiver o papel catequista, the Sistema shall exibir no menu apenas os itens destinados a catequistas.
4. The Sistema shall apresentar todos os textos da interface em português do Brasil.
5. The Sistema shall exibir as páginas de login, a inicial e a de acesso negado sem rolagem horizontal em telas a partir de 360 px de largura.
6. The Sistema shall permitir operar o formulário de login e o menu apenas com o teclado, com rótulos acessíveis em todos os campos.
