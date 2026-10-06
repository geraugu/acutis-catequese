import { expect, test, type Browser, type Page } from "@playwright/test";
import { CATEQUISTA, COORDENACAO } from "./fixtures";

const LIMITE_CARGA_MS = 3000;

function sufixo() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Cria a turma pela interface (coordenação), designa o catequista e devolve o id. */
async function criarTurmaDesignada(page: Page, nome: string): Promise<string> {
  await page.goto("/coordenacao/turmas/nova");
  await page.getByLabel("Nome", { exact: true }).fill(nome);
  await page.getByLabel("Ciclo (ano)").fill("2026");
  await page.getByLabel("Dia da semana").selectOption({ label: "Sábado" });
  await page.getByLabel("Horário").fill("09:30");
  await page.getByLabel("Local").fill("Salão paroquial");
  await page.getByRole("button", { name: "Criar turma" }).click();
  await expect(page.getByRole("status")).toContainText("Turma criada.");
  const id = new URL(page.url()).pathname.split("/").pop() ?? "";
  await page.goto(`/coordenacao/turmas/${id}/equipe`);
  await page.getByLabel("Catequista", { exact: true }).selectOption({ label: CATEQUISTA.nome });
  await page.getByRole("button", { name: "Designar" }).click();
  await expect(page.getByRole("status")).toContainText("Catequista designado.");
  return id;
}

async function contextoAnonimo(browser: Browser) {
  const contexto = await browser.newContext({
    storageState: { cookies: [], origins: [] },
    viewport: { width: 360, height: 740 },
  });
  return { contexto, page: await contexto.newPage() };
}

/** Preenche e envia a ficha pública; espera a confirmação de recebimento. */
async function enviarFicha(page: Page, nome: string) {
  await page.getByLabel("Nome", { exact: true }).fill(nome);
  await page.getByLabel("Data de nascimento", { exact: true }).fill("2004-06-15");
  await page.getByLabel("Telefone", { exact: true }).fill("(11) 91234-5678");
  await page.getByRole("checkbox", { name: /Autorizo/ }).check();
  await page.getByRole("button", { name: "Enviar ficha" }).click();
  await expect(page.getByRole("status")).toContainText("Recebemos sua ficha!");
  // Nunca repete os dados enviados (3.6).
  await expect(page.locator("body")).not.toContainText(nome);
}

test("fluxo completo do autocadastro: link, envio, revisão, desativação e descarte", async ({
  browser,
  baseURL,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "A emulação de rede via CDP só existe no Chromium.");
  test.setTimeout(120_000);
  const s = sufixo();
  const turma = `Turma Autocadastro ${s}`;
  const pessoa = `Ana Autocadastro ${s}`;
  const descartada = `Beto Descartado ${s}`;

  // Coordenação cria a turma e designa o catequista.
  const coord = await browser.newContext({ baseURL, storageState: COORDENACAO.estado });
  const pc = await coord.newPage();
  const turmaId = await criarTurmaDesignada(pc, turma);

  // 1. Catequista gera o link e copia (1.1, 1.2).
  const cat = await browser.newContext({ baseURL, storageState: CATEQUISTA.estado });
  await cat.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseURL });
  const pk = await cat.newPage();
  await pk.goto(`/catequista/turmas/${turmaId}/equipe`);
  const secao = pk.getByRole("region", { name: "Link de autocadastro" });
  await secao.getByRole("button", { name: "Gerar link" }).click();
  await expect(pk.getByRole("status").filter({ hasText: "Link gerado." })).toBeVisible();
  await secao.getByRole("button", { name: "Copiar link" }).click();
  await expect(secao.getByRole("status")).toHaveText("Link copiado");
  const url = (await secao.locator("code").textContent())?.trim() ?? "";
  expect(url).toMatch(/\/inscricao\/[A-Za-z0-9_-]{43}$/);
  expect(await pk.evaluate(() => navigator.clipboard.readText())).toBe(url);
  const caminho = new URL(url).pathname;

  // 2. Anônimo, 360 px e rede 3G, abre e envia a ficha (2.1, 2.2, 2.4, 2.5, 3.5, 3.6).
  const anon = await contextoAnonimo(browser);
  const cdp = await anon.contexto.newCDPSession(anon.page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  const inicio = Date.now();
  await anon.page.goto(`${baseURL}${caminho}`, { waitUntil: "domcontentloaded" });
  await expect(anon.page.getByRole("button", { name: "Enviar ficha" })).toBeVisible();
  expect(Date.now() - inicio).toBeLessThan(LIMITE_CARGA_MS);
  const larguras = await anon.page.evaluate(() => ({
    total: document.documentElement.scrollWidth,
    visivel: document.documentElement.clientWidth,
  }));
  expect(larguras.total).toBeLessThanOrEqual(larguras.visivel);
  await enviarFicha(anon.page, pessoa);

  // 3. Catequista vê a contagem e a fila, abre e confirma (5.1, 7.1).
  await pk.goto("/catequista/turmas");
  await pk.getByRole("link", { name: "1 ficha pendente" }).click();
  await expect(pk).toHaveURL(new RegExp(`/catequista/turmas/${turmaId}/pendentes$`));
  const fila = pk.getByRole("list", { name: "Fichas pendentes" });
  await fila.getByRole("link", { name: pessoa }).click();
  await expect(pk.getByRole("heading", { level: 1 })).toContainText(pessoa);
  await pk.getByRole("button", { name: "Confirmar e inscrever" }).click();
  await expect(
    pk.getByRole("status").filter({ hasText: "Ficha confirmada e inscrita na turma" }),
  ).toBeVisible();
  // Confirmar volta para a aba Inscritos da turma (8.5).
  await expect(pk).toHaveURL(new RegExp(`/catequista/turmas/${turmaId}/inscritos`));
  await expect(
    pk.getByRole("list", { name: "Inscritos vigentes" }).getByRole("link", { name: pessoa }),
  ).toBeVisible();

  // 5. Descarte com confirmação explícita (8.1).
  await anon.page.goto(`${baseURL}${caminho}`);
  await enviarFicha(anon.page, descartada);
  await pk.goto(`/catequista/turmas/${turmaId}/pendentes`);
  await pk
    .getByRole("list", { name: "Fichas pendentes" })
    .getByRole("link", { name: descartada })
    .click();
  await pk.getByRole("button", { name: "Descartar ficha" }).click();
  const dialogo = pk.getByRole("dialog", { name: "Descartar ficha" });
  await expect(dialogo).toBeVisible();
  await dialogo.getByRole("button", { name: "Descartar", exact: true }).click();
  await expect(pk.getByRole("status").filter({ hasText: "Ficha descartada" })).toBeVisible();
  await expect(pk.getByText("Nenhuma ficha pendente.")).toBeVisible();
  await expect(pk.getByRole("link", { name: descartada })).toHaveCount(0);

  // 4. Coordenação desativa o link; o anônimo vê a indisponibilidade (1.4).
  await pc.goto(`/coordenacao/turmas/${turmaId}/equipe`);
  await pc.getByRole("button", { name: "Desativar link" }).click();
  const confirmar = pc.getByRole("dialog", { name: "Desativar o link?" });
  await confirmar.getByRole("button", { name: "Desativar", exact: true }).click();
  await expect(pc.getByRole("status").filter({ hasText: "Link desativado" })).toBeVisible();
  await anon.page.goto(`${baseURL}${caminho}`);
  await expect(anon.page.getByText("Este link não está mais disponível.")).toBeVisible();
  await expect(anon.page.getByRole("button", { name: "Enviar ficha" })).toHaveCount(0);

  await anon.contexto.close();
  await cat.close();
  await coord.close();
});
