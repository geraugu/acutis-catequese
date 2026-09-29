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
| 1 | [fundacao-autenticacao](.kiro/specs/fundacao-autenticacao/) | Setup do projeto e login com os perfis coordenação e catequista | 📝 Brief |
| 2 | [cadastro-catequistas](.kiro/specs/cadastro-catequistas/) | Cadastro de catequistas com conta de acesso | 📝 Brief |
| 3 | [cadastro-catequizandos](.kiro/specs/cadastro-catequizandos/) | Cadastro de catequizandos e situação sacramental | 📝 Brief |
| 4 | [gestao-turmas](.kiro/specs/gestao-turmas/) | Turmas, catequistas responsáveis e inscrições | 📝 Brief |
| 5 | [programa-catequese](.kiro/specs/programa-catequese/) | Encontros e temas de cada turma | 📝 Brief |
| 6 | [controle-presenca](.kiro/specs/controle-presenca/) | Chamada por encontro e frequência | 📝 Brief |

Legenda: 📝 Brief · 📋 Requisitos · 📐 Design · ✅ Tarefas aprovadas · 🚧 Em implementação · 🚀 Entregue (release)

## Pré-requisitos

- Git
- Node.js 22 LTS
- Docker (para o PostgreSQL local)

## Instalação e execução

```bash
git clone https://github.com/geraugu/acutis-catequese.git
cd acutis-catequese
cp .env.example .env
docker compose up -d
npm install
npm run dev
```

> Os comandos serão confirmados quando a stack for definida.

## Testes

```bash
npm test
```

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
