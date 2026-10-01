import { describe, expect, it } from "vitest";
import type { DataCivil } from "@/modules/compartilhado/datas";
import {
  ROTULO_SITUACAO,
  SITUACOES,
  type SituacaoEncontro,
  TRANSICOES,
  aguardandoConfirmacao,
  baseValida,
  criarEncontroSchema,
  motivoSchema,
  ordenarEncontros,
  podeEditar,
  proximoEncontro,
  validarRealizacao,
} from "@/modules/programa/domain/encontro";

const d = (texto: string) => texto as DataCivil;
const UUID = "3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e";

function mensagens(entrada: unknown): string[] {
  const resultado = criarEncontroSchema().safeParse(entrada);
  return resultado.success ? [] : resultado.error.issues.map((issue) => issue.message);
}

describe("situações", () => {
  it("tem os rótulos das três situações", () => {
    expect(SITUACOES).toEqual(["planejado", "realizado", "cancelado"]);
    expect(ROTULO_SITUACAO).toEqual({
      planejado: "Planejado",
      realizado: "Realizado",
      cancelado: "Cancelado",
    });
  });
});

describe("criarEncontroSchema", () => {
  it("aceita dados válidos e transforma vazios em undefined", () => {
    expect(
      criarEncontroSchema().parse({
        data: "2026-10-05",
        horario: "07:30",
        temaId: "",
        observacoes: "  ",
      }),
    ).toEqual({ data: "2026-10-05", horario: "07:30", temaId: undefined, observacoes: undefined });
  });

  it("aceita temaId UUID e observações com trim", () => {
    expect(
      criarEncontroSchema().parse({
        data: "2026-10-05",
        horario: "23:59",
        temaId: UUID,
        observacoes: " Trazer a Bíblia ",
      }),
    ).toEqual({
      data: "2026-10-05",
      horario: "23:59",
      temaId: UUID,
      observacoes: "Trazer a Bíblia",
    });
  });

  it("exige a data", () => {
    expect(mensagens({ data: "", horario: "19:30" })).toEqual(["Informe a data"]);
    expect(mensagens({ horario: "19:30" })).toEqual(["Informe a data"]);
  });

  it("recusa horários fora do formato HH:MM ou fora do dia", () => {
    for (const horario of ["7:30", "24:00", "", "19:60"]) {
      expect(mensagens({ data: "2026-10-05", horario })).toEqual([
        "Informe um horário válido (ex.: 19:30)",
      ]);
    }
  });

  it("recusa temaId inválido", () => {
    expect(mensagens({ data: "2026-10-05", horario: "19:30", temaId: "abc" })).toEqual([
      "Escolha um tema ativo do programa.",
    ]);
  });

  it("recusa observações longas e aponta todos os erros de uma vez", () => {
    expect(mensagens({ data: "", horario: "x", observacoes: "a".repeat(2001) })).toEqual([
      "Informe a data",
      "Informe um horário válido (ex.: 19:30)",
      "As observações devem ter no máximo 2000 caracteres",
    ]);
    expect(
      mensagens({ data: "2026-10-05", horario: "19:30", observacoes: "a".repeat(2000) }),
    ).toEqual([]);
  });
});

describe("motivoSchema", () => {
  it("faz trim e transforma vazio em undefined", () => {
    expect(motivoSchema.parse("  Chuva ")).toBe("Chuva");
    expect(motivoSchema.parse("   ")).toBeUndefined();
    expect(motivoSchema.parse(undefined)).toBeUndefined();
  });

  it("recusa motivo com mais de 200 caracteres", () => {
    const r = motivoSchema.safeParse("a".repeat(201));
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("O motivo deve ter no máximo 200 caracteres");
    expect(motivoSchema.parse("a".repeat(200))).toHaveLength(200);
  });
});

describe("TRANSICOES", () => {
  it("define realizar, cancelar e reabrir", () => {
    expect(TRANSICOES.realizar).toEqual({ de: ["planejado"], para: "realizado" });
    expect(TRANSICOES.cancelar).toEqual({ de: ["planejado"], para: "cancelado" });
    expect(TRANSICOES.reabrir).toEqual({ de: ["realizado", "cancelado"], para: "planejado" });
  });
});

describe("podeEditar", () => {
  it("só permite editar encontro planejado", () => {
    expect(podeEditar({ situacao: "planejado" })).toBe(true);
    expect(podeEditar({ situacao: "realizado" })).toBe(false);
    expect(podeEditar({ situacao: "cancelado" })).toBe(false);
  });
});

describe("validarRealizacao", () => {
  const hoje = d("2026-10-01");
  it("recusa data futura e aceita hoje e passado", () => {
    expect(validarRealizacao(d("2026-10-02"), hoje)).toBe("Este encontro ainda não aconteceu.");
    expect(validarRealizacao(hoje, hoje)).toBeNull();
    expect(validarRealizacao(d("2026-09-30"), hoje)).toBeNull();
  });
});

describe("aguardandoConfirmacao", () => {
  const hoje = d("2026-10-01");
  it("só para planejado com data anterior a hoje", () => {
    expect(aguardandoConfirmacao({ situacao: "planejado", data: d("2026-09-30") }, hoje)).toBe(
      true,
    );
    expect(aguardandoConfirmacao({ situacao: "planejado", data: hoje }, hoje)).toBe(false);
    expect(aguardandoConfirmacao({ situacao: "planejado", data: d("2026-10-02") }, hoje)).toBe(
      false,
    );
    expect(aguardandoConfirmacao({ situacao: "realizado", data: d("2026-09-30") }, hoje)).toBe(
      false,
    );
    expect(aguardandoConfirmacao({ situacao: "cancelado", data: d("2026-09-30") }, hoje)).toBe(
      false,
    );
  });
});

type E = { id: string; situacao: SituacaoEncontro; data: DataCivil; horario: string };
const e = (id: string, situacao: SituacaoEncontro, data: string, horario: string): E => ({
  id,
  situacao,
  data: d(data),
  horario,
});

describe("ordenarEncontros", () => {
  it("ordena por data e horário sem alterar a lista original", () => {
    const lista = [
      e("c", "planejado", "2026-10-05", "19:30"),
      e("a", "planejado", "2026-10-01", "20:00"),
      e("b", "planejado", "2026-10-05", "08:00"),
    ];
    expect(ordenarEncontros(lista).map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(lista.map((x) => x.id)).toEqual(["c", "a", "b"]);
  });
});

describe("proximoEncontro", () => {
  const hoje = d("2026-10-01");
  it("ignora cancelados, realizados e datas passadas e desempata pelo horário", () => {
    const lista = [
      e("passado", "planejado", "2026-09-30", "08:00"),
      e("cancelado", "cancelado", "2026-10-01", "07:00"),
      e("realizado", "realizado", "2026-10-01", "07:30"),
      e("tarde", "planejado", "2026-10-01", "19:30"),
      e("cedo", "planejado", "2026-10-01", "08:00"),
      e("depois", "planejado", "2026-10-08", "08:00"),
    ];
    expect(proximoEncontro(lista, hoje)?.id).toBe("cedo");
  });

  it("devolve null quando não há planejado futuro", () => {
    expect(proximoEncontro([e("x", "realizado", "2026-10-10", "08:00")], hoje)).toBeNull();
    expect(proximoEncontro([], hoje)).toBeNull();
  });
});

describe("baseValida", () => {
  const t = "11111111-1111-4111-8111-111111111111";
  it("aceita a base do catequista", () => {
    expect(baseValida(`/catequista/turmas/${t}/encontros`, t)).toBe(
      `/catequista/turmas/${t}/encontros`,
    );
  });
  it("aceita a base da coordenação", () => {
    expect(baseValida(`/coordenacao/turmas/${t}/encontros`, t)).toBe(
      `/coordenacao/turmas/${t}/encontros`,
    );
  });
  it("base arbitrária vira a base da coordenação", () => {
    expect(baseValida("https://mal.example", t)).toBe(`/coordenacao/turmas/${t}/encontros`);
    expect(baseValida("/catequista/turmas/outra/encontros", t)).toBe(
      `/coordenacao/turmas/${t}/encontros`,
    );
  });
});
