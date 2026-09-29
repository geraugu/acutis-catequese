# Brief: controle-presenca

## Problem
A chamada é feita em papel e a frequência não é acompanhada, então a coordenação não identifica a tempo quem está se afastando.

## Current State
Existem turmas com catequizandos inscritos e encontros planejados.

## Desired Outcome
- O catequista registra a presença (presente, ausente ou justificado) de cada catequizando da turma em um encontro, inclusive pelo celular.
- O sistema calcula o percentual de frequência e destaca quem está abaixo de um limite.

## Approach
- Entidade Presença (encontro × catequizando).
- Tela de chamada otimizada para mobile.
- Cálculo de frequência como função pura, com testes unitários.

## Scope
- **In**:
  - chamada por encontro;
  - edição da chamada;
  - frequência por catequizando e por turma;
  - alerta de baixa frequência.
- **Out**:
  - exportação ou relatórios em PDF;
  - notificações automáticas;
  - check-in por QR code.

## Boundary Candidates
- Registro de chamada
- Cálculo e exibição de frequência

## Out of Boundary
- Gestão de encontros e turmas

## Upstream / Downstream
- **Upstream**: programa-catequese, gestao-turmas
- **Downstream**: futuros relatórios e certificados

## Existing Spec Touchpoints
- **Extends**: nenhum
- **Adjacent**: programa-catequese (status do encontro)

## Constraints
- Limite de frequência configurável (valor padrão a definir nos requisitos).
- Uso em celular durante o encontro.
