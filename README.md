# acutis-catequese

> Sistema de gestão da catequese de adultos, inspirado em São Carlo Acutis, padroeiro dos informáticos.

## Descrição

O **acutis-catequese** é uma aplicação web que apoia a coordenação e os catequistas de uma paróquia na organização da catequese de adultos. Ele substitui planilhas e cadernos de chamada por um registro único e consultável de catequizandos, catequistas, encontros e frequência.

Este projeto é um trabalho da pós-graduação em Engenharia de Software e foi desenvolvido com a metodologia **Spec Driven Development (Kiro)**.

### Funcionalidades

- [ ] Cadastro de catequizandos
- [ ] Cadastro de catequistas
- [ ] Programa da catequese (encontros e temas)
- [ ] Controle de presença dos catequizandos

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Framework (front + back) | [Next.js 16](https://nextjs.org/) (App Router, Server Actions) + TypeScript |
| Banco de dados | [PostgreSQL](https://www.postgresql.org/) (Docker em dev, [Neon](https://neon.tech/) em produção) |
| ORM | [Prisma 7](https://www.prisma.io/) |
| Autenticação | [Better Auth](https://www.better-auth.com/) |
| Validação | [Zod](https://zod.dev/) |
| Testes | [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) |
| Deploy | [Vercel](https://vercel.com/) |

## Metodologia (Spec Driven Development)

O desenvolvimento segue o fluxo do [Kiro](https://kiro.dev/), aplicado com o [cc-sdd](https://github.com/gotalab/cc-sdd) no Claude Code. Nenhuma funcionalidade é implementada antes de ter requisitos, design e tarefas aprovados.

```
Steering → Discovery (roadmap) → Requirements → Design → Tasks → Implementação + testes → Release
```

### Documentos do projeto (steering)

Contexto persistente que orienta todas as specs:

| Documento | Conteúdo |
|---|---|
| [product.md](.kiro/steering/product.md) | Visão do produto, capacidades e casos de uso |
| [tech.md](.kiro/steering/tech.md) | Stack, padrões de desenvolvimento, ambientes e decisões técnicas |
| [structure.md](.kiro/steering/structure.md) | Organização do código e convenções de nomenclatura |
| [roadmap.md](.kiro/steering/roadmap.md) | Abordagem escolhida, escopo e ordem das specs |

### Specs das funcionalidades

Cada spec fica em `.kiro/specs/<funcionalidade>/`, com os arquivos `brief.md`, `requirements.md` (formato EARS), `design.md` e `tasks.md`.

| # | Spec | Descrição | Status |
|---|---|---|---|
| 1 | [fundacao-autenticacao](.kiro/specs/fundacao-autenticacao/) | Setup do projeto e login com os perfis coordenação e catequista | 🚀 Entregue (v0.1.0) |
| 2 | [cadastro-catequistas](.kiro/specs/cadastro-catequistas/) | Cadastro de catequistas com conta de acesso | ✅ Tarefas aprovadas |
| 3 | [cadastro-catequizandos](.kiro/specs/cadastro-catequizandos/) | Cadastro de catequizandos e situação sacramental | 📝 Brief |
| 4 | [gestao-turmas](.kiro/specs/gestao-turmas/) | Turmas, catequistas responsáveis e inscrições | 📝 Brief |
| 5 | [programa-catequese](.kiro/specs/programa-catequese/) | Encontros e temas de cada turma | 📝 Brief |
| 6 | [autocadastro-catequizandos](.kiro/specs/autocadastro-catequizandos/) | Link da turma para o adulto preencher a própria ficha (pendente até confirmação) | 📝 Brief |
| 7 | [controle-presenca](.kiro/specs/controle-presenca/) | Chamada por encontro e frequência | 📝 Brief |

Legenda: 📝 Brief · 📋 Requisitos · 📐 Design · ✅ Tarefas aprovadas · 🚧 Em implementação · 🚀 Entregue (release)

## Pré-requisitos

- Git
- Node.js 22 LTS
- Docker (para o PostgreSQL local)

## Instalação e execução

Pré-requisitos: Node.js 22+ e Docker (com Docker Compose).

```bash
git clone https://github.com/geraugu/acutis-catequese.git
cd acutis-catequese
cp .env.example .env
# Gere um segredo de autenticação (32+ caracteres) e cole em BETTER_AUTH_SECRET no .env:
openssl rand -base64 32
npm install
npm run db:up      # sobe o PostgreSQL 17 e aguarda ficar saudável
npm run db:migrate # aplica as migrações do Prisma no banco local
npm run db:seed    # cria a conta inicial de coordenação (SEED_COORDENACAO_*)
npm run dev
```

O `db:seed` lê `SEED_COORDENACAO_EMAIL`, `SEED_COORDENACAO_SENHA` (mínimo 8 caracteres) e `SEED_COORDENACAO_NOME` do `.env`. Rodar de novo não altera uma conta já existente.

Para parar o banco: `npm run db:down`. Se faltar ou for inválida alguma variável do `.env`, a aplicação não inicia e a mensagem indica qual variável corrigir.

### Variáveis de ambiente

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Banco da aplicação (dev: `acutis_dev` no Docker) |
| `DATABASE_URL_TEST` | Banco dos testes de integração e e2e (`acutis_test`, criado pelo Docker Compose) |
| `BETTER_AUTH_SECRET` | Segredo da autenticação, com no mínimo 32 caracteres (gere com `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | URL pública da aplicação (dev: `http://localhost:3000`) |
| `AUTH_RATE_LIMIT` | `on` ou `off`: limite de requisições por IP no login |
| `SEED_COORDENACAO_EMAIL` / `_SENHA` / `_NOME` | Conta inicial de coordenação criada pelo `db:seed` |

## Testes

Com o banco rodando (`npm run db:up`):

```bash
npm run lint              # análise estática
npm run typecheck         # verificação de tipos
npm run format:check      # formatação (Prettier)
npm run test:unit         # testes unitários (Vitest; domínio e componentes)
npm run test:integration  # testes de integração (Vitest + banco acutis_test)
npm run test:e2e          # testes ponta a ponta (Playwright; faz build e sobe a aplicação)
npm test                  # unitários + integração
```

Na primeira execução do e2e, instale o navegador com `npx playwright install chromium`. Os testes de integração e e2e limpam as tabelas do `acutis_test`, então não os rode ao mesmo tempo.

A cada push e pull request, o [GitHub Actions](.github/workflows/ci.yml) executa três jobs: **Qualidade** (lint, tipos, formatação), **Testes** (unitários e integração) e **E2E**.

## Exemplos de uso

> Em construção. Aqui entrarão capturas de tela e fluxos, como cadastrar um catequizando e registrar presença.

## Limitações conhecidas

> Em construção.

## Versionamento

- Commits no padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/).
- Releases com [versionamento semântico](https://semver.org/lang/pt-BR/), publicadas nas tags do GitHub.

## Créditos

- **Autor:** Geraldo Figueiredo
- **Inspiração:** São Carlo Acutis (1991–2006)
- **Metodologia:** Kiro SDD por meio do cc-sdd

## Licença

Distribuído sob a licença [MIT](LICENSE).
