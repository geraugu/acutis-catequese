import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import * as repositorio from "@/modules/equipe/repositorio";
import { criarMembroAction } from "@/modules/equipe/actions";
import { MSG_EMAIL_EM_USO } from "@/modules/equipe/mensagens";
import {
  capturarRedirect,
  criarCatequista,
  criarCoordenacao,
  entrarComo,
  form,
  limparSessao,
  usarSessao,
} from "./helpers";

vi.mock("next/headers", async () => (await import("./next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("./next-mocks")).nextNavigationMock);

const SENHA_INICIAL = "senha-inicial-9";

const campos = (extra: Record<string, string> = {}) => ({
  nome: "Maria da Silva",
  email: "  Maria.Silva@Exemplo.com ",
  telefone: "(11) 98765-4321",
  papel: "catequista",
  observacoes: "Turma de sábado",
  senha: SENHA_INICIAL,
  ...extra,
});

afterEach(() => {
  vi.restoreAllMocks();
  limparSessao();
});

describe("criarMembroAction (1.3, 2.1, 2.3, 2.4, 2.5, 2.7, 2.10)", () => {
  it("cria membro com papel e perfil, redireciona com aviso e o membro consegue logar", async () => {
    usarSessao(await criarCoordenacao());
    const url = await capturarRedirect(criarMembroAction({}, form(campos())));

    const u = await prisma.user.findUniqueOrThrow({
      where: { email: "maria.silva@exemplo.com" },
      include: { perfil: true },
    });
    expect(url).toBe(`/coordenacao/equipe/${u.id}?aviso=cadastrado`);
    expect(u.name).toBe("Maria da Silva");
    expect(u.role).toBe("catequista");
    expect(u.banned).not.toBe(true);
    expect(u.perfil?.telefone).toBe("11987654321");
    expect(u.perfil?.observacoes).toBe("Turma de sábado");
    await expect(entrarComo("maria.silva@exemplo.com", SENHA_INICIAL)).resolves.toBeTruthy();
  });

  it("recusa e-mail em uso com a mensagem certa, sem devolver a senha", async () => {
    const coord = await criarCoordenacao();
    await criarCatequista("maria.silva@exemplo.com");
    usarSessao(coord);
    const antes = await prisma.user.count();

    const estado = await criarMembroAction({}, form(campos()));

    expect(estado.errosCampos?.email).toBe(MSG_EMAIL_EM_USO);
    expect(estado.valores?.nome).toBe("Maria da Silva");
    expect(JSON.stringify(estado)).not.toContain(SENHA_INICIAL);
    expect(await prisma.user.count()).toBe(antes);
  });

  it("devolve erros por campo e valores preenchidos, nunca a senha", async () => {
    usarSessao(await criarCoordenacao());
    const estado = await criarMembroAction({}, form(campos({ nome: "", senha: "curta1" })));

    expect(estado.errosCampos?.nome).toBeTruthy();
    expect(estado.errosCampos?.senha).toBeTruthy();
    expect(estado.valores?.telefone).toBe("(11) 98765-4321");
    expect(estado.valores).not.toHaveProperty("senha");
    expect(JSON.stringify(estado)).not.toContain("curta1");
  });

  it("catequista é redirecionado para acesso negado sem gravar nada", async () => {
    usarSessao(await criarCatequista());
    const antes = await prisma.user.count();
    const url = await capturarRedirect(criarMembroAction({}, form(campos())));
    expect(url).toBe("/acesso-negado");
    expect(await prisma.user.count()).toBe(antes);
    expect(await prisma.perfilMembro.count()).toBe(0);
  });

  it("falha no perfil remove a conta criada (compensação) e não expõe a senha", async () => {
    usarSessao(await criarCoordenacao());
    vi.spyOn(repositorio, "salvarPerfil").mockRejectedValueOnce(new Error("falha simulada"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const estado = await criarMembroAction({}, form(campos()));

    expect(estado.erro).toBeTruthy();
    expect(JSON.stringify(estado)).not.toContain(SENHA_INICIAL);
    expect(await prisma.user.count({ where: { email: "maria.silva@exemplo.com" } })).toBe(0);
  });
});
