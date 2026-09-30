import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import { loadEnv } from "vite";
import { CATEQUISTA, COORDENACAO } from "./fixtures";

const BASE = "/coordenacao/catequizandos";

function sufixo() {
  return Math.random().toString(36).slice(2, 8);
}

type NovaFicha = {
  nome: string;
  dataNascimento?: string;
  telefone?: string;
  crisma?: { data: string; paroquia: string };
};

async function preencher(page: Page, f: NovaFicha) {
  await page.goto(`${BASE}/novo`);
  await page.getByLabel("Nome").fill(f.nome);
  await page.getByLabel("Data de nascimento").fill(f.dataNascimento ?? "2005-03-10");
  await page.getByLabel("Telefone").fill(f.telefone ?? "(11) 98765-4321");
  if (f.crisma) {
    const crisma = page.getByRole("group", { name: "Crisma" });
    await crisma.getByLabel("Recebido").check();
    await crisma.getByLabel("Data").fill(f.crisma.data);
    await crisma.getByLabel("Paróquia").fill(f.crisma.paroquia);
  }
  await page.getByRole("button", { name: "Cadastrar catequizando" }).click();
}

/** Cadastra pela interface e retorna o id (da URL da página do catequizando). */
async function cadastrar(page: Page, f: NovaFicha): Promise<string> {
  await preencher(page, f);
  await expect(page.getByRole("status")).toContainText("Catequizando cadastrado.");
  return new URL(page.url()).pathname.split("/").pop() ?? "";
}

/** Cria uma ficha pendente direto no banco de teste (via tsx, como o preparo do banco). */
function criarFichaPendente(nome: string): string {
  const variaveis = loadEnv("test", process.cwd(), "");
  return execFileSync("npx", ["tsx", "tests/e2e/criar-ficha-pendente.ts", nome], {
    env: { ...process.env, ...variaveis, DATABASE_URL: variaveis.DATABASE_URL_TEST ?? "" },
  })
    .toString()
    .trim();
}

async function semRolagemHorizontal(page: Page) {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const { largura, visivel } = await page.evaluate(() => ({
    largura: document.documentElement.scrollWidth,
    visivel: document.documentElement.clientWidth,
  }));
  expect(largura).toBeLessThanOrEqual(visivel);
}

test.describe("coordenação", () => {
  test.use({ storageState: COORDENACAO.estado });

  test("cadastra com crisma recebida e vê idade e links de contato", async ({ page }) => {
    const nome = `Ana Crismada ${sufixo()}`;
    await cadastrar(page, {
      nome,
      dataNascimento: "2005-03-10",
      crisma: { data: "2020-11-15", paroquia: "São José" },
    });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(nome);
    await expect(page.getByText(/10\/03\/2005 \(\d+ anos\)/)).toBeVisible();
    await expect(page.getByText("(11) 98765-4321")).toBeVisible();
    await expect(page.getByText(/na paróquia São José/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Ligar" })).toHaveAttribute(
      "href",
      "tel:+5511987654321",
    );
    await expect(page.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute(
      "href",
      "https://wa.me/5511987654321",
    );
  });

  test("busca sem acento e filtro sem crisma refletem na URL", async ({ page }) => {
    const s = sufixo();
    const semCrisma = `João Conceição ${s}`;
    const comCrisma = `João Conceição Crismado ${s}`;
    await cadastrar(page, { nome: semCrisma });
    await cadastrar(page, {
      nome: comCrisma,
      crisma: { data: "2021-05-02", paroquia: "Santa Rita" },
    });

    await page.goto(BASE);
    await page.getByLabel("Nome, telefone ou e-mail").fill(`joao conceicao ${s}`);
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL(/[?&]q=joao\+conceicao/);
    await expect(page.getByRole("link", { name: semCrisma, exact: true })).toBeVisible();

    await page.getByLabel("Nome, telefone ou e-mail").fill(`joao conceicao`);
    await page.getByLabel("Sacramento").selectOption("crisma");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL(/[?&]sem=crisma/);
    await expect(page.getByRole("link", { name: semCrisma, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: comCrisma, exact: true })).toHaveCount(0);
  });

  test("avisa duplicidade e Salvar mesmo assim grava", async ({ page }) => {
    const s = sufixo();
    await cadastrar(page, { nome: `Luíza Duplicada ${s}`, dataNascimento: "2004-07-20" });
    await preencher(page, { nome: `LUIZA DUPLICADA ${s}`, dataNascimento: "2004-07-20" });
    await expect(page.getByText("Já existe um catequizando com este nome")).toBeVisible();
    await expect(page).toHaveURL(/\/novo$/);
    await page.getByRole("button", { name: "Salvar mesmo assim" }).click();
    await expect(page.getByRole("status")).toContainText("Catequizando cadastrado.");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`LUIZA DUPLICADA ${s}`);
  });

  test("inativar pelo diálogo mostra Inativo", async ({ page }) => {
    await cadastrar(page, { nome: `Pedro Inativar ${sufixo()}` });
    await page.getByRole("button", { name: "Inativar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Inativar" }).click();
    await expect(page.getByRole("status")).toContainText("Catequizando inativado.");
    await expect(page.locator(".situacao")).toHaveText("Inativo");
  });

  test("ficha pendente aparece no contador e é confirmada", async ({ page }) => {
    const nome = `Maria Pendente ${sufixo()}`;
    criarFichaPendente(nome);
    await page.goto(BASE);
    const atalho = page.getByRole("link", { name: /fichas? pendentes?/ });
    await expect(atalho).toBeVisible();
    await atalho.click();
    await expect(page).toHaveURL(/estado=pendente/);
    await page.getByRole("link", { name: nome, exact: true }).click();
    await page.getByRole("button", { name: "Confirmar ficha" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirmar ficha" }).click();
    await expect(page.getByRole("status")).toContainText("Ficha confirmada.");
    await expect(page.locator(".situacao")).toHaveText("Ativo");
  });

  test("id inexistente mostra Catequizando não encontrado", async ({ page }) => {
    await page.goto(`${BASE}/00000000-0000-0000-0000-000000000000`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Catequizando não encontrado");
  });

  test.describe("a 360 px", () => {
    test.use({ viewport: { width: 360, height: 740 } });

    for (const rota of [BASE, `${BASE}/novo`]) {
      test(`${rota} sem rolagem horizontal`, async ({ page }) => {
        await page.goto(rota);
        await semRolagemHorizontal(page);
      });
    }

    test("página do catequizando sem rolagem horizontal", async ({ page }) => {
      await cadastrar(page, {
        nome: `Catequizando Estreito ${sufixo()}`,
        crisma: { data: "2020-11-15", paroquia: "Nossa Senhora Aparecida" },
      });
      await semRolagemHorizontal(page);
    });
  });
});

test.describe("catequista", () => {
  test.use({ storageState: CATEQUISTA.estado });

  test("vê Acesso negado na área dos catequizandos", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Acesso negado");
  });
});
