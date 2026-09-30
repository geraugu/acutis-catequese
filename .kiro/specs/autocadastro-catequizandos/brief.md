# Brief: autocadastro-catequizandos

## Problem
Digitar a ficha de cada adulto dá trabalho ao catequista e à coordenação, e gera erros de transcrição (nome, contato, sacramentos). Os catequizandos já usam o celular e o WhatsApp no dia a dia.

## Current State
Após `cadastro-catequizandos` e `gestao-turmas`, só a coordenação cadastra catequizandos e os inscreve nas turmas, manualmente.

## Desired Outcome
- O catequista (ou a coordenação) gera um link de autocadastro da turma e o compartilha, por exemplo no grupo de WhatsApp.
- O adulto abre o link sem precisar de login, preenche a própria ficha e dá consentimento para o uso dos dados (LGPD).
- A ficha entra no sistema como **pendente**, já vinculada à turma do link.
- O catequista ou a coordenação revisa e **confirma** (o catequizando passa a ativo e inscrito na turma) ou **descarta** a ficha.

## Approach
- Token aleatório e não adivinhável por link de turma, com possibilidade de desativar ou regenerar o link e data de expiração opcional.
- Página pública mobile-first, no design "Acolhedor", que reutiliza o schema de validação do catequizando.
- Proteção contra abuso: limite de envios por IP e por link, e detecção de possível duplicata (mesmo e-mail ou telefone já cadastrado) sinalizada na revisão.

## Scope
- **In**:
  - gerar, copiar, desativar e regenerar o link da turma;
  - formulário público de autocadastro com consentimento LGPD;
  - fila de fichas pendentes por turma, com as ações confirmar e descartar;
  - aviso de possível duplicata na revisão.
- **Out**:
  - conta de acesso (login) para catequizandos;
  - envio automático do link por WhatsApp ou e-mail (o compartilhamento é manual);
  - edição da ficha pelo próprio catequizando depois do envio;
  - link individual por pessoa.

## Boundary Candidates
- Ciclo de vida do link da turma (gerar, desativar, regenerar, expirar)
- Recepção pública da ficha (validação, consentimento, proteção contra abuso)
- Revisão das pendências (confirmar, descartar)

## Out of Boundary
- Regras e campos da ficha do catequizando (são de `cadastro-catequizandos` e reutilizados aqui)
- Regras de inscrição em turma (são de `gestao-turmas`; a confirmação apenas aciona a inscrição)

## Upstream / Downstream
- **Upstream**: cadastro-catequizandos (schema e estado pendente), gestao-turmas (turma, inscrição, autorização por turma), fundacao-autenticacao (papéis e rate limit)
- **Downstream**: controle-presenca (apenas catequizandos confirmados entram na chamada)

## Existing Spec Touchpoints
- **Extends**: nenhum
- **Adjacent**: cadastro-catequizandos, gestao-turmas

## Constraints
- É a única área pública do sistema. Nada de dados de outros catequizandos pode ficar exposto, e mensagens de erro não devem revelar se alguém já está cadastrado.
- LGPD: consentimento explícito e registrado (data e versão do texto), com coleta mínima.
- Uso pelo celular, com conexões lentas.
