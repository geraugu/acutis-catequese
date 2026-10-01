import { expect, test, type Browser, type Page } from "@playwright/test";
import { CATEQUISTA, COORDENACAO } from "./fixtures";

const BASE = "/coordenacao/turmas";

function sufixo() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Cria a turma pela interface e retorna o id (da URL da página da turma). */
async function criarTurma(page: Page, nome: string, vagas?: number): Promise<string> {
  await page.goto(`${BASE}/nova`);
  await page.getByLabel("Nome").fill(nome);
  await page.getByLabel("Ciclo (ano)").fill("2026");
  await page.getByLabel("Dia da semana").selectOption({ label: "Sábado" });
  await page.getByLabel("Horário").fill("09:30");
  await page.getByLabel("Local").fill("Salão paroquial");
  if (vagas !== undefined) await page.getByLabel("Vagas").fill(String(vagas));
  await page.getByRole("button", { name: "Criar turma" }).click();
  await expect(page.getByRole("status")).toContainText("Turma criada.");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(nome);
  return new URL(page.url()).pathname.split("/").pop() ?? "";
}

/** Cadastra um catequizando pela interface e retorna o id. */
async function cadastrarCatequizando(page: Page, nome: string): Promise<string> {
  await page.goto("/coordenacao/catequizandos/novo");
  await page.getByLabel("Nome").fill(nome);
  await page.getByLabel("Data de nascimento").fill("2008-05-20");
  await page.getByLabel("Telefone").fill("(11) 98765-4321");
  await page.getByRole("button", { name: "Cadastrar catequizando" }).click();
  await expect(page.getByRole("status")).toContainText("Catequizando cadastrado.");
  return new URL(page.url()).pathname.split("/").pop() ?? "";
}

/** Busca o candidato na página da turma e devolve o item dele na lista de candidatos. */
async function buscarCandidato(page: Page, turmaId: string, nome: string) {
  await page.goto(`${BASE}/${turmaId}`);
  await page.getByLabel("Buscar catequizando por termo").fill(nome);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  const item = page.locator(".inscrever-candidatos li").filter({ hasText: nome });
  await expect(item).toBeVisible();
  return item;
}

async function inscrever(page: Page, turmaId: string, nome: string) {
  const item = await buscarCandidato(page, turmaId, nome);
  await item.getByRole("button", { name: "Inscrever", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Catequizando inscrito.");
}

async function designarFixture(page: Page) {
  await page.getByLabel("Catequista", { exact: true }).selectOption({ label: CATEQUISTA.nome });
  await page.getByRole("button", { name: "Designar" }).click();
  await expect(page.getByRole("status")).toContainText("Catequista designado.");
}

function vigentes(page: Page) {
  return page.getByRole("list", { name: "Inscritos vigentes" });
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

test.describe("coordenação", () => {
  test.use({ storageState: COORDENACAO.estado });

  test("cria turma, designa o catequista e inscreve; o catequista acompanha em leitura", async ({
    page,
    browser,
    baseURL,
  }) => {
    const s = sufixo();
    const turma = `Turma Fluxo ${s}`;
    const nome = `Bruno Inscrito ${s}`;
    const naoInscrito = `Carla Fora ${s}`;
    const turmaId = await criarTurma(page, turma);
    await designarFixture(page);
    await expect(page.locator(".turma-catequistas")).toContainText(CATEQUISTA.nome);
    const catequizandoId = await cadastrarCatequizando(page, nome);
    const foraId = await cadastrarCatequizando(page, naoInscrito);
    await inscrever(page, turmaId, nome);
    await expect(vigentes(page).getByRole("link", { name: nome })).toBeVisible();

    // A página do catequizando mostra a turma atual (seção "Turma").
    await page.goto(`/coordenacao/catequizandos/${catequizandoId}`);
    const secao = page.getByRole("region", { name: "Turma" });
    await expect(secao.getByTestId("turma-atual")).toContainText(turma);

    // Outra turma, sem o catequista, para o teste de acesso.
    const outraId = await criarTurma(page, `Turma Alheia ${s}`);

    const { contexto, page: cat } = await comoCatequista(browser, baseURL);
    await cat.goto("/catequista");
    await cat.getByRole("link", { name: "Minhas turmas" }).first().click();
    await expect(cat.getByRole("heading", { level: 1 })).toHaveText("Minhas turmas");
    await cat.getByRole("link", { name: turma }).click();
    await expect(cat.getByRole("heading", { level: 1 })).toHaveText(turma);
    await expect(cat.locator("main").getByRole("button")).toHaveCount(0);
    await cat.getByRole("link", { name: nome }).click();
    await expect(cat).toHaveURL(new RegExp(`/catequista/catequizandos/${catequizandoId}$`));
    await expect(cat.getByRole("heading", { level: 1 })).toHaveText(nome);
    await expect(cat.locator("main").getByRole("button")).toHaveCount(0);
    await expect(cat.getByRole("link", { name: "Editar" })).toHaveCount(0);

    // Outra turma e ficha de não inscrito: Acesso negado.
    await cat.goto(`/catequista/turmas/${outraId}`);
    await expect(cat.getByRole("heading", { level: 1 })).toHaveText("Acesso negado");
    await cat.goto(`/catequista/catequizandos/${foraId}`);
    await expect(cat.getByRole("heading", { level: 1 })).toHaveText("Acesso negado");
    await contexto.close();
  });

  test("transfere o catequizando entre duas turmas", async ({ page }) => {
    const s = sufixo();
    const origem = `Turma Origem ${s}`;
    const nome = `Davi Transferido ${s}`;
    const origemId = await criarTurma(page, origem);
    const destinoId = await criarTurma(page, `Turma Destino ${s}`);
    await cadastrarCatequizando(page, nome);
    await inscrever(page, origemId, nome);

    const item = await buscarCandidato(page, destinoId, nome);
    await item.getByRole("button", { name: "Inscrever", exact: true }).click();
    await expect(item.getByRole("alert")).toContainText(
      `Já inscrito na turma ${origem}. Deseja transferir?`,
    );
    await item.getByRole("button", { name: "Transferir para esta turma" }).click();
    await expect(page.getByRole("status")).toContainText("Catequizando transferido.");
    await expect(vigentes(page).getByRole("link", { name: nome })).toBeVisible();

    await page.goto(`${BASE}/${origemId}`);
    await expect(page.getByRole("link", { name: nome })).toHaveCount(0);
    await expect(page.getByText("Nenhum catequizando inscrito")).toBeVisible();
  });

  test("turma com 1 vaga: confirma a lotação e aparece como Lotada", async ({ page }) => {
    const s = sufixo();
    const turma = `Turma Lotada ${s}`;
    const turmaId = await criarTurma(page, turma, 1);
    const primeiro = `Elisa Primeira ${s}`;
    const segundo = `Fabio Segundo ${s}`;
    await cadastrarCatequizando(page, primeiro);
    await cadastrarCatequizando(page, segundo);
    await inscrever(page, turmaId, primeiro);

    const item = await buscarCandidato(page, turmaId, segundo);
    await item.getByRole("button", { name: "Inscrever", exact: true }).click();
    await expect(item.getByRole("alert")).toContainText("Turma lotada (1 de 1 vagas).");
    await item.getByRole("button", { name: "Inscrever mesmo assim" }).click();
    await expect(page.getByRole("status")).toContainText("Catequizando inscrito.");
    await expect(vigentes(page).getByRole("listitem")).toHaveCount(2);
    await expect(page.locator(".turma-selos")).toContainText("Lotada");

    await page.goto(BASE);
    const linha = page.locator(".lista-turmas-item").filter({ hasText: turma });
    await expect(linha.locator(".etiqueta", { hasText: "Lotada" })).toBeVisible();
  });

  test("encerrar pelo diálogo mostra Encerrada, zero vigentes e nenhuma ação", async ({ page }) => {
    const s = sufixo();
    const turma = `Turma Encerrar ${s}`;
    const nome = `Gabi Encerrada ${s}`;
    const turmaId = await criarTurma(page, turma);
    await cadastrarCatequizando(page, nome);
    await inscrever(page, turmaId, nome);

    await page.getByRole("button", { name: "Encerrar turma" }).click();
    const dialogo = page.getByRole("dialog");
    await expect(dialogo).toContainText("1 catequizando será desligado.");
    await dialogo.getByRole("button", { name: "Encerrar turma" }).click();
    await expect(page).toHaveURL(/aviso=turma-encerrada/);
    await expect(page.locator(".turma-selos")).toContainText("Encerrada");
    await expect(page.getByText("Nenhum catequizando inscrito")).toBeVisible();
    await expect(page.locator("main").getByRole("button")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Editar" })).toHaveCount(0);
  });

  test.describe("teclado", () => {
    // 24 h: o campo de horário tem só os segmentos de hora e minuto.
    test.use({ locale: "pt-BR" });

    test("cria turma só com o teclado", async ({ page }) => {
      const nome = `Turma Teclado ${sufixo()}`;
      await page.goto(`${BASE}/nova`);
      await page.getByLabel("Nome").focus();
      await page.keyboard.type(nome);
      await page.keyboard.press("Tab");
      await page.keyboard.type("2026");
      await page.keyboard.press("Tab");
      await expect(page.getByLabel("Dia da semana")).toBeFocused();
      await page.keyboard.type("Dom");
      await expect(page.getByLabel("Dia da semana")).toHaveValue("domingo");
      await page.keyboard.press("Tab");
      await expect(page.getByLabel("Horário")).toBeFocused();
      // No Linux o Chromium mostra o campo em 12 h com AM/PM mesmo em pt-BR; o "A" preenche
      // esse segmento e é ignorado onde o campo é de 24 h.
      await page.keyboard.type("1000A");
      await expect(page.getByLabel("Horário")).toHaveValue("10:00");
      // O campo de horário pode ter segmentos internos navegáveis por Tab.
      const local = page.getByLabel("Local");
      for (let i = 0; i < 4 && !(await local.evaluate((e) => e === document.activeElement)); i++) {
        await page.keyboard.press("Tab");
      }
      await expect(local).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("status")).toContainText("Turma criada.");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(nome);
      await expect(page.locator(".membro-dados")).toContainText("Domingo, 10:00");
    });
  });

  test.describe("a 360 px", () => {
    test.use({ viewport: { width: 360, height: 740 } });

    test("lista e página da turma sem rolagem horizontal", async ({ page }) => {
      const turmaId = await criarTurma(page, `Turma Estreita com nome comprido ${sufixo()}`);
      await designarFixture(page);
      await semRolagemHorizontal(page);
      await page.goto(BASE);
      await semRolagemHorizontal(page);
      await page.goto(`${BASE}/${turmaId}`);
      await semRolagemHorizontal(page);
    });
  });
});

test.describe("catequista a 360 px", () => {
  test.use({ storageState: CATEQUISTA.estado, viewport: { width: 360, height: 740 } });

  test("Minhas turmas sem rolagem horizontal", async ({ page }) => {
    await page.goto("/catequista/turmas");
    await semRolagemHorizontal(page);
  });
});

test.describe("coordenação: estados de borda", () => {
  test.use({ storageState: COORDENACAO.estado });

  test("turma inexistente mostra 'Turma não encontrada' com link para a lista (7.6)", async ({
    page,
  }) => {
    await page.goto(`${BASE}/00000000-0000-4000-8000-000000000000`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Turma não encontrada");
    await page.getByRole("link", { name: "Voltar para a lista de turmas" }).click();
    await expect(page).toHaveURL(new RegExp(`${BASE}$`));
  });

  test("filtros sem resultado mostram o estado vazio e 'Limpar filtros' volta à lista (3.2–3.4)", async ({
    page,
  }) => {
    await page.goto(`${BASE}?situacao=encerradas&ciclo=1999`);
    await expect(page.getByRole("heading", { name: "Nenhuma turma encontrada" })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Situação")).toHaveValue("encerradas");
    await expect(page.getByLabel("Ciclo")).toHaveValue("1999");
    await page.getByRole("link", { name: "Limpar filtros" }).click();
    await expect(page).toHaveURL(new RegExp(`${BASE}$`));
  });

  test("catequista sem designações vê a mensagem de lista vazia (9.2)", async ({
    page,
    browser,
    baseURL,
  }) => {
    const senha = "SenhaMembro#2026";
    const email = `sem-turma.${sufixo()}@teste.local`;
    await page.goto("/coordenacao/equipe/novo");
    await page.getByLabel("Nome").fill(`Catequista Sem Turma ${sufixo()}`);
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Telefone").fill("(21) 3333-4444");
    await page.getByLabel("Senha inicial").fill(senha);
    await page.getByRole("button", { name: "Cadastrar membro" }).click();
    await expect(page.getByRole("status")).toContainText("Membro cadastrado");

    const contexto = await browser.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    });
    const cat = await contexto.newPage();
    await cat.goto("/login");
    await cat.getByLabel("E-mail").fill(email);
    await cat.getByLabel("Senha").fill(senha);
    await cat.getByRole("button", { name: "Entrar" }).click();
    await expect(cat).toHaveURL(/\/catequista$/);
    await cat.goto("/catequista/turmas");
    await expect(cat.getByText("Você ainda não tem turmas designadas.")).toBeVisible();
    await contexto.close();
  });
});
