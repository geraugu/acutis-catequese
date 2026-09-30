import { expect, test } from "@playwright/test";
import { CATEQUISTA, COORDENACAO } from "./fixtures";

test.describe("catequista", () => {
  test.use({ storageState: CATEQUISTA.estado });

  test("vê Acesso negado na área da coordenação, com link para a sua página inicial", async ({
    page,
  }) => {
    await page.goto("/coordenacao");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Acesso negado");
    await expect(page.getByRole("link", { name: "Voltar para a página inicial" })).toHaveAttribute(
      "href",
      "/catequista",
    );
  });
});

test.describe("coordenação", () => {
  test.use({ storageState: COORDENACAO.estado });

  test("acessa a área de catequista", async ({ page }) => {
    const resposta = await page.goto("/catequista");
    expect(resposta?.status()).toBe(200);
    await expect(page).toHaveURL(/\/catequista$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Olá, ${COORDENACAO.nome}`);
  });
});
