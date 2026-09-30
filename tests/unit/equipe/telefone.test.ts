import { describe, expect, it } from "vitest";
import {
  formatarTelefone,
  linkLigacao,
  linkWhatsApp,
  normalizarTelefone,
  telefoneSchema,
} from "@/modules/equipe/domain/telefone";

describe("normalizarTelefone", () => {
  it("aceita celular com máscara", () => {
    expect(normalizarTelefone("(11) 98765-4321")).toBe("11987654321");
  });
  it("aceita fixo com máscara", () => {
    expect(normalizarTelefone("(11) 3333-4444")).toBe("1133334444");
  });
  it("aceita entrada sem máscara", () => {
    expect(normalizarTelefone("11987654321")).toBe("11987654321");
    expect(normalizarTelefone("1133334444")).toBe("1133334444");
  });
  it("remove um +55 inicial", () => {
    expect(normalizarTelefone("+55 (11) 98765-4321")).toBe("11987654321");
    expect(normalizarTelefone("+551133334444")).toBe("1133334444");
  });
  it("recusa telefone de 9 dígitos", () => {
    expect(normalizarTelefone("987654321")).toBeNull();
  });
  it("recusa telefone de 12 dígitos", () => {
    expect(normalizarTelefone("119876543210")).toBeNull();
    expect(normalizarTelefone("+55119876543210")).toBeNull();
  });
  it("recusa texto sem dígitos e vazio", () => {
    expect(normalizarTelefone("")).toBeNull();
    expect(normalizarTelefone("abc")).toBeNull();
  });
});

describe("formatarTelefone", () => {
  it("formata 11 dígitos", () => {
    expect(formatarTelefone("11987654321")).toBe("(11) 98765-4321");
  });
  it("formata 10 dígitos", () => {
    expect(formatarTelefone("1133334444")).toBe("(11) 3333-4444");
  });
});

describe("telefoneSchema", () => {
  it("devolve só dígitos quando válido", () => {
    expect(telefoneSchema.parse("+55 (11) 98765-4321")).toBe("11987654321");
  });
  it("recusa inválido com mensagem em pt-BR", () => {
    const r = telefoneSchema.safeParse("98765-432");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("Informe um telefone com DDD");
  });
});

describe("links", () => {
  it("gera link de ligação", () => {
    expect(linkLigacao("11987654321")).toBe("tel:+5511987654321");
  });
  it("gera link do WhatsApp", () => {
    expect(linkWhatsApp("11987654321")).toBe("https://wa.me/5511987654321");
  });
});
