# Brief: cadastro-catequizandos

## Problem
Os dados dos adultos em formação ficam espalhados em fichas de papel e planilhas. Isso dificulta saber quem está em qual etapa e quais sacramentos cada um já recebeu.

## Current State
Após a fundação, não há nenhuma entidade de domínio.

## Desired Outcome
A coordenação cria, lista, busca, edita e inativa catequizandos. A ficha registra os dados pessoais e a situação sacramental (batismo, eucaristia, crisma).

## Approach
- CRUD com Server Actions.
- Validação com Zod.
- Regras de domínio (validações, situação sacramental) em módulos puros com testes unitários.

## Scope
- **In**:
  - dados pessoais (nome, data de nascimento, contato, endereço opcional);
  - sacramentos recebidos;
  - observações pastorais;
  - listagem com busca e filtros;
  - inativação.
- **Out**:
  - inscrição em turma;
  - upload de documentos (certidões);
  - autocadastro.

## Boundary Candidates
- Entidade Catequizando e validações
- Situação sacramental

## Out of Boundary
- Turmas, encontros e presença

## Upstream / Downstream
- **Upstream**: fundacao-autenticacao
- **Downstream**: gestao-turmas, controle-presenca

## Existing Spec Touchpoints
- **Extends**: nenhum
- **Adjacent**: cadastro-catequistas (padrões de CRUD em comum)

## Constraints
- LGPD: coletar o mínimo necessário.
- Somente a coordenação edita; o catequista consulta apenas os catequizandos das próprias turmas (regra aplicada em gestao-turmas).
- Idade mínima de adulto a definir nos requisitos.
