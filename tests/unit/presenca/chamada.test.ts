import { describe, expect, it } from "vitest";
import type { DataCivil } from "@/modules/compartilhado/datas";
import {
  disponibilidadeDaChamada,
  inscritoNaData,
  lerMarcacoes,
  montarLinhas,
  podeGerenciarVisitantes,
  validarMarcacoes,
  type LinhaChamada,
} from "@/modules/presenca/domain/chamada";

const d = (s: string) => s as DataCivil;
const HOJE = d("2026-10-05");
const aberta = { encerrada: false };

describe("disponibilidadeDaChamada", () => {
  it("planejado com data até hoje é nova (2.1)", () => {
    expect(disponibilidadeDaChamada({ situacao: "planejado", data: HOJE }, aberta, HOJE)).toEqual({
      disponivel: true,
      modo: "nova",
    });
    expect(
      disponibilidadeDaChamada({ situacao: "planejado", data: d("2026-09-01") }, aberta, HOJE),
    ).toEqual({ disponivel: true, modo: "nova" });
  });

  it("realizado é correção (3.1)", () => {
    expect(
      disponibilidadeDaChamada({ situacao: "realizado", data: d("2026-09-01") }, aberta, HOJE),
    ).toEqual({ disponivel: true, modo: "correcao" });
  });

  it("recusa turma encerrada, cancelado e data futura com mensagem (2.5)", () => {
    const enc = disponibilidadeDaChamada(
      { situacao: "planejado", data: HOJE },
      { encerrada: true },
      HOJE,
    );
    expect(enc).toMatchObject({ disponivel: false, motivo: "turma-encerrada" });
    const canc = disponibilidadeDaChamada({ situacao: "cancelado", data: HOJE }, aberta, HOJE);
    expect(canc).toMatchObject({ disponivel: false, motivo: "cancelado" });
    const fut = disponibilidadeDaChamada(
      { situacao: "planejado", data: d("2026-10-06") },
      aberta,
      HOJE,
    );
    expect(fut).toMatchObject({ disponivel: false, motivo: "data-futura" });
    for (const r of [enc, canc, fut]) {
      expect(r.disponivel === false && r.mensagem.length > 0).toBe(true);
    }
  });

  it("respeita a precedência: turma encerrada, cancelado, data futura", () => {
    const futuro = d("2026-12-01");
    expect(
      disponibilidadeDaChamada({ situacao: "cancelado", data: futuro }, { encerrada: true }, HOJE),
    ).toMatchObject({ motivo: "turma-encerrada" });
    expect(
      disponibilidadeDaChamada({ situacao: "cancelado", data: futuro }, aberta, HOJE),
    ).toMatchObject({ motivo: "cancelado" });
    expect(
      disponibilidadeDaChamada({ situacao: "planejado", data: futuro }, aberta, HOJE),
    ).toMatchObject({ motivo: "data-futura" });
  });
});

describe("inscritoNaData", () => {
  const data = d("2026-10-05");
  it("entrada até a data e sem saída", () => {
    expect(inscritoNaData({ dataEntrada: d("2026-10-05"), dataSaida: null }, data)).toBe(true);
    expect(inscritoNaData({ dataEntrada: d("2026-10-06"), dataSaida: null }, data)).toBe(false);
  });

  it("saída é exclusiva (2.1)", () => {
    expect(inscritoNaData({ dataEntrada: d("2026-09-01"), dataSaida: d("2026-10-05") }, data)).toBe(
      false,
    );
    expect(inscritoNaData({ dataEntrada: d("2026-09-01"), dataSaida: d("2026-10-06") }, data)).toBe(
      true,
    );
  });

  it("transferência no mesmo dia: só a turma nova conta (3.3)", () => {
    const antiga = { dataEntrada: d("2026-09-01"), dataSaida: data };
    const nova = { dataEntrada: data, dataSaida: null };
    expect(inscritoNaData(antiga, data)).toBe(false);
    expect(inscritoNaData(nova, data)).toBe(true);
  });
});

describe("montarLinhas", () => {
  it("une elegíveis e registros, em ordem alfabética sem acento (3.1, 3.3)", () => {
    const linhas = montarLinhas(
      [
        { catequizandoId: "a", nome: "Zé" },
        { catequizandoId: "b", nome: "Ágata" },
        { catequizandoId: "c", nome: "Bruno" },
      ],
      [
        { catequizandoId: "b", nome: "Ágata", status: "justificado", visitante: false },
        { catequizandoId: "x", nome: "Carla", status: "presente", visitante: false },
      ],
    );
    expect(linhas).toEqual([
      { catequizandoId: "b", nome: "Ágata", status: "justificado" },
      { catequizandoId: "c", nome: "Bruno", status: null },
      { catequizandoId: "x", nome: "Carla", status: "presente" },
      { catequizandoId: "a", nome: "Zé", status: null },
    ]);
  });

  it("não inclui visitante, mesmo elegível (4.7)", () => {
    const linhas = montarLinhas(
      [{ catequizandoId: "a", nome: "Ana" }],
      [
        { catequizandoId: "a", nome: "Ana", status: "presente", visitante: true },
        { catequizandoId: "v", nome: "Vera", status: "presente", visitante: true },
      ],
    );
    expect(linhas).toEqual([]);
  });
});

describe("lerMarcacoes", () => {
  it("lê só status válidos dos ids informados; o resto é null (2.4)", () => {
    const dados = new FormData();
    dados.set("status:a", "presente");
    dados.set("status:b", "ausente");
    dados.set("status:c", "talvez");
    dados.set("status:fora", "presente");
    const lidas = lerMarcacoes(dados, ["a", "b", "c", "d"]);
    expect([...lidas.entries()]).toEqual([
      ["a", "presente"],
      ["b", "ausente"],
      ["c", null],
      ["d", null],
    ]);
  });

  it("ignora valor que não é texto", () => {
    const dados = new FormData();
    dados.set("status:a", new File(["x"], "x.txt"));
    expect(lerMarcacoes(dados, ["a"]).get("a")).toBeNull();
  });
});

describe("validarMarcacoes", () => {
  const linhas: LinhaChamada[] = [
    { catequizandoId: "a", nome: "Ana", status: null },
    { catequizandoId: "b", nome: "Bia", status: null },
  ];

  it("lista vazia não salva (2.6)", () => {
    expect(validarMarcacoes([], new Map())).toEqual({ ok: false, razao: "sem-inscritos" });
  });

  it("aponta os faltantes (2.4)", () => {
    const r = validarMarcacoes(
      linhas,
      new Map([
        ["a", "presente" as const],
        ["b", null],
      ]),
    );
    expect(r).toEqual({ ok: false, razao: "faltantes", faltantes: ["b"] });
  });

  it("ids desconhecidos são ignorados e válido devolve só as marcações das linhas", () => {
    const r = validarMarcacoes(
      linhas,
      new Map<string, "presente" | "ausente" | null>([
        ["a", "presente"],
        ["b", "ausente"],
        ["zzz", null],
      ]),
    );
    expect(r).toEqual({
      ok: true,
      marcacoes: new Map([
        ["a", "presente"],
        ["b", "ausente"],
      ]),
    });
  });
});

describe("podeGerenciarVisitantes", () => {
  const encontro = { temaId: "t1", situacao: "planejado" as const, data: HOJE };
  it("verdadeiro com tema, turma aberta e chamada disponível (4.1)", () => {
    expect(podeGerenciarVisitantes(encontro, aberta, HOJE)).toBe(true);
  });
  it("falso sem tema (4.4)", () => {
    expect(podeGerenciarVisitantes({ ...encontro, temaId: null }, aberta, HOJE)).toBe(false);
  });
  it("falso com turma encerrada", () => {
    expect(podeGerenciarVisitantes(encontro, { encerrada: true }, HOJE)).toBe(false);
  });
  it("falso sem chamada disponível", () => {
    expect(podeGerenciarVisitantes({ ...encontro, situacao: "cancelado" }, aberta, HOJE)).toBe(
      false,
    );
    expect(podeGerenciarVisitantes({ ...encontro, data: d("2026-10-06") }, aberta, HOJE)).toBe(
      false,
    );
  });
});
