---
inclusion: always
updated_at: 2026-10-05
---
# Design System: "Acolhedor"

Direção visual escolhida em 2026-09-30, entre três opções (Sereno, Acolhedor e Litúrgico). A implementação de referência está em `src/app/globals.css`, na tela de login e no layout interno (`AppShell`). Todas as telas já entregues (equipe, catequizandos, turmas, programa, autocadastro) seguem este sistema.

## Princípios

- **Acolhedor, não institucional.** O tom é de uma comunidade, não de uma repartição. Os textos falam com a pessoa ("Que bom ver você"), em frases curtas.
- **Celular primeiro.** O catequista usa o sistema durante o encontro, no celular. Os alvos de toque têm no mínimo 44 px, os campos são grandes e cada tela segue uma única coluna até 640 px.
- **Leve e plano.** Superfícies brancas sobre um fundo verde muito claro, cantos arredondados, sem gradientes e com no máximo uma sombra discreta nos cartões.
- **Acessibilidade não é opcional.** Contraste AA, rótulos sempre visíveis (não apenas placeholders), foco visível e operação completa pelo teclado.

## Tokens (variáveis CSS em `:root`)

| Token | Valor | Uso |
|---|---|---|
| `--cor-fundo` | `#EEF3E6` | Fundo da página |
| `--cor-superficie` | `#FFFFFF` | Cartões, cabeçalho |
| `--cor-campo` | `#F3F6EE` | Fundo de campos de formulário |
| `--cor-texto` | `#1E2A14` | Texto principal |
| `--cor-texto-suave` | `#5F6B55` | Texto de apoio, legendas |
| `--cor-primaria` | `#3B6D11` | Botão principal, marca, links |
| `--cor-primaria-hover` | `#27500A` | Hover do primário |
| `--cor-primaria-suave` | `#EAF3DE` | Item de menu ativo, destaques leves |
| `--cor-primaria-contraste` | `#FFFFFF` | Texto sobre o fundo primário |
| `--cor-borda` | `#D5DEC8` | Bordas e divisórias |
| `--cor-perigo` / `--cor-perigo-fundo` | `#A32D2D` / `#FCEBEB` | Erros |
| `--cor-sucesso` / `--cor-sucesso-fundo` | `#27500A` / `#EAF3DE` | Confirmações |
| `--cor-foco` | `#1D4ED8` | Anel de foco (contrasta com o verde) |
| `--raio-campo` | `10px` | Campos |
| `--raio-cartao` | `14px` | Cartões |
| `--raio-pilula` | `999px` | Botões e etiquetas |
| `--largura-maxima` | `960px` | Largura máxima do conteúdo |

**Tipografia:** fonte do sistema (`system-ui`). Títulos com peso 600 e corpo com 400. Tamanhos: título da página em 1.5rem, título de cartão em 1.25rem, corpo em 1rem e legenda em 0.875rem. Não há fonte com serifa.

**Espaçamento:** múltiplos de 0.25rem. O padrão entre campos é 1rem, dentro de cartões é 1.25rem a 1.5rem, e as margens laterais no celular são de 1rem.

## Componentes e padrões

- **Botão primário:** formato pílula, fundo `--cor-primaria` e texto branco, com altura mínima de 44 px. Apenas um por tela.
- **Botão secundário:** pílula com borda `--cor-primaria` e fundo branco.
- **Campo:** rótulo visível acima, fundo `--cor-campo`, sem borda aparente em repouso (borda aparece em hover e foco) e `--raio-campo`. Em caso de erro, borda `--cor-perigo` e mensagem abaixo, ligada por `aria-describedby`.
- **Cartão:** superfície branca com `--raio-cartao` e padding de 1.25rem a 1.5rem.
- **Alertas:** fundo suave com texto na cor forte do mesmo tom (perigo ou sucesso). Nunca use texto preto sobre fundo colorido.
- **Marca:** quadrado arredondado verde com um ícone de folha, seguido de "Acutis Catequese" em peso 600.
- **Telas de lista:** busca no topo, linhas separadas por borda (não cartões individuais) e ação principal como botão primário.
- **Etiquetas e situações:** `.etiqueta` e `.selo` (pílula suave) para categorias, `.situacao-*` e `.estado-*` para a situação de um registro (ativo, inativo, planejado, realizado, cancelado...). A situação sempre aparece como **texto**, nunca só por cor.
- **Escolha de status (ex.: chamada):** opções em pílula (`.presenca-opcao`) sobre um `input` de rádio invisível que cobre toda a pílula, para o alvo de toque ser inteiro. A opção marcada muda fundo e borda (`:has(input:checked)`); "ausente" usa o tom de perigo. Cada status aparece com **ícone + texto** (`StatusPresenca`), e alertas como "Baixa frequência" também, nunca só pela cor.
- **Estado vazio:** título convidativo, uma linha de explicação e a ação principal.
- **Confirmação de ações destrutivas** (inativar etc.): pede confirmação explícita e usa texto que nomeia a ação ("Inativar catequista"), não "OK".

## Como aplicar os estilos

- **Fonte da verdade:** `src/app/globals.css`, com classes semânticas em português (`.lista-turmas`, `.cronograma`, `.botao-primario`) e cores/raios sempre via tokens, nunca valores soltos.
- **Organização do arquivo:** tokens e base primeiro; depois os padrões compartilhados (botão, campo, aviso, lista vazia, paginação); depois uma seção comentada por feature (`/* Turmas (gestao-turmas): ... */`). Estilos novos entram na seção da própria feature.
- **CSS Modules** (`*.module.css`) são exceção, para estilo isolado de um componente ou página (hoje: `comum/confirmacao` e a página pública de inscrição). Eles usam os mesmos tokens.
- **Acessibilidade de base:** `:focus-visible` global com `--cor-foco`, link "pular para o conteúdo" (`.pular-link`) e `.visualmente-oculto` para texto só para leitor de tela.
- **Breakpoint:** uma coluna até 640 px e ajustes a partir de `min-width: 640px`.

## Textos (voz)

- Português do Brasil, segunda pessoa informal ("você") e frases curtas.
- Botões começam com um verbo e têm de 1 a 3 palavras ("Entrar", "Salvar alterações", "Inativar").
- Mensagens de erro dizem o que aconteceu e o que fazer, sem culpar a pessoa.
- Evitar "por favor", "sucesso!" e pontos de exclamação em mensagens do sistema.
