import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getSessao } from "@/modules/auth/dal";
import { editarMembroAction } from "@/modules/equipe/actions";
import { MENSAGEM_VIOLACAO, MSG_EMAIL_EM_USO } from "@/modules/equipe/mensagens";
import {
  capturarRedirect,
  criarCatequista,
  criarCoordenacao,
  entrarComo,
  form,
  limparSessao,
  SENHA_TESTE,
  usarSessao,
} from "./helpers";

vi.mock("next/headers", async () => (await import("./next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("./next-mocks")).nextNavigationMock);

const campos = (extra: Record<string, string> = {}) => ({
  nome: "Maria Editada",
  email: " Nova.Maria@Exemplo.com ",
  telefone: "(11) 91234-5678",
  papel: "catequista",
  observacoes: "Turma de domingo",
  ...extra,
});

afterEach(() => {
  vi.restoreAllMocks();
  limparSessao();
});

describe("editarMembroAction (1.3, 4.1–4.5, 7.2, 7.3)", () => {
  it("salva nome, e-mail e perfil e redireciona com 'alteracoes-salvas'; novo e-mail loga, antigo não", async () => {
    const coord = await criarCoordenacao();
    const alvo = await criarCatequista("maria@exemplo.com");
    usarSessao(coord);

    const url = await capturarRedirect(editarMembroAction(alvo.id, {}, form(campos())));

    expect(url).toBe(`/coordenacao/equipe/${alvo.id}?aviso=alteracoes-salvas`);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: alvo.id }, include: { perfil: true } });
    expect(u.name).toBe("Maria Editada");
    expect(u.email).toBe("nova.maria@exemplo.com");
    expect(u.perfil?.telefone).toBe("11912345678");
    expect(u.perfil?.observacoes).toBe("Turma de domingo");
    await expect(entrarComo("nova.maria@exemplo.com", SENHA_TESTE)).resolves.toBeTruthy();
    await expect(entrarComo("maria@exemplo.com", SENHA_TESTE)).rejects.toThrow();
  });

  it("recusa e-mail de outro membro como mensagem geral, sem gravar", async () => {
    const coord = await criarCoordenacao();
    const alvo = await criarCatequista("alvo@exemplo.com", "Original");
    await criarCatequista("outro@exemplo.com");
    usarSessao(coord);

    const estado = await editarMembroAction(alvo.id, {}, form(campos({ email: "Outro@Exemplo.com" })));

    expect(estado.erro).toBe(MSG_EMAIL_EM_USO);
    expect(estado.valores?.nome).toBe("Maria Editada");
    const u = await prisma.user.findUniqueOrThrow({ where: { id: alvo.id }, include: { perfil: true } });
    expect(u.name).toBe("Original");
    expect(u.email).toBe("alvo@exemplo.com");
    expect(u.perfil).toBeNull();
  });

  it("manter o próprio e-mail não é conflito", async () => {
    const coord = await criarCoordenacao();
    const alvo = await criarCatequista("alvo@exemplo.com");
    usarSessao(coord);
    const url = await capturarRedirect(
      editarMembroAction(alvo.id, {}, form(campos({ email: "ALVO@exemplo.com" }))),
    );
    expect(url).toBe(`/coordenacao/equipe/${alvo.id}?aviso=alteracoes-salvas`);
  });

  it("papel alterado vale na próxima leitura de sessão do membro", async () => {
    const coord = await criarCoordenacao();
    const alvo = await criarCatequista("alvo@exemplo.com");
    usarSessao(coord);

    await capturarRedirect(
      editarMembroAction(alvo.id, {}, form(campos({ email: "alvo@exemplo.com", papel: "coordenacao" }))),
    );

    usarSessao(alvo);
    expect((await getSessao())?.papel).toBe("coordenacao");
  });

  it("a última coordenação não consegue se rebaixar e nada muda no banco", async () => {
    const coord = await criarCoordenacao("coord@exemplo.com", "Coord Original");
    usarSessao(coord);

    const estado = await editarMembroAction(
      coord.id,
      {},
      form(campos({ email: "coord@exemplo.com", papel: "catequista" })),
    );

    expect(estado.erro).toBe(MENSAGEM_VIOLACAO["proprio-papel"]);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: coord.id }, include: { perfil: true } });
    expect(u.role).toBe("coordenacao");
    expect(u.name).toBe("Coord Original");
    expect(u.perfil).toBeNull();
  });

  it("rebaixar outra coordenação é permitido quando resta uma ativa", async () => {
    const ativa = await criarCoordenacao("ativa@exemplo.com");
    const outra = await criarCoordenacao("outra@exemplo.com");
    usarSessao(ativa);
    const url = await capturarRedirect(
      editarMembroAction(outra.id, {}, form(campos({ email: "outra@exemplo.com", papel: "catequista" }))),
    );
    expect(url).toContain("alteracoes-salvas");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: outra.id } })).role).toBe("catequista");
  });

  it("catequista é redirecionado para acesso negado sem gravar", async () => {
    const cat = await criarCatequista("cat@exemplo.com", "Cat");
    usarSessao(cat);
    const url = await capturarRedirect(editarMembroAction(cat.id, {}, form(campos())));
    expect(url).toBe("/acesso-negado");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: cat.id } })).name).toBe("Cat");
  });

  it("devolve erros por campo para dados inválidos", async () => {
    const coord = await criarCoordenacao();
    const alvo = await criarCatequista();
    usarSessao(coord);
    const estado = await editarMembroAction(alvo.id, {}, form(campos({ nome: "", email: "x" })));
    expect(estado.errosCampos?.nome).toBeTruthy();
    expect(estado.errosCampos?.email).toBeTruthy();
  });
});
