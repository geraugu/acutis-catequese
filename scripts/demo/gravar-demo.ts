/**
 * Grava o vídeo da demonstração (página da turma em abas) contra o app de demonstração.
 * Roda via `tsx`; usa o Playwright direto (sem o runner de testes). Uso:
 *   tsx scripts/demo/gravar-demo.ts <url-base> <pasta-de-saida>
 * Saída: <pasta-de-saida>/demo.webm. Login numa sessão sem vídeo, para não expor o e-mail.
 */
import { mkdirSync, readdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "@playwright/test";
import { CATEQUISTA_DEMO } from "./credenciais";

const base = process.argv[2] ?? "http://localhost:3100";
const saida = process.argv[3] ?? "demo-video";
const VIEWPORT = { width: 1000, height: 640 };

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Cursor e anel de clique simples, injetados em toda página (só para a demonstração). */
const CURSOR = `
(() => {
  const iniciar = () => {
    if (document.getElementById("demo-cursor")) return;
    const estilo = document.createElement("style");
    estilo.textContent = \`
      #demo-cursor{position:fixed;z-index:2147483647;pointer-events:none;width:18px;height:18px;
        margin:-9px 0 0 -9px;border-radius:50%;background:rgba(30,90,200,.35);
        border:2px solid rgba(30,90,200,.9);transition:transform .12s ease;left:-50px;top:-50px}
      #demo-cursor.clique{transform:scale(1.8)}\`;
    document.head.append(estilo);
    const c = document.createElement("div");
    c.id = "demo-cursor";
    document.body.append(c);
    const guardada = sessionStorage.getItem("demo-pos");
    if (guardada) { const [x, y] = guardada.split(","); c.style.left = x + "px"; c.style.top = y + "px"; }
    addEventListener("mousemove", (e) => {
      c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px";
      sessionStorage.setItem("demo-pos", e.clientX + "," + e.clientY);
    }, true);
    addEventListener("mousedown", () => c.classList.add("clique"), true);
    addEventListener("mouseup", () => c.classList.remove("clique"), true);
  };
  if (document.body) iniciar(); else addEventListener("DOMContentLoaded", iniciar);
})();`;

/** Move o cursor até o elemento com um trajeto suave e clica. */
async function clicar(page: Page, alvo: ReturnType<Page["getByRole"]>) {
  await alvo.scrollIntoViewIfNeeded();
  const caixa = await alvo.boundingBox();
  if (!caixa) throw new Error("Elemento sem caixa de layout.");
  await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2, { steps: 25 });
  await pausa(250);
  await page.mouse.down();
  await pausa(90);
  await page.mouse.up();
}

async function main() {
  const navegador = await chromium.launch({ channel: "chromium" });
  try {
    // 1) Login sem gravação.
    const sessaoLogin = await navegador.newContext({ viewport: VIEWPORT, locale: "pt-BR" });
    const paginaLogin = await sessaoLogin.newPage();
    await paginaLogin.goto(`${base}/login`);
    await paginaLogin.getByLabel("E-mail").fill(CATEQUISTA_DEMO.email);
    await paginaLogin.getByLabel("Senha").fill(CATEQUISTA_DEMO.senha);
    await paginaLogin.getByRole("button", { name: "Entrar" }).click();
    await paginaLogin.waitForURL(/\/catequista/);
    const estado = await sessaoLogin.storageState();
    await sessaoLogin.close();

    // 2) Gravação com a sessão já autenticada.
    mkdirSync(saida, { recursive: true });
    const contexto = await navegador.newContext({
      viewport: VIEWPORT,
      locale: "pt-BR",
      storageState: estado,
      recordVideo: { dir: saida, size: VIEWPORT },
    });
    await contexto.addInitScript(CURSOR);
    const page = await contexto.newPage();

    await page.goto(`${base}/catequista/turmas`);
    await page.getByRole("heading", { level: 1, name: "Minhas turmas" }).waitFor();
    await page.mouse.move(700, 500);
    await pausa(2000);

    await clicar(page, page.getByRole("link", { name: /Turma São José/ }).first());
    await page.getByRole("heading", { level: 1, name: "Turma São José" }).waitFor();
    await pausa(2200);

    const abas = page.getByRole("navigation", { name: "Seções da turma" });
    await clicar(page, abas.getByRole("link", { name: "Inscritos" }));
    await page.waitForURL(/\/inscritos/);
    await pausa(2000);

    await clicar(page, abas.getByRole("link", { name: "Frequência" }));
    await page.waitForURL(/\/frequencia/);
    await pausa(2000);
    await clicar(page, page.getByRole("link", { name: "Ordenar por menor frequência" }));
    await page.waitForURL(/ordem=frequencia/);
    await pausa(1500);
    await page.mouse.wheel(0, 260);
    await pausa(1800);

    await clicar(page, abas.getByRole("link", { name: "Encontros" }));
    await page.waitForURL(/\/encontros/);
    await pausa(2200);

    await clicar(page, abas.getByRole("link", { name: "Equipe e link" }));
    await page.waitForURL(/\/equipe/);
    await pausa(1500);
    await page.mouse.wheel(0, 200);
    await pausa(2200);

    const video = page.video();
    await contexto.close();
    const caminho = await video?.path();
    if (!caminho) throw new Error("Vídeo não gravado.");
    const arquivo = readdirSync(saida).find((f) => f.endsWith(".webm"));
    if (arquivo) renameSync(join(saida, arquivo), join(saida, "demo.webm"));
  } finally {
    await navegador.close();
  }
}

main().catch((erro: unknown) => {
  console.error(erro);
  process.exit(1);
});
