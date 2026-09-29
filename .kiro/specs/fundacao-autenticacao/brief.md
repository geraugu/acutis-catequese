# Brief: fundacao-autenticacao

## Problem
Não existe base técnica nem controle de acesso. Sem isso, nenhuma outra funcionalidade pode ser construída, e os dados pessoais dos catequizandos ficariam expostos.

## Current State
O repositório tem apenas documentação (steering, README e LICENSE). Não há código, `package.json` nem testes.

## Desired Outcome
- Um projeto Next.js roda localmente com Postgres (Docker), e os testes rodam no CI.
- Um usuário faz login com e-mail e senha e é direcionado conforme o seu papel (coordenação ou catequista).
- Rotas protegidas bloqueiam quem não está autenticado ou não tem permissão.

## Approach
- Next.js 16 (App Router) + TypeScript strict.
- Prisma 7 com adapter-pg.
- Better Auth 1.x com o campo `role`.
- Vitest e Playwright.
- GitHub Actions rodando lint, typecheck e testes.
- Seed com uma conta inicial de coordenação.

## Scope
- **In**:
  - estrutura do projeto e ferramentas de qualidade (lint, format, typecheck);
  - banco de dados e migrações;
  - login e logout;
  - sessão;
  - papéis;
  - proteção de rotas e helper de autorização;
  - layout base com navegação por papel;
  - CI;
  - seed.
- **Out**:
  - cadastro de catequistas (a criação de contas de catequistas é da spec seguinte);
  - recuperação de senha por e-mail;
  - login social.

## Boundary Candidates
- Infraestrutura do projeto (tooling, CI, banco)
- Autenticação e sessão
- Autorização por papel (helper reutilizável)

## Out of Boundary
- Regras de domínio da catequese
- Gestão de usuários além da conta inicial de seed

## Upstream / Downstream
- **Upstream**: nenhum
- **Downstream**: todas as demais specs usam a sessão, os papéis e o layout

## Existing Spec Touchpoints
- **Extends**: nenhum
- **Adjacent**: cadastro-catequistas (vínculo entre usuário e catequista)

## Constraints
- Usar Postgres também em dev, sem SQLite.
- Nenhum segredo versionado; incluir `.env.example`.
- Interface em pt-BR.
