# Requirements Document

## Project Description (Input)
Digitar a ficha de cada adulto dá trabalho ao catequista e à coordenação e gera erros de transcrição. Com esta funcionalidade, o catequista ou a coordenação gera um link de autocadastro da turma e o compartilha (por exemplo, no grupo de WhatsApp). O adulto abre o link sem login, preenche a própria ficha e dá consentimento para o uso dos dados (LGPD). A ficha entra como **pendente**, já vinculada à turma do link. O catequista ou a coordenação revisa e **confirma** (o catequizando fica ativo e inscrito na turma) ou **descarta** a ficha. Detalhes completos estão em `brief.md`.

## Introduction
Esta spec cria a única área pública do sistema: um link de autocadastro por turma. Ela cobre o ciclo de vida do link, a recepção pública da ficha com consentimento LGPD e proteção contra abuso, e a revisão das fichas pendentes pela equipe da turma.

**Decisões de escopo (2026-10-01):**
- **Papel do catequista:** nas próprias turmas abertas, o catequista gerencia o link e confirma ou descarta as fichas recebidas por ele. Esta é uma exceção explícita às regras de `cadastro-catequizandos` (só a coordenação confirma pendentes) e de `gestao-turmas` (só a coordenação inscreve), restrita às fichas vindas do link.
- **Lotação:** a turma lotada continua aceitando fichas pelo link. O aviso de lotação aparece na revisão, e a confirmação segue a regra "Inscrever mesmo assim" de `gestao-turmas`.
- **Descarte:** a ficha descartada é excluída definitivamente, já que o sistema não guarda dados de quem não entrou na catequese (LGPD).
- **Duplicata:** a possível duplicata só gera aviso. Não há bloqueio nem mesclagem automática.

## Boundary Context
- **In scope**:
  - gerar, copiar, desativar e regenerar o link da turma, com data de expiração opcional;
  - página pública de autocadastro com consentimento LGPD registrado;
  - limites de envio contra abuso;
  - fila de fichas pendentes por turma, com as ações confirmar e descartar;
  - aviso de possível duplicata e de lotação na revisão.
- **Out of scope**:
  - login para catequizandos;
  - envio automático do link por WhatsApp ou e-mail;
  - edição da ficha pelo próprio catequizando depois do envio;
  - link individual por pessoa;
  - mesclagem de fichas duplicadas.
- **Adjacent expectations**:
  - Os campos e as regras de validação da ficha são de `cadastro-catequizandos` e são reutilizados sem alteração.
  - A inscrição feita na confirmação segue as regras de `gestao-turmas` (data de entrada, lotação, turma aberta).
  - A recusa de pendentes de `cadastro-catequizandos`, que marca a ficha como inativa, continua valendo para as fichas pendentes que a coordenação vê na área "Catequizandos".
  - `controle-presenca` considera só os catequizandos confirmados e inscritos. Fichas pendentes nunca aparecem na chamada.

## Requirements

### Requirement 1: Gestão do link de autocadastro da turma
**Objective:** Como catequista ou coordenação, quero gerar e controlar o link de autocadastro da turma, para compartilhá-lo com os adultos e encerrá-lo quando quiser.

#### Acceptance Criteria
1. When a coordenação ou um catequista responsável gerar o link de uma turma aberta que ainda não tem link ativo, the Sistema shall criar um link único e não adivinhável e exibi-lo na página da turma com a ação "Copiar link".
2. When o usuário acionar "Copiar link", the Sistema shall copiar o endereço completo para a área de transferência e exibir a confirmação "Link copiado".
3. The Sistema shall manter no máximo um link ativo por turma.
4. When o usuário desativar o link, the Sistema shall fazer o link parar de aceitar fichas imediatamente e exibir a confirmação "Link desativado".
5. When o usuário regenerar o link, após confirmação explícita, the Sistema shall invalidar o link anterior, criar um novo link e exibir a confirmação "Novo link gerado".
6. The Sistema shall aceitar uma data de expiração opcional para o link, que não pode estar no passado.
7. If a data de expiração informada estiver no passado, the Sistema shall impedir o salvamento e informar que a data é inválida.
8. The Sistema shall exibir na página da turma a situação do link (ativo, desativado ou expirado), a data de expiração (quando houver) e a quantidade de fichas pendentes recebidas por ele.
9. When uma turma for encerrada, the Sistema shall desativar o link dela.
10. If um catequista tentar gerenciar o link de uma turma em que não é responsável, the Sistema shall exibir a página de "Acesso negado".

### Requirement 2: Acesso público ao formulário
**Objective:** Como adulto convidado, quero abrir o link pelo celular sem criar conta, para preencher minha ficha com facilidade.

#### Acceptance Criteria
1. When alguém abrir um link ativo, não expirado, de uma turma aberta, the Sistema shall exibir, sem exigir login, o formulário de autocadastro com o nome da turma, o dia, o horário e o local.
2. If o link for inexistente, desativado, regenerado ou expirado, ou se a turma estiver encerrada, the Sistema shall exibir a mesma mensagem "Este link não está mais disponível. Fale com seu catequista.", sem revelar qual é o motivo.
3. The Sistema shall exibir no formulário público apenas os dados da turma listados no critério 1, nunca dados de catequizandos, de catequistas nem de outras turmas.
4. The Sistema shall apresentar o formulário público no padrão visual "Acolhedor", utilizável em telas de celular a partir de 320 px de largura e sem login.
5. The Sistema shall exibir o formulário público em até 3 segundos numa conexão móvel 3G.

### Requirement 3: Preenchimento da ficha e consentimento LGPD
**Objective:** Como adulto convidado, quero preencher minha própria ficha e entender como meus dados serão usados, para entrar na catequese com segurança.

#### Acceptance Criteria
1. The Sistema shall oferecer no formulário público os mesmos campos da ficha do catequizando e aplicar as mesmas regras de validação de `cadastro-catequizandos`.
2. If algum campo estiver inválido no envio, the Sistema shall manter os dados preenchidos e indicar cada campo com problema e o motivo.
3. The Sistema shall exibir o texto de consentimento para o uso dos dados, com uma caixa de aceite desmarcada por padrão.
4. If o adulto enviar o formulário sem marcar o aceite, the Sistema shall impedir o envio e informar que o consentimento é obrigatório.
5. When o adulto enviar uma ficha válida com o consentimento marcado, the Sistema shall registrá-la como pendente, vinculada à turma do link, com a data e a hora do consentimento e a versão do texto aceito.
6. When a ficha for registrada, the Sistema shall exibir a confirmação "Recebemos sua ficha! Seu catequista vai revisá-la em breve." e não exibir de novo os dados enviados.
7. The Sistema shall exibir a mesma confirmação de recebimento quando o e-mail ou o telefone enviado já pertencer a alguém cadastrado, sem revelar essa informação.

### Requirement 4: Proteção contra abuso
**Objective:** Como coordenação, quero limitar envios abusivos pelo link público, para evitar spam e fichas falsas na fila.

#### Acceptance Criteria
1. If o mesmo dispositivo de origem exceder o limite de envios permitido num intervalo de tempo, the Sistema shall recusar novos envios dele e exibir "Muitas tentativas. Tente novamente mais tarde.".
2. If um link exceder o limite de fichas recebidas num intervalo de tempo, the Sistema shall recusar novos envios por ele e exibir a mesma mensagem de muitas tentativas.
3. The Sistema shall aplicar os limites de envio sem impedir o uso normal de uma turma em que vários adultos se cadastram no mesmo dia.
4. If um envio for recusado pelos limites, the Sistema shall não registrar nenhum dado dele.

### Requirement 5: Fila de fichas pendentes da turma
**Objective:** Como catequista ou coordenação, quero ver as fichas recebidas pelo link da turma, para revisá-las antes de incluí-las.

#### Acceptance Criteria
1. When a coordenação ou um catequista responsável abrir a fila de pendentes de uma turma aberta, the Sistema shall listar as fichas pendentes recebidas pelo link dela, da mais antiga para a mais recente, com nome, data de envio e avisos.
2. When o revisor abrir uma ficha pendente, the Sistema shall exibir todos os dados enviados, a data e a versão do consentimento e os avisos aplicáveis.
3. While houver fichas pendentes numa turma, the Sistema shall exibir a quantidade delas na página da turma e em "Minhas turmas", para o catequista responsável.
4. If um catequista tentar acessar a fila ou uma ficha pendente de turma em que não é responsável, the Sistema shall exibir a página de "Acesso negado".
5. The Sistema shall permitir que o revisor corrija os dados de uma ficha pendente antes de confirmá-la, aplicando as regras de validação da ficha.

### Requirement 6: Aviso de possível duplicata
**Objective:** Como revisor, quero saber se a ficha pode ser de alguém já cadastrado, para evitar registros repetidos.

#### Acceptance Criteria
1. When o e-mail ou o telefone da ficha pendente coincidir com o de outro catequizando já cadastrado, em qualquer estado, the Sistema shall exibir na fila e na ficha o aviso "Possível duplicata".
2. Where o revisor for a coordenação, the Sistema shall exibir no aviso o nome do catequizando coincidente e um link para a ficha dele.
3. Where o revisor for um catequista, the Sistema shall exibir no aviso o nome do catequizando coincidente apenas se ele tiver inscrição vigente numa turma do catequista.
4. The Sistema shall permitir confirmar ou descartar a ficha mesmo com o aviso de possível duplicata.

### Requirement 7: Confirmação da ficha
**Objective:** Como catequista ou coordenação, quero confirmar a ficha revisada, para que o adulto passe a fazer parte da turma.

#### Acceptance Criteria
1. When o revisor confirmar uma ficha pendente de uma turma aberta e não lotada, the Sistema shall marcar o catequizando como ativo, inscrevê-lo na turma do link com a data de entrada igual à data da confirmação e exibir a confirmação "Ficha confirmada e inscrita na turma".
2. If a turma estiver lotada no momento da confirmação, the Sistema shall não gravar e exibir o aviso "Turma lotada ({inscritos} de {vagas} vagas)" com a opção "Confirmar mesmo assim".
3. When o revisor escolher "Confirmar mesmo assim", the Sistema shall confirmar a ficha e registrar a inscrição normalmente.
4. If a ficha não atender às regras de validação da ficha, the Sistema shall impedir a confirmação e indicar os campos a corrigir.
5. If outro revisor já tiver confirmado ou descartado a ficha, the Sistema shall impedir uma nova ação e informar que a ficha já foi revisada.
6. While a turma da ficha estiver encerrada, the Sistema shall impedir a confirmação com inscrição. A coordenação pode tratar a ficha pela área "Catequizandos", conforme `cadastro-catequizandos`.

### Requirement 8: Descarte da ficha
**Objective:** Como catequista ou coordenação, quero descartar fichas indevidas, para manter a fila limpa e não guardar dados desnecessários.

#### Acceptance Criteria
1. When o revisor descartar uma ficha pendente, após confirmação explícita, the Sistema shall excluí-la definitivamente, junto com o registro de consentimento, e exibir a confirmação "Ficha descartada".
2. The Sistema shall permitir descartar apenas fichas pendentes recebidas pelo link, nunca fichas ativas ou inativas.
3. The Sistema shall não notificar o autor da ficha sobre o descarte.
4. While a turma da ficha estiver encerrada, the Sistema shall manter a fila dela acessível ao revisor apenas para consulta e descarte das fichas pendentes.
