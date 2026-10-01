import { describe, expect, it } from "vitest";
import {
  type DataCivil,
  calcularIdade,
  compararDatas,
  dataCivilSchema,
  formatarData,
  formatarDataComDia,
  hojeCivil,
} from "@/modules/compartilhado/datas";

const d = (texto: string): DataCivil => dataCivilSchema.parse(texto);

describe("dataCivilSchema", () => {
  it("aceita datas válidas, inclusive 29/02 em ano bissexto", () => {
    expect(dataCivilSchema.parse("2010-05-17")).toBe("2010-05-17");
    expect(dataCivilSchema.parse("2024-02-29")).toBe("2024-02-29");
  });

  it.each([
    "2025-02-30",
    "2023-02-29",
    "2025-13-01",
    "2025-04-31",
    "2025-00-10",
    "ontem",
    "",
    "17/05/2010",
    "2010-5-17",
  ])("recusa %j com a mensagem padrão", (texto) => {
    const r = dataCivilSchema.safeParse(texto);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("Informe uma data válida");
  });
});

describe("calcularIdade", () => {
  it("completa o ano no dia do aniversário", () => {
    expect(calcularIdade(d("2010-09-30"), d("2026-09-30"))).toBe(16);
  });
  it("aniversário ontem conta", () => {
    expect(calcularIdade(d("2010-09-29"), d("2026-09-30"))).toBe(16);
  });
  it("aniversário amanhã ainda não conta", () => {
    expect(calcularIdade(d("2010-10-01"), d("2026-09-30"))).toBe(15);
  });
  it("nascido em 29/02 completa em 01/03 no ano não bissexto", () => {
    expect(calcularIdade(d("2008-02-29"), d("2025-02-28"))).toBe(16);
    expect(calcularIdade(d("2008-02-29"), d("2025-03-01"))).toBe(17);
    expect(calcularIdade(d("2008-02-29"), d("2024-02-29"))).toBe(16);
  });
});

describe("compararDatas", () => {
  it("ordena datas civis", () => {
    expect(compararDatas(d("2025-01-01"), d("2025-01-02"))).toBeLessThan(0);
    expect(compararDatas(d("2025-01-02"), d("2025-01-01"))).toBeGreaterThan(0);
    expect(compararDatas(d("2025-01-01"), d("2025-01-01"))).toBe(0);
  });
});

describe("formatarData", () => {
  it("formata como dd/mm/aaaa", () => {
    expect(formatarData(d("2010-05-07"))).toBe("07/05/2010");
  });
});

describe("hojeCivil", () => {
  it("às 23h30 em São Paulo retorna o dia local, não o de UTC", () => {
    const agora = new Date("2026-10-01T02:30:00.000Z");
    expect(hojeCivil(agora)).toBe("2026-09-30");
  });
  it("aceita outro fuso", () => {
    expect(hojeCivil(new Date("2026-10-01T02:30:00.000Z"), "UTC")).toBe("2026-10-01");
  });
});

describe("formatarDataComDia", () => {
  it.each([
    ["2026-10-04", "Domingo, 04/10/2026"],
    ["2026-10-05", "Segunda-feira, 05/10/2026"],
    ["2026-10-06", "Terça-feira, 06/10/2026"],
    ["2026-10-07", "Quarta-feira, 07/10/2026"],
    ["2026-10-08", "Quinta-feira, 08/10/2026"],
    ["2026-10-09", "Sexta-feira, 09/10/2026"],
    ["2026-10-10", "Sábado, 10/10/2026"],
    ["2028-02-29", "Terça-feira, 29/02/2028"],
    ["2026-12-31", "Quinta-feira, 31/12/2026"],
    ["2027-01-01", "Sexta-feira, 01/01/2027"],
  ])("formata %s como %s", (texto, esperado) => {
    expect(formatarDataComDia(d(texto))).toBe(esperado);
  });
});
