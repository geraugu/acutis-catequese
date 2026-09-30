# Implementation Plan

- [ ] 1. Fundação da feature: dados do perfil do membro

- [x] 1.1 Criar a tabela de perfil do membro e incluí-la na limpeza dos testes
  - Acrescentar ao schema o modelo de perfil do membro (telefone só com dígitos, observações opcionais, datas), com relação 1:1 com o usuário e exclusão em cascata. Adicionar no usuário o campo de relação opcional.
  - Gerar e aplicar a migração nos bancos de desenvolvimento e de teste e regenerar o client.
  - Incluir a nova tabela nas listas de TRUNCATE do setup de integração e do preparo do banco do e2e.
  - Pronto quando: `npm run db:migrate` cria `perfil_membro` e os testes de integração existentes continuam passando.
  - _Requirements: 2.1, 8.1_

- [x] 1.2 Verificar as permissões do plugin admin e preparar os helpers de teste da equipe
  - Com uma sessão real de coordenação no banco de teste, exercitar cada chamada do plugin admin que a feature usa: criar, atualizar, trocar papel, definir senha, revogar sessões, banir e desbanir (inclusive um alvo com papel coordenação) e remover. Registrar o resultado nas Implementation Notes.
  - Se alguma chamada for recusada, ajustar as permissões do papel coordenação e rodar novamente a suíte de integração da fundação. É um gatilho de revalidação registrado no design.
  - Criar os helpers compartilhados dos testes de integração da equipe:
    - mocks de `next/headers` e `redirect`, reaproveitando o padrão dos testes da fundação;
    - criação de coordenação e de catequista com sessão;
    - uso da sessão como ator.
  - Pronto quando: um teste de integração passa exercitando todas as chamadas listadas com a sessão de coordenação, e os helpers estão disponíveis para as tarefas 3.x.
  - _Depends: 1.1_
  - _Requirements: 1.3, 6.1, 6.4_

- [ ] 2. Domínio da equipe (regras puras, sem framework)

- [x] 2.1 (P) Implementar as regras de telefone
  - Normalização para dígitos: aceita pontuação e um `+55` inicial e exige 10 ou 11 dígitos. Formatação no padrão brasileiro. Schema de validação com mensagem em pt-BR.
  - Geração dos links de ligação e de conversa no WhatsApp.
  - Pronto quando: os testes unitários cobrem as entradas com máscara, sem máscara e com +55, telefones de 9 e de 12 dígitos recusados, a formatação com 10 e com 11 dígitos e os dois links.
  - _Boundary: equipe/domain/telefone_
  - _Requirements: 2.8, 8.3_

- [ ] 2.2 (P) Implementar a busca e a paginação da equipe
  - Normalização de texto: minúsculas, sem acentos e com espaços colapsados.
  - Exportar `normalizarBusca`, `filtrarPorTermo` (genérico, reutilizável pelas próximas listas), `filtrarMembros` (especialização para a equipe) e `paginar`, conforme o design.
  - Filtro por termo, que casa com o nome ou o e-mail normalizados ou com os dígitos do telefone. Filtro por situação (ativo, inativo, todos). Ordenação alfabética em pt-BR.
  - Paginação de 20 itens que limita a página ao intervalo válido.
  - Pronto quando: os testes unitários mostram que "joao" encontra "João", que um trecho do telefone encontra o membro, que o filtro de situação e a ordem funcionam e que 45 itens geram 3 páginas, com página inválida ou fora do intervalo corrigida.
  - _Boundary: equipe/domain/busca_
  - _Requirements: 3.1, 3.2, 3.3, 3.6_

- [ ] 2.3 (P) Implementar as regras de proteção da coordenação
  - Identificar as violações "a si mesmo", "próprio papel" e "última coordenação" para as operações inativar e mudar papel, a partir do ator, do alvo e da contagem de coordenações ativas.
  - Pronto quando: os testes unitários cobrem todas as combinações do fluxograma do design, incluindo que mudar para o mesmo papel nunca é violação e que um alvo catequista nunca aciona a regra da última coordenação.
  - _Boundary: equipe/domain/protecao-coordenacao_
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 2.4 Implementar os schemas do membro e as mensagens da equipe
  - Schema de edição (nome, e-mail normalizado, telefone, papel, observações opcionais que viram indefinidas quando vazias) e schema de criação (edição mais a senha, que reutiliza a regra de senha da fundação).
  - Mensagens em pt-BR e códigos de aviso da tabela do design (cadastrado, alterações salvas, senha redefinida, inativado, reativado, e-mail em uso e as três violações de proteção). Função que traduz um código de aviso vindo da URL, aceitando apenas códigos conhecidos.
  - Pronto quando: os testes unitários cobrem os campos obrigatórios com as mensagens, a normalização do e-mail, o papel inválido recusado, a senha de 7 caracteres recusada na criação, as observações vazias e o código de aviso desconhecido resultando em nenhuma mensagem.
  - _Boundary: equipe/domain/membro, equipe/mensagens_
  - _Depends: 2.1_
  - _Requirements: 2.2, 2.3, 2.4, 2.6, 2.7, 2.9, 4.2, 5.3_

- [ ] 3. Operações no servidor

- [ ] 3.1 Implementar o repositório da equipe
  - Listar todos os membros com papel, telefone e situação (a situação vem do bloqueio da conta), omitindo registros com papel inválido. Obter o detalhe de um membro com observações e data de cadastro.
  - Verificar se um e-mail está em uso, opcionalmente ignorando um id. Gravar o perfil criando ou atualizando. Contar as coordenações ativas.
  - Pronto quando: os testes de integração mostram que a conta do seed, sem perfil, aparece com telefone nulo; que um membro banido aparece como inativo; que a checagem de e-mail em uso respeita a exceção de id; e que a contagem ignora coordenações inativas.
  - _Depends: 1.1_
  - _Requirements: 2.5, 3.1, 4.3, 6.6, 7.3, 8.1_

- [ ] 3.2 Implementar a ação de cadastrar membro
  - Autorizar a coordenação antes de qualquer outra coisa. Validar com o schema de criação e verificar o e-mail em uso. Criar a conta pelo plugin admin, repassando a sessão da coordenação, e gravar o perfil. Se o perfil falhar, remover a conta criada (compensação).
  - O tipo de estado dos formulários é exportado por esta tarefa e consumido pelos formulários da tarefa 4.2.
  - Em caso de erro, devolver os erros por campo e os valores preenchidos, nunca a senha. Em caso de sucesso, redirecionar para a página do membro com o aviso "cadastrado".
  - Pronto quando: os testes de integração mostram que o membro é criado com papel e perfil e consegue logar com a senha inicial; que e-mail duplicado é recusado com a mensagem certa; que um catequista chamando a ação é redirecionado sem gravar nada; que uma falha simulada no perfil não deixa conta criada; e que o estado de erro nunca contém a senha.
  - _Depends: 1.2, 2.4, 3.1_
  - _Requirements: 1.3, 2.1, 2.3, 2.4, 2.5, 2.7, 2.10_

- [ ] 3.3 Implementar a ação de editar membro
  - Autorizar, validar com o schema de edição e verificar o e-mail em uso por outro membro. Se o papel mudar, aplicar as regras de proteção antes. Atualizar nome e e-mail e o papel pelo plugin admin, e o perfil pelo repositório. Em caso de sucesso, redirecionar para a página do membro com o aviso "alterações salvas". E-mail em uso e violação de proteção voltam como mensagem geral (alerta), sem gravar nada.
  - Pronto quando: os testes de integração mostram que a edição válida redireciona com a confirmação; que, após trocar o e-mail, o novo loga e o antigo não; que o e-mail de outro membro é recusado; que o papel alterado aparece na próxima leitura de sessão; e que a última coordenação não consegue se rebaixar, sem nada mudar no banco.
  - _Depends: 2.3, 3.2_
  - _Requirements: 1.3, 4.1, 4.2, 4.3, 4.4, 4.5, 7.2, 7.3_

- [ ] 3.4 Implementar a ação de redefinir senha
  - Autorizar e validar com a regra de senha. Definir a nova senha pelo plugin admin, encerrar todas as sessões do membro e limpar as tentativas falhas do e-mail dele. Redirecionar com o aviso "senha redefinida".
  - Pronto quando: os testes de integração mostram que a senha antiga falha e a nova funciona; que a sessão anterior do membro deixa de valer; que um e-mail bloqueado por tentativas consegue logar logo em seguida; e que uma senha de 7 caracteres é recusada.
  - _Depends: 3.2_
  - _Requirements: 1.3, 5.1, 5.2, 5.4_

- [ ] 3.5 Implementar as ações de inativar e reativar
  - Autorizar e aplicar as regras de proteção antes de inativar. Inativar bloqueia a conta sem prazo pelo plugin admin, o que encerra as sessões. Reativar remove o bloqueio. Nenhuma das duas exclui dados.
  - Pronto quando: os testes de integração mostram que o membro inativado recebe a recusa de conta desabilitada no login e perde a sessão; que o reativado volta a logar com a senha anterior; que inativar a si mesmo e inativar a última coordenação são recusados sem mudanças; e que inativar uma coordenação, havendo duas, funciona.
  - _Depends: 1.2, 2.3, 3.2_
  - _Requirements: 1.3, 6.1, 6.3, 6.4, 6.5, 7.1, 7.3_

- [ ] 4. Interface da equipe

- [ ] 4.1 (P) Construir os componentes de lista, busca, paginação e aviso
  - Lista em linhas com borda, com nome como link, papel em etiqueta, telefone formatado e situação, e estado vazio com "Limpar busca".
  - Formulário de busca por método GET, com rótulos visíveis e seletor de situação, que funciona sem JavaScript. Paginação com links que preservam a busca. Aviso de sucesso a partir de um código conhecido, anunciado como status.
  - Esta é a única tarefa paralela que altera o CSS global. Os estilos dos formulários ficam com a 4.4 e os da página do membro com a 4.5.
  - Estilos dessas peças no CSS global, seguindo o design system e sem rolagem horizontal a 360 px.
  - Pronto quando: os testes de componente mostram a lista com os dados formatados, o estado vazio, a busca com os valores atuais e a paginação com as URLs corretas.
  - _Boundary: lista-membros, busca-equipe, paginacao, aviso, globals.css_
  - _Depends: 2.2, 2.4, 3.1_
  - _Requirements: 2.9, 3.3, 3.4, 3.5, 3.7, 5.3, 6.6_

- [ ] 4.2 (P) Construir os formulários de membro e de senha
  - Formulário de membro nos modos criação e edição: o campo de senha aparece só na criação, o papel vem com catequista pré-selecionado, há uma dica de não registrar dados sensíveis nas observações, os erros ficam ligados aos campos, os valores são reapresentados, e o botão fica desabilitado durante o envio.
  - Formulário de redefinição de senha com um único campo e o mesmo padrão de erro.
  - Pronto quando: os testes de componente mostram os erros ligados aos campos com `aria-describedby`, a ausência de campo de senha no modo edição, o catequista pré-selecionado e o campo de senha sempre vazio após um erro.
  - Depende da 3.2 só pelo tipo do estado do formulário. Os estilos dos formulários ficam com a 4.4.
  - _Boundary: formulario-membro, formulario-senha_
  - _Depends: 3.2_
  - _Requirements: 2.3, 2.6, 2.10, 4.6, 5.2_

- [ ] 4.3 (P) Construir a confirmação de inativar e reativar
  - Botão que abre um diálogo nativo com o título nomeando a ação e o membro (por exemplo, "Inativar Maria Souza?"), um texto explicando o efeito e os botões de confirmar (estilo de perigo para inativar) e "Cancelar". O foco inicial fica em "Cancelar" e o Esc fecha.
  - Os estilos do diálogo ficam num arquivo próprio do componente, fora do CSS global.
  - Pronto quando: um teste de componente mostra o título com o nome do membro, os dois botões e que confirmar envia a ação correspondente à situação.
  - _Boundary: acoes-situacao_
  - _Depends: 3.5_
  - _Requirements: 6.2_

- [ ] 4.4 Integração: item de menu e páginas de lista e cadastro
  - Acrescentar o item "Equipe" ao menu da coordenação e atualizar o teste unitário do menu: o item aparece só para a coordenação.
  - Página da lista, que lê busca, situação e página da URL, e página de cadastro. As duas exigem o papel coordenação e têm títulos em pt-BR.
  - Estilos dos formulários (membro e senha) no CSS global.
  - Pronto quando: o teste do menu passa, o build passa e, verificando manualmente com `npm run dev`, a coordenação chega à lista pelo menu, busca e cadastra um membro.
  - _Boundary: menu-por-papel, app/(interno)/coordenacao/equipe (page, novo), globals.css (formulários)_
  - _Depends: 3.2, 4.1, 4.2_
  - _Requirements: 1.1, 1.2, 3.1, 3.4, 8.4_

- [ ] 4.5 Integração: página do membro, edição, senha e "não encontrado"
  - Página do membro com dados em lista de definição, links de ligação e WhatsApp, aviso de sucesso e ações conforme a situação. Páginas de edição e de redefinição de senha. Página "Membro não encontrado" para um id inexistente.
  - Estilos da página do membro no CSS global.
  - Pronto quando: o build passa e, verificando manualmente, a coordenação edita, redefine a senha, inativa e reativa pela página do membro. Os cenários de "não encontrado" e do conteúdo da página do membro são cobertos pelo e2e (5.1).
  - _Boundary: app/(interno)/coordenacao/equipe/[id], globals.css (página do membro)_
  - _Depends: 3.3, 3.4, 3.5, 4.2, 4.3, 4.4_
  - _Requirements: 6.6, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 5. Validação ponta a ponta

- [ ] 5.1 Escrever os testes e2e da gestão da equipe
  - Reutilizar o setup do e2e da fundação, que já salva a sessão de coordenação e a de catequista em `playwright/.auth/`. O preparo do banco já limpa `perfil_membro` (tarefa 1.1).
  - Cenários:
    - cadastrar um catequista pela interface, ver "Membro cadastrado" e o novo catequista conseguir entrar;
    - a busca sem acento encontra o membro e a URL contém o termo;
    - inativar pelo diálogo mostra a situação "Inativo", e o login desse membro recebe a mensagem de acesso desabilitado;
    - um catequista vê "Acesso negado" na área da equipe;
    - a lista e o formulário não têm rolagem horizontal a 360 px;
    - a página do membro mostra os dados e os links de telefone;
    - um id inexistente mostra "Membro não encontrado".
  - Usar e-mails únicos por teste, para não interferir nos usuários do setup.
  - Pronto quando: `npm run test:e2e` passa com todos os cenários da fundação e desta spec.
  - _Depends: 4.5_
  - _Requirements: 1.2, 2.1, 2.9, 3.2, 3.4, 3.7, 6.1, 6.2, 6.3, 8.1, 8.3, 8.4, 8.5_

## Implementation Notes
- 1.2: com a sessão de coordenação, todas as chamadas do plugin admin funcionam (createUser, adminUpdateUser, setRole, setUserPassword, revokeUserSessions, banUser/unbanUser, inclusive com alvo coordenação, e removeUser). Nenhuma permissão foi alterada, então não houve revalidação da fundação. Os helpers ficam em `tests/integration/equipe/helpers.ts` e `next-mocks.ts` (os `vi.mock` ficam em cada arquivo de teste). O e-mail é gravado em minúsculas.
