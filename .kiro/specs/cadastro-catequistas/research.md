# Pesquisa e Decisões de Design

## Resumo
- **Feature**: `cadastro-catequistas`
- **Tipo de discovery**: Extension (discovery leve, focada na integração com a fundação e o Better Auth)
- **Principais descobertas**:
  - O plugin `admin` do Better Auth 1.7.6 já oferece as operações de conta necessárias, todas exigindo sessão de um papel administrativo (a coordenação):
    - `/admin/create-user`;
    - `/admin/update-user`, que altera e-mail e papel;
    - `/admin/set-role`;
    - `/admin/set-user-password`;
    - `/admin/ban-user` e `/admin/unban-user`, que implementam inativar e reativar;
    - `/admin/revoke-user-sessions`.
  - Telefone e observações não pertencem ao modelo de autenticação. Eles vão para uma tabela de perfil 1:1 com `user` (`perfil_membro`), mantendo o schema do Better Auth intacto.
  - A equipe de uma paróquia é pequena (dezenas de pessoas). A busca sem acentos e a paginação podem ser feitas por uma função pura sobre a lista completa, sem extensão `unaccent` nem índice de texto.

## Registro de Pesquisa

### Operações de conta via plugin admin
- **Fonte**: `node_modules/better-auth/dist/plugins/admin/routes.mjs` (1.7.6).
- **Achados**:
  - Os endpoints exigem a sessão do chamador com permissão do papel administrativo, que nesta configuração é `adminRoles: ["coordenacao"]`, e usam o `ac` já definido em `auth-permissoes.ts`.
  - `update-user` com `data.role` exige a permissão `user:set-role`, que a coordenação tem por meio de `adminAc`.
  - `ban-user` tem uma checagem especial quando o alvo tem papel administrativo (linha 81 da rota). Inativar um membro da coordenação pode exigir uma permissão adicional.
  - O hook existente em `auth.ts` valida o tamanho da senha só em `/admin/create-user`. A rota `set-user-password` não tem essa validação.
- **Implicações**:
  - As actions chamam `auth.api.*` repassando os `headers` da sessão da coordenação. Isso é autorização dupla: `requireRole` e, depois, a checagem do plugin.
  - `redefinirSenha` valida com `senhaSchema` antes de chamar a API.
  - **A verificar na implementação:** o bloqueio de um alvo com papel coordenação. Se o plugin recusar, a alternativa é conceder a permissão correspondente ao papel coordenação em `auth-permissoes.ts`.

### Encerramento de sessões
- **Achado**: o bloqueio via `ban-user` revoga as sessões do usuário, conforme a pesquisa da fundação. A troca de senha pelo admin não revoga.
- **Implicação**: `redefinirSenha` chama `revoke-user-sessions` depois de `set-user-password` (5.1). Também chama `limparFalhas(email)` (5.4).

### Mudança de papel e e-mail
- **Achado**: a DAL da fundação lê a sessão com `disableCookieCache: true`, então o papel é lido do banco a cada requisição.
- **Implicação**: a mudança de papel vale a partir da próxima página (4.5) sem precisar revogar sessões. A troca de e-mail muda o login (4.4). O Better Auth normaliza o e-mail no `update-user` do admin, mas a unicidade é verificada antes pelo repositório, para exibir a mensagem em pt-BR (4.3).

## Avaliação de Padrões de Arquitetura

| Opção | Descrição | Vantagens | Riscos | Decisão |
|---|---|---|---|---|
| Módulo `equipe` com domínio puro + repositório + actions | Segue o padrão do módulo `auth` | Consistente com a fundação e testável | — | ✅ |
| Colunas extras em `user` (`additionalFields`) | Telefone e observações no próprio `user` | Menos joins | Mistura domínio e autenticação, e muda um contrato da fundação | ❌ |
| Busca no banco (`unaccent`/`ILIKE`) | Filtro via SQL | Escala | Exige extensão e migração especial; desnecessário para dezenas de registros | ❌ (revisitar se passar de ~500 membros) |

## Decisões de Design

### Decisão: tabela `perfil_membro` 1:1 com `user`
- **Contexto**: os requisitos 2.2 e 8.1 pedem telefone e observações, mas a fundação é dona do `user`.
- **Escolha**: `PerfilMembro(userId PK/FK, telefone, observacoes?, createdAt, updatedAt)`. Membros antigos sem perfil, como a conta do seed, aparecem com telefone "—".
- **Consistência**: na criação, o sistema cria o usuário via API e depois o perfil via Prisma. Se o perfil falhar, remove o usuário (`remove-user`) como compensação, de modo que não fique conta sem perfil criada pela interface.

### Decisão: regras de proteção da coordenação como função pura
- **Contexto**: requisito 7 (não inativar a si mesmo, não perder o próprio papel, manter ao menos uma coordenação ativa).
- **Escolha**: `verificarProtecaoCoordenacao(...)` no domínio, alimentada pelo repositório com a contagem de coordenações ativas.
- **Custo**: existe uma janela de concorrência entre contar e bloquear. Com poucos usuários administrativos, isso é aceitável e fica registrado como risco.

### Decisão: busca e paginação em memória
- **Generalização**: `filtrarMembros(membros, { termo, situacao })` e `paginar(lista, pagina, 20)` são puras e reutilizáveis pelas listas de catequizandos.
- **Normalização**: `normalizarBusca` aplica minúsculas, remove acentos (NFD sem diacríticos) e, no telefone, compara só dígitos.

### Adotar em vez de construir
- **Adotado**: operações de conta do plugin admin, `requireRole` e `senhaSchema` da fundação, e o elemento nativo `<dialog>` para a confirmação de inativação.
- **Construído**: perfil do membro, busca, regras de proteção e UI da equipe.

## Riscos e Mitigações
- **`ban-user` recusar alvo com papel coordenação**: coberto por teste de integração. Se ocorrer, ajustar as permissões em `auth-permissoes.ts`, o que é um gatilho de revalidação da fundação.
- **Falha parcial na criação** (usuário criado, perfil não): compensação com `remove-user` e teste de integração.
- **Concorrência nas regras de coordenação**: aceita e documentada.
- **Mensagem flash via query string** (`?aviso=cadastrado`): usa apenas códigos fixos, nunca texto livre vindo da URL.
