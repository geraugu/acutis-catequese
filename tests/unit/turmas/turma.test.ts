import { describe, expect, it } from "vitest";
import {
  DIAS_SEMANA,
  ROTULO_DIA,
  criarTurmaSchema,
  estaLotada,
  formatarHorario,
  formatarOcupacao,
  ordenarTurmas,
} from "@/modules/turmas/domain/turma";

const schema = criarTurmaSchema({ anoAtual: 2026 });

const valido = {
  nome: "  Primeira Eucaristia A ",
  ciclo: "2026",
  diaSemana: "sabado",
  horario: "09:00",
  local: "",
  observacoes: "",
  vagas: "",
};

function mensagens(dados: Record<string, unknown>) {
  const r = schema.safeParse(dados);
  if (r.success) return {};
  return Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]));
}

describe("dias da semana", () => {
  it("rotula cada dia", () => {
    expect(DIAS_SEMANA).toHaveLength(7);
    expect(ROTULO_DIA.domingo).toBe("Domingo");
    expect(ROTULO_DIA.segunda).toBe("Segunda-feira");
    expect(ROTULO_DIA.sabado).toBe("Sábado");
  });
});

describe("criarTurmaSchema", () => {
  it("aceita dados válidos, normaliza e trata opcionais vazios como ausentes", () => {
    const r = schema.parse(valido);
    expect(r).toEqual({
      nome: "Primeira Eucaristia A",
      ciclo: 2026,
      diaSemana: "sabado",
      horario: "09:00",
      local: undefined,
      observacoes: undefined,
      vagas: undefined,
    });
  });

  it("aceita local, observações e vagas preenchidos", () => {
    const r = schema.parse({ ...valido, local: " Sala 2 ", observacoes: " x ", vagas: "20" });
    expect(r).toMatchObject({ local: "Sala 2", observacoes: "x", vagas: 20 });
  });

  it("aponta todos os obrigatórios vazios ao mesmo tempo", () => {
    expect(mensagens({ nome: "  ", ciclo: "", diaSemana: "", horario: "" })).toEqual({
      nome: "Informe o nome",
      ciclo: "Informe um ano entre 2000 e 2027",
      diaSemana: "Escolha o dia da semana",
      horario: "Informe um horário válido (ex.: 19:30)",
    });
  });

  it("recusa nome com 1 ou mais de 80 caracteres", () => {
    expect(mensagens({ ...valido, nome: "A" }).nome).toBeDefined();
    expect(mensagens({ ...valido, nome: "A".repeat(81) }).nome).toBeDefined();
    expect(schema.safeParse({ ...valido, nome: "AB" }).success).toBe(true);
  });

  it.each([
    ["1999", false],
    ["2000", true],
    ["2027", true],
    ["2028", false],
    ["2026.5", false],
  ])("ciclo %s → válido=%s", (ciclo, ok) => {
    const r = schema.safeParse({ ...valido, ciclo });
    expect(r.success).toBe(ok);
    if (!ok) expect(mensagens({ ...valido, ciclo }).ciclo).toBe("Informe um ano entre 2000 e 2027");
  });

  it.each([
    ["7:30", false],
    ["24:00", false],
    ["12:60", false],
    ["07:30", true],
    ["00:00", true],
    ["23:59", true],
  ])("horário %s → válido=%s", (horario, ok) => {
    expect(schema.safeParse({ ...valido, horario }).success).toBe(ok);
  });

  it("recusa dia inválido", () => {
    expect(mensagens({ ...valido, diaSemana: "feriado" }).diaSemana).toBe(
      "Escolha o dia da semana",
    );
  });

  it.each(["0", "501", "2,5", "2.5", "abc"])("recusa vagas %s", (vagas) => {
    expect(mensagens({ ...valido, vagas }).vagas).toBe(
      "Informe um número de vagas entre 1 e 500, ou deixe em branco",
    );
  });

  it("aceita vagas 1 e 500 e vazio como sem limite", () => {
    expect(schema.parse({ ...valido, vagas: "1" }).vagas).toBe(1);
    expect(schema.parse({ ...valido, vagas: "500" }).vagas).toBe(500);
    expect(schema.parse({ ...valido, vagas: "  " }).vagas).toBeUndefined();
    expect(schema.parse({ ...valido, vagas: undefined }).vagas).toBeUndefined();
  });

  it("recusa local e observações longos", () => {
    expect(mensagens({ ...valido, local: "x".repeat(121) }).local).toBeDefined();
    expect(mensagens({ ...valido, observacoes: "x".repeat(1001) }).observacoes).toBeDefined();
  });
});

describe("lotação", () => {
  it("estaLotada só com vagas definidas", () => {
    expect(estaLotada(30, null)).toBe(false);
    expect(estaLotada(19, 20)).toBe(false);
    expect(estaLotada(20, 20)).toBe(true);
    expect(estaLotada(21, 20)).toBe(true);
  });

  it("formata a ocupação", () => {
    expect(formatarOcupacao(12, 20)).toBe("12 de 20 vagas");
  });
});

describe("formatarHorario", () => {
  it("mantém HH:MM", () => {
    expect(formatarHorario("19:30")).toBe("19:30");
    expect(formatarHorario("19:30:00")).toBe("19:30");
  });
});

describe("ordenarTurmas", () => {
  it("ordena por dia, horário e nome sem alterar a original", () => {
    const turmas = [
      { nome: "B", diaSemana: "sabado" as const, horario: "09:00" },
      { nome: "A", diaSemana: "sabado" as const, horario: "09:00" },
      { nome: "C", diaSemana: "domingo" as const, horario: "10:00" },
      { nome: "D", diaSemana: "sabado" as const, horario: "08:00" },
      { nome: "E", diaSemana: "segunda" as const, horario: "19:30" },
    ];
    const copia = [...turmas];
    expect(ordenarTurmas(turmas).map((t) => t.nome)).toEqual(["C", "E", "D", "A", "B"]);
    expect(turmas).toEqual(copia);
  });
});
