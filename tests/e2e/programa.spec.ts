import { expect, test, type Browser, type Page } from "@playwright/test";
import { CATEQUISTA, COORDENACAO } from "./fixtures";

/*
 * Os temas formam um programa único e global: a numeração e o total do progresso dependem de
 * todos os temas ativos. Só este arquivo cria temas, então ele roda em série (um teste por vez)
 * e cada asserção dependente do total lê o programa logo antes de conferir.
 */
test.describe.configure({ mode: "serial" });

const PROGRAMA = "/coordenacao/programa";

function sufixo() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Data civil (AAAA-MM-DD) deslocada em dias a partir de hoje, no fuso local. */
function dataRelativa(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** AAAA-MM-DD → dd/mm/aaaa (formato exibido nas mensagens e rótulos). */
function exibida(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

async function criarTema(page: Page, titulo: string) {
  await page.goto(`${PROGRAMA}/novo`);
  await page.getByLabel("Título").fill(titulo);
  await page.getByLabel("Descrição").fill(`Descrição de ${titulo}`);
  await page.getByRole("button", { name: "Criar tema" }).click();
  await expect(page.getByRole("status")).toContainText("Tema criado.");
  await expect(itemTema(page, titulo)).toBeVisible();
}

function itemTema(page: Page, titulo: string) {
  return page.locator(".lista-temas-item").filter({ hasText: titulo });
}

/** Títulos na ordem exibida no programa. */
async function ordemDosTemas(page: Page): Promise<string[]> {
  return page.locator(".lista-temas-titulo").allTextContents();
}

/** Quantidade de temas ativos (numerados) no programa, lida pela coordenação. */
async function totalDeTemasAtivos(page: Page): Promise<number> {
  await page.goto(PROGRAMA);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Programa");
  return page.locator(".lista-temas-numero").count();
}

async function criarTurma(page: Page, nome: string): Promise<string> {
  await page.goto("/coordenacao/turmas/nova");
  await page.getByLabel("Nome").fill(nome);
  await page.getByLabel("Ciclo (ano)").fill("2026");
  await page.getByLabel("Dia da semana").selectOption({ label: "Sábado" });
  await page.getByLabel("Horário").fill("09:30");
  await page.getByLabel("Local").fill("Salão paroquial");
  await page.getByRole("button", { name: "Criar turma" }).click();
  await expect(page.getByRole("status")).toContainText("Turma criada.");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(nome);
  return new URL(page.url()).pathname.split("/").pop() ?? "";
}

/** Designa o catequista fixture na aba Equipe e link, onde ficam as designações (6.1). */
async function designarFixture(page: Page, turmaId: string) {
  await page.goto(`/coordenacao/turmas/${turmaId}/equipe`);
  await page.getByLabel("Catequista", { exact: true }).selectOption({ label: CATEQUISTA.nome });
  await page.getByRole("button", { name: "Designar" }).click();
  await expect(page.getByRole("status")).toContainText("Catequista designado.");
  await expect(page).toHaveURL(new RegExp(`/coordenacao/turmas/${turmaId}/equipe`));
}

/** Escolhe o tema pela opção que contém o título (o rótulo inclui o número do programa). */
async function escolherTema(page: Page, titulo: string) {
  const select = page.getByLabel("Tema");
  const valor = await select.locator("option", { hasText: titulo }).getAttribute("value");
  await select.selectOption(valor ?? "");
}

/** Preenche e envia o formulário de novo encontro (sem tratar o aviso de tema repetido). */
async function enviarEncontro(
  page: Page,
  base: string,
  dados: { data: string; titulo?: string; horario?: string },
) {
  await page.goto(`${base}/novo`);
  await page.getByLabel("Data").fill(dados.data);
  if (dados.horario) await page.getByLabel("Horário").fill(dados.horario);
  if (dados.titulo) await escolherTema(page, dados.titulo);
  await page.getByRole("button", { name: "Criar encontro" }).click();
}

async function criarEncontro(
  page: Page,
  base: string,
  dados: { data: string; titulo?: string; horario?: string },
) {
  await enviarEncontro(page, base, dados);
  await expect(page.getByRole("status")).toContainText("Encontro criado.");
  await expect(page).toHaveURL(new RegExp(`${base}\\?aviso=encontro-criado$`));
}

function itemEncontro(page: Page, data: string) {
  return page.locator(".cronograma-item").filter({ hasText: exibida(data) });
}

async function semRolagemHorizontal(page: Page) {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const { largura, visivel } = await page.evaluate(() => ({
    largura: document.documentElement.scrollWidth,
    visivel: document.documentElement.clientWidth,
  }));
  expect(largura).toBeLessThanOrEqual(visivel);
}

async function comoCatequista(browser: Browser, baseURL: string | undefined) {
  const contexto = await browser.newContext({ baseURL, storageState: CATEQUISTA.estado });
  return { contexto, page: await contexto.newPage() };
}

test.describe("programa e encontros", () => {
  test.use({ storageState: COORDENACAO.estado });

  test("cria três temas, reordena e desativa um; o catequista vê o programa sem ações", async ({
    page,
    browser,
    baseURL,
  }) => {
    const s = sufixo();
    const [a, b, c] = [`Tema Alfa ${s}`, `Tema Beta ${s}`, `Tema Gama ${s}`];
    await criarTema(page, a);
    await criarTema(page, b);
    await criarTema(page, c);

    // Novos temas entram no fim, na ordem de criação.
    await page.goto(PROGRAMA);
    let ordem = await ordemDosTemas(page);
    expect(ordem.indexOf(b)).toBe(ordem.indexOf(a) + 1);
    expect(ordem.indexOf(c)).toBe(ordem.indexOf(b) + 1);

    // Subir o Gama troca a posição com o Beta (posição relativa, não absoluta).
    await page.getByRole("button", { name: `Subir ${c}` }).click();
    await expect
      .poll(async () => {
        ordem = await ordemDosTemas(page);
        return ordem.indexOf(c) < ordem.indexOf(b);
      })
      .toBe(true);
    expect(ordem.indexOf(c)).toBe(ordem.indexOf(a) + 1);

    // Desativar o Beta pelo diálogo: fica marcado como Desativado, sem número.
    await page.getByRole("button", { name: `Desativar ${b}` }).click();
    const dialogo = page.getByRole("dialog");
    await expect(dialogo).toContainText(`Desativar o tema ${b}?`);
    await dialogo.getByRole("button", { name: "Desativar", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Tema desativado.");
    await expect(itemTema(page, b).locator(".situacao-inativo")).toHaveText("Desativado");
    await expect(itemTema(page, b).locator(".lista-temas-numero")).toHaveCount(0);
    await expect(page.getByRole("button", { name: `Reativar ${b}` })).toBeVisible();

    // O catequista vê o programa sem ações e sem links de gestão.
    const { contexto, page: cat } = await comoCatequista(browser, baseURL);
    await cat.goto("/catequista");
    await cat.getByRole("link", { name: "Programa" }).first().click();
    await expect(cat).toHaveURL(/\/catequista\/programa$/);
    await expect(cat.getByRole("heading", { level: 1 })).toHaveText("Programa");
    await expect(itemTema(cat, a)).toBeVisible();
    await expect(itemTema(cat, c)).toBeVisible();
    await expect(cat.locator("main").getByRole("button")).toHaveCount(0);
    await expect(cat.getByRole("link", { name: "Novo tema" })).toHaveCount(0);
    await expect(cat.locator("main .lista-temas").getByRole("link")).toHaveCount(0);
    await contexto.close();
  });

  test("catequista designado: aviso de tema repetido, Salvar mesmo assim, realizado e progresso", async ({
    page,
    browser,
    baseURL,
  }) => {
    const s = sufixo();
    const [temaA, temaB] = [`Tema Progresso A ${s}`, `Tema Progresso B ${s}`];
    await criarTema(page, temaA);
    await criarTema(page, temaB);
    const turmaId = await criarTurma(page, `Turma Programa ${s}`);
    await designarFixture(page, turmaId);

    const { contexto, page: cat } = await comoCatequista(browser, baseURL);
    const base = `/catequista/turmas/${turmaId}/encontros`;
    const passada = dataRelativa(-7);
    const repetida = dataRelativa(-14);

    await criarEncontro(cat, base, { data: passada, titulo: temaA });

    // Segundo encontro com o mesmo tema: o servidor avisa e nada é gravado.
    await enviarEncontro(cat, base, { data: repetida, titulo: temaA });
    await expect(cat.locator("main").getByRole("alert")).toContainText(
      `Este tema já tem encontro nesta turma em ${exibida(passada)}.`,
    );
    await expect(cat).toHaveURL(new RegExp(`${base}/novo$`));
    // Os valores são preservados no reenvio.
    await expect(cat.getByLabel("Data")).toHaveValue(repetida);

    // "Salvar mesmo assim" reenvia com confirmarTemaRepetido=1 pelo name/value do botão.
    const envio = cat.waitForRequest(
      (r) => r.method() === "POST" && (r.postData() ?? "").includes("confirmarTemaRepetido"),
    );
    await cat.getByRole("button", { name: "Salvar mesmo assim" }).click();
    expect((await envio).postData()).toMatch(/name="[^"]*confirmarTemaRepetido"\r\n\r\n1\r\n/);
    await expect(cat.getByRole("status")).toContainText("Encontro criado.");
    await expect(itemEncontro(cat, passada)).toBeVisible();
    await expect(itemEncontro(cat, repetida)).toBeVisible();

    // Marca o encontro passado como realizado; o progresso conta 1 tema realizado.
    await itemEncontro(cat, passada)
      .getByRole("button", { name: /Marcar como realizado/ })
      .click();
    await expect(cat.getByRole("status")).toContainText("Encontro realizado.");
    await expect(itemEncontro(cat, passada).locator(".situacao-realizado")).toBeVisible();

    // Helpers de outros specs também criam temas direto no banco: o total pode mudar entre a
    // leitura e o reload, então lê e valida juntos e repete até o texto bater com o total real.
    await expect(async () => {
      const total = await totalDeTemasAtivos(page);
      expect(total).toBeGreaterThanOrEqual(2);
      await cat.reload();
      await expect(cat.locator(".progresso-resumo")).toHaveText(`1 de ${total} temas`, {
        timeout: 2_000,
      });
    }).toPass();
    // O tema B segue pendente; o A, não.
    const pendentes = cat.locator(".progresso-pendentes");
    await pendentes.getByText("Ver temas pendentes").click();
    await expect(pendentes).toContainText(temaB);
    await expect(pendentes).not.toContainText(temaA);
    await contexto.close();
  });

  test("cancela com motivo e reabre pelo diálogo", async ({ page }) => {
    const s = sufixo();
    const turmaId = await criarTurma(page, `Turma Cancelar ${s}`);
    const base = `/coordenacao/turmas/${turmaId}/encontros`;
    const data = dataRelativa(10);
    await criarEncontro(page, base, { data });

    await page.getByRole("button", { name: `Cancelar encontro de ${exibida(data)}` }).click();
    const dialogo = page.getByRole("dialog");
    await dialogo.getByLabel("Motivo (opcional)").fill("Chuva forte");
    await dialogo.getByRole("button", { name: "Cancelar encontro", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Encontro cancelado.");
    const item = itemEncontro(page, data);
    await expect(item.locator(".situacao-cancelado")).toBeVisible();
    await expect(item).toContainText("Motivo: Chuva forte");
    await expect(item.getByRole("link", { name: "Editar" })).toHaveCount(0);

    await page.getByRole("button", { name: `Reabrir encontro de ${exibida(data)}` }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Reabrir", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Encontro reaberto.");
    await expect(item.locator(".situacao-planejado")).toBeVisible();
    await expect(item).not.toContainText("Motivo:");
  });

  test("página da turma mostra o próximo encontro com link para o cronograma de cada papel", async ({
    page,
    browser,
    baseURL,
  }) => {
    const s = sufixo();
    const tema = `Tema Próximo ${s}`;
    await criarTema(page, tema);
    const turmaId = await criarTurma(page, `Turma Próximo ${s}`);
    await designarFixture(page, turmaId);
    // O próximo encontro fica no Resumo da turma.
    await page.goto(`/coordenacao/turmas/${turmaId}`);
    const secao = page.getByRole("region", { name: "Próximo encontro" });
    await expect(secao).toContainText("Nenhum encontro planejado");
    await expect(secao.getByRole("link", { name: "Ver cronograma" })).toHaveAttribute(
      "href",
      `/coordenacao/turmas/${turmaId}/encontros`,
    );

    const futura = dataRelativa(20);
    await criarEncontro(page, `/coordenacao/turmas/${turmaId}/encontros`, {
      data: futura,
      titulo: tema,
    });
    await page.goto(`/coordenacao/turmas/${turmaId}`);
    await expect(secao).toContainText(exibida(futura));
    await expect(secao).toContainText(tema);
    await secao.getByRole("link", { name: "Ver cronograma" }).click();
    await expect(page).toHaveURL(new RegExp(`/coordenacao/turmas/${turmaId}/encontros$`));

    const { contexto, page: cat } = await comoCatequista(browser, baseURL);
    await cat.goto(`/catequista/turmas/${turmaId}`);
    const secaoCat = cat.getByRole("region", { name: "Próximo encontro" });
    await expect(secaoCat).toContainText(exibida(futura));
    await secaoCat.getByRole("link", { name: "Ver cronograma" }).click();
    await expect(cat).toHaveURL(new RegExp(`/catequista/turmas/${turmaId}/encontros$`));
    await expect(itemEncontro(cat, futura).locator(".selo")).toHaveText("Próximo encontro");
    await contexto.close();
  });

  test("a página do tema lista os encontros de duas turmas (equivalência)", async ({ page }) => {
    const s = sufixo();
    const tema = `Tema Equivalente ${s}`;
    const [turma1, turma2] = [`Turma Eq Um ${s}`, `Turma Eq Dois ${s}`];
    await criarTema(page, tema);
    const id1 = await criarTurma(page, turma1);
    const id2 = await criarTurma(page, turma2);
    await criarEncontro(page, `/coordenacao/turmas/${id1}/encontros`, {
      data: dataRelativa(5),
      titulo: tema,
    });
    await criarEncontro(page, `/coordenacao/turmas/${id2}/encontros`, {
      data: dataRelativa(6),
      titulo: tema,
    });

    await page.goto(PROGRAMA);
    await expect(itemTema(page, tema)).toContainText("2 encontros");
    await itemTema(page, tema).getByRole("link", { name: tema, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(tema);
    const tabela = page.getByRole("table", { name: "Encontros das turmas com este tema" });
    await expect(tabela.getByRole("row")).toHaveCount(3);
    await expect(tabela.getByRole("link", { name: turma1 })).toHaveAttribute(
      "href",
      `/coordenacao/turmas/${id1}`,
    );
    await expect(tabela.getByRole("link", { name: turma2 })).toBeVisible();
    // Tema usado não oferece exclusão.
    await expect(page.getByRole("button", { name: `Excluir ${tema}` })).toHaveCount(0);
  });

  test("o catequista não designado vê Acesso negado no cronograma de outra turma", async ({
    page,
    browser,
    baseURL,
  }) => {
    const turmaId = await criarTurma(page, `Turma Alheia Programa ${sufixo()}`);
    const { contexto, page: cat } = await comoCatequista(browser, baseURL);
    for (const caminho of ["", "/novo"]) {
      await cat.goto(`/catequista/turmas/${turmaId}/encontros${caminho}`);
      await expect(cat.getByRole("heading", { level: 1 })).toHaveText("Acesso negado");
    }
    await contexto.close();
  });

  test.describe("teclado", () => {
    test.use({ locale: "pt-BR" });

    test("cria encontro só com o teclado", async ({ page }) => {
      const s = sufixo();
      const tema = `Tema Teclado ${s}`;
      await criarTema(page, tema);
      const turmaId = await criarTurma(page, `Turma Teclado Programa ${s}`);
      const base = `/coordenacao/turmas/${turmaId}/encontros`;
      const data = dataRelativa(30);
      const [ano, mes, dia] = data.split("-");

      await page.goto(`${base}/novo`);
      const campoData = page.getByLabel("Data");
      await campoData.focus();
      // Campo de data em pt-BR: dia, mês e ano, com avanço automático entre segmentos.
      await page.keyboard.type(`${dia}${mes}${ano}`);
      // No Linux o Chromium segue o locale do sistema (en-US no CI): mês, dia e ano.
      if ((await campoData.inputValue()) !== data) {
        // Sem o blur, o foco continua no segmento do ano; refocar volta ao primeiro segmento.
        await campoData.blur();
        await campoData.focus();
        await page.keyboard.type(`${mes}${dia}${ano}`);
      }
      await expect(campoData).toHaveValue(data);
      const horario = page.getByLabel("Horário");
      for (
        let i = 0;
        i < 4 && !(await horario.evaluate((e) => e === document.activeElement));
        i++
      ) {
        await page.keyboard.press("Tab");
      }
      await expect(horario).toBeFocused();
      // No Linux o Chromium usa 12 h com AM/PM; o "A" é ignorado onde o campo é de 24 h.
      await page.keyboard.type("1000A");
      await expect(horario).toHaveValue("10:00");
      const select = page.getByLabel("Tema");
      for (let i = 0; i < 4 && !(await select.evaluate((e) => e === document.activeElement)); i++) {
        await page.keyboard.press("Tab");
      }
      await expect(select).toBeFocused();
      const opcao = select.locator("option", { hasText: tema });
      const valor = await opcao.getAttribute("value");
      // Busca por digitação no select fechado: o rótulo começa pelo número do programa.
      await page.keyboard.type((await opcao.textContent()) ?? "");
      await expect(select).toHaveValue(valor ?? "");
      await page.keyboard.press("Tab");
      await expect(page.getByLabel("Observações")).toBeFocused();
      await page.keyboard.type("Trazer a Bíblia");
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Criar encontro" })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("status")).toContainText("Encontro criado.");
      await expect(itemEncontro(page, data)).toContainText("10:00");
      await expect(itemEncontro(page, data)).toContainText(tema);
    });
  });

  test.describe("a 360 px", () => {
    test.use({ viewport: { width: 360, height: 740 } });

    test("programa, cronograma e formulário sem rolagem horizontal", async ({ page }) => {
      const s = sufixo();
      const tema = `Tema Estreito com título bem comprido para testar a quebra ${s}`;
      await criarTema(page, tema);
      const turmaId = await criarTurma(page, `Turma Estreita Programa ${s}`);
      const base = `/coordenacao/turmas/${turmaId}/encontros`;
      await criarEncontro(page, base, { data: dataRelativa(3), titulo: tema });
      await page.goto(PROGRAMA);
      await semRolagemHorizontal(page);
      await page.goto(base);
      await semRolagemHorizontal(page);
      await page.goto(`${base}/novo`);
      await semRolagemHorizontal(page);
    });
  });
});
