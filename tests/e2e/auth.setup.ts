import { execFileSync } from "node:child_process";
import { expect, test as setup, type Page } from "@playwright/test";
import { loadEnv } from "vite";
import { CATEQUISTA, COORDENACAO } from "./fixtures";

async function entrar(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
}

setup("prepara usuários de teste e sessões por papel", async ({ browser }) => {
  // Mesmo ambiente do webServer: a aplicação e o preparo usam o banco de teste.
  const variaveis = loadEnv("test", process.cwd(), "");
  execFileSync("npx", ["tsx", "tests/e2e/preparar-banco.ts"], {
    stdio: "inherit",
    env: { ...process.env, ...variaveis, DATABASE_URL: variaveis.DATABASE_URL_TEST ?? "" },
  });

  for (const [usuario, destino] of [
    [COORDENACAO, /\/coordenacao$/],
    [CATEQUISTA, /\/catequista$/],
  ] as const) {
    const contexto = await browser.newContext();
    const page = await contexto.newPage();
    await entrar(page, usuario.email, usuario.senha);
    await expect(page).toHaveURL(destino);
    await contexto.storageState({ path: usuario.estado });
    await contexto.close();
  }
});
