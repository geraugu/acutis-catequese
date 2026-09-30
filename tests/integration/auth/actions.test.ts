import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/modules/auth/dal";
import { entrarAction, sairAction } from "@/modules/auth/actions";
import {
  MSG_BLOQUEIO,
  MSG_CONTA_DESABILITADA,
  MSG_CREDENCIAIS_INVALIDAS,
} from "@/modules/auth/mensagens";

// Jarra de cookies mutável da requisição simulada.
const jarra = new Map<string, string>();
function cabecalhoCookie() {
  return [...jarra].map(([k, v]) => `${k}=${v}`).join("; ");
}
vi.mock("next/headers", () => ({
  headers: async () => {
    const h = new Headers();
    if (jarra.size) h.set("cookie", cabecalhoCookie());
    return h;
  },
  cookies: async () => ({
    set: (k: string, v: string) => void jarra.set(k, v),
    get: (k: string) => (jarra.has(k) ? { name: k, value: jarra.get(k) } : undefined),
    delete: (k: string) => void jarra.delete(k),
  }),
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

function form(campos: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
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

async function criar(email: string, role: "coordenacao" | "catequista") {
  return auth.api.createUser({ body: { email, password: SENHA, name: "Fulano", role } });
}

describe("entrarAction / sairAction", () => {
  beforeEach(() => {
    jarra.clear();
  });

  it("login válido de catequista redireciona para /catequista (3.1)", async () => {
    await criar("cat@exemplo.com", "catequista");
    const url = await redirecionamento(
      entrarAction({}, form({ email: " CAT@exemplo.com ", senha: SENHA })),
    );
    expect(url).toBe("/catequista");
    expect(await prisma.session.count()).toBe(1);
  });

  it("coordenação com callbackUrl /catequista é honrada", async () => {
    await criar("coord@exemplo.com", "coordenacao");
    const url = await redirecionamento(
      entrarAction(
        {},
        form({ email: "coord@exemplo.com", senha: SENHA, callbackUrl: "/catequista" }),
      ),
    );
    expect(url).toBe("/catequista");
  });

  it("catequista com callbackUrl /coordenacao vai para /catequista", async () => {
    await criar("cat@exemplo.com", "catequista");
    const url = await redirecionamento(
      entrarAction(
        {},
        form({ email: "cat@exemplo.com", senha: SENHA, callbackUrl: "/coordenacao" }),
      ),
    );
    expect(url).toBe("/catequista");
  });

  it("callbackUrl externa é ignorada (6.2)", async () => {
    await criar("cat@exemplo.com", "catequista");
    const url = await redirecionamento(
      entrarAction(
        {},
        form({ email: "cat@exemplo.com", senha: SENHA, callbackUrl: "https://evil.com" }),
      ),
    );
    expect(url).toBe("/catequista");
  });

  it("senha errada devolve mensagem genérica e o e-mail (3.2)", async () => {
    await criar("cat@exemplo.com", "catequista");
    const estado = await entrarAction({}, form({ email: "cat@exemplo.com", senha: "errada-123" }));
    expect(estado.erro).toBe(MSG_CREDENCIAIS_INVALIDAS);
    expect(estado.email).toBe("cat@exemplo.com");
    expect(await prisma.session.count()).toBe(0);
  });

  it("campos vazios devolvem erros por campo sem chamar a autenticação (3.3)", async () => {
    const espiao = vi.spyOn(auth.api, "signInEmail");
    const estado = await entrarAction({}, form({ email: "", senha: "" }));
    expect(estado.errosCampos?.email).toBeTruthy();
    expect(estado.errosCampos?.senha).toBeTruthy();
    expect(espiao).not.toHaveBeenCalled();
    espiao.mockRestore();
  });

  it("conta desabilitada recebe a mensagem própria (3.4)", async () => {
    const { user } = await criar("cat@exemplo.com", "catequista");
    await prisma.user.update({ where: { id: user.id }, data: { banned: true } });
    const estado = await entrarAction({}, form({ email: "cat@exemplo.com", senha: SENHA }));
    expect(estado.erro).toBe(MSG_CONTA_DESABILITADA);
  });

  it("após 5 falhas o login é bloqueado", async () => {
    await criar("cat@exemplo.com", "catequista");
    for (let i = 0; i < 5; i++) {
      await entrarAction({}, form({ email: "cat@exemplo.com", senha: "errada-123" }));
    }
    const estado = await entrarAction({}, form({ email: "cat@exemplo.com", senha: SENHA }));
    expect(estado.erro).toBe(MSG_BLOQUEIO);
  });

  it("sair revoga a sessão e o cookie deixa de valer (5.3, 5.4)", async () => {
    await criar("cat@exemplo.com", "catequista");
    const resposta = await auth.api.signInEmail({
      body: { email: "cat@exemplo.com", password: SENHA, rememberMe: false },
      asResponse: true,
    });
    const cookie = resposta.headers.getSetCookie().map((c) => c.split(";")[0]);
    for (const c of cookie) {
      const i = c.indexOf("=");
      jarra.set(c.slice(0, i), c.slice(i + 1));
    }
    const antes = new Map(jarra);
    expect(await getSessao()).not.toBeNull();

    expect(await redirecionamento(sairAction())).toBe("/login");
    expect(await prisma.session.count()).toBe(0);

    jarra.clear();
    for (const [k, v] of antes) jarra.set(k, v);
    expect(await getSessao()).toBeNull();
  });
});
