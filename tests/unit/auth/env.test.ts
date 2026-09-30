import { describe, expect, it } from "vitest";
import { carregarEnv } from "@/lib/env";

const valido = {
  DATABASE_URL: "postgresql://acutis:acutis@localhost:5432/acutis_dev",
  BETTER_AUTH_SECRET: "a".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
} as unknown as NodeJS.ProcessEnv;

describe("carregarEnv", () => {
  it("retorna as variáveis válidas com AUTH_RATE_LIMIT padrão 'on'", () => {
    const env = carregarEnv(valido);
    expect(env.DATABASE_URL).toBe(valido.DATABASE_URL);
    expect(env.AUTH_RATE_LIMIT).toBe("on");
  });

  it("falha citando DATABASE_URL quando a URL do banco está ausente", () => {
    const semBanco = { ...valido };
    delete semBanco.DATABASE_URL;
    expect(() => carregarEnv(semBanco)).toThrow(
      /Variável de ambiente ausente ou inválida: DATABASE_URL/,
    );
  });

  it("falha citando BETTER_AUTH_SECRET quando o segredo tem menos de 32 caracteres", () => {
    expect(() => carregarEnv({ ...valido, BETTER_AUTH_SECRET: "curto" })).toThrow(
      /BETTER_AUTH_SECRET/,
    );
  });

  it("falha citando AUTH_RATE_LIMIT quando o valor é inválido", () => {
    expect(() => carregarEnv({ ...valido, AUTH_RATE_LIMIT: "talvez" })).toThrow(/AUTH_RATE_LIMIT/);
  });
});
