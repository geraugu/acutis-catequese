import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import { loadEnv } from "vite";
import { CATEQUISTA, COORDENACAO } from "./fixtures";

interface Turma {
  id: string;
  nome: string;
  encontroId: string;
}

interface Frequencia {
  t1: Turma;
  t2: Turma;
  t3: Turma;
  a: string;
  b: string;
  c: string;
  d: string;
  e: string;
}

function sufixo() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Cria T1 (A 100%, B 50%, C 0%), T2 (D, sem o catequista de teste) e T3 encerrada (E). */
function criarFrequencia(): Frequencia {
  const variaveis = loadEnv("test", process.cwd(), "");
  const saida = execFileSync("npx", ["tsx", "tests/e2e/criar-frequencia.ts", sufixo()], {
    env: { ...process.env, ...variaveis, DATABASE_URL: variaveis.DATABASE_URL_TEST ?? "" },
    encoding: "utf8",
  });
  return JSON.parse(saida) as Frequencia;
}

/** Nomes (na ordem exibida) dos alertas que pertencem a este teste; outros testes rodam em paralelo. */
async function alertasDe(page: Page, nomes: string[]): Promise<string[]> {
  const itens = await page.locator(".presenca-inscrito .presenca-inscrito-nome").allTextContents();
  return itens.filter((n) => nomes.includes(n));
}

/** Fallback: devolve o limite padrão direto no banco de teste se a restauração pela tela falhar. */
function restaurarLimiteNoBanco() {
  const variaveis = loadEnv("test", process.cwd(), "");
  execFileSync("npx", ["tsx", "tests/e2e/restaurar-limite.ts"], {
    env: { ...process.env, ...variaveis, DATABASE_URL: variaveis.DATABASE_URL_TEST ?? "" },
  });
}

async function definirLimite(page: Page, valor: string) {
  await page.getByLabel("Limite de frequência (%)").fill(valor);
  await page.getByRole("button", { name: "Salvar limite" }).click();
}

// O limite é global: os testes deste arquivo rodam em série para não se atropelarem.
test.describe.configure({ mode: "serial" });

test.describe("coordenação", () => {
  test.use({
    storageState: COORDENACAO.estado,
    viewport: { width: 1024, height: 800 },
    locale: "pt-BR",
  });

  test("altera o limite e os alertas acompanham, em ordem crescente de frequência", async ({
    page,
  }) => {
    const f = criarFrequencia();
    const meus = [f.a, f.b, f.c];
    try {
      await page.goto("/coordenacao/frequencia");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Frequência");
      await expect(page.getByText("Limite de frequência: 75%")).toBeVisible();
      await expect(page.getByLabel("Limite de frequência (%)")).toHaveValue("75");
      // B (50%) e C (0%) em alerta, do menor para o maior; A (100%) fora.
      expect(await alertasDe(page, meus)).toEqual([f.c, f.b]);
      const linhaC = page.locator(".presenca-inscrito").filter({ hasText: f.c });
      await expect(linhaC).toContainText(f.t1.nome);
      await expect(linhaC).toContainText("0%");
      await expect(linhaC).toContainText("Baixa frequência");
      await expect(linhaC).toContainText("0 presentes · 2 ausentes · 0 justificados");
      await expect(page.locator(".presenca-inscrito").filter({ hasText: f.b })).toContainText(
        "1 presente · 1 ausente · 0 justificados",
      );

      // Limite 100: quem tem qualquer falta aparece; A (100%) não (100 < 100 é falso).
      await definirLimite(page, "100");
      await expect(page.getByRole("status")).toContainText("Limite salvo.");
      await expect(page.getByText("Limite de frequência: 100%")).toBeVisible();
      expect(await alertasDe(page, meus)).toEqual([f.c, f.b]);
      await expect(page.getByText(f.a)).toHaveCount(0);

      // Limite 40: só C (0%) segue em alerta; B (50%) sai.
      await definirLimite(page, "40");
      await expect(page.getByText("Limite de frequência: 40%")).toBeVisible();
      expect(await alertasDe(page, meus)).toEqual([f.c]);
      await expect(page.getByText(f.b)).toHaveCount(0);

      // Valores inválidos mostram o erro junto ao campo e não mudam o limite.
      for (const invalido of ["0", "101", "abc"]) {
        await definirLimite(page, invalido);
        await expect(page.locator("#limite-percentual-erro")).toContainText(
          "Informe um limite inteiro de 1 a 100",
        );
        await expect(page.getByLabel("Limite de frequência (%)")).toHaveAttribute(
          "aria-invalid",
          "true",
        );
        await expect(page.getByText("Limite de frequência: 40%")).toBeVisible();
      }
    } finally {
      // O limite é global: devolve o padrão para não contaminar os demais testes.
      try {
        await page.goto("/coordenacao/frequencia");
        await definirLimite(page, "75");
        await expect(page.getByText("Limite de frequência: 75%")).toBeVisible();
      } catch (erro) {
        restaurarLimiteNoBanco();
        throw erro;
      }
    }
  });

  test("turma encerrada: frequência consultável, sem chamada e fora dos alertas", async ({
    page,
  }) => {
    const f = criarFrequencia();
    await page.goto(`/coordenacao/turmas/${f.t3.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(f.t3.nome);
    const linha = page.locator(".presenca-inscrito").filter({ hasText: f.e });
    await expect(linha).toContainText("0%");
    await expect(linha).toContainText("Baixa frequência");
    // Sem "Fazer chamada" nem "Corrigir chamada" no cronograma, mesmo com encontros realizados.
    await page.goto(`/coordenacao/turmas/${f.t3.id}/encontros`);
    await expect(page.locator(".cronograma-item")).toHaveCount(2);
    await expect(page.getByRole("link", { name: /Fazer chamada|Corrigir chamada/ })).toHaveCount(0);

    // A URL da chamada mostra a indisponibilidade, sem formulário.
    await page.goto(`/coordenacao/turmas/${f.t3.id}/encontros/${f.t3.encontroId}/chamada`);
    await expect(page.getByText("Esta turma está encerrada e não aceita chamada.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Salvar chamada" })).toHaveCount(0);

    // Quem é de turma encerrada não entra nos alertas, enquanto o de turma aberta entra.
    await page.goto("/coordenacao/frequencia");
    await expect(page.getByText(f.c)).toBeVisible();
    await expect(page.getByText(f.e)).toHaveCount(0);
  });
});

test.describe("catequista", () => {
  test.use({
    storageState: CATEQUISTA.estado,
    viewport: { width: 360, height: 740 },
    locale: "pt-BR",
  });

  test("vê só os alertas das suas turmas e não acessa a chamada de turma alheia", async ({
    page,
  }) => {
    const f = criarFrequencia();
    await page.goto("/catequista/frequencia");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Frequência");
    await expect(page.getByText(f.c)).toBeVisible();
    await expect(page.getByText(f.b)).toBeVisible();
    await expect(page.getByText(f.a)).toHaveCount(0);
    await expect(page.getByText(f.d)).toHaveCount(0);
    await expect(page.getByText(f.e)).toHaveCount(0);
    await expect(page.getByLabel("Limite de frequência (%)")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Salvar limite" })).toHaveCount(0);

    // Chamada de um encontro da turma alheia: acesso negado.
    await page.goto(`/catequista/turmas/${f.t2.id}/encontros/${f.t2.encontroId}/chamada`);
    await expect(page).toHaveURL(/\/acesso-negado$/);
    await expect(page.getByText("Acesso negado")).toBeVisible();
  });
});
