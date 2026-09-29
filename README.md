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

O desenvolvimento segue o fluxo do Kiro, aplicado com o [cc-sdd](https://github.com/gotalab/cc-sdd) no Claude Code:

1. **Steering** (`.kiro/steering/`): contexto persistente do projeto (produto, tecnologia e estrutura).
2. **Requirements**: requisitos no formato EARS.
3. **Design**: arquitetura e decisões técnicas.
4. **Tasks**: plano de implementação.
5. **Implementação**: código e testes.

As specs de cada funcionalidade ficam em `.kiro/specs/<funcionalidade>/`.

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
