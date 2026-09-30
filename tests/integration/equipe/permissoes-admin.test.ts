import { describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/modules/auth/dal";
import {
  capturarRedirect,
  criarCatequista,
  criarCoordenacao,
  entrarComo,
  limparSessao,
  usarSessao,
} from "./helpers";

vi.mock("next/headers", async () => (await import("./next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("./next-mocks")).nextNavigationMock);

async function status(p: Promise<unknown>): Promise<number | "ok"> {
  try {
    await p;
    return "ok";
  } catch (e) {
    const s = (e as { statusCode?: number }).statusCode;
    if (typeof s === "number") return s;
    throw e;
  }
}

describe("permissões do plugin admin para a coordenação (1.3, 6.1, 6.4)", () => {
  it("coordenação executa todas as operações de conta usadas pela feature", async () => {
    const coord = await criarCoordenacao();
    const h = coord.headers;

    const { user: novo } = await auth.api.createUser({
      headers: h,
      body: { email: "novo@exemplo.com", password: "senha-inicial-1", name: "Novo", role: "catequista" },
    });
    expect(novo.id).toBeTruthy();

    const alvos = [novo.id, (await criarCoordenacao("outra@exemplo.com")).id];

    for (const userId of alvos) {
      await auth.api.adminUpdateUser({
        headers: h,
        body: { userId, data: { name: "Renomeado", email: `ren-${userId.toLowerCase()}@exemplo.com` } },
      });
      const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      expect(u.name).toBe("Renomeado");
      expect(u.email).toBe(`ren-${userId.toLowerCase()}@exemplo.com`);

      await auth.api.setUserPassword({ headers: h, body: { userId, newPassword: "senha-nova-123" } });
      await entrarComo(u.email, "senha-nova-123");
      expect(await prisma.session.count({ where: { userId } })).toBeGreaterThan(0);

      await auth.api.revokeUserSessions({ headers: h, body: { userId } });
      expect(await prisma.session.count({ where: { userId } })).toBe(0);

      await auth.api.banUser({ headers: h, body: { userId, banReason: "teste" } });
      expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).banned).toBe(true);
      await auth.api.unbanUser({ headers: h, body: { userId } });
      expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).banned).toBe(false);
    }

    // Trocar papel nos dois sentidos.
    await auth.api.setRole({ headers: h, body: { userId: alvos[0], role: "coordenacao" } });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: alvos[0] } })).role).toBe("coordenacao");
    await auth.api.setRole({ headers: h, body: { userId: alvos[1], role: "catequista" } });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: alvos[1] } })).role).toBe("catequista");

    for (const userId of alvos) {
      await auth.api.removeUser({ headers: h, body: { userId } });
      expect(await prisma.user.findUnique({ where: { id: userId } })).toBeNull();
    }
  });

  it("catequista é recusado nas operações administrativas (403)", async () => {
    const cat = await criarCatequista();
    const outro = await criarCatequista();
    expect(await status(auth.api.banUser({ headers: cat.headers, body: { userId: outro.id } }))).toBe(403);
    expect(
      await status(
        auth.api.createUser({
          headers: cat.headers,
          body: { email: "x@exemplo.com", password: "senha-forte-123", name: "X", role: "catequista" },
        }),
      ),
    ).toBe(403);
    expect(await status(auth.api.removeUser({ headers: cat.headers, body: { userId: outro.id } }))).toBe(403);
  });
});

describe("helpers da equipe", () => {
  it("usarSessao faz o DAL enxergar o ator e capturarRedirect devolve a URL", async () => {
    const coord = await criarCoordenacao();
    usarSessao(coord);
    const s = await getSessao();
    expect(s?.userId).toBe(coord.id);
    expect(s?.papel).toBe("coordenacao");
    limparSessao();
    const { redirect } = await import("next/navigation");
    expect(await capturarRedirect(Promise.resolve().then(() => redirect("/x")))).toBe("/x");
  });
});
