# Research & Design Decisions: controle-presenca

## Summary
- **Feature**: `controle-presenca`
- **Discovery Scope**: Extensão (discovery leve). A spec acrescenta um módulo `presenca` ao monolito Next.js existente, apoiado em `gestao-turmas` e `programa-catequese`. Não há dependência externa nova.
- **Key Findings**:
  - Não há como saber a turma de uma presença só pelo encontro sem um join; a frequência por catequizando e por turma pede agrupamento. Decidiu-se gravar `turmaId` na própria presença (o encontro nunca muda de turma).
  - A regra de dependência (`structure.md`) só permite importar `acesso.ts` e `domain/*.ts` puros dos módulos upstream. Por isso a spec lê encontros, inscrições e catequizandos pelo próprio repositório e marca o encontro como realizado numa transação própria, reaproveitando só a tabela `TRANSICOES` pura de `programa/domain/encontro`.
  - O percentual deve ser comparado com o limite sem arredondar (7.4), mas exibido arredondado (5.3). Um catequizando com 66,7% aparece como "67%" e continua em alerta se o limite for 67%. A comparação usa aritmética inteira (`presentes × 100 < limite × total`) para não depender de ponto flutuante.

## Research Log

### Reutilização da regra de acesso por turma
- **Context**: Requisito 1 reaproveita a regra de `gestao-turmas`.
- **Findings**: `@/modules/turmas/acesso` exporta `podeVerTurma(sessao, turmaId)` e `podeVerCatequizando(sessao, catequizandoId)`. O padrão de uso é `requireRole` (ou `requireSession`) seguido de `podeVerTurma`, com `redirect("/acesso-negado")`. O módulo `autocadastro` já tem um `autorizacao.ts` com `autorizarTurma`.
- **Implications**: `presenca` tem o próprio `autorizacao.ts` com a mesma forma. A ficha do catequizando usa `podeVerCatequizando`.

### Estado dos encontros e da reabertura
- **Context**: Requisitos 2.3, 3.4 e 3.5 acionam a situação "realizado" e convivem com a reabertura de `programa-catequese`.
- **Findings**: `programa` muda a situação com `updateMany` condicional (`situacao IN de`). `TRANSICOES.realizar` é `planejado → realizado`; `reabrir` volta a `planejado`. Nada em `programa` apaga presenças, porque ele não conhece presenças.
- **Implications**: A frequência e o progresso só contam presenças cujo encontro está `realizado` (join na leitura). Assim a reabertura faz o encontro sair dos cálculos sem apagar nem copiar nada. Salvar a chamada de um encontro `planejado` faz `updateMany` condicional dentro da mesma transação das presenças.

### Quem consta na chamada
- **Context**: "Inscrito da turma" é a inscrição vigente na data do encontro (2.1, 3.3, 5.2).
- **Findings**: `Inscricao` guarda `dataEntrada` e `dataSaida` (`DATE`). Na transferência, as duas inscrições usam a mesma data (`gestao-turmas`, requisito 5.4).
- **Implications**: Regra adotada: `dataEntrada ≤ data do encontro` e (`dataSaida` nula ou `data do encontro < dataSaida`). A saída é exclusiva, o que evita contar o catequizando transferido em duas turmas no mesmo dia.

### Busca de visitantes
- **Context**: O catequista só enxerga catequizandos das próprias turmas, mas precisa achar um de outra turma (4.2).
- **Findings**: O cadastro não guarda o nome normalizado; a busca por nome usa `normalizarBusca` de `compartilhado/busca.ts` em memória (a base é pequena, de uma paróquia).
- **Implications**: Consulta própria no repositório de `presenca`, que devolve só `{ id, nome, turmaOrigemId, turmaOrigemNome }`. É a exceção de leitura registrada nos requisitos, e fica restrita ao catequista que tem acesso à turma visitada.

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Módulo `presenca` novo, com domínio puro | Mesma estrutura de `programa`: `domain/`, `repositorio.ts`, `actions.ts` | Segue o padrão do projeto; frequência vira função pura testável | Cálculos em memória sobre agregados do banco | Escolhida |
| Estender o módulo `programa` | Presenças dentro de `programa` | Menos arquivos | Mistura donos de dados; `programa` já é a spec anterior | Rejeitada |
| Materializar o percentual numa coluna | Guardar a frequência pronta | Leitura rápida | Precisa invalidar a cada correção, reabertura, troca de limite | Rejeitada: o volume é pequeno e o cálculo é barato |

## Design Decisions

### Decision: `turmaId` e `turmaOrigemId` na presença
- **Context**: Agrupar por turma e catequizando sem join com `encontro`, e mostrar de onde veio o visitante mesmo após uma transferência.
- **Alternatives Considered**: (1) derivar a turma pelo encontro; (2) gravar na presença.
- **Selected Approach**: `Presenca` guarda `turmaId` (turma do encontro) e, para visitantes, `turmaOrigemId`.
- **Rationale**: O encontro nunca muda de turma, então a cópia não perde sincronia. A inscrição de origem muda, e o histórico precisa do valor da época.
- **Trade-offs**: Uma coluna redundante, protegida por chave estrangeira composta lógica na criação (a ação grava a turma do encontro lido).

### Decision: situação do visitante e a falta da turma de origem
- **Context**: Decisões de 2026-10-05: a falta continua; a reposição só cumpre o tema.
- **Selected Approach**: A frequência usa `visitante = false`. O progresso usa qualquer presença `presente` em encontro realizado, de qualquer tipo.
- **Rationale**: Os dois cálculos ficam independentes e cada um é uma função pura.

### Decision: marcar o encontro como realizado dentro da chamada
- **Selected Approach**: A ação `salvarChamada` grava as presenças e faz `updateMany` condicional em `encontro` (`situacao = planejado`) na mesma transação. Se o `count` for 0, a transação é revertida e a pessoa vê "A situação deste encontro mudou".
- **Rationale**: Atomicidade: nunca existe encontro realizado sem chamada nem chamada de um encontro que mudou de situação no meio.

### Decision: visitante em página própria
- **Context**: Adicionar visitante pela mesma tela da chamada perderia os status já marcados, que ainda não foram salvos.
- **Selected Approach**: O visitante é gerenciado em `…/chamada/visitantes`, com ações que gravam na hora. A chamada só mostra a lista de visitantes e um link.
- **Trade-offs**: Um passo a mais, mas sem estado compartilhado entre formulários.

### Decision: limite único em tabela de uma linha
- **Selected Approach**: `limite_frequencia` com uma linha (`id = 1`) e `CHECK` de 1 a 100. Sem linha, vale 75 (`LIMITE_PADRAO`, em código). A ação grava com `upsert`.
- **Rationale**: Não exige seed nem migração de dados, e o padrão mora no domínio, onde é testado.

### Build vs. adopt
- Nenhuma biblioteca nova. Zod, Prisma, `datas.ts` e `busca.ts` cobrem tudo.

### Simplificação
- Sem cache nem materialização de percentuais.
- Sem tabela de visitantes à parte: um visitante é uma presença com `visitante = true`.
- Sem componente genérico de "relatório": só as telas pedidas.

## Risks & Mitigations
- **Duas pessoas salvam a chamada ao mesmo tempo** — o `updateMany` condicional garante um só vencedor na transição `planejado → realizado`; nas correções vale a última gravação por catequizando.
- **Inscrição editada depois da chamada** — a lista de correção une os registros existentes com os inscritos elegíveis na data, então ninguém some da tela.
- **Visitante vira inscrito da turma visitada** — a chave única `(encontroId, catequizandoId)` impede duplicidade; o registro existente prevalece como visitante e o catequizando sai da lista de inscritos daquele encontro.
- **Ruído do alerta** (0% após uma falta) — decisão do autor: sem mínimo de encontros (requisito 7.4). Se incomodar, o ajuste é um parâmetro na função `emAlerta`.
- **Limite com arredondamento** — comparação em inteiros, coberta por teste unitário de fronteira.

## References
- `.kiro/specs/programa-catequese/design.md` — padrão de módulo, páginas compartilhadas e testes.
- `.kiro/specs/gestao-turmas/design.md` — regra de acesso e inscrições.
- `.kiro/steering/structure.md` — regras de dependência entre módulos.
