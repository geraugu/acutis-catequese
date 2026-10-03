# Implementation Plan

- [ ] 1. Fundação: steering, banco, configuração e reuso de componentes

- [x] 1.1 Registrar a ampliação da exceção de imports no steering
  - Ampliar em `.kiro/steering/structure.md` a exceção de 2026-10-01: um módulo também pode importar arquivos puros `domain/*.ts` de módulos upstream, que não têm dependência de framework nem de persistência. Citar como exemplos `catequizandos/domain/ficha` e `turmas/domain/turma`.
  - Pronto quando: `structure.md` descreve a regra ampliada com a data da decisão, e a regra original de `acesso.ts` continua intacta.
  - _Requirements: 3.1, 7.2_

- [x] 1.2 Criar as tabelas do autocadastro
  - Criar os modelos `LinkAutocadastro`, `FichaAutocadastro` e `LimiteAutocadastro`, com as relações inversas em `Turma` e `Catequizando`, e a migração `*_autocadastro` com o índice único parcial `link_ativo_unico` (um link não desativado por turma). Rodar `prisma generate`.
  - Incluir as três tabelas na limpeza de `tests/integration/setup.ts` e `tests/e2e/preparar-banco.ts`, na ordem certa das FKs.
  - Pronto quando: a migração aplica nos bancos de dev e de teste, um teste de integração prova que um segundo link ativo na mesma turma é recusado pelo banco e a limpeza zera as tabelas novas.
  - _Requirements: 1.3, 3.5_

- [x] 1.3 (P) Configurar as variáveis de ambiente e a rota pública
  - Adicionar `AUTOCADASTRO_SEGREDO` (obrigatória) e `APP_URL` (se ainda não existir) em `src/lib/env.ts` e no `.env.example`, e preencher os valores de teste no CI.
  - Incluir o segmento `inscricao` nas exclusões do `matcher` de `src/proxy.ts`.
  - Pronto quando: `tests/unit/auth/rota-protegida.test.ts` mostra `/inscricao/abc` como pública e `/coordenacao` ainda protegida, e a aplicação falha ao iniciar sem `AUTOCADASTRO_SEGREDO`.
  - _Boundary: lib/env, proxy_
  - _Requirements: 2.1_

- [ ] 1.4 (P) Tornar os campos da ficha reutilizáveis
  - Exportar `CamposFicha` de `components/catequizandos/formulario-ficha.tsx`, com a prop opcional `idPrefixo`, sem mudar o comportamento das telas atuais.
  - Pronto quando: os testes de componente e os e2e de catequizandos seguem verdes e um teste novo renderiza `CamposFicha` com um prefixo de id.
  - _Boundary: components/catequizandos_
  - _Requirements: 3.1, 5.5_

- [ ] 2. Domínio do autocadastro (regras puras)

- [ ] 2.1 (P) Implementar a situação do link e a validação da expiração
  - Calcular a situação do link (ativo, desativado ou expirado) a partir da desativação, da data de expiração e do encerramento da turma. O link continua ativo até o fim do dia de expiração, e com a turma encerrada a situação é "desativado".
  - Recusar data de expiração no passado com mensagem de data inválida.
  - Pronto quando: os testes unitários cobrem os casos ativo, desativado, expirado no dia seguinte, ativo no dia da expiração, turma encerrada e expiração ontem, hoje e amanhã.
  - _Boundary: autocadastro/domain/link_
  - _Requirements: 1.6, 1.7, 1.8, 1.9, 2.2_

- [ ] 2.2 (P) Implementar a política de limites de envio
  - Política de janela fixa: 5 envios por origem e 60 por link, por hora. A avaliação devolve se o envio é permitido e a próxima contagem.
  - Pronto quando: os testes unitários cobrem abaixo do limite, exatamente no limite, acima do limite e janela vencida que reinicia a contagem. 30 envios de origens diferentes no mesmo link em uma hora são permitidos.
  - _Boundary: autocadastro/domain/limites_
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 2.3 (P) Implementar os avisos da revisão e o consentimento
  - Montar os avisos de possível duplicata (com coincidentes visíveis ou ocultos) e de lotação, usando `estaLotada` e `formatarOcupacao` de `turmas/domain/turma`, e normalizar e-mail e telefone para a comparação.
  - Definir o texto do consentimento e sua versão (`2026-10-01`).
  - Pronto quando: os testes unitários cobrem duplicata visível e oculta, ausência de avisos, turma lotada, vagas nulas e normalização ("A@B.com " igual a "a@b.com", "(11) 9 8888-7777" igual a "11988887777").
  - _Boundary: autocadastro/domain/avisos, autocadastro/domain/consentimento_
  - _Requirements: 3.3, 6.1, 6.2, 6.3, 7.2_

- [ ] 3. Infraestrutura e persistência do módulo

- [ ] 3.1 Implementar o token, a origem da requisição e a autorização por turma
  - Gerar o token com 32 bytes aleatórios em base64url e o hash HMAC-SHA256 do IP com `AUTOCADASTRO_SEGREDO`.
  - Ler o IP do primeiro valor de `x-forwarded-for`. Sem o cabeçalho, devolver "sem origem", e o limite por origem deixa de se aplicar.
  - Autorizar a turma: exigir sessão, permitir a coordenação ou o catequista para quem `podeVerTurma` for verdadeiro e, nos demais casos, redirecionar para `/acesso-negado`.
  - Pronto quando: os testes unitários mostram:
    - tokens distintos com 43 caracteres;
    - o mesmo hash para o mesmo IP, diferente do IP em claro;
    - "sem origem" quando falta o cabeçalho;
    - o catequista de outra turma redirecionado.
  - _Boundary: autocadastro/token, autocadastro/origem, autocadastro/autorizacao_
  - _Depends: 1.3_
  - _Requirements: 1.1, 1.10, 4.1, 4.3, 5.4_

- [ ] 3.2 Implementar o repositório do link e dos limites
  - Operações de obter o link da turma (com a contagem de pendentes), criar, desativar, regenerar em transação (desativa o anterior e cria o novo), salvar a expiração, obter os dados públicos pelo token (só nome, dia, horário e local da turma) e registrar tentativa com bloqueio de linha.
  - Pronto quando: os testes de integração mostram que regenerar invalida o token anterior, que a projeção pública não traz nenhum campo além dos quatro da turma, e que tentativas concorrentes não ultrapassam o limite.
  - _Boundary: autocadastro/repositorio (link e limites)_
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.8, 2.1, 2.3, 4.1, 4.2_

- [ ] 3.3 Implementar as transições da ficha no repositório
  - Criar a ficha pendente com sacramentos e origem (turma, link, consentimento e versão) numa transação.
  - Confirmar com inscrição numa transação: a passagem `pendente → ativo` é condicional e a inscrição tem a entrada na data informada.
  - Corrigir a ficha pendente, mantendo o estado e a origem.
  - Descartar excluindo sacramentos, origem e catequizando, só se a ficha estiver pendente e tiver origem na turma.
  - Pronto quando: os testes de integração mostram:
    - a ficha criada como pendente com o consentimento gravado;
    - a segunda confirmação devolvendo "já revisada";
    - a inscrição criada com a data informada;
    - a correção mantendo o estado `pendente`;
    - o descarte apagando os três registros;
    - o descarte de uma ficha ativa recusado.
  - _Boundary: autocadastro/repositorio (fichas: escrita)_
  - _Requirements: 3.5, 5.5, 7.1, 7.5, 8.1, 8.2_

- [ ] 3.4 Implementar as leituras da revisão no repositório
  - Listar a fila da turma da mais antiga para a mais recente, obter o detalhe da ficha com o consentimento, buscar coincidências por e-mail ou telefone normalizados (com o indicador de visibilidade para o catequista) e contar as pendentes por turma.
  - Pronto quando: os testes de integração mostram:
    - a fila ordenada;
    - a coincidência encontrada por telefone com formatação diferente;
    - o coincidente oculto para o catequista de outra turma;
    - a contagem correta por turma.
  - _Boundary: autocadastro/repositorio (fichas: leitura)_
  - _Depends: 2.3_
  - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3_

- [ ] 4. Envio público

- [ ] 4.1 Implementar a action de envio público
  - Sequência: (1) carregar o link pelo token; se estiver indisponível, devolver o estado único de indisponível. (2) Registrar a tentativa por origem (quando houver) e por link; se exceder o limite, devolver "Muitas tentativas" sem gravar a ficha. (3) Validar a ficha com `criarFichaSchema` e o consentimento. (4) Criar a ficha pendente. (5) Devolver "recebida", sem dados.
  - Em caso de erro inesperado, registrar o log sem dados pessoais e devolver o estado de indisponível.
  - Pronto quando: os testes de integração mostram:
    - link desativado, expirado e de turma encerrada com a mesma resposta;
    - ficha sem consentimento não gravada;
    - campos inválidos com erros por campo e valores mantidos;
    - e-mail já cadastrado devolvendo "recebida";
    - o sexto envio da mesma origem recusado sem gravar nada.
  - _Boundary: autocadastro/actions-publicas_
  - _Requirements: 2.2, 3.1, 3.2, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.4_

- [ ] 4.2 Construir a página pública de autocadastro
  - Página em `/inscricao/[token]` fora do layout interno, no padrão "Acolhedor", mobile-first a partir de 320 px:
    - cabeçalho com os dados da turma;
    - `CamposFicha` com prefixo;
    - texto de consentimento com caixa desmarcada;
    - mensagens de erro, de limite e de recebimento.
  - A página exibe a mensagem de indisponível quando o link não vale.
  - Pronto quando:
    - a página renderiza sem sessão;
    - o teste de componente mostra a caixa de consentimento desmarcada e o recebimento sem repetir os dados;
    - o JS da rota no build fica abaixo de 150 kB comprimido.
  - _Boundary: app/inscricao, components/autocadastro (formulario-publico)_
  - _Depends: 1.4, 4.1_
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.3, 3.6_

- [ ] 5. Gestão do link e revisão (interno)

- [ ] 5.1 Implementar as actions de gestão do link
  - Gerar (recusa quando já há link ativo), desativar, regenerar e salvar a expiração, sempre com autorização por turma e com a turma aberta, e redirecionar com os avisos "Link desativado" e "Novo link gerado".
  - Pronto quando: os testes de integração mostram as ações da coordenação e do catequista responsável funcionando, o catequista de outra turma redirecionado para acesso negado e a expiração passada recusada.
  - _Boundary: autocadastro/actions (link)_
  - _Requirements: 1.1, 1.4, 1.5, 1.6, 1.7, 1.10_

- [ ] 5.2 Construir a seção do link na página da turma
  - Componente com a situação, a expiração, a contagem de pendentes, o link completo, o botão "Copiar link" (Clipboard API com o aviso "Link copiado") e as ações gerar, desativar, regenerar (com `Confirmacao`) e editar expiração.
  - Incluí-lo nas páginas de turma da coordenação e do catequista, com o atalho para a fila.
  - Pronto quando: o teste de componente mostra "Link copiado" após copiar, o diálogo de confirmação antes de regenerar, a contagem de pendentes com o atalho, e a situação "Desativado" em turma encerrada, sem as ações.
  - _Boundary: components/autocadastro (secao-link, copiar-link), páginas de turma_
  - _Depends: 3.2, 5.1_
  - _Requirements: 1.2, 1.5, 1.8, 1.9, 5.3_

- [ ] 5.3 Implementar a action de confirmação
  - Fluxo:
    - revalida a ficha;
    - bloqueia turma encerrada;
    - devolve o aviso de lotação quando faltar `confirmarLotacao=1`;
    - confirma com a inscrição de hoje;
    - redireciona com "Ficha confirmada e inscrita na turma" ou informa "já revisada".
  - Pronto quando: os testes de integração cobrem turma livre, turma lotada sem e com a flag, turma encerrada, ficha inválida e revisão concorrente, pela coordenação e pelo catequista responsável.
  - _Boundary: autocadastro/actions (confirmação)_
  - _Depends: 2.3, 3.3_
  - _Requirements: 6.4, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 5.4 Implementar as actions de correção e descarte
  - Corrigir valida com o schema upstream, mantém o estado pendente e exige turma aberta.
  - Descartar funciona com a turma aberta ou encerrada, só para fichas pendentes do link, e mostra o aviso "Ficha descartada", sem notificar o autor.
  - Pronto quando: os testes de integração mostram a correção com erro por campo e com sucesso, o descarte em turma encerrada funcionando, o descarte de ficha ativa recusado e o catequista de outra turma redirecionado.
  - _Boundary: autocadastro/actions (correção e descarte)_
  - _Depends: 3.3_
  - _Requirements: 5.5, 6.4, 8.1, 8.2, 8.3, 8.4_

- [ ] 5.5 Construir a fila e a página de revisão
  - Rotas `.../turmas/[id]/pendentes` e `.../pendentes/[fichaId]` para a coordenação e para o catequista, acessíveis também em turma encerrada (só para consulta e descarte).
  - A lista mostra nome, data de envio e avisos. O detalhe mostra todos os dados, a data e a versão do consentimento e os avisos de duplicata: com nome e link para a coordenação, e só "Possível duplicata" para o catequista quando o coincidente estiver oculto.
  - O detalhe traz a correção com `CamposFicha`, o botão confirmar com "Confirmar mesmo assim" e o descarte com `Confirmacao`.
  - Pronto quando: os testes de componente mostram o aviso de duplicata nas duas variantes, o aviso de lotação com o botão "Confirmar mesmo assim", a fila ordenada e só o descarte disponível em turma encerrada.
  - _Boundary: components/autocadastro (fila-pendentes, revisao-ficha), rotas pendentes_
  - _Depends: 1.4, 3.4, 5.3, 5.4_
  - _Requirements: 5.1, 5.2, 5.4, 6.1, 6.2, 6.3, 7.2, 7.6_

- [ ] 6. Integração e validação

- [ ] 6.1 Integração: exibir as pendentes em "Minhas turmas"
  - Mostrar a quantidade de fichas pendentes por turma na lista "Minhas turmas" do catequista (a página de cada turma já recebe a contagem em 5.2).
  - Pronto quando: com uma ficha pendente, "Minhas turmas" mostra "1 ficha pendente" na turma certa, e as turmas sem pendências não mostram nada.
  - _Depends: 3.4_
  - _Requirements: 5.3_

- [ ] 6.2 Integração: testes e2e do fluxo completo
  - O catequista gera e copia o link. Um contexto anônimo, em viewport de 360 px e com rede limitada a 3G, abre o link em menos de 3 s, envia a ficha com consentimento e vê "Recebemos sua ficha!". O catequista vê a pendente, confirma, e o catequizando aparece nos inscritos.
  - A coordenação desativa o link e o contexto anônimo vê a mensagem de indisponível.
  - O descarte com confirmação faz a ficha sumir da fila.
  - Pronto quando: `tests/e2e/autocadastro.spec.ts` passa no CI junto com a suíte existente, e o lint e o typecheck ficam verdes.
  - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.2, 2.4, 2.5, 3.5, 3.6, 5.1, 7.1, 8.1_

## Implementation Notes
- 1.2: os ids do schema são TEXT e as colunas camelCase (sem `@db.Uuid` nem nomes snake_case); só as tabelas usam `@@map` snake_case. SQL manual deve citar colunas entre aspas ("turmaId").
- 1.3: não há `APP_URL`; a URL base dos links é `env.BETTER_AUTH_URL`. `AUTOCADASTRO_SEGREDO` (mín. 32) precisa ser configurada na Vercel antes do deploy.
