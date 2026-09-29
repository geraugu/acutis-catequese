---
updated_at: 2026-09-29
---
# Estrutura do Projeto

> **Status**: ainda não há código. A organização será definida junto com a stack, no design da primeira spec.

## Filosofia de Organização

Preferência inicial: **organização por funcionalidade (feature-first)**, alinhada aos módulos do domínio (catequizandos, catequistas, programa, presença). Isso facilita rastrear cada spec até o código correspondente.

## Padrões de Diretório

### Specs de funcionalidade
**Localização**: `.kiro/specs/<feature>/`
**Propósito**: requisitos, design e tarefas de cada funcionalidade antes da implementação.
**Exemplo**: `.kiro/specs/cadastro-catequizandos/`

### Código-fonte
A definir.

## Convenções de Nomenclatura

- **Specs/pastas de feature**: kebab-case em português (`controle-presenca`)
- **Termos de domínio**: em português, fiéis ao vocabulário da catequese (catequizando, catequista, encontro, turma)
- **Arquivos e identificadores de código**: a definir com a stack

## Organização de Imports

A definir com a stack.

## Princípios de Organização de Código

- Cada módulo de domínio é autocontido e depende apenas de módulos compartilhados, nunca de outro módulo de domínio diretamente.
- As regras de negócio ficam separadas da camada de interface e da persistência, para permitir testes automatizados.

---
_Documentar padrões, não árvores de arquivos_
