# Research & Design Decisions — autocadastro-catequizandos

## Summary
- **Feature**: `autocadastro-catequizandos`
- **Discovery Scope**: Extension (light discovery). Estende `catequizandos` e `turmas` e cria a primeira rota pública do sistema.
- **Key Findings**:
  - Nenhum fluxo da aplicação cria fichas pendentes hoje. Só o helper e2e `tests/e2e/criar-ficha-pendente.ts` faz isso.
  - `recusarFichaAction` (coordenação) marca a ficha como inativa. O descarte desta spec precisa excluir de verdade, e as FKs `Restrict` (sacramentos, inscrições) exigem excluir os filhos na mesma transação.
  - A duplicidade existente (`catequizandos/domain/duplicidade.ts`) compara nome + data de nascimento. O requisito 6.1 pede e-mail ou telefone. Será criada uma regra própria, sem alterar a de cadastro.
  - Não há limitador de taxa para rotas da aplicação. O `RateLimit` do Better Auth cobre só `/api/auth`. Nenhum código lê o IP do cliente.
  - `src/proxy.ts` exige o cookie de sessão em todas as rotas fora de uma lista no `matcher`. A rota pública precisa entrar nessa lista.
  - Não existe copiar para a área de transferência em `src`.

## Research Log

### Reuso do schema da ficha e da regra de lotação
- **Context**: o requisito 3.1 exige as mesmas regras de validação de `cadastro-catequizandos`, e o 7.2 a mesma regra de lotação de `gestao-turmas`.
- **Sources Consulted**: `src/modules/catequizandos/domain/ficha.ts` (`criarFichaSchema`, `lerFichaDoFormulario`, `campoDoFormulario`), `src/modules/turmas/domain/turma.ts` (`estaLotada`, `formatarOcupacao`), `.kiro/steering/structure.md`.
- **Findings**: o steering só permite importar `acesso.ts` de outro módulo. Duplicar o schema quebraria o requisito de "mesmas regras".
- **Implications**: o design propõe ampliar a exceção do steering para os arquivos puros `domain/*.ts` de módulos upstream, que não têm dependência de framework nem de persistência. A decisão precisa ser registrada em `structure.md` (tarefa própria).

### Limitação de envios
- **Context**: os requisitos 4.1 a 4.4 pedem limite por origem e por link, sem bloquear o uso normal.
- **Sources Consulted**: `src/lib/auth.ts` (rateLimit do Better Auth com storage `database`), `src/modules/auth/tentativas-login.ts` e `domain/bloqueio.ts` (política pura + tabela própria).
- **Findings**: o padrão do projeto é uma política pura no domínio mais uma tabela de contagem no Postgres. A implantação em Vercel coloca o IP do cliente no primeiro valor de `x-forwarded-for`.
- **Implications**: será criada a tabela `limite_autocadastro` com janela fixa. O IP é guardado só como hash HMAC (LGPD). Limites iniciais: 5 envios por origem por hora e 60 por link por hora.

### Rota pública
- **Findings**: `(interno)/layout.tsx` assume sessão. Uma página fora de `(interno)` não herda o AppShell.
- **Implications**: será usado o segmento `src/app/inscricao/[token]`, e `inscricao` entra no `matcher` de `src/proxy.ts`.

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Módulo `autocadastro` próprio | Link, origem da ficha, limite e revisão num módulo novo | Fronteira clara e testável. Não altera as actions upstream | Escreve em `Catequizando` e `Inscricao` pelo próprio repositório | Escolhida |
| Estender `catequizandos/actions.ts` | Adicionar confirmação com inscrição no módulo upstream | Menos arquivos | Mistura o papel de catequista e as regras de turma no módulo de cadastro | Rejeitada |

## Design Decisions

### Decision: token guardado em claro
- **Alternatives Considered**: 1) só o hash do token; 2) o token em claro, com índice único.
- **Selected Approach**: opção 2. O requisito 1.1 exige exibir e copiar o link a qualquer momento.
- **Rationale**: o token dá acesso apenas a um formulário de envio, sem leitura de dados. 32 bytes aleatórios em base64url tornam a adivinhação inviável.
- **Trade-offs**: quem ler o banco consegue montar o link, o que é aceitável pelo baixo privilégio que ele concede.

### Decision: origem da ficha em tabela separada
- **Selected Approach**: `FichaAutocadastro` 1:1 com `Catequizando` (chave = `catequizandoId`), com a turma, o link, o consentimento (data e versão) e a data de recebimento. O registro é mantido após a confirmação, como prova do consentimento.
- **Rationale**: o modelo `Catequizando` de `cadastro-catequizandos` fica intacto.

### Decision: confirmação atômica
- **Selected Approach**: uma transação faz `pendente → ativo` (update condicional) e cria a `Inscricao` com a data de hoje. Se o update afetar 0 linhas, a ficha já foi revisada (7.5).

### Decision: descarte com exclusão
- **Selected Approach**: uma transação exclui `SacramentoRecebido`, `FichaAutocadastro` e `Catequizando`, mas só se o estado ainda for pendente e existir origem de autocadastro (8.2).

## Synthesis Outcomes
- **Generalização**: os avisos da revisão (duplicata e lotação) são calculados por uma função pura `avisosDaFicha`.
- **Build vs adopt**: limitador próprio (cerca de 40 linhas de política pura) em vez de uma biblioteca. Upstash/Redis seria infraestrutura nova sem necessidade.
- **Simplificação**: a correção da ficha pelo revisor (5.5) reutiliza `atualizarFicha` com o schema upstream, sem um formulário novo, só uma action nova com autorização por turma.

## Risks & Mitigations
- Ampliar a exceção de imports no steering: registrar em `structure.md` antes da implementação.
- IP atrás de proxy desconhecido: sem `x-forwarded-for`, usar a chave "desconhecido". Nesse caso só o limite por link protege.
- Corrida entre dois revisores: o update condicional por estado mais a transação resolvem.
- Divergência de regra de duplicidade (nome+nascimento × e-mail/telefone): documentada. A unificação fica para uma decisão futura de `cadastro-catequizandos`.

## References
- `.kiro/specs/cadastro-catequizandos/requirements.md` (Req. 8), `.kiro/specs/gestao-turmas/requirements.md` (Req. 5, 7, 10)
- `src/modules/auth/domain/bloqueio.ts`: padrão de política pura com tabela de contagem
