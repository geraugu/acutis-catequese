# Research & Design Decisions: organizacao-pagina-turma

## Summary
- **Feature**: `organizacao-pagina-turma`
- **Discovery Scope**: Extensão (discovery leve). Reorganiza páginas existentes do monolito Next.js 16 em abas por rota. Não há dependência externa nova e não há mudança de dados.
- **Key Findings**:
  - Os layouts do Next não re-renderizam na navegação entre rotas irmãs (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`, seção "Layouts and auth checks"). Por isso o acesso à turma precisa ser checado em **cada página de aba**, e o layout só pode exibir dados que não vazem (nome da turma e contagem de pendentes) depois da própria checagem.
  - As duas páginas atuais (`coordenacao/turmas/[id]` e `catequista/turmas/[id]`) repetem a maior parte do conteúdo e diferem em ações e em quem pode vê-las. O mesmo vale para os cronogramas. O projeto já resolve isso com componentes compartilhados em `src/app/(interno)/_*/paginas.tsx`, com rotas finas por papel.
  - Os redirects das ações precisam mudar de destino: as 4 ações da coordenação que hoje voltam para `/coordenacao/turmas/[id]?aviso=` (inscrever, desligar, designar, remover) e as do autocadastro (`paginaDaTurma`), incluindo a confirmação de ficha, que hoje volta para a página principal.
  - O código atual já trata o catequista como visão de consulta, mas ele gerencia o link de autocadastro (`SecaoLink` com ações). A aba "Equipe e link" tem o mesmo conteúdo para os dois papéis, com as ações de catequista só para a coordenação.

## Research Log

### Layouts, grupos de rotas e abas por rota
- **Context**: Abas por rota, com cabeçalho persistente e páginas de tarefa sem abas (requisitos 1 e 7).
- **Findings**: Um grupo de rotas `(abas)` dentro de `turmas/[id]/` permite um `layout.tsx` que cobre só as cinco páginas de aba, sem mudar as URLs. As páginas de tarefa (`editar`, `encontros/novo`, `encontros/[encontroId]/**`, `pendentes/**`) ficam fora do grupo e, portanto, sem o layout. `useSelectedLayoutSegment()` (em `next/navigation`), chamado por um componente cliente renderizado pelo layout do grupo, devolve `null` na página principal e `"inscritos"`, `"frequencia"`, `"encontros"` ou `"equipe"` nas demais. O `not-found` mais próximo de um layout é o do segmento pai.
- **Implications**: A barra de abas é um componente cliente pequeno que identifica a aba atual por esse hook. O layout e a barra não dependem de `searchParams`.

### Onde checar o acesso
- **Context**: Requisito 9.1 (acesso em cada aba, inclusive por endereço direto) e a regra de layouts que não re-renderizam.
- **Findings**: Hoje cada página chama `requireRole` com o caminho exato e `podeVerTurma`. O layout também precisa disso antes de ler o nome e a contagem, porque, numa carga direta, ele roda junto com a página.
- **Implications**: `requireRole` e `podeVerTurma` rodam no layout e em cada página de aba, por uma função compartilhada (`carregarTurmaDaAba`). O nome vem de `dadosDaTurma` (leitura leve do programa). A contagem de pendentes vem de `obterLinkDaTurma(turmaId).pendentes`.

### Contagem de pendentes no cabeçalho
- **Findings**: `obterLinkDaTurma` já devolve `pendentes` (`prisma.fichaAutocadastro.count`). O layout não re-renderiza ao trocar de aba, então a contagem pode ficar defasada até a pessoa sair e voltar ao grupo, ou até uma ação chamar `revalidatePath(base, "layout")`.
- **Implications**: As ações do autocadastro que mudam a contagem (confirmar e descartar ficha) passam a revalidar o layout. Uma ficha nova enviada por outra pessoa só aparece na próxima carga. É uma limitação aceita e documentada.

### Mensagens de confirmação (`?aviso=`)
- **Findings**: A página principal combina as mensagens de `turmas` e de `autocadastro`; o cronograma combina as de `programa` e de `presenca`. O layout não lê `searchParams`.
- **Implications**: Cada página de aba lê o seu `aviso` e usa um tradutor compartilhado `avisoDaTurma` (turmas, depois autocadastro). O cronograma mantém o dele.

### Texto dos links de volta
- **Findings**: Hoje os textos variam: "← Voltar para {turma}", "← Voltar para os encontros", "← Voltar para as fichas pendentes", "Voltar para a chamada".
- **Implications**: Os textos passam a ser os do requisito 7.2, e os destinos mudam (fila de pendentes volta para a aba Equipe e link; edição da turma volta para o Resumo).

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Abas por rota com layout em grupo `(abas)` | Cabeçalho e barra no layout; cada aba é uma página | URLs próprias; só carrega o que a aba usa; reaproveita `/encontros`; páginas de tarefa ficam sem abas | Mover arquivos e atualizar testes; contagem no layout pode ficar defasada | Escolhida |
| Abas por `?aba=` na mesma página | Um componente decide o que mostrar | Menos arquivos movidos | O servidor monta tudo a cada visita; `?aviso`, `?q` e `?ordem` disputam a URL | Rejeitada pelo autor (2026-10-05) |
| ARIA `tablist` com painéis no cliente | Troca de painel no navegador | Troca instantânea | Perde endereço por aba e exige estado no cliente | Rejeitada: as abas são navegação entre páginas |

## Design Decisions

### Decision: abas como navegação, não como widget `tablist`
- **Context**: Cada aba é uma página com endereço próprio.
- **Selected Approach**: `<nav>` com uma lista de links e `aria-current="page"` na atual. Sem `role="tablist"`.
- **Rationale**: A orientação de acessibilidade para "abas" que trocam de página é o padrão de navegação, e o teclado funciona só com Tab, que atende ao requisito 11.3 sem JavaScript de roving focus.
- **Trade-offs**: Não há navegação por setas entre as abas; a ordem de Tab basta para cinco itens.

### Decision: rotas finas por papel e componentes compartilhados
- **Selected Approach**: As rotas de cada papel só chamam `requireRole` com o caminho exato e delegam para `_turma/abas.tsx` e `_turma/layout-turma.tsx`, como já fazem `_encontros`, `_presenca` e `_pendentes`. A página atual do catequista deixa de ser uma cópia da da coordenação.
- **Rationale**: Elimina a duplicação e garante a mesma estrutura nos dois papéis (requisito 9.5).

### Decision: separar o bloco de presença em dois
- **Selected Approach**: `BlocoFrequenciaDaTurma` (que hoje devolve a chamada de hoje e a frequência) é dividido em `BlocoChamadaDeHoje` (vai para o Resumo) e `BlocoFrequenciaDaTurma` (só a frequência, vai para a aba Frequência).
- **Rationale**: Cada bloco vai para a aba onde faz sentido, e a chamada de hoje precisa só dos encontros que o Resumo já lê.

### Decision: destino dos redirects pela aba, com um helper
- **Selected Approach**: `paginaDaTurma(sessao, turmaId, aba?)` no autocadastro e uma função equivalente em `turmas/actions.ts` montam `/{papel}/turmas/{id}[/aba]`. As ações de link vão para `equipe`; a confirmação de ficha vai para `inscritos`; criar, editar e encerrar continuam na principal (Resumo).
- **Rationale**: Um único ponto por módulo conhece os caminhos das abas.

### Decision: um `not-found` por turma, no segmento `[id]`
- **Selected Approach**: `turmas/[id]/not-found.tsx` nos dois papéis (a coordenação já tem; o catequista ganha um). Os `encontros/not-found.tsx` continuam para as páginas de tarefa.
- **Rationale**: O `notFound()` do layout é tratado pelo segmento pai, e a mesma tela serve para as cinco abas.

### Build vs. adopt
- Nenhuma biblioteca nova. Só `next/navigation` e `react` (`cache`).

### Simplificação
- Sem estado de aba no cliente, sem `searchParams` no layout e sem componente genérico de abas: a barra tem cinco itens fixos.

## Risks & Mitigations
- **Muitos testes dependem da página principal** — 6 specs e2e e cerca de 10 testes de integração procuram blocos na página da turma. Mitigação: a tarefa de testes lista os arquivos e cada tarefa de aba atualiza os testes do que moveu.
- **Contagem de pendentes defasada** — mitigada por `revalidatePath(base, "layout")` nas ações que a mudam; limitação aceita para fichas enviadas por terceiros.
- **Quebra de links salvos** — `?ordem=` e `?q=` na URL principal passam a ser ignorados (requisito 10.4). Mitigação: os links internos já passam a apontar para as abas novas.
- **Colisão de rotas** — `(abas)/encontros/page.tsx` convive com `encontros/novo` e `encontros/[encontroId]/**` fora do grupo; só uma delas define `page` em `/encontros`. Mitigação: o build lista as rotas, e um teste e2e percorre as cinco abas e uma página de tarefa.

## References
- `node_modules/next/dist/docs/01-app/02-guides/authentication.md` — "Layouts and auth checks".
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-selected-layout-segment.md`.
- `.kiro/specs/gestao-turmas/design.md`, `.kiro/specs/programa-catequese/design.md`, `.kiro/specs/controle-presenca/design.md` — páginas e blocos que são redistribuídos.
