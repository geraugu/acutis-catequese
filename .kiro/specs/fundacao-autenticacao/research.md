# Pesquisa e Decisões de Design

## Resumo
- **Feature**: `fundacao-autenticacao`
- **Tipo de discovery**: New Feature (greenfield), com discovery completo
- **Principais descobertas**:
  - O Better Auth 1.7.x oferece de forma nativa três coisas que os requisitos pedem:
    - sessão só do navegador, com `rememberMe: false`;
    - papéis e bloqueio de conta, pelo plugin `admin`;
    - e-mail sem diferenciar maiúsculas de minúsculas.
  - O **bloqueio por e-mail (5 falhas em 15 min)** não é nativo, porque o rate limit nativo é por IP e por rota. Por isso ele será implementado com hooks e uma tabela própria.
  - No Next.js 16 o `middleware` passou a se chamar **`proxy.ts`** e roda em Node. Serve apenas como verificação otimista, porque o cookie pode ser forjado. A autorização real precisa ser refeita em cada página e em cada Server Action.
  - O Prisma 7 exige três coisas: um driver adapter (`@prisma/adapter-pg`), o `output` do client definido e o `.env` carregado explicitamente (dotenv). No npm, a tag `latest` do `prisma` aponta para a 8.0 RC, então a versão deve ser fixada em `^7.10`.

## Registro de Pesquisa

### Versões verificadas (npm, 2026-09-29)
- **Versões**:

  | Pacote | Versão |
  |---|---|
  | `better-auth` | 1.7.6 |
  | CLI `auth` | 1.7.6 (o antigo `@better-auth/cli` parou na 1.4) |
  | `next` | 16.3.7 |
  | `@prisma/client` e `@prisma/adapter-pg` | 7.10.0 |
  | `@playwright/test` | 1.63.0 |
  | `vitest` | 5.0.2 é a latest; fixar em `^4`, conforme o steering |

- **Implicação**:
  - Fixar `prisma@^7.10`, porque o Better Auth aceita no máximo Prisma 7.
  - Gerar o schema de autenticação com `npx auth@latest generate`.

### Sessão só enquanto o navegador estiver aberto (Req 5)
- **Achado**: com `signIn.email({ rememberMe: false })`, o cookie `session_token` é gravado sem `maxAge`, ou seja, como cookie de sessão. O cookie auxiliar `dont_remember` mantém esse comportamento quando a sessão é renovada.
- **Ressalva**: o registro da sessão no banco continua com `expiresAt`, que por padrão é de 7 dias.
- **Implicação**: usar `session.expiresIn = 12h` como limite no servidor, para o caso de o navegador restaurar a sessão.

### Papéis e bloqueio de conta (Req 3.4, 6)
- **Achado**:
  - O plugin `admin` aceita papéis customizados via `createAccessControl`.
  - A opção `adminRoles` precisa ser `["coordenacao"]`, porque o padrão é `["admin"]`.
  - Um usuário banido que tenta logar recebe `403` com `code: "BANNED_USER"`, e a mensagem pode ser configurada em `bannedUserMessage`.
  - `auth.api.createUser` cria usuários pelo servidor mesmo com `disableSignUp: true`.
- **Implicação**:
  - Esta spec configura os papéis e trata o erro `BANNED_USER`.
  - Banir e desbanir usuários fica para a spec `cadastro-catequistas`.

### Bloqueio após tentativas falhas (Req 4)
- **Achado**:
  - O rate limit nativo conta por IP e rota. O padrão em `/sign-in/email` é de 3 requisições a cada 10 s.
  - Os hooks `before` e `after`, criados com `createAuthMiddleware` e `APIError` (de `better-auth/api`), permitem interceptar `/sign-in/email`.
- **Implicação**:
  - Criar a tabela `LoginAttempt` e uma política pura, testável.
  - Manter o rate limit por IP como uma camada extra de proteção, desligado no ambiente de teste.
- **A verificar na implementação**: como o hook `after` detecta que o login falhou (`ctx.context.returned` ou `isAPIError`).

### Next.js 16 e a integração com o Better Auth
- **Achado**:
  - A rota `app/api/auth/[...all]/route.ts` usa `toNextJsHandler(auth)`.
  - O plugin `nextCookies()` precisa ser o **último** da lista, e é ele que permite que Server Actions gravem cookies.
  - `auth.api.getSession({ headers: await headers() })` funciona em componentes do servidor e em Server Actions.
  - `getSessionCookie` só confirma que o cookie existe.
  - Server Actions são enviadas como POST para a rota da página, então a checagem do `proxy` não é suficiente.
- **Implicação**: toda autorização passa por uma DAL (`requireSession` / `requireRole`), chamada em layouts, páginas e actions (Req 6.4).

### E-mail sem diferenciar maiúsculas
- **Achado**: o Better Auth converte o e-mail para minúsculas no login e na criação de conta, mas não remove espaços.
- **Implicação**:
  - Aplicar `.trim().toLowerCase()` no schema Zod do formulário.
  - A chave do bloqueio por e-mail também usa o e-mail normalizado dessa forma.

## Avaliação de Padrões de Arquitetura

| Opção | Descrição | Vantagens | Riscos | Decisão |
|---|---|---|---|---|
| Monolito Next.js com núcleo de domínio puro + DAL | Páginas e actions finas; regras em `src/modules/*/domain`; acesso a dados e sessão em uma DAL | Regras testáveis sem framework; alinhado ao `structure.md` | É preciso disciplina para não pôr regra nos componentes | ✅ |
| Hexagonal completo (ports/adapters) | Interfaces para todo I/O | Isolamento máximo | Excesso de abstração para uma única implementação | ❌ |
| Autorização só no proxy | Uma única verificação central | Simples | Inseguro: o cookie pode ser forjado e as actions escapam da checagem | ❌ |

## Decisões de Design

### Decisão: bloqueio por e-mail com tabela própria
- **Contexto**: Req 4 (5 falhas em 15 min bloqueiam o e-mail por 15 min).
- **Alternativas**:
  1. rate limit nativo por IP: não atende, porque conta por IP e não por e-mail;
  2. campos `failedCount` e `lockedUntil` no `user`: não funciona para e-mails que não existem, e registrar falhas só de e-mails existentes revelaria quais contas existem;
  3. **tabela `LoginAttempt(email, createdAt)` com política pura** (escolhida).
- **Motivo**: funciona também para e-mails inexistentes, sem revelar se a conta existe (Req 3.2), e a regra fica testável como função pura.
- **Custo**: alguém pode bloquear de propósito o e-mail de um catequista (negação de serviço). Isso é aceitável porque o bloqueio dura só 15 minutos.

### Decisão: a política de senha num único lugar
- **Generalização**: o Req 7 vale para toda criação de conta, inclusive para a futura `cadastro-catequistas`.
- **Implementação**: `senhaSchema` (Zod, mínimo de 8 caracteres) no domínio, com `minPasswordLength: 8` configurado no Better Auth como segunda barreira.

### Decisão: hierarquia de papéis
- **Contexto**: Req 6.5 (a coordenação acessa tudo o que o catequista acessa).
- **Implementação**: `podeAcessar(papelDoUsuario, papeisPermitidos)` no domínio, em que `coordenacao` satisfaz `catequista`. É uma função pura, sem tabela de permissões.

### Decisão: adotar em vez de construir
- **Adotar**: Better Auth (hash de senha scrypt, sessão, cookies, banimento, papéis), Zod (validação), Next (`redirect` e `proxy`).
- **Construir**: somente o bloqueio por e-mail, a hierarquia de papéis, a validação de variáveis de ambiente e o seed.

### Simplificação
- Nada de tabela de permissões nem RBAC granular: dois papéis fixos resolvem.
- Nenhum repositório genérico: o Prisma é usado diretamente na DAL e nos hooks.
- A página inicial de cada papel, por enquanto, é só um placeholder de boas-vindas.

## Riscos e Mitigações
- **API do hook `after` diferente do esperado**: coberta por teste de integração do bloqueio antes de seguir adiante.
- **`createUser` exigindo headers no seed**: validar no primeiro uso. Alternativa: `signUpEmail` com um `auth` configurado só para o seed.
- **Rate limit por IP atrapalhando o e2e**: `rateLimit.enabled` depende do ambiente e fica desligado em teste.
- **Open redirect pelo parâmetro de retorno (`callbackUrl`)**: aceitar apenas caminhos relativos internos.

## Referências
- [Better Auth: Email & Password](https://www.better-auth.com/docs/authentication/email-password)
- [Better Auth: Cookies](https://www.better-auth.com/docs/concepts/cookies)
- [Better Auth: Admin plugin](https://www.better-auth.com/docs/plugins/admin)
- [Better Auth: Rate limit](https://www.better-auth.com/docs/concepts/rate-limit)
- [Better Auth: Hooks](https://www.better-auth.com/docs/concepts/hooks)
- [Better Auth: Next.js](https://www.better-auth.com/docs/integrations/next)
- [Better Auth: Prisma adapter](https://www.better-auth.com/docs/adapters/prisma)
- [Next.js: proxy.ts](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Prisma: upgrade para v7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
