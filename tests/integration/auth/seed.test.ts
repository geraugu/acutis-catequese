import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { semearCoordenacao } from "@/modules/auth/seed-coordenacao";

const fonteValida = {
  SEED_COORDENACAO_EMAIL: "coord@exemplo.org",
  SEED_COORDENACAO_SENHA: "senha-forte-1",
  SEED_COORDENACAO_NOME: "Coordenação",
};

async function hashDaSenha() {
  const conta = await prisma.account.findFirstOrThrow({ where: { providerId: "credential" } });
  return conta.password;
}

describe("semearCoordenacao", () => {
  it("rodar duas vezes resulta em uma única conta de coordenação, sem alterar a senha (1.4, 1.5)", async () => {
    expect(await semearCoordenacao(fonteValida)).toBe("criada");
    const hash = await hashDaSenha();
    expect(hash).toBeTruthy();
    expect(hash).not.toBe(fonteValida.SEED_COORDENACAO_SENHA);

    expect(
      await semearCoordenacao({ ...fonteValida, SEED_COORDENACAO_SENHA: "outra-senha-9" }),
    ).toBe("ja-existia");

    const usuarios = await prisma.user.findMany();
    expect(usuarios).toHaveLength(1);
    expect(usuarios[0]).toMatchObject({ email: "coord@exemplo.org", role: "coordenacao" });
    expect(await hashDaSenha()).toBe(hash);
  });

  it("senha de 7 caracteres faz o seed falhar sem criar conta (7.2)", async () => {
    await expect(
      semearCoordenacao({ ...fonteValida, SEED_COORDENACAO_SENHA: "1234567" }),
    ).rejects.toThrow(/mínimo 8/);
    expect(await prisma.user.count()).toBe(0);
  });

  it("falha nomeando a variável ausente", async () => {
    const semEmail = { ...fonteValida, SEED_COORDENACAO_EMAIL: undefined };
    await expect(semearCoordenacao(semEmail)).rejects.toThrow(/SEED_COORDENACAO_EMAIL/);
    expect(await prisma.user.count()).toBe(0);
  });

  it("normaliza o e-mail", async () => {
    await semearCoordenacao({ ...fonteValida, SEED_COORDENACAO_EMAIL: "  Coord@X.org " });
    expect(await semearCoordenacao({ ...fonteValida, SEED_COORDENACAO_EMAIL: "coord@x.org" })).toBe(
      "ja-existia",
    );
    const usuario = await prisma.user.findFirstOrThrow();
    expect(usuario.email).toBe("coord@x.org");
  });
});
