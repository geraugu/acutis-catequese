# Research & Design Decisions — reposicao-guiada

## Summary
- **Feature**: `reposicao-guiada`
- **Discovery Scope**: Extension (descoberta leve). A feature reaproveita o progresso por tema, o visitante e a regra de acesso de `controle-presenca`, e lê encontros, inscrições e temas já existentes. Nenhuma biblioteca nova.
- **Key Findings**:
  - O visitante já é uma `Presenca` com `visitante = true`; a reposição guiada só precisa de uma **intenção prévia** (reserva) e de uma consulta que cruze temas pendentes com encontros futuros.
  - `Presenca` é única por `(encontroId, catequizandoId)` e só guarda presença do visitante como `presente`; "não compareceu" não vira linha de presença, fica na reserva.
  - Os módulos `programa` e `turmas` não podem ser editados por esta spec (cancelar encontro, trocar tema, desligar aluno). A reação a essas mudanças é **derivada na leitura**, sem tocar neles.

## Research Log
### Cálculo dos temas a repor
- **Context**: o requisito 2 pede temas ativos pendentes que já foram trabalhados na turma de origem.
- **Sources**: `domain/progresso-catequizando.ts` (`calcularProgressoCatequizando`), `repositorio.ts` (`cumpridosDoCatequizando`, `temasAtivosNumerados`).
- **Findings**: `pendentes` já devolve todos os temas ativos sem presença presente. Falta apenas interseccionar com os temas de encontros **realizados** das turmas de origem.
- **Implications**: nova função pura `temasARepor` e uma consulta de temas trabalhados; sem mudar o progresso existente.

### Opções e conflitos
- **Findings**: uma única consulta de encontros candidatos (planejados, data >= hoje, turma aberta, fora das turmas de origem, com tema entre os a repor) evita N+1; o conflito de data usa os encontros da própria turma e as reservas ativas do catequizando.

### Reação a mudanças de outros módulos
- **Findings**: encontro cancelado, tema trocado, saída do aluno e turma encerrada alteram dados que a reserva apenas referencia.
- **Implications**: situação efetiva derivada na leitura (função pura) e **materializada** como `cancelada` nas escritas do mesmo catequizando (reserva nova, confirmação). Evita editar `programa` e `turmas` e mantém o índice de unicidade correto.

## Architecture Pattern Evaluation
| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Estender o módulo `presenca` | Novos arquivos `reposicao-*` no módulo | Reaproveita visitante, autorização e chamada sem importar repositórios alheios | O módulo cresce | Escolhido |
| Novo módulo `reposicao` | Módulo próprio | Isolamento | Teria de duplicar a escrita de visitante ou importar `presenca/repositorio` (proibido) | Rejeitado |
| Cascata nas actions de `programa`/`turmas` | Cancelar reservas ao cancelar encontro etc. | Estado sempre materializado | Acopla specs e viola a regra de dependência | Rejeitado |

## Design Decisions
### Decision: reserva com situação derivada
- **Context**: requisito 6 (mudanças que afetam a reserva) sem editar módulos upstream.
- **Selected Approach**: situação persistida `reservada | compareceu | nao_compareceu | cancelada`; "efetiva" calculada na leitura; materialização nas escritas.
- **Trade-offs**: se um encontro cancelado for reaberto antes de qualquer escrita, a reserva volta a valer. Comportamento aceito e documentado.
### Decision: confirmação reutiliza o visitante
- **Selected Approach**: confirmar comparecimento chama o `adicionarVisitante` existente, que passa a marcar a reserva como `compareceu` na mesma transação.
- **Follow-up**: `salvarChamada` marca `reservada` como `nao_compareceu` na mesma transação; `removerVisitante` devolve `compareceu` para `reservada`.
### Decision: generalização
- O conceito "encontro candidato para um tema" serve tanto à lista de opções quanto à validação da reserva; uma só consulta e uma só função pura (`opcoesDoTema`).

## Risks & Mitigations
- Corrida entre duas reservas do mesmo tema → índice único parcial em `(catequizandoId, temaId)` onde `situacao = 'reservada'`.
- Reserva obsoleta bloqueando nova reserva → materializar obsoletas antes de inserir.
- Ampliação da leitura entre turmas → limitada a nome da turma, dia, data, horário e tema do encontro; e nome e turma de origem do catequizando na chamada.

## References
- `.kiro/specs/controle-presenca/design.md` (visitante, progresso, acesso)
- `.kiro/steering/structure.md` (regras de dependência entre módulos)
