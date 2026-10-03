import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { enviarFichaAction, type EstadoEnvio } from "@/modules/autocadastro/actions-publicas";
import { criarLink } from "@/modules/autocadastro/repositorio";
import { POLITICA_LIMITES } from "@/modules/autocadastro/domain/limites";
import { VERSAO_CONSENTIMENTO } from "@/modules/autocadastro/domain/consentimento";
import { MSG_CONSENTIMENTO } from "@/modules/autocadastro/mensagens";
import { camposFicha, form } from "../catequizandos/helpers";
import { criarTurmaDireta, criarUsuarioDireto } from "../turmas/helpers";

const cabecalhos = vi.hoisted(() => ({ ip: null as string | null }));

vi.mock("next/headers", () => ({
  headers: async () => {
    const h = new Headers();
    if (cabecalhos.ip) h.set("x-forwarded-for", `${cabecalhos.ip}, 10.0.0.1`);
    return h;
  },
}));

afterEach(() => {
  cabecalhos.ip = null;
  vi.restoreAllMocks();
});

const INICIAL: EstadoEnvio = { tipo: "inicial" };
let seq = 0;

async function cenario(extra: { encerradaEm?: string } = {}) {
  const turmaId = await criarTurmaDireta({ nome: `Turma envio ${++seq}`, ...extra });
  const userId = await criarUsuarioDireto(`Coord ${++seq}`, { role: "coordenacao" });
  const token = randomBytes(32).toString("base64url");
  await criarLink(turmaId, token, userId);
  return { turmaId, token };
}

const fichaValida = (extra: Record<string, string> = {}) =>
  form(camposFicha({ consentimento: "on", ...extra }));

const pendentes = (turmaId: string) => prisma.fichaAutocadastro.count({ where: { turmaId } });

describe("enviarFichaAction (2.2, 3.x, 4.x)", () => {
  it("grava a ficha pendente com consentimento e devolve recebida sem dados", async () => {
    cabecalhos.ip = "203.0.113.1";
    const { turmaId, token } = await cenario();
    const r = await enviarFichaAction(token, INICIAL, fichaValida());
    expect(r).toEqual({ tipo: "recebida" });
    const f = await prisma.fichaAutocadastro.findFirstOrThrow({
      where: { turmaId },
      include: { catequizando: true },
    });
    expect(f.versaoConsentimento).toBe(VERSAO_CONSENTIMENTO);
    expect(f.catequizando.estado).toBe("pendente");
    expect(f.catequizando.nome).toBe("Maria Souza");
  });

  it("link desativado, expirado, de turma encerrada ou inexistente dão a mesma resposta", async () => {
    const desativado = await cenario();
    await prisma.linkAutocadastro.updateMany({
      where: { token: desativado.token },
      data: { desativadoEm: new Date() },
    });
    const expirado = await cenario();
    await prisma.linkAutocadastro.updateMany({
      where: { token: expirado.token },
      data: { expiraEm: new Date("2020-01-01T00:00:00Z") },
    });
    const encerrada = await cenario({ encerradaEm: "2025-12-01" });

    const respostas = await Promise.all(
      [desativado.token, expirado.token, encerrada.token, "nao-existe", "A".repeat(43)].map((t) =>
        enviarFichaAction(t, INICIAL, fichaValida()),
      ),
    );
    for (const r of respostas) expect(r).toEqual({ tipo: "indisponivel" });
    for (const c of [desativado, expirado, encerrada]) expect(await pendentes(c.turmaId)).toBe(0);
  });

  it("não grava ficha sem consentimento", async () => {
    const { turmaId, token } = await cenario();
    const r = await enviarFichaAction(token, INICIAL, form(camposFicha()));
    expect(r).toMatchObject({ tipo: "invalido", erroConsentimento: MSG_CONSENTIMENTO });
    expect(await pendentes(turmaId)).toBe(0);
  });

  it("campos inválidos devolvem erros por campo e mantêm os valores", async () => {
    const { turmaId, token } = await cenario();
    const r = await enviarFichaAction(token, INICIAL, fichaValida({ nome: "", telefone: "abc" }));
    expect(r.tipo).toBe("invalido");
    if (r.tipo !== "invalido") return;
    expect(r.errosCampos.nome).toBeTruthy();
    expect(r.errosCampos.telefone).toBeTruthy();
    expect(r.valores).toMatchObject({ telefone: "abc", email: "maria@exemplo.com" });
    expect(r.erroConsentimento).toBeUndefined();
    expect(await pendentes(turmaId)).toBe(0);
  });

  it("e-mail já cadastrado devolve recebida, sem revelar a coincidência", async () => {
    const { turmaId, token } = await cenario();
    cabecalhos.ip = "203.0.113.2";
    expect(await enviarFichaAction(token, INICIAL, fichaValida())).toEqual({ tipo: "recebida" });
    cabecalhos.ip = "203.0.113.3";
    expect(await enviarFichaAction(token, INICIAL, fichaValida())).toEqual({ tipo: "recebida" });
    expect(await pendentes(turmaId)).toBe(2);
  });

  it("recusa o sexto envio da mesma origem sem gravar nada", async () => {
    const { turmaId, token } = await cenario();
    cabecalhos.ip = "198.51.100.7";
    for (let i = 0; i < POLITICA_LIMITES.origem.maximo; i++) {
      expect(await enviarFichaAction(token, INICIAL, fichaValida())).toEqual({ tipo: "recebida" });
    }
    const r = await enviarFichaAction(token, INICIAL, fichaValida());
    expect(r).toEqual({ tipo: "limite" });
    expect(await pendentes(turmaId)).toBe(POLITICA_LIMITES.origem.maximo);
  });

  it("sem x-forwarded-for, aplica só o limite por link", async () => {
    const { turmaId, token } = await cenario();
    for (let i = 0; i <= POLITICA_LIMITES.origem.maximo; i++) {
      expect(await enviarFichaAction(token, INICIAL, fichaValida())).toEqual({ tipo: "recebida" });
    }
    expect(await pendentes(turmaId)).toBe(POLITICA_LIMITES.origem.maximo + 1);
  });

  it("erro inesperado vira indisponível e o log não traz dados pessoais", async () => {
    cabecalhos.ip = "192.0.2.55";
    const { token } = await cenario();
    vi.spyOn(prisma.catequizando, "create").mockRejectedValueOnce(
      new Error("falha maria@exemplo.com"),
    );
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await enviarFichaAction(token, INICIAL, fichaValida());
    expect(r).toEqual({ tipo: "indisponivel" });
    const registrado = JSON.stringify(log.mock.calls);
    expect(registrado).not.toContain("maria@exemplo.com");
    expect(registrado).not.toContain("192.0.2.55");
    expect(registrado).not.toContain("Maria Souza");
  });
});
