import { expect, test, type Page } from "@playwright/test";
import { CATEQUISTA, COORDENACAO } from "./fixtures";

async function preencherEEntrar(page: Page, email: string, senha: string) {
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("coordenação entra, vê nome, papel e Sair, e sai de volta ao login", async ({ page }) => {
  await page.goto("/login");
  await preencherEEntrar(page, COORDENACAO.email, COORDENACAO.senha);
  await expect(page).toHaveURL(/\/coordenacao$/);
  const cabecalho = page.getByRole("banner");
  await expect(cabecalho.getByText(COORDENACAO.nome)).toBeVisible();
  await expect(cabecalho.getByText("Coordenação", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/coordenacao");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fcoordenacao$/);
});

test("formulário vazio mostra os erros por campo", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Informe o e-mail")).toBeVisible();
  await expect(page.getByText("Informe a senha")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("login só pelo teclado", async ({ page }) => {
  await page.goto("/login");
  const email = page.getByLabel("E-mail");
  // Percorre a página com Tab até o campo de e-mail.
  for (let i = 0; i < 20 && !(await email.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press("Tab");
  }
  await expect(email).toBeFocused();
  await page.keyboard.type(COORDENACAO.email);
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Senha")).toBeFocused();
  await page.keyboard.type(COORDENACAO.senha);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Entrar" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/coordenacao$/);
});

test.describe("usuário já logado", () => {
  test.use({ storageState: COORDENACAO.estado });

  test("ao acessar /login é redirecionado para a página inicial", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/coordenacao$/);
  });
});

test("volta para a página pedida após o login", async ({ page }) => {
  await page.goto("/catequista");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fcatequista$/);
  await preencherEEntrar(page, CATEQUISTA.email, CATEQUISTA.senha);
  await expect(page).toHaveURL(/\/catequista$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Olá, ${CATEQUISTA.nome}`);
});
