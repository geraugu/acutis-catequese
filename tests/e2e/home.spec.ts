import { expect, test } from "@playwright/test";

test("página inicial sem sessão redireciona para o login em pt-BR", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Entrar");
});

test("página interna sem sessão redireciona para o login com endereço de retorno", async ({
  page,
}) => {
  await page.goto("/coordenacao");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fcoordenacao$/);
});
