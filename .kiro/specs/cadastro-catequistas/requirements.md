# Requirements Document

## Project Description (Input)
**Quem tem o problema:** a coordenação da catequese de adultos. Ela não tem um registro central de quem são os catequistas, como contatá-los e quem pode acessar o sistema.

**Situação atual:** a fundação (v0.1.x) entregou login com os papéis coordenação e catequista, proteção de rotas e o design system "Acolhedor". Só existe a conta de coordenação criada pelo seed, e não há como cadastrar catequistas pela interface.

**O que deve mudar:**
- A coordenação cria, lista, busca, edita e inativa catequistas. Os dados são nome, e-mail, telefone e observações.
- Ao criar um catequista, o sistema gera a conta de acesso vinculada, com papel `catequista` e uma senha inicial definida pela coordenação, que segue a política de senha (mínimo de 8 caracteres).
- Inativar um catequista bloqueia o login dele e preserva o histórico: não há exclusão. A reativação devolve o acesso.
- Apenas a coordenação gerencia catequistas.

**Fora do escopo:** vínculo com turmas (spec `gestao-turmas`), histórico de formação do catequista, troca e recuperação de senha pelo próprio usuário.

**Restrições:**
- Reutilizar os contratos da fundação: `requireRole`, `senhaSchema`, `normalizarEmail`, o campo `banned` e a mensagem de conta desabilitada.
- Seguir o design system (`.kiro/steering/design-system.md`).
- Interface em pt-BR.

**Decisões de escopo (2026-09-30):**
- Nome, e-mail e telefone são obrigatórios.
- A coordenação pode redefinir a senha de um membro.
- Na criação, a coordenação escolhe o papel (catequista ou coordenação).
- O e-mail pode ser alterado.

## Introduction
Esta spec entrega à coordenação a gestão da **equipe** da catequese: as pessoas que acessam o sistema com papel **catequista** ou **coordenação**. A coordenação cadastra cada membro com dados de contato e uma conta de acesso, encontra membros por busca, corrige dados, redefine senhas esquecidas e inativa quem deixou a equipe, sem apagar o histórico.

Ao longo do documento, **membro da equipe** significa um usuário do sistema com papel catequista ou coordenação.

## Boundary Context
- **In scope**:
  - cadastro de membro (nome, e-mail, telefone, observações, papel e senha inicial);
  - lista com busca e filtro de situação;
  - edição de dados e papel;
  - redefinição de senha pela coordenação;
  - inativação e reativação com bloqueio do acesso;
  - regras de proteção para não deixar o sistema sem coordenação ativa;
  - item "Equipe" no menu da coordenação.
- **Out of scope**:
  - vínculo com turmas (`gestao-turmas`);
  - histórico de formação;
  - troca de senha pelo próprio usuário;
  - recuperação de senha por e-mail;
  - exclusão definitiva;
  - autocadastro de membros;
  - envio automático de credenciais por e-mail ou WhatsApp (a coordenação repassa a senha inicial pessoalmente).
- **Adjacent expectations**:
  - O login, a sessão, o bloqueio por tentativas e a mensagem de "acesso desabilitado" vêm de `fundacao-autenticacao` e não mudam.
  - A política de senha (mínimo de 8 caracteres) é a mesma da fundação.
  - A spec `gestao-turmas` vai consumir a lista de catequistas ativos para designar responsáveis de turma.
  - A conta de coordenação criada pelo seed aparece na lista como qualquer outro membro.

## Requirements

### Requirement 1: Acesso restrito à coordenação
**Objective:** Como coordenação, quero que só a coordenação gerencie a equipe, para que catequistas não alterem contas nem acessos.

#### Acceptance Criteria
1. The Sistema shall disponibilizar a área "Equipe" e o item de menu correspondente apenas para usuários com papel coordenação.
2. If um usuário com papel catequista acessar qualquer página da área "Equipe", the Sistema shall exibir a página de "Acesso negado".
3. If uma ação de gestão da equipe for acionada diretamente, sem passar pela interface, por um usuário sem papel coordenação, the Sistema shall rejeitá-la sem alterar nenhum dado.

### Requirement 2: Cadastro de membro da equipe
**Objective:** Como coordenação, quero cadastrar um membro com dados de contato e conta de acesso, para que ele possa entrar no sistema.

#### Acceptance Criteria
1. When a coordenação enviar o cadastro com nome, e-mail, telefone, papel e senha inicial válidos, the Sistema shall criar o membro com situação ativa e uma conta de acesso com esse e-mail, papel e senha.
2. The Sistema shall exigir nome, e-mail, telefone, papel e senha inicial, e tratar observações como campo opcional.
3. If algum campo obrigatório estiver vazio ou inválido, the Sistema shall impedir o cadastro e exibir, junto a cada campo, uma mensagem em pt-BR indicando o problema.
4. If a senha inicial tiver menos de 8 caracteres, the Sistema shall impedir o cadastro e informar o tamanho mínimo exigido.
5. If já existir um membro (ativo ou inativo) com o mesmo e-mail, the Sistema shall impedir o cadastro e informar que o e-mail já está em uso.
6. The Sistema shall aceitar como papel apenas catequista ou coordenação, com catequista como opção pré-selecionada.
7. The Sistema shall tratar o e-mail sem diferenciar maiúsculas de minúsculas e ignorar espaços no início e no fim.
8. The Sistema shall aceitar telefone brasileiro com DDD (10 ou 11 dígitos, com ou sem pontuação) e exibi-lo formatado, por exemplo "(11) 98765-4321".
9. When o cadastro for concluído, the Sistema shall exibir a confirmação "Membro cadastrado" e lembrar a coordenação de repassar a senha inicial pessoalmente ao membro.
10. The Sistema shall não exibir a senha inicial em nenhuma tela depois do envio do cadastro.

### Requirement 3: Lista e busca da equipe
**Objective:** Como coordenação, quero ver e encontrar rapidamente os membros da equipe, para consultar contatos e situação.

#### Acceptance Criteria
1. When a coordenação acessar a área "Equipe", the Sistema shall listar os membros ativos em ordem alfabética de nome, exibindo nome, papel, e-mail, telefone e situação.
2. When a coordenação digitar um termo de busca, the Sistema shall exibir apenas os membros cujo nome, e-mail ou telefone contenham o termo, sem diferenciar maiúsculas, minúsculas nem acentos.
3. When a coordenação escolher o filtro de situação (ativos, inativos ou todos), the Sistema shall exibir apenas os membros da situação escolhida.
4. The Sistema shall manter o termo de busca e o filtro no endereço da página, de modo que recarregar ou compartilhar o endereço mostre o mesmo resultado.
5. If nenhum membro corresponder à busca e ao filtro, the Sistema shall exibir uma mensagem de estado vazio com a opção de limpar a busca.
6. Where a lista tiver mais de 20 membros, the Sistema shall paginar o resultado em páginas de 20.
7. The Sistema shall exibir a lista sem rolagem horizontal em telas a partir de 360 px de largura.

### Requirement 4: Edição de membro
**Objective:** Como coordenação, quero corrigir os dados de um membro, para manter contatos e acessos atualizados.

#### Acceptance Criteria
1. When a coordenação salvar alterações válidas de nome, e-mail, telefone, observações ou papel de um membro, the Sistema shall atualizar o membro e exibir a confirmação "Alterações salvas".
2. The Sistema shall aplicar na edição as mesmas regras de validação do cadastro para nome, e-mail, telefone e papel.
3. If o novo e-mail já estiver em uso por outro membro, the Sistema shall impedir a alteração e informar que o e-mail já está em uso.
4. When o e-mail de um membro for alterado, the Sistema shall passar a aceitar o login apenas com o novo e-mail, mantendo a senha atual.
5. When o papel de um membro for alterado, the Sistema shall aplicar o novo papel a partir da próxima página que o membro acessar.
6. The Sistema shall não exibir nem permitir alterar a senha pelo formulário de edição.

### Requirement 5: Redefinição de senha pela coordenação
**Objective:** Como coordenação, quero definir uma nova senha para um membro que a esqueceu, para devolver o acesso sem depender de e-mail.

#### Acceptance Criteria
1. When a coordenação definir uma nova senha válida para um membro, the Sistema shall substituir a senha do membro e encerrar todas as sessões abertas dele.
2. If a nova senha tiver menos de 8 caracteres, the Sistema shall impedir a redefinição e informar o tamanho mínimo exigido.
3. When a redefinição for concluída, the Sistema shall exibir a confirmação "Senha redefinida" e lembrar a coordenação de repassar a nova senha pessoalmente.
4. When a senha de um membro temporariamente bloqueado por tentativas falhas for redefinida, the Sistema shall liberar novas tentativas de login para esse membro imediatamente.

### Requirement 6: Inativação e reativação
**Objective:** Como coordenação, quero inativar quem deixou a equipe e reativar quem voltou, preservando o histórico, para controlar o acesso sem perder registros.

#### Acceptance Criteria
1. When a coordenação confirmar a inativação de um membro, the Sistema shall marcar o membro como inativo, bloquear o login dele e encerrar todas as sessões abertas dele.
2. The Sistema shall pedir confirmação explícita antes de inativar, nomeando a ação e o membro (por exemplo, "Inativar Maria Souza?").
3. While um membro estiver inativo, the Sistema shall recusar o login dele com a mensagem de acesso desabilitado já definida pela fundação.
4. When a coordenação reativar um membro inativo, the Sistema shall marcar o membro como ativo e voltar a aceitar o login dele com a senha anterior.
5. The Sistema shall nunca excluir um membro. Os dados de um membro inativo continuam consultáveis pela coordenação.
6. The Sistema shall exibir a situação (ativo ou inativo) na lista e na página do membro.

### Requirement 7: Proteção da coordenação
**Objective:** Como coordenação, quero que o sistema impeça ações que deixariam a paróquia sem ninguém para administrá-lo, para evitar perda de acesso administrativo.

#### Acceptance Criteria
1. If um membro da coordenação tentar inativar a própria conta, the Sistema shall impedir a ação e informar que não é possível inativar a si mesmo.
2. If um membro da coordenação tentar alterar o próprio papel para catequista, the Sistema shall impedir a ação e informar que não é possível remover o próprio papel de coordenação.
3. If a ação de inativar ou de mudar o papel para catequista deixar o sistema sem nenhum membro ativo com papel coordenação, the Sistema shall impedir a ação e informar que deve existir ao menos uma coordenação ativa.

### Requirement 8: Página do membro e navegação
**Objective:** Como coordenação, quero consultar os dados de um membro e acessar as ações dele num só lugar, para gerir a equipe com poucos toques no celular.

#### Acceptance Criteria
1. When a coordenação selecionar um membro na lista, the Sistema shall exibir a página do membro com nome, papel, e-mail, telefone, observações, situação e data de cadastro.
2. The Sistema shall oferecer, na página do membro, as ações editar, redefinir senha e inativar ou reativar, conforme a situação.
3. The Sistema shall oferecer o telefone do membro como link de ligação e como link para conversa no WhatsApp.
4. The Sistema shall exibir todas as páginas da área "Equipe" em pt-BR, seguindo o design system do projeto, operáveis apenas com o teclado e sem rolagem horizontal a partir de 360 px.
5. If a coordenação acessar a página de um membro inexistente, the Sistema shall exibir uma página "Membro não encontrado" com link para a lista da equipe.
