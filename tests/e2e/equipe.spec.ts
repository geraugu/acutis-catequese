import { expect, test, type Browser, type Page } from "@playwright/test";
import { MSG_CONTA_DESABILITADA } from "../../src/modules/auth/mensagens";
import { CATEQUISTA, COORDENACAO } from "./fixtures";

const SENHA = "SenhaMembro#2026";

function emailUnico(prefixo: string) {
  return `${prefixo}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@teste.local`;
}

type NovoMembro = { nome: string; email: string; telefone?: string; observacoes?: string };

/** Cadastra pela interface e retorna o id do membro (da URL da página do membro). */
async function cadastrar(page: Page, m: NovoMembro): Promise<string> {
  await page.goto("/coordenacao/equipe/novo");
  await page.getByLabel("Nome").fill(m.nome);
  await page.getByLabel("E-mail").fill(m.email);
  await page.getByLabel("Telefone").fill(m.telefone ?? "(21) 3333-4444");
  if (m.observacoes) await page.getByLabel("Observações").fill(m.observacoes);
  await page.getByLabel("Senha inicial").fill(SENHA);
  await page.getByRole("button", { name: "Cadastrar membro" }).click();
  await expect(page.getByRole("status")).toContainText("Membro cadastrado");
  const id = new URL(page.url()).pathname.split("/").pop();
  return id ?? "";
}

/** Login num contexto novo, sem sessão salva, para não tocar nas contas do setup. */
async function entrarNovoContexto(browser: Browser, baseURL: string | undefined, email: string) {
  const contexto = await browser.newContext({
    baseURL,
    storageState: { cookies: [], origins: [] },
  });
  const page = await contexto.newPage();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  return { contexto, page };
}

test.describe("coordenação", () => {
  test.use({ storageState: COORDENACAO.estado });

  test("cadastra um catequista e ele consegue entrar", async ({ page, browser, baseURL }) => {
    const email = emailUnico("novo");
    await cadastrar(page, { nome: "Novo Catequista", email });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Novo Catequista");
    const { contexto, page: membro } = await entrarNovoContexto(browser, baseURL, email);
    await expect(membro).toHaveURL(/\/catequista$/);
    await contexto.close();
  });

  test("busca sem acento encontra o membro e a URL guarda o termo", async ({ page }) => {
    const sufixo = Math.random().toString(36).slice(2, 7);
    const nome = `Conceição Tavares ${sufixo}`;
    await cadastrar(page, { nome, email: emailUnico("busca") });
    await page.goto("/coordenacao/equipe");
    await page.getByLabel("Nome, e-mail ou telefone").fill(`conceicao tavares ${sufixo}`);
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL(/[?&]q=conceicao/);
    await expect(page.getByRole("link", { name: nome })).toBeVisible();
  });

  test("inativar pelo diálogo mostra Inativo e bloqueia o login do membro", async ({
    page,
    browser,
    baseURL,
  }) => {
    const email = emailUnico("inativar");
    await cadastrar(page, { nome: "Membro a Inativar", email });
    await page.getByRole("button", { name: "Inativar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Inativar" }).click();
    await expect(page).toHaveURL(/aviso=inativado/);
    await expect(page.locator(".situacao")).toHaveText("Inativo");
    const { contexto, page: membro } = await entrarNovoContexto(browser, baseURL, email);
    await expect(membro.getByText(MSG_CONTA_DESABILITADA)).toBeVisible();
    await expect(membro).toHaveURL(/\/login/);
    await contexto.close();
  });

  test("página do membro mostra dados e links de telefone", async ({ page }) => {
    const email = emailUnico("dados");
    await cadastrar(page, {
      nome: "Membro com Telefone",
      email,
      telefone: "(11) 98765-4321",
      observacoes: "Prefere contato à tarde",
    });
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByText("Prefere contato à tarde")).toBeVisible();
    await expect(page.getByRole("link", { name: "Ligar" })).toHaveAttribute(
      "href",
      "tel:+5511987654321",
    );
    await expect(page.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute(
      "href",
      "https://wa.me/5511987654321",
    );
  });

  test("id inexistente mostra Membro não encontrado", async ({ page }) => {
    await page.goto("/coordenacao/equipe/00000000-0000-0000-0000-000000000000");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Membro não encontrado");
  });

  test.describe("a 360 px", () => {
    test.use({ viewport: { width: 360, height: 740 } });

    for (const rota of ["/coordenacao/equipe", "/coordenacao/equipe/novo"]) {
      test(`${rota} sem rolagem horizontal`, async ({ page }) => {
        await page.goto(rota);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const { largura, visivel } = await page.evaluate(() => ({
          largura: document.documentElement.scrollWidth,
          visivel: document.documentElement.clientWidth,
        }));
        expect(largura).toBeLessThanOrEqual(visivel);
      });
    }
  });
});

test.describe("catequista", () => {
  test.use({ storageState: CATEQUISTA.estado });

  test("vê Acesso negado na área da equipe", async ({ page }) => {
    await page.goto("/coordenacao/equipe");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Acesso negado");
  });
});
