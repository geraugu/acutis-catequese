import { expect, test, type Page } from "@playwright/test";
import { CATEQUISTA, COORDENACAO } from "./fixtures";

test.use({ viewport: { width: 360, height: 740 } });

async function semRolagemHorizontal(page: Page) {
  const { largura, visivel } = await page.evaluate(() => ({
    largura: document.documentElement.scrollWidth,
    visivel: document.documentElement.clientWidth,
  }));
  expect(largura).toBeLessThanOrEqual(visivel);
}

test("login sem rolagem horizontal a 360 px", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Entrar");
  await semRolagemHorizontal(page);
});

test.describe("coordenação", () => {
  test.use({ storageState: COORDENACAO.estado });
  test("página inicial sem rolagem horizontal a 360 px", async ({ page }) => {
    await page.goto("/coordenacao");
    await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
    await semRolagemHorizontal(page);
  });
});

test.describe("catequista", () => {
  test.use({ storageState: CATEQUISTA.estado });
  test("acesso negado sem rolagem horizontal a 360 px", async ({ page }) => {
    await page.goto("/acesso-negado");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Acesso negado");
    await semRolagemHorizontal(page);
  });
});
