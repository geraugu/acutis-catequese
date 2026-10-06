# Brief: organizacao-pagina-turma

## Problem
A página de uma turma selecionada virou uma coluna longa com muitos blocos empilhados. Na coordenação são oito: dados, próximo encontro, frequência, Editar/Encerrar, link de autocadastro, catequistas, inscrição e inscritos. Cada spec entregue acrescentou um bloco, e hoje é difícil achar o que se procura, principalmente no celular.

## Current State
- A página `/{papel}/turmas/[id]` concentra tudo. A coordenação tem a versão completa; o catequista tem uma versão menor, só de consulta (sem Editar/Encerrar nem inscrição).
- O cronograma (`…/encontros`) e as fichas pendentes (`…/pendentes`) já são rotas separadas, e a chamada fica em `…/encontros/[encontroId]/chamada`.
- As ações da coordenação (criar, editar, encerrar, designar, remover catequista, inscrever, desligar) terminam em `redirect` para `/coordenacao/turmas/[id]?aviso=…`. As ações do autocadastro redirecionam para a página que as chamou.
- A página principal lê `?aviso`, `?q` (busca de catequizando para inscrição) e `?ordem` (ordenação da frequência).

## Desired Outcome
- Ao abrir uma turma, o usuário vê o cabeçalho da turma e uma barra de abas; cada aba mostra só o seu conteúdo.
- A organização é a mesma para a coordenação e para o catequista, e cada papel vê só as abas e ações que já lhe cabem.

## Approach
- **Tabs por rota (decisão de 2026-10-05):** um layout compartilhado em `turmas/[id]/` com o cabeçalho e a barra de abas; cada aba é uma página própria. Não usar `?aba=`.
- **Abas propostas:**

  | Aba | Conteúdo |
  |---|---|
  | Resumo | dados da turma, próximo encontro ou chamada de hoje, Editar e Encerrar |
  | Inscritos | lista de inscritos, inscrição de catequizando e histórico |
  | Frequência | percentual da turma, ordenação e alertas |
  | Encontros | o cronograma já existente |
  | Equipe e link | catequistas responsáveis, link de autocadastro e fichas pendentes |

- As rotas já existentes (`encontros`, `pendentes`, chamada, visitantes) continuam funcionando e passam a aparecer dentro do layout com a aba certa ativa.
- As ações que hoje voltam para a página principal passam a voltar para a aba onde o usuário estava.
- Seguir o design system "Acolhedor" e as práticas de acessibilidade de abas (navegação por teclado, aba atual identificada).

## Scope
- **In**:
  - layout com cabeçalho da turma e barra de abas, nas duas visões (coordenação e catequista);
  - redistribuição dos blocos atuais pelas abas;
  - redirecionamento das ações para a aba correta;
  - ajuste dos testes (integração e e2e) que procuram os blocos na página principal;
  - uso no celular, a partir de 360 px, sem rolagem horizontal.
- **Out**:
  - novas funcionalidades ou novos dados em qualquer aba;
  - mudar regras de acesso, de negócio ou de cálculo (frequência, inscrição, autocadastro);
  - redesenhar a lista de turmas.

## Boundary Candidates
- Layout e navegação por abas (estrutura de rotas)
- Redistribuição do conteúdo existente (sem mudar o comportamento dos blocos)
- Retorno das ações à aba correta

## Out of Boundary
- Regras e dados de turmas, inscrições, encontros, presença e autocadastro (continuam nas specs de origem)

## Upstream / Downstream
- **Upstream**: gestao-turmas, programa-catequese, autocadastro-catequizandos, controle-presenca
- **Downstream**: nenhuma

## Existing Spec Touchpoints
- **Extends**: gestao-turmas (página da turma)
- **Adjacent**: programa-catequese (cronograma e próximo encontro), autocadastro-catequizandos (link e fichas pendentes), controle-presenca (frequência e chamada)

## Constraints
- Tudo o que hoje é possível na página da turma continua possível, só em outro lugar.
- Nenhuma ação pode deixar o usuário numa aba que não mostra o resultado dela (a mensagem de confirmação aparece na aba para onde a ação volta).
- O catequista não ganha acesso a nada além do que já tem.
- Entrega na release v0.8.0 (a v0.7.0 já foi publicada).
