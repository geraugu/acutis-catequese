import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import { loadEnv } from "vite";
import { CATEQUISTA, COORDENACAO } from "./fixtures";

test.use({
  storageState: CATEQUISTA.estado,
  viewport: { width: 360, height: 740 },
  locale: "pt-BR",
});

interface Reposicao {
  turmaAId: string;
  turmaANome: string;
  turmaBId: string;
  turmaBNome: string;
  encontroBId: string;
  temaTitulo: string;
  xId: string;
  xNome: string;
  xBusca: string;
  telefone: string;
  email: string;
  nomesB: string[];
}

function sufixo() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Cria as duas turmas, o catequizando X, a falta na turma A e o encontro de hoje na B. */
function criarReposicao(): Reposicao {
  const variaveis = loadEnv("test", process.cwd(), "");
  const saida = execFileSync("npx", ["tsx", "tests/e2e/criar-reposicao.ts", sufixo()], {
    env: { ...process.env, ...variaveis, DATABASE_URL: variaveis.DATABASE_URL_TEST ?? "" },
    encoding: "utf8",
  });
  return JSON.parse(saida) as Reposicao;
}

/** A frequência por turma só tem a turma de origem: o visitante não conta na turma B. */
async function soFrequenciaDaOrigem(pc: Page, r: Reposicao) {
  const secao = pc.locator('section[aria-labelledby="freq-turmas"]');
  await expect(secao.locator(".presenca-inscrito")).toHaveCount(1);
  await expect(secao).toContainText(r.turmaANome);
  await expect(secao).not.toContainText(r.turmaBNome);
}

/** Abre a ficha de X como coordenação e devolve a seção de frequência e progresso. */
async function fichaDeX(page: Page, r: Reposicao) {
  await page.goto(`/coordenacao/catequizandos/${r.xId}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(r.xNome);
}

test("catequista de outra turma registra um visitante e a reposição aparece na ficha", async ({
  page,
  browser,
  baseURL,
}) => {
  const r = criarReposicao();
  const base = `/catequista/turmas/${r.turmaBId}/encontros/${r.encontroBId}/chamada`;

  await page.goto(base);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fazer chamada");
  await page.getByRole("link", { name: "Adicionar visitante" }).click();
  await expect(page).toHaveURL(new RegExp(`${base}/visitantes$`));

  // A busca ignora acento e caixa e mostra só nome e turma de origem (4.2).
  await page.getByLabel("Buscar catequizando pelo nome").fill(r.xBusca.toUpperCase());
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  const candidato = page.locator(".presenca-lista-visitantes li").filter({ hasText: r.xNome });
  await expect(candidato).toHaveCount(1);
  await expect(candidato).toContainText(`Turma de origem: ${r.turmaANome}`);
  const html = await page.content();
  for (const contato of [r.telefone, "98765-4321", "98765", r.email]) {
    expect(html).not.toContain(contato);
  }

  // Confirmação e retorno com o aviso e X listado como visitante (4.3, 4.6).
  await candidato.getByRole("button", { name: `Adicionar ${r.xNome}` }).click();
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Visitante adicionado.");
  await expect(page).toHaveURL(new RegExp(`${base}/visitantes\\?`));
  const visitante = page.locator(".presenca-lista-visitantes li").filter({ hasText: r.xNome });
  await expect(visitante).toContainText("Visitante");
  await expect(visitante).toContainText(`Turma de origem: ${r.turmaANome}`);

  // Volta à chamada, marca os inscritos e salva: o visitante entra no resumo.
  await page.goto(base);
  await page.getByRole("button", { name: "Marcar todos como presentes" }).click();
  await page.getByRole("button", { name: "Salvar chamada" }).click();
  await expect(page.getByRole("status")).toContainText("Chamada salva.");
  const item = page.locator(".cronograma-item").filter({ hasText: r.temaTitulo });
  await expect(item.locator(".situacao-realizado")).toBeVisible();
  await expect(item).toContainText("2 presentes · 0 ausentes · 0 justificados · 1 visitante");

  // Ficha de X pela coordenação: tema cumprido por reposição; turma A segue com a falta (4.7).
  const coord = await browser.newContext({
    baseURL,
    storageState: COORDENACAO.estado,
    viewport: { width: 1024, height: 800 },
    locale: "pt-BR",
  });
  try {
    const pc = await coord.newPage();
    await fichaDeX(pc, r);
    const hoje = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date());
    const cumpridos = pc.getByRole("list", { name: "Temas cumpridos" });
    await expect(cumpridos).toContainText(r.temaTitulo);
    await expect(cumpridos).toContainText(
      `Cumprido por reposição na turma ${r.turmaBNome} em ${hoje}`,
    );
    const freq = pc.locator(".presenca-inscrito").filter({ hasText: r.turmaANome }).first();
    await expect(freq).toContainText("0%");
    await expect(freq).toContainText("1 ausente");
    await expect(freq).toContainText("0 presentes");
    await expect(pc.getByRole("list", { name: "Presenças" })).toContainText("Visitante");
    await soFrequenciaDaOrigem(pc, r);
    // A inscrição continua na turma A.
    await expect(pc.getByRole("main")).toContainText(r.turmaANome);
    await expect(pc.getByRole("main")).not.toContainText(`Inscrito em ${r.turmaBNome}`);

    // Remoção do visitante com confirmação nomeando-o; o tema volta a pendente (4.6, 4.7).
    await page.goto(`${base}/visitantes`);
    await page.getByRole("button", { name: `Remover ${r.xNome}` }).click();
    await expect(
      page.getByRole("heading", { name: `Remover o visitante ${r.xNome}?` }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Remover", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Visitante removido.");
    await expect(page.getByText("Nenhum visitante neste encontro.")).toBeVisible();

    await fichaDeX(pc, r);
    await expect(pc.getByRole("list", { name: "Temas cumpridos" })).toHaveCount(0);
    await pc.getByText("Ver temas pendentes").click();
    await expect(pc.getByRole("list", { name: "Temas pendentes" })).toContainText(r.temaTitulo);
    const freqDepois = pc.locator(".presenca-inscrito").filter({ hasText: r.turmaANome }).first();
    await expect(freqDepois).toContainText("1 ausente");
    await soFrequenciaDaOrigem(pc, r);
    await expect(pc.getByRole("main")).toContainText(r.turmaANome);
  } finally {
    await coord.close();
  }
});
