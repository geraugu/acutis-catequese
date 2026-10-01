# Research & Design Decisions: programa-catequese

## Summary
- **Feature**: `programa-catequese`
- **Discovery Scope**: Extension (descoberta leve). A feature estende `gestao-turmas` com o programa de temas e os encontros por turma, sem dependências externas novas.
- **Key Findings**:
  - O projeto já tem todos os padrões necessários: módulo de domínio com `domain/`, `repositorio.ts` (server-only), `actions.ts` ("use server"), `mensagens.ts`; componentes comuns `Aviso` e `Confirmacao` (com `children`); datas civis em `compartilhado/datas`; busca normalizada em `compartilhado/busca`.
  - A autorização por turma já existe em `@/modules/turmas/acesso` (`podeVerTurma`). Ela vale também para gerenciar encontros: a coordenação sempre pode, e o catequista pode quando é responsável pela turma.
  - `requireRole` aceita a coordenação onde se exige catequista, então as páginas do catequista também abrem para a coordenação.

## Research Log

### Reutilização da regra de acesso por turma
- **Context**: as actions de encontros precisam verificar no servidor se o catequista é responsável pela turma (1.3, 1.4, 1.5). O `structure.md` proibia que um módulo de domínio importasse outro.
- **Sources Consulted**: `.kiro/steering/structure.md`; `.kiro/specs/gestao-turmas/design.md` ("Revalidation Triggers": mudança em `podeVerTurma` revalida `programa-catequese`); `src/modules/turmas/acesso.ts`.
- **Findings**: o design de `gestao-turmas` publicou `podeVerTurma` justamente para esta spec. As alternativas eram compor na camada app (fugindo do padrão de actions nos módulos) ou duplicar a leitura de designações.
- **Implications**: decisão do usuário (2026-10-01): o módulo `programa` importa só `@/modules/turmas/acesso`. O `structure.md` foi atualizado com essa exceção. Os dados da turma de que o programa precisa (nome, horário, encerramento) são lidos pelo repositório do próprio programa, na tabela `turma`.

### Unicidade do título do tema sem acentos
- **Context**: 2.4 pede título único sem diferenciar maiúsculas, minúsculas nem acentos.
- **Findings**: o PostgreSQL só ignora acentos com a extensão `unaccent`, que o projeto não usa. `normalizarBusca` (compartilhado) já remove acentos e caixa.
- **Implications**: o tema guarda uma coluna `chave` com o título normalizado por `normalizarBusca`, com índice único. A action consulta a chave antes de gravar, e o índice protege contra concorrência (P2002).

### Ordenação dos temas
- **Context**: 2.6 pede mover para cima e para baixo com numeração contínua.
- **Findings**: trocar posições com índice único em `posicao` exigiria restrição adiável. A numeração exibida pode ser calculada.
- **Implications**: `posicao` é um inteiro sem índice único; mover troca as posições de dois temas ativos vizinhos numa transação. O número exibido é calculado pela ordem dos ativos (1..n), então lacunas em `posicao` não aparecem.

### Conflito de horário e encontros cancelados
- **Context**: 4.7 proíbe dois encontros não cancelados na mesma data e horário; reabrir um cancelado pode recriar o conflito.
- **Implications**: índice único parcial `(turmaId, data, horario) WHERE situacao <> 'cancelado'`. A action verifica antes e converte P2002 na mesma mensagem, inclusive na reabertura.

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Módulo `programa` com temas e encontros | Um módulo de domínio para o programa e os encontros | Os dois são uma única responsabilidade: o encontro existe para dar um tema; progresso e equivalência cruzam os dois | Módulo maior | Escolhida |
| Módulos `programa` e `encontros` separados | Temas num módulo, encontros em outro | Arquivos menores | `encontros` dependeria de `programa` (proibido pela regra de módulos) ou duplicaria leituras | Rejeitada |

## Design Decisions

### Decision: um módulo `programa` para temas e encontros
- **Context**: progresso (6.4, 6.5) e equivalência (8.x) combinam temas e encontros.
- **Selected Approach**: `src/modules/programa` com `domain/tema.ts`, `domain/encontro.ts`, `domain/progresso.ts`, repositório, actions e mensagens.
- **Rationale**: evita dependência entre módulos irmãos e mantém as regras puras testáveis.

### Decision: generalização das transições de situação
- **Context**: realizar, cancelar e reabrir são variações de "mudar a situação se a origem for válida".
- **Selected Approach**: uma tabela pura de transições (`TRANSICOES`) e uma função `mudarSituacao(id, de, para, extras)` no repositório com update condicional (`where situacao = de`). As três actions só diferem na transição e nas validações extras (data futura, motivo).
- **Trade-offs**: a interface é genérica, mas a implementação continua restrita às três transições exigidas.

### Decision: rotas separadas por papel, componentes compartilhados
- **Context**: o padrão de `gestao-turmas` usa `/coordenacao/...` e `/catequista/...` com componentes que recebem a base do link.
- **Selected Approach**: cronograma e formulários em `/coordenacao/turmas/[id]/encontros/**` e `/catequista/turmas/[id]/encontros/**`; programa em `/coordenacao/programa/**` (gestão e equivalência) e `/catequista/programa` (consulta).
- **Rationale**: mantém o padrão de menu e de `requireRole` por caminho.

### Decision: dia da semana nas datas
- **Context**: 9.4 pede a data com o dia da semana.
- **Selected Approach**: acrescentar `formatarDataComDia(data)` em `compartilhado/datas` ("Sábado, 05/10/2026"), reutilizando o cálculo de dia da semana sem fuso.
- **Rationale**: é formatação genérica de data civil, útil também para `controle-presenca`.

### Build vs. adopt
- Nenhuma biblioteca nova. Ordenação por botões (sem arrastar), em vez de uma biblioteca de drag-and-drop, porque 2.6 pede só subir e descer e a operação por teclado (9.2) fica garantida.

### Simplificação
- Sem helper próprio de acesso no módulo `programa`: as actions e páginas chamam `podeVerTurma` diretamente; ver e gerenciar encontros seguem a mesma regra.
- Sem tabela de histórico de situações: o motivo do cancelamento fica no próprio encontro e é limpo na reabertura.

## Risks & Mitigations
- **Exceção à regra de módulos** — restrita ao arquivo `acesso.ts` e registrada no `structure.md`; mudanças em `podeVerTurma` revalidam esta spec.
- **Reabertura gerando conflito de horário** — índice parcial + mensagem de conflito na reabertura.
- **Tema desativado no meio do programa** — numeração calculada só sobre os ativos; desativados ao fim e fora do progresso (3.6).

## References
- `.kiro/specs/gestao-turmas/design.md` — padrão de módulos, actions, acesso e páginas.
- `.kiro/steering/structure.md` — regra de dependências entre módulos (com a exceção de 2026-10-01).
