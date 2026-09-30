# Requirements Document

## Project Description (Input)

**Quem tem o problema:** a coordenação da catequese de adultos. Os dados dos adultos em formação ficam espalhados em fichas de papel e planilhas, e é difícil saber quem está em cada etapa e quais sacramentos cada um já recebeu.

**Situação atual:** a fundação (v0.1.x) entregou login, papéis e proteção de rotas. A v0.2.0 entregou a gestão da equipe (catequistas e coordenação), com padrões de lista, busca, paginação, formulários e inativação no módulo `equipe`. Ainda não existe nenhum registro de catequizando.

**O que deve mudar:**

- A coordenação cria, lista, busca, edita e inativa catequizandos.
- A ficha registra os dados pessoais: nome, data de nascimento, contato e endereço opcional.
- A ficha registra a situação sacramental (batismo, eucaristia e crisma) e as observações pastorais.
- A lista tem busca e filtros.
- O catequizando tem um estado: pendente, ativo ou inativo. O estado pendente será usado pelo autocadastro.

**Fora do escopo:** inscrição em turma (`gestao-turmas`), upload de documentos (certidões) e autocadastro por link (`autocadastro-catequizandos`, que vai reutilizar as validações desta spec).

**Restrições:**

- LGPD: coletar só o mínimo necessário.
- Somente a coordenação edita. O catequista consulta apenas os catequizandos das próprias turmas, regra que será aplicada em `gestao-turmas`.
- A idade mínima é de 16 anos. O sistema pode evoluir para atender também a catequese de crianças.
- Reutilizar os padrões e funções genéricas da equipe: `filtrarPorTermo`, `paginar`, telefone, aviso e paginação.
- Seguir o design system "Acolhedor", com a interface em pt-BR.

**Decisões de escopo (2026-09-30):**

- A idade mínima é de 16 anos.
- O telefone é obrigatório e o e-mail é opcional.
- Para cada sacramento, a ficha registra se foi recebido (sim ou não), com data e paróquia opcionais.
- Só a coordenação acessa os catequizandos. Ela cadastra já como ativo e confirma ou recusa os pendentes.

## Introduction

Esta spec entrega à coordenação o cadastro dos **catequizandos**, os adultos em formação na catequese. A coordenação:

- registra a ficha de cada um, com dados pessoais, contato, situação sacramental e observações pastorais;
- encontra catequizandos por busca e filtros;
- corrige dados;
- inativa quem deixou a catequese, sem apagar o histórico;
- confirma ou recusa fichas pendentes.

Ao longo do documento, **catequizando** significa uma pessoa em formação cadastrada no sistema. O catequizando não tem conta de acesso.

## Boundary Context

- **In scope**:
  - ficha do catequizando: nome, data de nascimento, telefone, e-mail opcional, endereço opcional, sacramentos e observações pastorais;
  - estados pendente, ativo e inativo;
  - lista com busca e filtros de estado e de sacramento;
  - edição, inativação e reativação;
  - confirmação e recusa de fichas pendentes;
  - aviso de possível duplicidade;
  - item "Catequizandos" no menu da coordenação.
- **Out of scope**:
  - inscrição em turma e acesso do catequista aos catequizandos das próprias turmas (`gestao-turmas`);
  - criação de fichas pendentes por link público (`autocadastro-catequizandos`);
  - upload de documentos e certidões;
  - exclusão definitiva;
  - conta de acesso para o catequizando;
  - catequese de crianças (responsáveis legais e outra idade mínima).
- **Adjacent expectations**:
  - O login, os papéis e a página de "Acesso negado" vêm de `fundacao-autenticacao`.
  - A spec `autocadastro-catequizandos` vai criar fichas no estado pendente, com as mesmas regras de validação desta spec.
  - A spec `gestao-turmas` vai consumir a lista de catequizandos ativos.
  - A idade mínima deve poder mudar no futuro sem alterar as demais regras da ficha, prevendo uma eventual catequese de crianças.

## Requirements

### Requirement 1: Acesso restrito à coordenação

**Objective:** Como coordenação, quero que só a coordenação acesse a ficha dos catequizandos, para proteger os dados pessoais conforme a LGPD.

#### Acceptance Criteria

1. The Sistema shall disponibilizar a área "Catequizandos" e o item de menu correspondente apenas para usuários com papel coordenação.
2. If um usuário com papel catequista acessar qualquer página da área "Catequizandos", the Sistema shall exibir a página de "Acesso negado".
3. If uma ação sobre catequizandos for acionada diretamente, sem passar pela interface, por um usuário sem papel coordenação, the Sistema shall rejeitá-la sem alterar nenhum dado.

### Requirement 2: Cadastro de catequizando

**Objective:** Como coordenação, quero registrar a ficha de um adulto em formação, para centralizar os dados que hoje estão em papel e em planilhas.

#### Acceptance Criteria

1. When a coordenação enviar o cadastro com nome, data de nascimento e telefone válidos, the Sistema shall criar o catequizando no estado ativo.
2. The Sistema shall exigir nome, data de nascimento e telefone, e tratar e-mail, endereço e observações pastorais como campos opcionais.
3. If algum campo obrigatório estiver vazio ou algum campo preenchido estiver inválido, the Sistema shall impedir o cadastro e exibir, junto a cada campo, uma mensagem em pt-BR indicando o problema.
4. If a data de nascimento for futura, the Sistema shall impedir o cadastro e informar que a data é inválida.
5. If a data de nascimento resultar em idade menor que 16 anos na data do cadastro, the Sistema shall impedir o cadastro e informar a idade mínima exigida.
6. The Sistema shall aceitar telefone brasileiro com DDD (10 ou 11 dígitos, com ou sem pontuação) e exibi-lo formatado, por exemplo "(11) 98765-4321".
7. Where o e-mail for informado, the Sistema shall validar o formato, tratá-lo sem diferenciar maiúsculas de minúsculas e ignorar espaços no início e no fim.
8. When o cadastro for concluído, the Sistema shall exibir a confirmação "Catequizando cadastrado".
9. The Sistema shall exibir, junto ao campo de observações pastorais, a orientação de registrar apenas o necessário para o acompanhamento pastoral.

### Requirement 3: Situação sacramental

**Objective:** Como coordenação, quero registrar quais sacramentos cada catequizando já recebeu, para saber em que etapa cada um está.

#### Acceptance Criteria

1. The Sistema shall registrar, para cada um dos sacramentos batismo, eucaristia e crisma, se o catequizando já o recebeu, com "não recebido" como valor inicial.
2. Where um sacramento estiver marcado como recebido, the Sistema shall permitir informar a data e a paróquia em que foi recebido, ambas opcionais.
3. If a data de um sacramento for futura ou anterior à data de nascimento, the Sistema shall impedir o salvamento e informar que a data é inválida.
4. When um sacramento for marcado como não recebido, the Sistema shall descartar a data e a paróquia informadas para ele.
5. The Sistema shall exibir a situação sacramental de forma resumida na lista e completa na página do catequizando.

### Requirement 4: Possível duplicidade

**Objective:** Como coordenação, quero ser avisada ao cadastrar alguém que talvez já exista, para evitar fichas duplicadas.

#### Acceptance Criteria

1. When a coordenação enviar um cadastro cujo nome e data de nascimento coincidam com os de um catequizando existente, em qualquer estado, the Sistema shall não salvar e exibir um aviso de possível duplicidade com link para a ficha existente. A comparação do nome não diferencia maiúsculas, minúsculas nem acentos.
2. When a coordenação confirmar que deseja salvar mesmo assim, the Sistema shall criar o catequizando normalmente.
3. The Sistema shall manter os dados preenchidos no formulário enquanto exibe o aviso de possível duplicidade.

### Requirement 5: Lista, busca e filtros

**Objective:** Como coordenação, quero encontrar rapidamente os catequizandos, para consultar dados e acompanhar a situação de cada um.

#### Acceptance Criteria

1. When a coordenação acessar a área "Catequizandos", the Sistema shall listar os catequizandos ativos em ordem alfabética de nome, exibindo nome, idade, telefone, situação sacramental resumida e estado.
2. When a coordenação digitar um termo de busca, the Sistema shall exibir apenas os catequizandos cujo nome, e-mail ou telefone contenham o termo, sem diferenciar maiúsculas, minúsculas nem acentos.
3. When a coordenação escolher o filtro de estado (ativos, pendentes, inativos ou todos), the Sistema shall exibir apenas os catequizandos no estado escolhido.
4. When a coordenação escolher o filtro de sacramento (por exemplo, "sem crisma"), the Sistema shall exibir apenas os catequizandos que ainda não receberam o sacramento escolhido.
5. The Sistema shall manter o termo de busca e os filtros no endereço da página, de modo que recarregar ou compartilhar o endereço mostre o mesmo resultado.
6. If nenhum catequizando corresponder à busca e aos filtros, the Sistema shall exibir uma mensagem de estado vazio com a opção de limpar a busca.
7. Where a lista tiver mais de 20 catequizandos, the Sistema shall paginar o resultado em páginas de 20.
8. While existirem fichas pendentes, the Sistema shall exibir na área "Catequizandos" a quantidade de fichas pendentes, com um atalho para o filtro de pendentes.

### Requirement 6: Página e edição do catequizando

**Objective:** Como coordenação, quero consultar e corrigir a ficha de um catequizando num só lugar, para manter os dados atualizados.

#### Acceptance Criteria

1. When a coordenação selecionar um catequizando na lista, the Sistema shall exibir a página do catequizando com todos os dados da ficha, a idade, o estado e a data de cadastro.
2. The Sistema shall oferecer o telefone do catequizando como link de ligação e como link para conversa no WhatsApp.
3. When a coordenação salvar alterações válidas na ficha, the Sistema shall atualizar o catequizando e exibir a confirmação "Alterações salvas".
4. The Sistema shall aplicar na edição as mesmas regras de validação do cadastro, incluindo as da situação sacramental.
5. The Sistema shall oferecer, na página do catequizando, as ações disponíveis para o estado atual:
   - editar, em qualquer estado;
   - inativar, quando ativo;
   - reativar, quando inativo;
   - confirmar ou recusar, quando pendente.
6. If a coordenação acessar a página de um catequizando inexistente, the Sistema shall exibir uma página "Catequizando não encontrado" com link para a lista.

### Requirement 7: Estados, inativação e reativação

**Objective:** Como coordenação, quero inativar quem deixou a catequese e reativar quem voltou, para controlar a lista preservando o histórico.

#### Acceptance Criteria

1. The Sistema shall manter cada catequizando em exatamente um estado: pendente, ativo ou inativo.
2. When a coordenação confirmar a inativação de um catequizando ativo, the Sistema shall marcá-lo como inativo e exibir a confirmação "Catequizando inativado".
3. The Sistema shall pedir confirmação explícita antes de inativar, nomeando a ação e o catequizando (por exemplo, "Inativar Maria Souza?").
4. When a coordenação reativar um catequizando inativo, the Sistema shall marcá-lo como ativo e exibir a confirmação "Catequizando reativado".
5. The Sistema shall nunca excluir um catequizando. Os dados de um catequizando inativo continuam consultáveis pela coordenação.

### Requirement 8: Confirmação de fichas pendentes

**Objective:** Como coordenação, quero revisar as fichas pendentes antes de incluí-las na catequese, para garantir que os dados estão corretos.

#### Acceptance Criteria

1. When a coordenação confirmar uma ficha pendente, the Sistema shall marcá-la como ativa e exibir a confirmação "Ficha confirmada".
2. If a ficha pendente não atender às regras de validação da ficha, the Sistema shall impedir a confirmação e orientar a coordenação a corrigi-la pela edição.
3. When a coordenação recusar uma ficha pendente, após confirmação explícita, the Sistema shall marcá-la como inativa, sem excluí-la, e exibir a confirmação "Ficha recusada".
4. The Sistema shall permitir editar uma ficha pendente sem alterar o estado dela.

### Requirement 9: Interface

**Objective:** Como coordenação, quero usar o cadastro no celular com conforto, para atualizar fichas durante os encontros.

#### Acceptance Criteria

1. The Sistema shall exibir todas as páginas da área "Catequizandos" em pt-BR, seguindo o design system do projeto.
2. The Sistema shall tornar todas as páginas da área "Catequizandos" operáveis apenas com o teclado.
3. The Sistema shall exibir a lista, a página do catequizando e os formulários sem rolagem horizontal em telas a partir de 360 px de largura.
4. The Sistema shall exibir datas no formato brasileiro (dd/mm/aaaa).
