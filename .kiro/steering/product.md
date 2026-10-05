---
updated_at: 2026-10-05
---
# Visão do Produto

**acutis-catequese** é um sistema web de gestão da catequese de adultos em uma paróquia. Ele atende a coordenação e os catequistas na organização das turmas, dos encontros e do acompanhamento dos catequizandos.

O nome homenageia São Carlo Acutis, padroeiro dos informáticos. O projeto é um trabalho acadêmico de pós-graduação em Engenharia de Software, desenvolvido com Spec Driven Development (Kiro).

## Capacidades Principais

- **Acesso por perfil**: a coordenação gerencia tudo; o catequista acessa apenas as turmas pelas quais é responsável.
- **Gestão da equipe**: catequistas e coordenação, cada um com sua conta de acesso.
- **Cadastro de catequizandos**: dados pessoais, contato e situação sacramental dos adultos em formação.
- **Turmas e inscrições**: turmas por ciclo, com catequistas responsáveis e catequizandos inscritos.
- **Autocadastro de catequizandos**: o adulto preenche a própria ficha por um link público da turma, com consentimento LGPD. A ficha fica pendente até o catequista ou a coordenação confirmá-la.
- **Programa da catequese**: cronograma de encontros e temas ao longo da caminhada.
- **Controle de presença** _(em desenvolvimento)_: registro da frequência em cada encontro, acompanhamento da assiduidade e reposição de temas em outra turma (visitante).

## Casos de Uso Alvo

- A coordenação abre uma nova turma, associa catequistas e inscreve catequizandos.
- O adulto se inscreve sozinho pelo link da turma e o catequista confirma a ficha.
- O catequista consulta o programa e registra a presença no encontro do dia.
- A coordenação identifica catequizandos com baixa frequência para acompanhamento pastoral.

## Proposta de Valor

- Substitui planilhas e cadernos de chamada por um registro único e consultável.
- É pensado para adultos (não para catequese infantil), considerando os sacramentos já recebidos.
- Tem escopo enxuto e foco em usabilidade para voluntários com pouca familiaridade técnica.

## Contexto Acadêmico

A entrega exige repositório público, Conventional Commits, README completo, gerenciamento de dependências via `package.json`, testes automatizados e releases com tags. Essas exigências orientam decisões de processo e não são opcionais.

---
_Foco em propósito e padrões, não em listas exaustivas de funcionalidades_
