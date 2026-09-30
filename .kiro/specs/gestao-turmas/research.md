# Pesquisa e Decisões de Design

## Resumo
- **Feature**: `gestao-turmas`
- **Tipo de discovery**: Extension. A discovery foi leve, focada na integração com `cadastro-catequistas` e `cadastro-catequizandos` e com a regra de dependência entre módulos definida no `structure.md`.
- **Principais descobertas**:
  1. Os requisitos 4.6 e 6.5 pedem que a inativação feita em outras specs afete as turmas: inativar ou rebaixar um catequista remove as designações dele, e inativar um catequizando encerra a inscrição dele. O `structure.md` proíbe que um módulo de domínio importe outro, e as actions de `equipe` e `catequizandos` já estão entregues.
  2. A inativação de membros acontece pelo plugin admin do Better Auth (`banUser`, `setRole`, `adminUpdateUser`), que grava direto na tabela `user`. Não há ponto de extensão na aplicação que cubra todos esses caminhos.
  3. O catequista precisa consultar fichas de catequizandos (9.3). Hoje a página da ficha fica em `/coordenacao/catequizandos/[id]` e exige o papel coordenação.

## Registro de Pesquisa

### Efeitos da inativação sobre as turmas
- **Fonte**:
  - `src/modules/equipe/actions.ts` (inativar e editar, com `setRole`);
  - `src/modules/catequizandos/actions.ts` (`inativarCatequizandoAction`, `recusarFichaAction`);
  - `prisma/schema.prisma`, onde o `User` é do Better Auth.
- **Opções avaliadas**:
  1. As actions da equipe e dos catequizandos chamam funções do módulo `turmas`. Isso viola o `structure.md` e acopla specs já entregues.
  2. Filtrar na leitura: designações de membros inativos ou não catequistas seriam ignoradas. O problema é que, se o membro fosse reativado, as designações "voltariam", o que contraria "removê-lo" (4.6).
  3. **Triggers no PostgreSQL**, criados na migração desta spec:
     - `user` passa a banned ou deixa o papel catequista: a designação vigente recebe `removidoEm`;
     - `catequizando` passa a inativo: a inscrição vigente recebe `dataSaida` = data de hoje em São Paulo e `motivoSaida = inativacao`.
- **Decisão**: opção 3. O efeito é atômico com a inativação, vale para qualquer caminho de escrita (actions, plugin admin, seed) e não exige mudar os módulos das specs anteriores.
- **Implicações**:
  - A regra fica visível na migração e no design, e é coberta por testes de integração que inativam pela action da spec de origem.
  - "Recusar ficha" leva de pendente para inativo. Uma ficha pendente não tem inscrição, então o trigger não faz nada nesse caso.

### Consulta da ficha pelo catequista
- **Achado**: a página de detalhe da coordenação mistura exibição e ações de coordenação.
- **Decisão**:
  - Extrair a exibição da ficha para o componente `FichaCatequizando` (somente leitura) em `components/catequizandos`, que a página da coordenação passa a usar.
  - Criar a rota `/catequista/catequizandos/[id]` na camada `app`, que compõe `obterCatequizando` (catequizandos) com `podeVerCatequizando` (turmas).
  - Composição entre módulos só na camada `app`; os módulos não se importam.

### Regras de unicidade
- **Decisão**:
  - Índices parciais no PostgreSQL:
    - uma inscrição vigente por catequizando (`dataSaida IS NULL`);
    - uma designação vigente por par turma × catequista (`removidoEm IS NULL`);
    - nome único por ciclo entre turmas abertas (`lower(nome)`, `encerradaEm IS NULL`).
  - A aplicação verifica antes, para exibir a mensagem em pt-BR. O índice garante a regra contra concorrência.

## Avaliação de Padrões de Arquitetura

| Opção | Descrição | Vantagens | Riscos | Decisão |
|---|---|---|---|---|
| Módulo `turmas` (domain + repositório + actions + acesso) | Mesmo padrão das specs anteriores | Consistente e testável | — | ✅ |
| Triggers de efeito da inativação | Regra no banco | Desacoplado e atômico | Lógica fora do TS | ✅ (documentada e testada) |
| Composição na camada `app` | Páginas combinam módulos | Respeita o `structure.md` | Páginas um pouco maiores | ✅ |

## Decisões de Design
- **Acesso reutilizável**:
  - `modules/turmas/acesso.ts` com `podeVerTurma` e `podeVerCatequizando`, mais a regra pura em `domain/acesso.ts`.
  - As specs `programa-catequese` e `controle-presenca` vão usar esses mesmos helpers.
- **Horário e dia**:
  - `diaSemana` como enum (domingo a sábado).
  - `horario` como texto `HH:MM`, validado em 24 h.
  - Não há fuso envolvido: é um horário de parede.
- **Ciclo**: inteiro, validado entre 2000 e `anoAtual + 1`, com o ano atual vindo de `hojeCivil()`.
- **Motivo de saída**: o enum `desligamento | transferencia | encerramento | inativacao` torna o histórico explicável (5.6).
- **Datas**: reutiliza `DataCivil` e `hojeCivil` de `compartilhado/datas`.

## Riscos e Mitigações
- **Triggers esquecidos em mudanças futuras**: o design e a nota em `tasks.md` apontam onde estão, e os testes de integração falham se forem removidos.
- **Fuso no trigger**: o trigger usa `(now() AT TIME ZONE 'America/Sao_Paulo')::date`. Um teste confere o formato da data.
- **Tamanho da lista**: listas pequenas, filtradas em memória, como nas specs anteriores.
