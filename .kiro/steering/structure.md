---
updated_at: 2026-10-05
---
# Estrutura do Projeto

## Filosofia de Organização

**Feature-first**, alinhada aos módulos do domínio (catequizandos, equipe, turmas, programa, presença, autocadastro, auth). Cada spec em `.kiro/specs/<feature>/` corresponde a um módulo em `src/modules/`, o que facilita rastrear requisito → código → teste.

## Padrões de Diretório

### Specs de funcionalidade
**Localização**: `.kiro/specs/<feature>/`
**Propósito**: requisitos, design e tarefas de cada funcionalidade antes da implementação.
**Exemplo**: `.kiro/specs/cadastro-catequizandos/`

### Módulos de domínio (`src/modules/<modulo>/`)
**Propósito**: toda a lógica da feature, em camadas por arquivo.
- `domain/*.ts`: regras e schemas Zod **puros** (sem framework, sem `server-only`, sem persistência). Alvo dos testes unitários.
- `repositorio.ts`: acesso ao Prisma (começa com `import "server-only"`). Devolve tipos próprios do módulo, não modelos do Prisma.
- `actions.ts`: Server Actions (`"use server"`). Validam com os schemas do domínio, checam o papel com `requireRole` e chamam o repositório.
- `mensagens.ts`: códigos de aviso/erro tipados (`CODIGOS_AVISO as const`) usados pela interface.
- `acesso.ts` (quando existe): contrato público da regra de autorização do módulo.
- Arquivos opcionais conforme a necessidade (`autorizacao.ts`, `token.ts`, `actions-publicas.ts`).

**Compartilhado** (`src/modules/compartilhado/`): utilitários sem dono (datas civis, telefone, busca) que qualquer módulo pode importar.

### Rotas (`src/app/`)
App Router. Áreas autenticadas ficam no grupo `(interno)`, separadas por papel (`coordenacao/`, `catequista/`); rotas públicas ficam fora dele (`login`, `inscricao/[token]`, `acesso-negado`). Pastas com prefixo `_` (`_pendentes`, `_encontros`) guardam código compartilhado entre as áreas e não viram rota. As páginas só compõem componentes e chamam repositório/actions.

### Componentes (`src/components/<feature>/`)
Espelham os módulos (`turmas`, `catequizandos`, `equipe`, `programa`, `autocadastro`, `auth`). `comum/` guarda peças genéricas (aviso, confirmação, paginação) e `layout/` a estrutura de página. Sem regra de negócio: ela vem do `domain/`.

### Infraestrutura
- `src/lib/`: integrações (`prisma`, `auth`, `auth-client`, `auth-permissoes`, `env`).
- `src/proxy.ts`: proxy do Next.js (proteção de rotas).
- `src/generated/prisma/`: cliente gerado, não editar.
- `prisma/`: `schema.prisma`, `migrations/` e `seed.ts`.
- `docker/`: inicialização do Postgres local.

### Testes (`tests/`)
Espelham a estrutura dos módulos, uma subpasta por módulo em cada camada:
- `unit/<modulo>/`: domínio puro, mensagens e componentes (Vitest).
- `integration/<modulo>/`: repositório, actions, schema e triggers contra Postgres de teste (Vitest); `helpers.ts` por módulo quando necessário.
- `e2e/<feature>.spec.ts`: fluxos principais por papel (Playwright).

## Convenções de Nomenclatura

- **Specs, pastas e arquivos**: kebab-case em português (`controle-presenca`, `progresso-catequizando.ts`, `formulario-turma.tsx`).
- **Termos de domínio**: em português, fiéis ao vocabulário da catequese (catequizando, catequista, encontro, turma).
- **Identificadores de código**: camelCase para valores e funções, PascalCase para tipos e componentes, em português. Schemas Zod terminam em `Schema` (`criarTurmaSchema`).
- **Testes**: `<arquivo-testado>.test.ts` (unit/integration) e `<feature>.spec.ts` (e2e).

## Organização de Imports

- Alias absoluto `@/*` → `src/*` para tudo que cruza pastas (`@/lib/prisma`, `@/modules/auth/dal`).
- Imports relativos (`./domain/turma`) apenas dentro do mesmo módulo.
- Imports `type` explícitos para tipos.
- Arquivos que tocam persistência começam com `import "server-only"`; os de `domain/` nunca o importam.

## Princípios de Organização de Código

- Cada módulo de domínio é autocontido e depende apenas de módulos compartilhados, nunca de outro módulo de domínio diretamente.
  - Exceção (decisão de 2026-10-01): um módulo pode importar o arquivo `acesso.ts` publicado por um módulo upstream (por exemplo, `@/modules/turmas/acesso`), que é o contrato da regra de autorização. O restante do módulo upstream continua fora de alcance; dados dele, quando necessários, são lidos pelo repositório do próprio módulo.
  - Exceção (decisão de 2026-10-03, spec `autocadastro-catequizandos`): um módulo também pode importar arquivos **puros** `domain/*.ts` de um módulo upstream — sem dependência de framework, de `server-only` nem de persistência — para reaproveitar schemas e regras sem duplicá-los (por exemplo, `@/modules/catequizandos/domain/ficha` e `@/modules/turmas/domain/turma`). Repositórios, actions e demais arquivos do upstream continuam fora de alcance.
- As regras de negócio ficam separadas da camada de interface e da persistência, para permitir testes automatizados.

---
_Documentar padrões, não árvores de arquivos_
