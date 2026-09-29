---
updated_at: 2026-09-29
---
# Stack Tecnológica

> Definida no `/kiro-discovery` (2026-09-29), após verificação de viabilidade. Justificativas completas em `roadmap.md`.

## Arquitetura

**Monolito full-stack** com Next.js (App Router):
- A interface usa React Server Components. As mutações passam por Server Actions.
- As regras de negócio ficam em **módulos de domínio puros** (sem dependência de framework). Isso permite testá-las isoladamente com testes unitários.
- A persistência é feita pelo Prisma e fica isolada do domínio.

## Tecnologias Principais

- **Linguagem**: TypeScript (strict)
- **Framework**: Next.js 16.x (App Router, Server Actions)
- **Runtime**: Node.js 22 LTS
- **Banco de dados**: PostgreSQL, também em desenvolvimento (sem SQLite)
- **ORM**: Prisma 7.x com driver adapter `@prisma/adapter-pg` e `prisma.config.ts`

## Bibliotecas-Chave

- **Better Auth 1.x**: autenticação com e-mail e senha. É uma biblioteca, não um serviço, e guarda usuários e sessões no próprio Postgres (adapter Prisma). Os papéis `coordenacao` e `catequista` vêm do plugin `admin`, que também permite bloquear usuários inativos.
- **Zod**: schemas de validação compartilhados entre formulários e Server Actions.

## Padrões de Desenvolvimento

### Tipagem
- TypeScript `strict`, sem `any`.
- Tipos de entrada derivados dos schemas Zod.

### Qualidade de Código
- ESLint e Prettier.
- Lint e typecheck obrigatórios no CI.

### Testes
- **Vitest**: testes unitários do domínio e testes de integração das Server Actions com um banco de teste.
- **Playwright**: testes e2e dos fluxos principais, com um login por papel (`storageState`) e um banco com seed.
- Testes automatizados são obrigatórios (requisito acadêmico). Toda regra de negócio precisa ter teste.

### Controle de Versão
- **Conventional Commits** (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).
- Versionamento semântico: cada spec concluída gera uma release com tag no GitHub.

## Ambientes e Infraestrutura

| Ambiente | Aplicação | Banco |
|---|---|---|
| Desenvolvimento | `next dev` local | PostgreSQL via **Docker Compose** |
| Teste/CI | GitHub Actions | PostgreSQL como service container |
| Produção | **Vercel** | **Neon** (Postgres gerenciado, plano gratuito, integração nativa com a Vercel) |

- Em produção, usar a connection string **com pooling** do Neon.
- `prisma generate` roda no build.
- Não usar URLs `prisma+postgres://` do Accelerate, que será descontinuado em 2026-12-01.
- Segredos só em variáveis de ambiente. O repositório versiona apenas o `.env.example`.

## Ambiente de Desenvolvimento

### Ferramentas Necessárias
- Node.js 22 LTS e npm
- Docker (para o Postgres local)
- Git

### Comandos Comuns
```bash
# Banco: docker compose up -d
# Dev:   npm run dev
# Build: npm run build
# Test:  npm test          (Vitest)
# E2E:   npm run test:e2e  (Playwright)
```

## Decisões Técnicas Importantes

- **Next.js monolito** em vez de front e back separados ou BaaS. Motivos: prazo curto (menos de 2 meses), um único `package.json`, e regras de negócio no próprio código, testáveis e apresentáveis.
- **Better Auth** em vez de Auth.js v5. O Auth.js v5 continua em beta e hoje só recebe correções de segurança. A própria equipe recomenda o Better Auth para projetos novos.
- **Postgres em todos os ambientes.** O Prisma 7 usa provider fixo e migrações específicas por banco, e a Vercel não tem sistema de arquivos persistente.
- **Neon** em vez de Supabase para produção. O plano gratuito do Supabase pausa o projeto após 7 dias sem uso, o que é arriscado perto da apresentação.
- **Specs antes do código**: nada é implementado sem requirements, design e tasks aprovados.

---
_Documentar padrões e decisões, não cada dependência_
