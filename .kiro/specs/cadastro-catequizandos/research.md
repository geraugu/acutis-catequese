# Pesquisa e Decisões de Design

## Resumo

- **Feature**: `cadastro-catequizandos`
- **Tipo de discovery**: Extension, com discovery leve focada nos padrões já entregues pelo módulo `equipe` (v0.2.0) e pela fundação.
- **Principais descobertas**:
  - Várias peças da equipe já são genéricas, mas moram dentro de `src/modules/equipe`:
    - `normalizarBusca`, `filtrarPorTermo` e `paginar`, em `domain/busca.ts`;
    - todo o `domain/telefone.ts`;
    - `Aviso` e `Paginacao`, em `components/equipe`.

    O steering (`structure.md`) diz que um módulo de domínio depende só de módulos compartilhados, nunca de outro módulo de domínio. Por isso, o catequizando não pode importar de `equipe`.

  - O catequizando não tem conta de acesso. Portanto, não usa Better Auth nem o plugin admin, só Prisma. O modelo é bem mais simples que o da equipe.
  - As datas (nascimento e sacramentos) são datas civis, sem hora. Para evitar erro de fuso ao calcular a idade, elas devem ser tratadas como texto `AAAA-MM-DD` no domínio e como `@db.Date` no banco.

## Registro de Pesquisa

### Reaproveitamento do módulo `equipe`

- **Fonte**: `src/modules/equipe/domain/{busca,telefone}.ts`, `src/components/equipe/{aviso,paginacao,acoes-situacao}.tsx` e o design de `cadastro-catequistas`.
- **Achados**:
  - `filtrarPorTermo(itens, termo, campos)` e `paginar(itens, pagina, tamanho)` não dependem de nada da equipe. Só `filtrarMembros` e os tipos `ItemBuscavel`/`Situacao` são específicos.
  - `Aviso` depende de `mensagemDeAviso`, que é da equipe. `Paginacao` tem a rota `/coordenacao/equipe` e o parâmetro `situacao` fixos no código.
  - `AcoesSituacao` tem textos da equipe, mas a mecânica do `<dialog>` (título, texto, confirmar com estilo de perigo, "Cancelar" com foco inicial, alerta de erro) é genérica.
- **Implicações**: extrair as partes genéricas para `src/modules/compartilhado` e `src/components/comum`, e fazer a equipe consumi-las. Isso é uma revalidação de `cadastro-catequistas`, coberta pelos testes unitários, de integração e e2e já existentes.

### Datas civis e idade

- **Achado**: `new Date("2000-05-10")` é interpretado em UTC. Em `America/Sao_Paulo` isso pode virar o dia anterior, o que erra a idade de quem faz aniversário naquele dia.
- **Implicação**:
  - O domínio recebe e compara datas como texto `AAAA-MM-DD`, com a função pura `calcularIdade(nascimento, hoje)`.
  - A data de hoje é obtida uma vez, no fuso `America/Sao_Paulo`, por `hojeCivil()`, e injetada nos schemas.
  - O banco usa `@db.Date`.
  - A exibição em dd/mm/aaaa é feita por formatação pura sobre o texto.

## Avaliação de Padrões de Arquitetura

| Opção                                    | Descrição                                                             | Vantagens                                | Riscos                                  | Decisão |
| ---------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------- | ------- |
| Módulo `catequizandos` + `compartilhado` | Domínio puro, repositório e actions, com as peças genéricas extraídas | Respeita o steering e evita duplicação   | Refatoração da equipe                   | ✅      |
| Importar de `equipe`                     | Reusar direto do módulo da equipe                                     | Zero refatoração                         | Viola o steering e acopla dois domínios | ❌      |
| Copiar código                            | Duplicar busca, telefone e componentes                                | Isolamento                               | Duplicação e divergência                | ❌      |
| Sacramentos em colunas                   | 9 colunas em `catequizando`                                           | Menos joins                              | Tabela larga e repetitiva               | ❌      |
| Tabela `sacramento_recebido`             | Uma linha por sacramento recebido (tipo, data?, paróquia?)            | Presença da linha = recebido; extensível | Um join                                 | ✅      |

## Decisões de Design

### Decisão: módulo compartilhado

- **Escolha**:
  - `src/modules/compartilhado/busca.ts` fica com `normalizarBusca`, `filtrarPorTermo`, `paginar` e `Pagina`.
  - `src/modules/compartilhado/telefone.ts` é o `telefone.ts` inteiro, movido.
  - `src/modules/compartilhado/datas.ts` é novo.
  - Em `src/components/comum/` ficam `aviso.tsx` (recebe a mensagem já resolvida), `paginacao.tsx` (recebe a rota base e os parâmetros a preservar) e `confirmacao.tsx` (o diálogo genérico).
- **Equipe**:
  - `filtrarMembros` e os tipos continuam em `equipe`.
  - `AcoesSituacao` passa a usar `Confirmacao`.
  - As páginas passam a usar os componentes comuns.

### Decisão: idade mínima parametrizável

- **Escolha**: `IDADE_MINIMA_PADRAO = 16`. O schema é criado por `criarFichaSchema({ hoje, idadeMinima })`.
- **Por quê**: uma catequese de crianças poderá usar outra idade sem mexer nas demais regras (Adjacent expectations).

### Decisão: duplicidade com confirmação

- **Escolha**:
  - A action compara nome normalizado e data de nascimento com todos os catequizandos (lista pequena, em memória).
  - Se houver coincidência e o campo `confirmarDuplicidade` não vier no formulário, devolve `duplicado: { id, nome }` sem salvar.
  - O formulário mostra o aviso com link para a ficha existente e o botão "Salvar mesmo assim", que reenvia com `confirmarDuplicidade=1`.

### Decisão: estados como máquina pura

- **Escolha**: `transicao(estado, operacao)` devolve o novo estado ou `null` quando a transição é inválida:
  - `inativar`: ativo → inativo;
  - `reativar`: inativo → ativo;
  - `confirmar`: pendente → ativo;
  - `recusar`: pendente → inativo.

  A edição não altera o estado.

### Adotar em vez de construir

- **Adotado**: `requireRole` da fundação e os padrões de action, `EstadoFormulario`, redirect com `?aviso=` e `<dialog>` nativo, já usados pela equipe.
- **Construído**: ficha, sacramentos, datas, duplicidade, estados e a UI dos catequizandos.

## Riscos e Mitigações

- **Refatoração da equipe quebrar algo**: a tarefa de extração roda todas as suítes existentes (unit, integração e e2e) antes de qualquer código novo.
- **Fuso horário nas datas**: datas civis como texto e testes com aniversário no próprio dia.
- **Lista em memória crescer**: mesma premissa da equipe. Revisitar acima de cerca de 2.000 catequizandos.
- **Dados sensíveis (LGPD)**: observações com a dica de registrar só o necessário, acesso restrito à coordenação e nenhum dado pessoal em logs ou na URL (a busca usa o termo digitado, não o id).

## Skills e guias consultados

- `.kiro/steering/design-system.md`: tokens, botões pílula e estilo de perigo.
- Aprendizados da spec `cadastro-catequistas`: Implementation Notes e a correção de Prettier na CI.
