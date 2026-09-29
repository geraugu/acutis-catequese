# Brief: cadastro-catequistas

## Problem
A coordenação não tem um registro central de quem são os catequistas, como contatá-los e quem pode acessar o sistema.

## Current State
Após a fundação, existe login, mas somente a conta de seed da coordenação.

## Desired Outcome
A coordenação cria, lista, busca, edita e inativa catequistas. Cada catequista tem uma conta de acesso com papel "catequista".

## Approach
- CRUD com Server Actions.
- Validação com schema compartilhado (Zod).
- A criação do catequista gera a conta de usuário no Better Auth, com uma senha inicial definida pela coordenação.

## Scope
- **In**:
  - dados do catequista (nome, e-mail, telefone, observações);
  - criação da conta vinculada;
  - listagem com busca;
  - edição;
  - inativação (bloqueia o login).
- **Out**:
  - vínculo com turmas (fica em gestao-turmas);
  - histórico de formação do catequista.

## Boundary Candidates
- Entidade Catequista e suas regras
- Ciclo de vida da conta vinculada (ativar e inativar)

## Out of Boundary
- Turmas e responsabilidades
- Presença

## Upstream / Downstream
- **Upstream**: fundacao-autenticacao
- **Downstream**: gestao-turmas

## Existing Spec Touchpoints
- **Extends**: nenhum
- **Adjacent**: fundacao-autenticacao (usuário e papel)

## Constraints
- Apenas a coordenação gerencia catequistas.
- Inativar em vez de excluir, para preservar o histórico.
