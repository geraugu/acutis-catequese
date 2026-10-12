import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import { loadEnv } from "vite";
import { CATEQUISTA, COORDENACAO } from "./fixtures";

// O catequista de teste conduz a turma visitada; a coordenação reserva pelo celular.
test.use({
  storageState: CATEQUISTA.estado,
  viewport: { width: 360, height: 740 },
  locale: "pt-BR",
});

interface Reposicao {
  turmaANome: string;
  turmaBId: string;
  turmaBNome: string;
  encontroBId: string;
  temaTitulo: string;
  xId: string;
  xNome: string;
}

function sufixo() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Mesmo cenário do e2e de visitante: X faltou na turma A; a turma B tem encontro de hoje. */
function criarReposicao(): Reposicao {
  const variaveis = loadEnv("test", process.cwd(), "");
  const saida = execFileSync("npx", ["tsx", "tests/e2e/criar-reposicao.ts", sufixo()], {
    env: { ...process.env, ...variaveis, DATABASE_URL: variaveis.DATABASE_URL_TEST ?? "" },
    encoding: "utf8",
  });
  return JSON.parse(saida) as Reposicao;
}

async function semRolagemHorizontal(pagina: Page) {
  const { largura, visivel } = await pagina.evaluate(() => ({
    largura: document.documentElement.scrollWidth,
    visivel: document.documentElement.clientWidth,
  }));
  expect(largura).toBeLessThanOrEqual(visivel);
}

const paginaDe = (r: Reposicao) => `/coordenacao/catequizandos/${r.xId}/reposicao`;

test("coordenação reserva, o catequista confirma presente e o tema deixa de faltar", async ({
  page,
  browser,
  baseURL,
}) => {
  const r = criarReposicao();
  const coord = await browser.newContext({
    baseURL,
    storageState: COORDENACAO.estado,
    viewport: { width: 360, height: 740 },
    locale: "pt-BR",
  });
  try {
    const pc = await coord.newPage();

    // O tema a repor aparece com a opção da turma visitada, sem rolagem horizontal (3.1, 7.1).
    await pc.goto(paginaDe(r));
    await expect(pc.getByRole("heading", { level: 1 })).toHaveText("O que falta");
    await expect(pc.getByRole("heading", { level: 3 })).toContainText(r.temaTitulo);
    await semRolagemHorizontal(pc);

    // Reserva em outra turma: aviso e reserva em destaque no lugar das opções (3.6, 4.1, 7.2).
    await pc.getByRole("button", { name: `Reservar ${r.turmaBNome}` }).click();
    await expect(pc.getByRole("status")).toContainText("Reposição reservada.");
    await expect(pc.getByRole("group", { name: /^Reserva do tema/ })).toContainText(r.turmaBNome);
    await expect(pc.getByRole("button", { name: /^Reservar/ })).toHaveCount(0);
    await semRolagemHorizontal(pc);

    // O catequista da turma visitada vê a reserva na chamada, com a turma de origem (5.1).
    const chamada = `/catequista/turmas/${r.turmaBId}/encontros/${r.encontroBId}/chamada`;
    await page.goto(chamada);
    const bloco = page.getByRole("region", { name: "Reposições reservadas" });
    await expect(bloco).toContainText(r.xNome);
    await expect(bloco).toContainText(`Turma de origem: ${r.turmaANome}`);
    await semRolagemHorizontal(page);

    // Confirmar presente o move para os visitantes (5.2).
    await page.getByRole("button", { name: `Confirmar presente: ${r.xNome}` }).click();
    await expect(page.getByRole("status")).toContainText("Visitante adicionado.");
    await expect(
      page.locator(".presenca-lista-visitantes li").filter({ hasText: r.xNome }),
    ).toContainText("Visitante");

    // Chamada salva: o tema passa a cumprido e sai da lista de pendências (2.3).
    await page.goto(chamada);
    await page.getByRole("button", { name: "Marcar todos como presentes" }).click();
    await page.getByRole("button", { name: "Salvar chamada" }).click();
    await expect(page.getByRole("status")).toContainText("Chamada salva.");

    await pc.goto(paginaDe(r));
    await expect(pc.getByText("Nenhuma reposição pendente")).toBeVisible();
    await expect(pc.getByRole("heading", { level: 3 })).toHaveCount(0);
    await expect(pc.getByRole("list", { name: "Histórico de reservas" })).toContainText(
      "Compareceu",
    );
    await semRolagemHorizontal(pc);
  } finally {
    await coord.close();
  }
});

test("cancelar a reserva devolve as opções e o catequista de fora é negado", async ({
  page,
  browser,
  baseURL,
}) => {
  const r = criarReposicao();
  const coord = await browser.newContext({
    baseURL,
    storageState: COORDENACAO.estado,
    viewport: { width: 360, height: 740 },
    locale: "pt-BR",
  });
  try {
    const pc = await coord.newPage();
    await pc.goto(paginaDe(r));
    await pc.getByRole("button", { name: `Reservar ${r.turmaBNome}` }).click();
    await expect(pc.getByRole("status")).toContainText("Reposição reservada.");

    // Cancelamento com confirmação nomeada; as opções do tema voltam (4.5).
    await pc.getByRole("button", { name: "Cancelar reserva" }).click();
    await pc.getByRole("button", { name: "Cancelar a reserva", exact: true }).click();
    await expect(pc.getByRole("status")).toContainText("Reserva cancelada.");
    await expect(pc.getByRole("button", { name: `Reservar ${r.turmaBNome}` })).toBeVisible();
    await expect(pc.getByRole("list", { name: "Histórico de reservas" })).toContainText(
      "Cancelada",
    );
    await semRolagemHorizontal(pc);
  } finally {
    await coord.close();
  }

  // O catequista conduz só a turma visitada: não é responsável pela origem de X (1.2, 1.3).
  await page.goto(`/catequista/catequizandos/${r.xId}/reposicao`);
  await expect(page).toHaveURL(/\/acesso-negado$/);
  await expect(page.getByRole("main")).not.toContainText(r.xNome);
});
