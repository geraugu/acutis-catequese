# Implementation Plan

- [ ] 1. Fundação: projeto, banco e infraestrutura de testes

- [x] 1.1 Criar o projeto Next.js com TypeScript strict e as ferramentas de qualidade
  - Criar a aplicação Next.js 16 (App Router, diretório `src/`, alias `@/*`), com React 19 e TypeScript em modo strict.
  - Configurar ESLint e Prettier.
  - Registrar os scripts `dev`, `build`, `start`, `lint`, `format` e `typecheck`.
  - Fixar as versões principais definidas no design: Next 16.3 e Better Auth 1.7. O Prisma e o Vitest são fixados nas tarefas 1.3 e 1.4.
  - Atualizar o `.gitignore` com os artefatos de build e de teste e com o client Prisma gerado.
  - Pronto quando: `npm run dev` exibe uma página inicial em `localhost:3000`, e `npm run lint` e `npm run typecheck` terminam sem erros.
  - _Requirements: 2.3_

- [x] 1.2 Configurar o PostgreSQL local e a validação de variáveis de ambiente
  - Subir o PostgreSQL 17 via Docker Compose, com volume nomeado e healthcheck.
  - Criar o `.env.example` com todas as variáveis do design (banco, segredo e URL de autenticação, conta inicial da coordenação, chave do rate limit), sem valores secretos reais.
  - Registrar os scripts `db:up`, `db:migrate` e `db:seed`, e documentar no README o passo de copiar `.env.example` para `.env` e gerar um segredo de autenticação de 32 caracteres ou mais.
  - Implementar a validação das variáveis na inicialização. Se faltar alguma, ou se alguma for inválida, a inicialização é interrompida com uma mensagem que nomeia a variável.
  - Incluir teste unitário da validação: sem a URL do banco, o erro deve citar o nome da variável.
  - Pronto quando: `docker compose up -d` deixa o banco saudável, e iniciar a aplicação sem uma variável obrigatória falha com mensagem que a identifica.
  - _Requirements: 1.2, 1.3, 1.6_

- [x] 1.3 Configurar o Prisma 7 e o schema das tabelas de autenticação
  - Instalar o Prisma `^7.10` (não usar a 8) com o adapter de PostgreSQL. Configurar o arquivo de configuração do Prisma: schema, migrações, comando de seed e carregamento do `.env`.
  - Gerar os modelos de autenticação com a CLI do Better Auth, incluindo os campos de papel e bloqueio do plugin admin. Acrescentar o modelo de tentativas de login com índice por e-mail e data.
  - Criar o cliente único do banco e a primeira migração.
  - O script `db:migrate` (registrado em 1.2) passa a aplicar as migrações do Prisma.
  - Pronto quando: `npm run db:migrate` cria no banco local as tabelas `user`, `session`, `account`, `verification` e `login_attempt`, e o cliente gerado compila no typecheck.
  - _Requirements: 1.1, 6.1_

- [x] 1.4 Montar a infraestrutura de testes unitários, de integração e e2e
  - Configurar o Vitest `^4` com dois projetos: unitário (sem banco) e integração (com banco de teste). O setup de integração aplica as migrações e limpa as tabelas entre os testes.
  - Incluir um ambiente DOM (jsdom + Testing Library) no projeto unitário, para testar componentes de interface isoladamente.
  - Configurar o Playwright: servidor da aplicação em build de produção, um projeto de setup para login por papel e viewport padrão.
  - Registrar os scripts `test`, `test:unit`, `test:integration` e `test:e2e`.
  - Pronto quando: cada script roda com sucesso usando um teste de exemplo, e o de integração consegue gravar e ler no banco de teste.
  - _Requirements: 2.3, 2.4_

- [ ] 2. Núcleo de domínio da autenticação

- [x] 2.1 (P) Implementar os papéis e a hierarquia de acesso
  - Definir os dois papéis (coordenação e catequista) com seus rótulos em pt-BR.
  - A regra de acesso deve deixar a coordenação acessar tudo o que o catequista acessa, mas não o contrário.
  - Definir a página inicial de cada papel e a verificação de que um valor é um papel válido.
  - Pronto quando: os testes unitários provam que a coordenação acessa áreas de catequista, que o catequista é barrado nas áreas da coordenação, e que cada papel tem a página inicial correta.
  - _Boundary: domain/papeis_
  - _Requirements: 3.1, 6.1, 6.5_

- [x] 2.2 (P) Implementar a política de bloqueio por tentativas falhas
  - Regra pura: 5 falhas dentro de 15 minutos bloqueiam o e-mail por 15 minutos, contados a partir da quinta falha. O resultado informa quando o bloqueio termina.
  - Pronto quando: os testes unitários mostram que 4 falhas não bloqueiam, que 5 falhas em 15 minutos bloqueiam, que 5 falhas espalhadas por mais de 15 minutos não bloqueiam, e que o bloqueio termina após 15 minutos.
  - _Boundary: domain/bloqueio_
  - _Requirements: 4.1, 4.3_

- [x] 2.3 (P) Implementar a validação de entrada e as mensagens de erro
  - Regra de senha: no mínimo 8 caracteres, com mensagem em pt-BR.
  - Formulário de login: e-mail sem espaços nas pontas e em minúsculas; e-mail e senha obrigatórios; mensagens por campo.
  - Sanitização do endereço de retorno: aceita somente caminhos internos.
  - Esta tarefa é dona das constantes de mensagem (inclusive a de bloqueio) e do mapeamento de código para mensagem. As tarefas 3.1, 3.2 e 3.4 só importam essas constantes e esse mapeamento. Os códigos usados são os do design: `INVALID_EMAIL_OR_PASSWORD`, `BANNED_USER` e 429.
  - Mapeamento dos erros de login para as mensagens do design: credenciais inválidas (genérica), conta desabilitada, bloqueio temporário e erro inesperado.
  - Pronto quando: os testes unitários cobrem a normalização do e-mail, os campos vazios, a senha de 7 caracteres recusada, a rejeição de URLs externas (`//`, `https://`, `/\`) e a mensagem correta para cada código de erro.
  - _Boundary: domain/senha, domain/credenciais, domain/callback-url, mensagens_
  - _Requirements: 3.2, 3.3, 3.4, 3.6, 4.2, 6.2, 7.1_

- [ ] 3. Autenticação no servidor

- [ ] 3.1 Configurar o Better Auth e a rota de autenticação
  - Login por e-mail e senha, com cadastro público desabilitado e senha de no mínimo 8 caracteres.
  - Plugin admin com os papéis coordenação e catequista, coordenação como papel administrativo e mensagem em pt-BR para conta desabilitada.
  - Sessão com validade máxima de 12 horas no servidor. O rate limit por IP é ligado ou desligado por variável de ambiente, e o plugin de cookies do Next fica por último.
  - Expor a rota de autenticação da aplicação.
  - Teste de integração: um usuário criado pelo servidor consegue fazer login sem "lembrar-me", o cookie de sessão não tem prazo de expiração e a senha gravada não é igual ao texto original.
  - Pronto quando: o teste de integração de login passa contra o banco de teste.
  - _Depends: 1.2, 1.3, 1.4, 2.1_
  - _Requirements: 5.1, 5.2, 6.1, 7.1, 7.3_

- [ ] 3.2 Implementar o bloqueio por e-mail nos hooks de login
  - Persistência das tentativas falhas por e-mail: listar as recentes, registrar e limpar.
  - Esta tarefa estende a configuração de autenticação criada em 3.1, acrescentando os hooks.
  - Antes do login: consultar as falhas recentes e aplicar a política de bloqueio. Se o e-mail estiver bloqueado, recusar mesmo com a senha correta.
  - Depois do login: registrar a falha quando as credenciais forem inválidas (inclusive para e-mail inexistente) e limpar as falhas após um login bem-sucedido. Uma conta desabilitada não conta como falha.
  - Confirmar na implementação como o hook "depois" detecta o erro (ver o risco registrado em `research.md`).
  - Pronto quando: os testes de integração mostram que 5 falhas bloqueiam até a senha correta; que avançar o relógio 15 minutos libera; que um sucesso após 4 falhas zera a contagem; que uma conta banida é recusada sem gerar falha; e que e-mail inexistente e senha errada recebem a mesma resposta.
  - _Depends: 3.1, 2.2, 2.3_
  - _Requirements: 3.2, 3.4, 4.1, 4.2, 4.3, 4.4_

- [ ] 3.3 Implementar a camada de sessão e autorização (DAL)
  - Obter a sessão validada no banco, memorizada por requisição, com nome, e-mail e papel.
  - Exigir sessão: sem sessão, redirecionar para o login levando o caminho atual como endereço de retorno.
  - Exigir papel: sem permissão, redirecionar para "Acesso negado". Papel inválido no banco é tratado como sem permissão.
  - Pronto quando: os testes de integração mostram que uma sessão encerrada é tratada como não autenticada; que uma ação restrita à coordenação, chamada por um catequista, é redirecionada sem gravar nada; e que a coordenação passa em uma exigência de catequista.
  - _Depends: 3.1, 2.1_
  - _Requirements: 5.1, 5.4, 6.2, 6.3, 6.4, 6.5_

- [ ] 3.4 Implementar as ações de entrar e sair
  - Entrar: valida o formulário, faz login sem "lembrar-me", traduz os erros para as mensagens em pt-BR e redireciona para o endereço de retorno (se for interno e permitido ao papel) ou para a página inicial do papel.
  - Sair: encerra a sessão no servidor e redireciona para o login.
  - Pronto quando: os testes de integração mostram que um login válido redireciona para a página inicial do papel; que o endereço de retorno é respeitado quando permitido; que um endereço de retorno externo é ignorado; e que depois de sair o mesmo cookie não dá mais acesso.
  - _Depends: 3.1, 3.2, 3.3, 2.1, 2.3_
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.3, 5.4, 6.2_

- [ ] 3.5 Implementar a carga inicial (seed) da conta de coordenação
  - Ler as credenciais da conta inicial das variáveis de ambiente e falhar nomeando a variável que faltar.
  - Validar a senha com a regra de senha.
  - Se já existir um usuário com o e-mail normalizado, apenas avisar, sem alterar nada. Caso contrário, criar a conta com o papel coordenação.
  - Pronto quando: os testes de integração mostram que rodar o seed duas vezes resulta em uma única conta de coordenação e que uma senha de 7 caracteres faz o seed falhar; e `npm run db:seed` funciona no banco local.
  - _Depends: 3.1, 2.3, 1.2_
  - _Requirements: 1.4, 1.5, 7.2_

- [ ] 4. Interface e rotas

- [ ] 4.1 (P) Construir o layout base e a navegação por papel
  - Layout raiz em pt-BR com estilos globais responsivos.
  - Estrutura interna: cabeçalho com nome do usuário, papel e botão "Sair", mais navegação principal com os itens do papel. Por enquanto, cada papel tem só o item "Início".
  - Usar marcação semântica (cabeçalho, navegação rotulada, conteúdo principal), operável por teclado e sem rolagem horizontal a partir de 360 px.
  - Depende de 3.4 porque o botão "Sair" usa a ação de sair.
  - Pronto quando: um teste de componente (jsdom), renderizando com uma sessão de exemplo, mostra o nome, o rótulo do papel, "Sair" e os itens do papel correto.
  - _Boundary: AppShell, menu-por-papel, SairButton, app/layout_
  - _Depends: 3.4_
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 4.2 (P) Construir o formulário e a página de login
  - Formulário com rótulos associados, preenchimento automático adequado, erros por campo ligados aos campos e mensagem geral anunciada como alerta. O botão fica desabilitado durante o envio.
  - A página de login redireciona para a página inicial do papel quando já existe sessão, e repassa o endereço de retorno para o formulário.
  - Pronto quando: um teste de componente mostra os rótulos em pt-BR e os erros por campo recebidos do estado da ação. O redirecionamento de um usuário já logado é verificado no e2e (5.1).
  - _Boundary: LoginForm, app/login_
  - _Depends: 3.4_
  - _Requirements: 3.3, 3.5, 8.4, 8.6_

- [ ] 4.3 Integração: proteção de rotas e páginas internas
  - Checagem otimista (proxy): sem cookie de sessão, redireciona para o login com o endereço de retorno. As rotas públicas e os arquivos estáticos ficam de fora.
  - A raiz redireciona para a página inicial do papel ou para o login.
  - A área interna exige sessão e aplica o layout base. As páginas iniciais de coordenação e de catequista exigem o papel correspondente e mostram uma mensagem de boas-vindas.
  - A página "Acesso negado" tem link para a página inicial do papel, ou para o login se não houver sessão.
  - Pronto quando: verificado manualmente com `npm run dev`, acessar `/catequista` sem login leva ao login e volta para lá após o login; um catequista em `/coordenacao` vê "Acesso negado"; e a coordenação consegue abrir `/catequista`.
  - Esta tarefa é de integração entre proxy, DAL, layout e páginas. Os comportamentos são cobertos pelos cenários e2e em 5.1.
  - _Boundary: proxy, app/page, app/(interno), app/acesso-negado_
  - _Depends: 3.3, 4.1, 4.2_
  - _Requirements: 3.1, 3.5, 6.2, 6.3, 6.5, 8.1_

- [ ] 5. Validação ponta a ponta e automação

- [ ] 5.1 Escrever os testes e2e dos fluxos de acesso
  - Setup: seed da coordenação e criação de um catequista de teste pelo servidor (a criação de catequistas não faz parte do seed de produção), com login e estado salvo para cada papel.
  - Cenários:
    - login da coordenação, página inicial com nome, papel e "Sair", e logout de volta ao login;
    - retorno à página pedida após o login;
    - "Acesso negado" para o catequista;
    - a coordenação acessa a área de catequista;
    - erros do formulário vazio e envio só pelo teclado;
    - ausência de rolagem horizontal a 360 px nas páginas de login, inicial e acesso negado.
  - Cenário extra: um usuário já logado que acessa `/login` é redirecionado.
  - Pronto quando: `npm run test:e2e` passa localmente em todos os cenários.
  - _Depends: 1.4, 3.5, 4.3_
  - _Requirements: 2.4, 3.1, 3.3, 5.3, 6.2, 6.3, 6.5, 8.1, 8.5, 8.6_

- [ ] 5.2 Configurar o pipeline de integração contínua
  - Workflow disparado em push e pull request, com etapas nomeadas:
    - Qualidade: lint e typecheck;
    - Testes: unitários e integração com o serviço PostgreSQL 17;
    - E2E: build, migrações, seed e Playwright, publicando o relatório como artefato.
  - As variáveis de teste são definidas no próprio workflow, sem credenciais reais.
  - Pré-requisito externo: o remoto `origin` no GitHub (já existe: geraugu/acutis-catequese).
  - Pronto quando: um push para o GitHub dispara o workflow com todas as etapas verdes, e uma falha proposital em um teste marca a etapa correspondente como falha.
  - _Depends: 1.2, 3.5, 5.1_
  - _Requirements: 1.6, 2.1, 2.2_

- [ ] 5.3 Validar o setup a partir de um clone limpo e atualizar as instruções
  - O esqueleto do README com o passo do `.env` já existe desde 1.2. Aqui ele é finalizado e validado.
  - Atualizar as instruções de execução e de teste e a lista de variáveis de ambiente para refletir os comandos reais.
  - Pronto quando: seguindo apenas as instruções, um clone novo chega à aplicação rodando com login da coordenação funcionando, e cada comando de verificação documentado executa com sucesso.
  - _Requirements: 1.1, 2.3_

## Implementation Notes
- 1.1: Better Auth, Prisma e Vitest não foram instalados na 1.1 (ficam com 3.1, 1.3 e 1.4); fixar `better-auth@^1.7`, `prisma@^7.10` e `vitest@^4` nessas tarefas. O npm 11 retém os install scripts (ex.: unrs-resolver); até aqui não foi preciso aprová-los.
- 1.2: o Docker (OrbStack) fica em `~/.orbstack/bin`, que não está no PATH padrão. O banco `acutis_test` só é criado pelo init script quando o volume é criado. Os scripts `db:migrate` e `db:seed` ficam com as tarefas 1.3 e 3.5. A validação de env roda em `next.config.ts`.
- 1.3: os modelos do Better Auth foram escritos à mão no formato 1.7. Na 3.1, conferir com `npx auth@latest generate` que não há diferença. O seed está configurado como `tsx prisma/seed.ts` no prisma.config.ts; o script `db:seed` e o arquivo ficam com a 3.5. O client é importado de `@/generated/prisma/client`.
- 1.4: os testes de integração usam `DATABASE_URL_TEST`, e o setup aborta se a URL não for a do `acutis_test`. Os componentes são testados com `// @vitest-environment jsdom`. O Playwright usa `channel: "chromium"` porque faltou disco para o headless shell; se sobrar espaço, remover essa linha. O webServer reaproveita um servidor que já esteja na porta 3000 (fora do CI).
- 2.2: `avaliarBloqueio` ignora falhas com data posterior a `agora`. Para a query use `JANELA_CONSULTA_FALHAS_MS` (30 min). Na 3.2, não registrar falhas enquanto o e-mail estiver bloqueado, senão o bloqueio se estende.
- 2.3: `mensagens.ts` exporta `MSG_*`, `CODIGO_CREDENCIAIS_INVALIDAS`, `CODIGO_CONTA_DESABILITADA`, `STATUS_BLOQUEIO` e `mensagemDeErroLogin`. O domínio exporta `normalizarEmail`, que 3.2 e 3.5 devem reusar. `sanitizarCallbackUrl` também recusa espaços e caracteres de controle.
