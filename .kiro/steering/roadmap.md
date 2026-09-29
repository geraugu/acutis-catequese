# Roadmap

## Visão Geral
O acutis-catequese é um sistema web de gestão da catequese de adultos de uma paróquia. A coordenação gerencia catequistas, catequizandos, turmas e o programa de encontros. Os catequistas registram a presença nos encontros das suas turmas.

O projeto é acadêmico (pós-graduação em Engenharia de Software), com prazo curto (menos de 2 meses). Por isso o foco é um MVP enxuto, entregue em fatias verticais, cada uma com testes automatizados e uma release própria.

## Decisão de Abordagem
- **Escolhida**: monolito full-stack TypeScript com **Next.js 16 (App Router + Server Actions)**, **Prisma 7 + PostgreSQL**, **Better Auth 1.x** (e-mail e senha, com papéis), **Vitest** (testes unitários e de integração) e **Playwright** (testes e2e). Deploy na Vercel com Postgres gerenciado (Neon ou Supabase).
- **Por quê**:
  - É uma base de código única, com um só `package.json`.
  - Tem pouca infraestrutura, o que combina com o prazo curto.
  - As regras de negócio ficam num núcleo de domínio testável, o que atende à exigência de testes.
  - O deploy é simples.
- **Ajustes após a verificação de viabilidade (2026-09-29)**:
  - Better Auth substitui o Auth.js v5, que continua em beta e hoje recebe só correções de segurança.
  - O banco é PostgreSQL também no ambiente de desenvolvimento (via Docker), sem SQLite. O Prisma 7 exige um provider fixo e driver adapters, e a Vercel não tem sistema de arquivos persistente.
- **Alternativas rejeitadas**:
  - React (Vite) + API separada: exige mais infraestrutura e mais tempo.
  - React + Supabase (BaaS): deixa pouca regra de negócio no código do projeto, o que enfraquece os testes e a apresentação acadêmica.

## Escopo
- **Dentro**:
  - autenticação com perfis coordenação e catequista;
  - cadastro de catequistas e de catequizandos;
  - turmas;
  - programa de encontros;
  - chamada e frequência.
- **Fora**:
  - relatórios avançados e certificados;
  - notificações (e-mail, WhatsApp);
  - várias paróquias (multi-tenant);
  - aplicativo mobile nativo;
  - autocadastro de catequizandos.

## Restrições
- Prazo menor que 2 meses: MVP primeiro.
- Requisitos acadêmicos:
  - repositório público;
  - Conventional Commits;
  - README completo;
  - `package.json`;
  - testes automatizados;
  - releases com tags.
- Interface em português do Brasil.
- Dados pessoais de catequizandos: coletar apenas o necessário (LGPD).

## Estratégia de Fronteiras
- **Por que esta divisão**:
  - Cada entidade do domínio tem dono único.
  - A spec `gestao-turmas` concentra os vínculos entre catequistas e catequizandos. Assim, os cadastros ficam independentes entre si e podem ser feitos em paralelo.
  - Programa e presença dependem apenas de turmas.
- **Pontos de atenção entre specs**:
  - Vínculo usuário ↔ catequista (fundação × cadastro-catequistas).
  - Regras de inativação: o que acontece com turmas e presenças quando um catequista ou catequizando é inativado.
  - Autorização por turma: o catequista só acessa as próprias turmas (fundação × turmas × presença).

## Specs (ordem de dependência)
- [ ] fundacao-autenticacao -- Setup do projeto (Next.js, Prisma, testes, CI) e login com perfis coordenação e catequista. Dependências: none
- [ ] cadastro-catequistas -- Criar, listar, editar e inativar catequistas, com vínculo à conta de usuário. Dependências: fundacao-autenticacao
- [ ] cadastro-catequizandos -- Criar, listar, editar e inativar catequizandos, com dados pessoais e situação sacramental. Dependências: fundacao-autenticacao
- [ ] gestao-turmas -- Turmas por ciclo, catequistas responsáveis e inscrição de catequizandos. Dependências: cadastro-catequistas, cadastro-catequizandos
- [ ] programa-catequese -- Encontros da turma com data, tema e descrição. Dependências: gestao-turmas
- [ ] controle-presenca -- Chamada por encontro e percentual de frequência por catequizando. Dependências: programa-catequese
