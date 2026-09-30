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

## Requirements
<!-- Will be generated in /kiro-spec-requirements phase -->
