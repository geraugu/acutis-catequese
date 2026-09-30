import { describe, expect, it } from "vitest";
import { chaveDuplicidade, encontrarDuplicado } from "@/modules/catequizandos/domain/duplicidade";
import type { DataCivil } from "@/modules/compartilhado/datas";

const d = (s: string) => s as DataCivil;
const existentes = [
  { id: "1", nome: "José da Silva", dataNascimento: d("2000-01-02") },
  { id: "2", nome: "Maria", dataNascimento: d("1999-05-05") },
];

describe("chaveDuplicidade", () => {
  it("ignora caixa, acento e espaços extras", () => {
    expect(chaveDuplicidade("  JOSE   da  silva ", d("2000-01-02"))).toBe(
      chaveDuplicidade("José da Silva", d("2000-01-02")),
    );
  });
  it("difere quando a data difere", () => {
    expect(chaveDuplicidade("Maria", d("2000-01-02"))).not.toBe(
      chaveDuplicidade("Maria", d("2000-01-03")),
    );
  });
});

describe("encontrarDuplicado", () => {
  it("encontra com nome normalizado e mesma data", () => {
    expect(encontrarDuplicado(existentes, "jose DA silva", d("2000-01-02"))?.id).toBe("1");
  });
  it("exige mesma data", () => {
    expect(encontrarDuplicado(existentes, "José da Silva", d("2000-01-03"))).toBeUndefined();
  });
  it("respeita ignorarId", () => {
    expect(encontrarDuplicado(existentes, "José da Silva", d("2000-01-02"), "1")).toBeUndefined();
  });
});
