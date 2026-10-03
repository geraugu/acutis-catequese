import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

const SEGREDO = "s".repeat(40);
vi.mock("@/lib/env", () => ({ env: { AUTOCADASTRO_SEGREDO: "s".repeat(40) } }));

import { gerarToken, hashOrigem } from "@/modules/autocadastro/token";

describe("gerarToken", () => {
  it("gera 32 bytes em base64url (43 caracteres)", () => {
    const token = gerarToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
  });

  it("gera tokens diferentes a cada chamada", () => {
    const tokens = new Set(Array.from({ length: 50 }, gerarToken));
    expect(tokens.size).toBe(50);
  });
});

describe("hashOrigem", () => {
  it("calcula o HMAC-SHA256 do IP com o segredo, em hex", () => {
    const esperado = createHmac("sha256", SEGREDO).update("203.0.113.7").digest("hex");
    expect(hashOrigem("203.0.113.7")).toBe(esperado);
  });

  it("não expõe o IP e é determinístico", () => {
    const hash = hashOrigem("203.0.113.7");
    expect(hash).not.toContain("203.0.113.7");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashOrigem("203.0.113.7")).toBe(hash);
    expect(hashOrigem("203.0.113.8")).not.toBe(hash);
  });
});
