import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { hojeCivil } from "@/modules/compartilhado/datas";
import {
  editarMembroAction,
  inativarMembroAction,
  reativarMembroAction,
} from "@/modules/equipe/actions";
import {
  inativarCatequizandoAction,
  reativarCatequizandoAction,
} from "@/modules/catequizandos/actions";
import {
  capturarRedirect,
  criarCatequista,
  criarCoordenacao,
  form,
  limparSessao,
  usarSessao,
} from "../equipe/helpers";
import { criarCatequizandoDireto, criarTurmaDireta, dia, inscreverDireto } from "./helpers";

vi.mock("next/headers", async () => (await import("../equipe/next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("../equipe/next-mocks")).nextNavigationMock);

afterEach(() => {
  vi.restoreAllMocks();
  limparSessao();
});

const ANTIGA = new Date("2025-01-10T12:00:00Z");

async function designar(turmaId: string, userId: string, removidoEm: Date | null = null) {
  const d = await prisma.designacao.create({
    data: { turmaId, userId, removidoEm },
    select: { id: true },
  });
  return d.id;
}

const designacao = (id: string) => prisma.designacao.findUniqueOrThrow({ where: { id } });
const inscricao = (id: string) => prisma.inscricao.findUniqueOrThrow({ where: { id } });
const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

describe("triggers de inativação (4.6, 6.5)", () => {
  it("inativar um catequista remove as designações vigentes; reativar não restaura; encerradas intactas", async () => {
    const coord = await criarCoordenacao();
    const cat = await criarCatequista();
    const t1 = await criarTurmaDireta();
    const t2 = await criarTurmaDireta({ nome: "Turma B" });
    const t3 = await criarTurmaDireta({ nome: "Turma C" });
    const vig1 = await designar(t1, cat.id);
    const vig2 = await designar(t2, cat.id);
    const antiga = await designar(t3, cat.id, ANTIGA);
    usarSessao(coord);

    await capturarRedirect(inativarMembroAction(cat.id, {}));

    expect((await designacao(vig1)).removidoEm).not.toBeNull();
    expect((await designacao(vig2)).removidoEm).not.toBeNull();
    expect((await designacao(antiga)).removidoEm).toEqual(ANTIGA);

    await capturarRedirect(reativarMembroAction(cat.id, {}));

    expect(await prisma.designacao.count({ where: { userId: cat.id, removidoEm: null } })).toBe(0);
    expect((await designacao(antiga)).removidoEm).toEqual(ANTIGA);
  });

  it("mudar o papel de catequista para coordenação remove as designações vigentes", async () => {
    const coord = await criarCoordenacao();
    const cat = await criarCatequista();
    const t1 = await criarTurmaDireta();
    const t2 = await criarTurmaDireta({ nome: "Turma B" });
    const vig = await designar(t1, cat.id);
    const antiga = await designar(t2, cat.id, ANTIGA);
    usarSessao(coord);

    await capturarRedirect(
      editarMembroAction(
        cat.id,
        {},
        form({
          nome: cat.nome,
          email: cat.email,
          telefone: "(11) 91234-5678",
          papel: "coordenacao",
          observacoes: "",
        }),
      ),
    );

    expect((await prisma.user.findUniqueOrThrow({ where: { id: cat.id } })).role).toBe(
      "coordenacao",
    );
    expect((await designacao(vig)).removidoEm).not.toBeNull();
    expect((await designacao(antiga)).removidoEm).toEqual(ANTIGA);
  });

  it("inativar um catequizando encerra a inscrição vigente com motivo 'inativacao' e data de hoje em São Paulo; reativar não restaura", async () => {
    usarSessao(await criarCoordenacao());
    const c = await criarCatequizandoDireto("Ana");
    const t1 = await criarTurmaDireta({ ciclo: 2025 });
    const t2 = await criarTurmaDireta({ nome: "Turma B" });
    const encerrada = await inscreverDireto(t1, c, "2025-02-01", {
      data: "2025-11-30",
      motivo: "encerramento",
    });
    const vigente = await inscreverDireto(t2, c, "2026-02-01");

    await capturarRedirect(inativarCatequizandoAction(c, {}));

    const v = await inscricao(vigente);
    expect(ymd(v.dataSaida)).toBe(hojeCivil());
    expect(v.motivoSaida).toBe("inativacao");
    const e = await inscricao(encerrada);
    expect(e.dataSaida).toEqual(dia("2025-11-30"));
    expect(e.motivoSaida).toBe("encerramento");

    await capturarRedirect(reativarCatequizandoAction(c, {}));

    expect(await prisma.inscricao.count({ where: { catequizandoId: c, dataSaida: null } })).toBe(0);
    expect((await inscricao(vigente)).motivoSaida).toBe("inativacao");
  });
});
