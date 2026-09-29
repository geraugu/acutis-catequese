# Brief: gestao-turmas

## Problem
A catequese acontece em turmas, mas não há como organizar quais catequistas conduzem e quais catequizandos participam de cada uma.

## Current State
Catequistas e catequizandos existem como cadastros independentes.

## Desired Outcome
A coordenação cria turmas (nome, ciclo/ano, dia e horário, local), designa catequistas responsáveis e inscreve catequizandos. O catequista vê apenas as próprias turmas.

## Approach
- Entidade Turma com relações N:N com Catequista e com Catequizando (inscrição com data de entrada e saída).
- Regra de autorização por turma exposta como helper reutilizável.

## Scope
- **In**:
  - CRUD de turmas;
  - designação de catequistas;
  - inscrição e desligamento de catequizandos;
  - visão "minhas turmas" do catequista;
  - encerramento de turma.
- **Out**:
  - encontros (programa-catequese);
  - presença.

## Boundary Candidates
- Entidade Turma e ciclo de vida
- Inscrições (catequizando ↔ turma)
- Autorização por turma

## Out of Boundary
- Conteúdo e cronograma dos encontros

## Upstream / Downstream
- **Upstream**: cadastro-catequistas, cadastro-catequizandos
- **Downstream**: programa-catequese, controle-presenca

## Existing Spec Touchpoints
- **Extends**: nenhum
- **Adjacent**: cadastros (regras de inativação que afetam as inscrições)

## Constraints
- Um catequizando em no máximo uma turma ativa por vez (a confirmar nos requisitos).
