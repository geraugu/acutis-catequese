import { describe, expect, it } from "vitest";
import type { DataCivil } from "@/modules/compartilhado/datas";
import {
  MOTIVOS_SAIDA,
  ROTULO_MOTIVO,
  validarDataEntrada,
  validarDataSaida,
} from "@/modules/turmas/domain/inscricao";

const d = (t: string) => t as DataCivil;
const HOJE = d("2026-09-30");
const NASCIMENTO = d("2015-03-10");

describe("motivos de saída", () => {
  it("lista os quatro motivos com rótulos em pt-BR", () => {
    expect(MOTIVOS_SAIDA).toEqual(["desligamento", "transferencia", "encerramento", "inativacao"]);
    expect(ROTULO_MOTIVO.desligamento).toBe("Desligamento");
    expect(ROTULO_MOTIVO.transferencia).toBe("Transferência");
    expect(ROTULO_MOTIVO.encerramento).toBe("Encerramento da turma");
    expect(ROTULO_MOTIVO.inativacao).toBe("Inativação");
  });
});

describe("validarDataEntrada", () => {
  it("recusa entrada futura", () => {
    expect(validarDataEntrada(d("2026-10-01"), NASCIMENTO, HOJE)).toBe("Data inválida");
  });
  it("recusa entrada anterior ao nascimento", () => {
    expect(validarDataEntrada(d("2015-03-09"), NASCIMENTO, HOJE)).toBe("Data inválida");
  });
  it("aceita entrada igual ao nascimento e igual a hoje", () => {
    expect(validarDataEntrada(NASCIMENTO, NASCIMENTO, HOJE)).toBeNull();
    expect(validarDataEntrada(HOJE, NASCIMENTO, HOJE)).toBeNull();
    expect(validarDataEntrada(d("2026-02-01"), NASCIMENTO, HOJE)).toBeNull();
  });
});

describe("validarDataSaida", () => {
  const ENTRADA = d("2026-02-01");
  it("recusa saída futura", () => {
    expect(validarDataSaida(d("2026-10-01"), ENTRADA, HOJE)).toBe("Data inválida");
  });
  it("recusa saída anterior à entrada", () => {
    expect(validarDataSaida(d("2026-01-31"), ENTRADA, HOJE)).toBe("Data inválida");
  });
  it("aceita saída igual à entrada e igual a hoje", () => {
    expect(validarDataSaida(ENTRADA, ENTRADA, HOJE)).toBeNull();
    expect(validarDataSaida(HOJE, ENTRADA, HOJE)).toBeNull();
  });
});
