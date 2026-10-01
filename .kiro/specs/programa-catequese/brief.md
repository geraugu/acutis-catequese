# Brief: programa-catequese

## Problem
O programa da catequese (sequência de encontros e temas) não é registrado de forma estruturada, o que dificulta o planejamento e a chamada.

## Current State
Existem turmas, mas elas não têm encontros.

## Desired Outcome
Cada turma tem um cronograma de encontros com data, tema e descrição. A coordenação e os catequistas da turma planejam e consultam os encontros.

## Approach
- Entidade Encontro pertencente a uma Turma.
- Listagem cronológica com os próximos encontros em destaque.

## Scope
- **In**:
  - criar, editar, cancelar e listar encontros por turma;
  - tema e descrição;
  - status (planejado, realizado, cancelado).
- **Out**:
  - biblioteca de temas reutilizável entre turmas;
  - materiais e anexos;
  - calendário externo.

## Boundary Candidates
- Entidade Encontro e status

## Out of Boundary
- Registro de presença

## Upstream / Downstream
- **Upstream**: gestao-turmas
- **Downstream**: controle-presenca

## Existing Spec Touchpoints
- **Extends**: nenhum
- **Adjacent**: gestao-turmas (autorização por turma)

## Constraints
- O catequista só gerencia encontros das próprias turmas.
- **Programa comum (decisão de 2026-10-01):** todas as turmas seguem o mesmo programa de temas. Os encontros de turmas diferentes sobre o mesmo tema precisam ser identificáveis como equivalentes, para que o catequizando possa repor um tema em outra turma (ver `controle-presenca`).
