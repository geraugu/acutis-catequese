import { execFileSync } from "node:child_process";
import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { loadEnv } from "vite";
import { CATEQUISTA, COORDENACAO } from "./fixtures";

test.use({ storageState: COORDENACAO.estado, locale: "pt-BR" });

const BASE = "/coordenacao/turmas";
const ROTULOS = ["Resumo", "Inscritos", "Frequência", "Encontros", "Equipe e link"] as const;

function sufixo() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

interface Chamada {
  turmaId: string;
  turmaNome: string;
  encontroId: string;
  nomes: string[];
}

/** Turma própria com inscritos e o encontro de hoje, criada direto no banco de teste. */
function criarChamada(semDesignacao = false): Chamada {
  const variaveis = loadEnv("test", process.cwd(), "");
  const saida = execFileSync(
    "npx",
    ["tsx", "tests/e2e/criar-chamada.ts", sufixo(), ...(semDesignacao ? ["sem-designacao"] : [])],
    {
      env: { ...process.env, ...variaveis, DATABASE_URL: variaveis.DATABASE_URL_TEST ?? "" },
      encoding: "utf8",
    },
  );
  return JSON.parse(saida) as Chamada;
}

/** Cria a turma pela interface e retorna o id (da URL da página da turma). */
async function criarTurma(page: Page, nome: string): Promise<string> {
  await page.goto(`${BASE}/nova`);
  await page.getByLabel("Nome").fill(nome);
  await page.getByLabel("Ciclo (ano)").fill("2026");
  await page.getByLabel("Dia da semana").selectOption({ label: "Sábado" });
  await page.getByLabel("Horário").fill("09:30");
  await page.getByLabel("Local").fill("Salão paroquial");
  await page.getByRole("button", { name: "Criar turma" }).click();
  await expect(page.getByRole("status")).toContainText("Turma criada.");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(nome);
  return new URL(page.url()).pathname.split("/").pop() ?? "";
}

async function cadastrarCatequizando(page: Page, nome: string) {
  await page.goto("/coordenacao/catequizandos/novo");
  await page.getByLabel("Nome").fill(nome);
  await page.getByLabel("Data de nascimento").fill("2008-05-20");
  await page.getByLabel("Telefone").fill("(11) 98765-4321");
  await page.getByRole("button", { name: "Cadastrar catequizando" }).click();
  await expect(page.getByRole("status")).toContainText("Catequizando cadastrado.");
}

function barra(page: Page): Locator {
  return page.getByRole("navigation", { name: "Seções da turma" });
}

/** Só a aba `atual` leva `aria-current="page"` (1.2). */
async function conferirAbaAtual(page: Page, atual: (typeof ROTULOS)[number]) {
  await expect(barra(page).getByRole("link")).toHaveText(ROTULOS);
  for (const rotulo of ROTULOS) {
    const link = barra(page).getByRole("link", { name: rotulo });
    if (rotulo === atual) await expect(link).toHaveAttribute("aria-current", "page");
    else await expect(link).not.toHaveAttribute("aria-current");
  }
}

async function semRolagemHorizontal(page: Page) {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const { largura, visivel } = await page.evaluate(() => ({
    largura: document.documentElement.scrollWidth,
    visivel: document.documentElement.clientWidth,
  }));
  expect(largura).toBeLessThanOrEqual(visivel);
}

test("percorre as cinco abas, inscreve e designa voltando para a aba certa", async ({ page }) => {
  const s = sufixo();
  const turma = `Turma Abas ${s}`;
  const nome = `Eva Inscrita ${s}`;
  const turmaId = await criarTurma(page, turma);
  await cadastrarCatequizando(page, nome);

  await page.goto(`${BASE}/${turmaId}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(turma);
  await conferirAbaAtual(page, "Resumo");
  await expect(page.getByText("Salão paroquial")).toBeVisible();

  const conteudo: Record<string, { rota: string; titulo: string }> = {
    Inscritos: { rota: "/inscritos", titulo: "Inscritos" },
    Frequência: { rota: "/frequencia", titulo: "Frequência" },
    Encontros: { rota: "/encontros", titulo: "Encontros" },
    "Equipe e link": { rota: "/equipe", titulo: "Catequistas" },
  };
  for (const rotulo of ROTULOS.slice(1)) {
    await barra(page).getByRole("link", { name: rotulo }).click();
    await expect(page).toHaveURL(new RegExp(`${BASE}/${turmaId}${conteudo[rotulo].rota}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(turma);
    await expect(
      page.getByRole("heading", { level: 2, name: conteudo[rotulo].titulo, exact: true }),
    ).toBeVisible();
    await conferirAbaAtual(page, rotulo);
  }
  await barra(page).getByRole("link", { name: "Resumo" }).click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/${turmaId}$`));
  await conferirAbaAtual(page, "Resumo");

  // Inscrever volta para Inscritos com a confirmação (8.2).
  await page.goto(`${BASE}/${turmaId}/inscritos`);
  await page.getByLabel("Buscar catequizando por termo").fill(nome);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  const item = page.locator(".inscrever-candidatos li").filter({ hasText: nome });
  await item.getByRole("button", { name: "Inscrever", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/${turmaId}/inscritos`));
  await expect(page.getByRole("status")).toContainText("Catequizando inscrito.");
  await conferirAbaAtual(page, "Inscritos");
  await expect(
    page.getByRole("list", { name: "Inscritos vigentes" }).getByRole("link", { name: nome }),
  ).toBeVisible();

  // Designar volta para Equipe e link com a confirmação (8.3).
  await barra(page).getByRole("link", { name: "Equipe e link" }).click();
  await page.getByLabel("Catequista", { exact: true }).selectOption({ label: CATEQUISTA.nome });
  await page.getByRole("button", { name: "Designar" }).click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/${turmaId}/equipe`));
  await expect(page.getByRole("status")).toContainText("Catequista designado.");
  await conferirAbaAtual(page, "Equipe e link");
  await expect(page.locator(".turma-catequistas")).toContainText(CATEQUISTA.nome);
});

test("fazer chamada abre sem a barra de abas e volta para Encontros", async ({ page }) => {
  const c = criarChamada();
  await page.goto(`${BASE}/${c.turmaId}`);
  await conferirAbaAtual(page, "Resumo");
  const bloco = page.getByRole("region", { name: "Encontro de hoje" });
  await bloco.getByRole("link", { name: "Fazer chamada" }).click();
  await expect(page).toHaveURL(new RegExp(`/encontros/${c.encontroId}/chamada$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fazer chamada");
  await expect(barra(page)).toHaveCount(0);

  await page.getByRole("link", { name: "← Voltar para Encontros" }).click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/${c.turmaId}/encontros$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(c.turmaNome);
  await conferirAbaAtual(page, "Encontros");
});

test.describe("celular", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("em 360 px a barra quebra em linhas e nenhuma aba rola na horizontal", async ({ page }) => {
    const c = criarChamada();
    for (const aba of ["", "/inscritos", "/frequencia", "/encontros", "/equipe"]) {
      await page.goto(`${BASE}/${c.turmaId}${aba}`);
      await semRolagemHorizontal(page);
      const caixas = await barra(page)
        .getByRole("link")
        .evaluateAll((els) =>
          els.map((e) => {
            const r = e.getBoundingClientRect();
            return { topo: Math.round(r.top), esquerda: r.left, direita: r.right };
          }),
        );
      expect(caixas).toHaveLength(ROTULOS.length);
      expect(new Set(caixas.map((x) => x.topo)).size).toBeGreaterThan(1);
      for (const x of caixas) {
        expect(x.esquerda).toBeGreaterThanOrEqual(0);
        expect(x.direita).toBeLessThanOrEqual(360);
      }
      const lista = barra(page).locator("ul");
      const { rolagem, visivel } = await lista.evaluate((e) => ({
        rolagem: e.scrollWidth,
        visivel: e.clientWidth,
      }));
      expect(rolagem).toBeLessThanOrEqual(visivel);
    }
  });
});

test("percorre as abas só com o teclado", async ({ page }) => {
  const c = criarChamada();
  await page.goto(`${BASE}/${c.turmaId}`);
  await conferirAbaAtual(page, "Resumo");
  const links = barra(page).getByRole("link");

  await links.first().focus();
  for (let i = 1; i < ROTULOS.length; i++) {
    await page.keyboard.press("Tab");
    const foco = links.nth(i);
    await expect(foco).toBeFocused();
    await expect(foco).toHaveText(ROTULOS[i]);
    // O foco por teclado é visível (contorno de :focus-visible).
    await expect(foco).toHaveCSS("outline-style", "solid");
    expect(await foco.evaluate((e) => e.matches(":focus-visible"))).toBe(true);
  }

  // Enter na última aba navega; a aba atual muda e o foco segue na barra.
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${BASE}/${c.turmaId}/equipe$`));
  await conferirAbaAtual(page, "Equipe e link");

  await links.nth(1).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${BASE}/${c.turmaId}/inscritos$`));
  await conferirAbaAtual(page, "Inscritos");
});

test.describe("catequista", () => {
  test.use({ storageState: CATEQUISTA.estado });

  async function enviarFichaPublica(
    browser: Browser,
    baseURL: string | undefined,
    caminho: string,
    nome: string,
  ) {
    const contexto = await browser.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    });
    try {
      const anonimo = await contexto.newPage();
      await anonimo.goto(caminho);
      await anonimo.getByLabel("Nome", { exact: true }).fill(nome);
      await anonimo.getByLabel("Data de nascimento", { exact: true }).fill("2004-06-15");
      await anonimo.getByLabel("Telefone", { exact: true }).fill("(11) 91234-5678");
      await anonimo.getByRole("checkbox", { name: /Autorizo/ }).check();
      await anonimo.getByRole("button", { name: "Enviar ficha" }).click();
      await expect(anonimo.getByRole("status")).toContainText("Recebemos sua ficha!");
    } finally {
      await contexto.close();
    }
  }

  /** Descarta todas as fichas pendentes da turma; não falha se não houver nenhuma. */
  async function descartarPendentes(page: Page, base: string) {
    await page.goto(`${base}/pendentes`);
    const fila = page.getByRole("list", { name: "Fichas pendentes" });
    while ((await fila.count()) > 0) {
      await fila.getByRole("link").first().click();
      await page.getByRole("button", { name: "Descartar ficha" }).click();
      await page
        .getByRole("dialog", { name: "Descartar ficha" })
        .getByRole("button", { name: "Descartar", exact: true })
        .click();
      await expect(page.getByRole("status").filter({ hasText: "Ficha descartada" })).toBeVisible();
      await page.goto(`${base}/pendentes`);
    }
  }

  test("vê as cinco abas sem ações de alteração e a contagem de pendentes em Equipe e link", async ({
    page,
    browser,
    baseURL,
  }) => {
    const c = criarChamada();
    const base = `/catequista/turmas/${c.turmaId}`;
    const principal = page.locator("main");

    await page.goto(base);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(c.turmaNome);
    await conferirAbaAtual(page, "Resumo");
    // Sem pendentes não há contagem na aba.
    await expect(barra(page).getByRole("link", { name: "Equipe e link" })).toHaveText(
      "Equipe e link",
    );
    // O Resumo só oferece a chamada (link); nenhum botão de alteração.
    await expect(principal.getByRole("button")).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Encontro de hoje" }).getByRole("link", {
        name: "Fazer chamada",
      }),
    ).toBeVisible();

    for (const [aba, rota] of [
      ["Inscritos", "/inscritos"],
      ["Frequência", "/frequencia"],
    ] as const) {
      await barra(page).getByRole("link", { name: aba }).click();
      await expect(page).toHaveURL(new RegExp(`${base}${rota}$`));
      await conferirAbaAtual(page, aba);
      await expect(principal.getByRole("button")).toHaveCount(0);
    }

    // Encontros: o catequista designado cuida do cronograma da própria turma (programa); só
    // essas ações existem, nenhuma de inscrição, designação ou exclusão.
    await barra(page).getByRole("link", { name: "Encontros" }).click();
    await expect(page).toHaveURL(new RegExp(`${base}/encontros$`));
    await conferirAbaAtual(page, "Encontros");
    await expect(principal.getByRole("button")).toHaveText([
      /^Marcar como realizado/,
      /^Cancelar encontro de /,
    ]);
    await expect(principal.getByRole("link", { name: "Novo encontro" })).toBeVisible();
    await expect(principal.getByRole("link", { name: "Fazer chamada" })).toBeVisible();

    // Equipe e link: a única ação é gerar o link de autocadastro.
    await barra(page).getByRole("link", { name: "Equipe e link" }).click();
    await expect(page).toHaveURL(new RegExp(`${base}/equipe$`));
    await conferirAbaAtual(page, "Equipe e link");
    await expect(principal.getByRole("button")).toHaveText(["Gerar link"]);
    await principal.getByRole("button", { name: "Gerar link" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Link gerado." })).toBeVisible();
    const link = (await principal.locator("code").textContent())?.trim() ?? "";
    expect(link).toMatch(/\/inscricao\/[A-Za-z0-9_-]{43}$/);

    // Uma ficha pendente aparece como contagem no rótulo, com texto acessível (1.6).
    // O descarte roda sempre (mesmo se o teste falhar) para não vazar pendência na turma.
    const pendente = `Fulana Pendente ${sufixo()}`;
    try {
      await enviarFichaPublica(browser, baseURL, new URL(link).pathname, pendente);
      await page.goto(base);
      const equipe = barra(page).getByRole("link", { name: /^Equipe e link\s*1 ficha pendente$/ });
      await expect(equipe).toBeVisible();
      await expect(equipe.locator(".aba-contagem")).toHaveText("1");
      await expect(equipe.locator(".aba-contagem")).toHaveAttribute("aria-hidden", "true");
      // As outras abas não levam contagem.
      for (const rotulo of ROTULOS.filter((r) => r !== "Equipe e link")) {
        await expect(barra(page).getByRole("link", { name: rotulo, exact: true })).toHaveText(
          rotulo,
        );
      }
    } finally {
      await descartarPendentes(page, base);
    }
  });

  test("abrir direto qualquer aba ou a chamada de outra turma mostra Acesso negado", async ({
    page,
  }) => {
    const alheia = criarChamada(true);
    const base = `/catequista/turmas/${alheia.turmaId}`;
    const caminhos = [
      "",
      "/inscritos",
      "/frequencia",
      "/encontros",
      "/equipe",
      `/encontros/${alheia.encontroId}/chamada`,
    ];
    for (const caminho of caminhos) {
      await page.goto(`${base}${caminho}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Acesso negado");
      // Nenhum dado da turma vaza: nem o nome, nem a barra de abas, nem os inscritos.
      await expect(barra(page)).toHaveCount(0);
      const html = await page.content();
      expect(html).not.toContain(alheia.turmaNome);
      for (const nome of alheia.nomes) expect(html).not.toContain(nome);
    }
  });
});
