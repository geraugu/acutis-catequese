import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import {
  autorizarCatequizando,
  autorizarTurma,
  exigirCoordenacao,
  turmasDoUsuario,
} from "@/modules/presenca/autorizacao";
import { designar, removerDesignacao } from "@/modules/turmas/repositorio";
import { criarCatequizandoDireto, criarInscricaoDireta, criarTurmaDireta } from "./helpers";

let cookieAtual: string | null = null;

vi.mock("next/headers", () => ({
  headers: async () => {
    const h = new Headers();
    if (cookieAtual) h.set("cookie", cookieAtual);
    return h;
  },
}));

class RedirectErro extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT;${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectErro(url);
  },
}));

const SENHA = "senha-forte-123";

async function criarEEntrar(email: string, role: "coordenacao" | "catequista") {
  const criado = await auth.api.createUser({ body: { email, password: SENHA, name: email, role } });
  const resposta = await auth.api.signInEmail({
    body: { email, password: SENHA, rememberMe: false },
    asResponse: true,
  });
  const cookie = resposta.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return { userId: criado.user.id, cookie };
}

async function redirecionamento(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof RedirectErro) return e.url;
    throw e;
  }
  throw new Error("esperava redirect");
}

async function cenario() {
  const coord = await criarEEntrar("coord@exemplo.com", "coordenacao");
  const resp = await criarEEntrar("resp@exemplo.com", "catequista");
  const outro = await criarEEntrar("outro@exemplo.com", "catequista");
  const turmaId = await criarTurmaDireta();
  await designar(turmaId, resp.userId);
  const catequizandoId = await criarCatequizandoDireto();
  await criarInscricaoDireta(turmaId, catequizandoId);
  return { coord, resp, outro, turmaId, catequizandoId };
}

describe("autorização do módulo de presença (1.1 a 1.5)", () => {
  beforeEach(() => {
    cookieAtual = null;
  });

  it("autorizarTurma: coordenação e catequista responsável passam (1.2, 1.3)", async () => {
    const c = await cenario();
    cookieAtual = c.coord.cookie;
    expect((await autorizarTurma(c.turmaId)).userId).toBe(c.coord.userId);
    cookieAtual = c.resp.cookie;
    expect((await autorizarTurma(c.turmaId)).userId).toBe(c.resp.userId);
  });

  it("autorizarTurma: catequista de outra turma e designação removida vão a /acesso-negado (1.4)", async () => {
    const c = await cenario();
    cookieAtual = c.outro.cookie;
    expect(await redirecionamento(autorizarTurma(c.turmaId))).toBe("/acesso-negado");
    cookieAtual = c.resp.cookie;
    await removerDesignacao(c.turmaId, c.resp.userId);
    expect(await redirecionamento(autorizarTurma(c.turmaId))).toBe("/acesso-negado");
  });

  it("autorizarTurma: id inválido nega sem lançar erro de banco (1.4)", async () => {
    const c = await cenario();
    cookieAtual = c.resp.cookie;
    expect(await redirecionamento(autorizarTurma("nao-uuid"))).toBe("/acesso-negado");
  });

  it("autorizarTurma: sem sessão vai ao login (1.5)", async () => {
    const c = await cenario();
    expect(await redirecionamento(autorizarTurma(c.turmaId))).toBe("/login");
  });

  it("autorizarCatequizando: responsável e coordenação passam; outro catequista não (1.2, 1.3, 1.4)", async () => {
    const c = await cenario();
    cookieAtual = c.coord.cookie;
    await expect(autorizarCatequizando(c.catequizandoId)).resolves.toMatchObject({
      userId: c.coord.userId,
    });
    cookieAtual = c.resp.cookie;
    await expect(autorizarCatequizando(c.catequizandoId)).resolves.toMatchObject({
      userId: c.resp.userId,
    });
    cookieAtual = c.outro.cookie;
    expect(await redirecionamento(autorizarCatequizando(c.catequizandoId))).toBe("/acesso-negado");
    await removerDesignacao(c.turmaId, c.resp.userId);
    cookieAtual = c.resp.cookie;
    expect(await redirecionamento(autorizarCatequizando(c.catequizandoId))).toBe("/acesso-negado");
    expect(await redirecionamento(autorizarCatequizando("x'; drop"))).toBe("/acesso-negado");
  });

  it("exigirCoordenacao: coordenação passa e catequista é recusado (1.1)", async () => {
    const c = await cenario();
    cookieAtual = c.coord.cookie;
    await expect(exigirCoordenacao()).resolves.toMatchObject({ papel: "coordenacao" });
    cookieAtual = c.resp.cookie;
    expect(await redirecionamento(exigirCoordenacao())).toBe("/acesso-negado");
  });

  it("turmasDoUsuario: coordenação vê todas; catequista só as abertas que conduz (1.2, 1.3)", async () => {
    const c = await cenario();
    const encerrada = await criarTurmaDireta({ nome: "Antiga", encerradaEm: "2026-06-01" });
    await designar(encerrada, c.resp.userId);
    expect(
      await turmasDoUsuario({ userId: c.coord.userId, nome: "", email: "", papel: "coordenacao" }),
    ).toBe("todas");
    expect(
      await turmasDoUsuario({ userId: c.resp.userId, nome: "", email: "", papel: "catequista" }),
    ).toEqual([c.turmaId]);
    expect(
      await turmasDoUsuario({ userId: c.outro.userId, nome: "", email: "", papel: "catequista" }),
    ).toEqual([]);
  });
});
