import { execFileSync } from "node:child_process";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { loadEnv } from "vite";
import { CATEQUISTA } from "./fixtures";

/** Captura de tela opcional (VERIFICACAO_VISUAL=<pasta>) para a conferência visual manual. */
const PASTA_CAPTURAS = process.env.VERIFICACAO_VISUAL;

test.use({
  storageState: CATEQUISTA.estado,
  viewport: { width: 360, height: 740 },
  locale: "pt-BR",
});

interface Chamada {
  turmaId: string;
  turmaNome: string;
  encontroId: string;
  nomes: string[];
}

function sufixo() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Cria turma, designação, inscritos, tema e o encontro de hoje direto no banco de teste. */
function criarChamada(): Chamada {
  const variaveis = loadEnv("test", process.cwd(), "");
  const saida = execFileSync("npx", ["tsx", "tests/e2e/criar-chamada.ts", sufixo()], {
    env: { ...process.env, ...variaveis, DATABASE_URL: variaveis.DATABASE_URL_TEST ?? "" },
    encoding: "utf8",
  });
  return JSON.parse(saida) as Chamada;
}

async function capturar(page: Page, nome: string) {
  if (PASTA_CAPTURAS)
    await page.screenshot({ path: `${PASTA_CAPTURAS}/${nome}.png`, fullPage: true });
}

async function semRolagemHorizontal(page: Page) {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const { largura, visivel } = await page.evaluate(() => ({
    largura: document.documentElement.scrollWidth,
    visivel: document.documentElement.clientWidth,
  }));
  expect(largura).toBeLessThanOrEqual(visivel);
}

function linha(page: Page, nome: string): Locator {
  return page.getByRole("group", { name: nome });
}

async function abrirChamada(page: Page, c: Chamada) {
  await page.goto("/catequista/turmas");
  await page.getByRole("link", { name: c.turmaNome }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(c.turmaNome);
  const bloco = page.getByRole("region", { name: "Encontro de hoje" });
  await expect(bloco).toBeVisible();
  await bloco.getByRole("link", { name: "Fazer chamada" }).click();
  await expect(page).toHaveURL(new RegExp(`/encontros/${c.encontroId}/chamada$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fazer chamada");
}

test("catequista faz a chamada no celular, vê o resumo e corrige um status", async ({ page }) => {
  const c = criarChamada();
  const [ana, bruno, carla, davi] = c.nomes;
  await abrirChamada(page, c);
  await semRolagemHorizontal(page);

  // Salvar sem marcar ninguém mostra o aviso de faltantes e nada é gravado.
  await page.getByRole("button", { name: "Salvar chamada" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Marque a presença de todos os catequizandos.",
  );
  await capturar(page, "chamada-faltantes");

  await page.getByRole("button", { name: "Marcar todos como presentes" }).click();
  await linha(page, bruno).getByLabel("Ausente").check();
  await linha(page, carla).getByLabel("Justificado").check();
  await expect(linha(page, ana).getByLabel("Presente")).toBeChecked();
  await expect(linha(page, davi).getByLabel("Presente")).toBeChecked();
  await semRolagemHorizontal(page);
  await capturar(page, "chamada-marcada");

  await page.getByRole("button", { name: "Salvar chamada" }).click();
  await expect(page.getByRole("status")).toContainText("Chamada salva.");
  await expect(page).toHaveURL(new RegExp(`/catequista/turmas/${c.turmaId}/encontros\\?`));
  const item = page.locator(".cronograma-item").filter({ hasText: "Tema Chamada" });
  await expect(item.locator(".situacao-realizado")).toBeVisible();
  await expect(item).toContainText("2 presentes · 1 ausente · 1 justificado · 0 visitantes");
  await capturar(page, "cronograma-resumo");
  await semRolagemHorizontal(page);

  // Frequência na página da turma: percentuais coerentes com as marcações.
  await page.goto(`/catequista/turmas/${c.turmaId}`);
  const inscritos = page.locator(".presenca-inscrito");
  await expect(inscritos).toHaveCount(4);
  await expect(inscritos.filter({ hasText: ana })).toContainText("100%");
  await expect(inscritos.filter({ hasText: davi })).toContainText("100%");
  await expect(inscritos.filter({ hasText: bruno })).toContainText("0%");
  await expect(inscritos.filter({ hasText: bruno })).toContainText("1 ausente");
  await expect(inscritos.filter({ hasText: carla })).toContainText("1 justificado");
  await expect(page.locator(".presenca-percentual").first()).not.toHaveText("");
  await semRolagemHorizontal(page);
  await capturar(page, "frequencia-turma");

  // Correção: o encontro realizado oferece "Corrigir chamada" e a tela vem preenchida.
  await page.goto(`/catequista/turmas/${c.turmaId}/encontros`);
  await page.getByRole("link", { name: "Corrigir chamada" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Corrigir chamada");
  await expect(linha(page, bruno).getByLabel("Ausente")).toBeChecked();
  await semRolagemHorizontal(page);
  await linha(page, bruno).getByLabel("Presente").check();
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("status")).toContainText("Chamada atualizada.");
  await expect(page.locator(".cronograma-item").filter({ hasText: "Tema Chamada" })).toContainText(
    "3 presentes · 0 ausentes · 1 justificado · 0 visitantes",
  );
});

test("conclui a chamada só com o teclado", async ({ page }) => {
  const c = criarChamada();
  await page.goto(`/catequista/turmas/${c.turmaId}/encontros/${c.encontroId}/chamada`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fazer chamada");

  const todos = page.getByRole("button", { name: "Marcar todos como presentes" });
  await todos.focus();
  await page.keyboard.press("Enter");
  for (const nome of c.nomes) {
    await expect(linha(page, nome).getByLabel("Presente")).toBeChecked();
  }

  // Do primeiro rádio da primeira linha, as setas mudam o status dentro do grupo.
  const primeira = linha(page, c.nomes[0]).getByLabel("Presente");
  await primeira.focus();
  await page.keyboard.press("ArrowRight");
  await expect(linha(page, c.nomes[0]).getByLabel("Ausente")).toBeChecked();
  await expect(linha(page, c.nomes[0]).getByLabel("Ausente")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(linha(page, c.nomes[0]).getByLabel("Justificado")).toBeChecked();

  // Tab chega ao rádio marcado do grupo seguinte, depois ao botão Salvar.
  await page.keyboard.press("Tab");
  await expect(linha(page, c.nomes[1]).getByLabel("Presente")).toBeFocused();
  const salvar = page.getByRole("button", { name: "Salvar chamada" });
  for (let i = 0; i < 6 && !(await salvar.evaluate((e) => e === document.activeElement)); i++) {
    await page.keyboard.press("Tab");
  }
  await expect(salvar).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Chamada salva.");
  await expect(page.locator(".cronograma-item").filter({ hasText: "Tema Chamada" })).toContainText(
    "3 presentes · 0 ausentes · 1 justificado · 0 visitantes",
  );
});
