import { describe, expect, it } from "vitest";
import { senhaSchema } from "@/modules/auth/domain/senha";
import { loginSchema, normalizarEmail } from "@/modules/auth/domain/credenciais";
import { sanitizarCallbackUrl } from "@/modules/auth/domain/callback-url";

const erros = (r: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) => Object.fromEntries((r.error?.issues ?? []).map((i) => [String(i.path[0]), i.message]));

describe("senhaSchema", () => {
  it("recusa 7 caracteres com mensagem em pt-BR", () => {
    const r = senhaSchema.safeParse("1234567");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("A senha deve ter no mínimo 8 caracteres");
  });
  it("aceita 8 caracteres", () => {
    expect(senhaSchema.safeParse("12345678").success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("normaliza o e-mail", () => {
    const r = loginSchema.safeParse({ email: "  Maria@Paroquia.org ", senha: "x" });
    expect(r.success && r.data.email).toBe("maria@paroquia.org");
  });
  it("mensagens por campo para campos vazios", () => {
    expect(erros(loginSchema.safeParse({ email: "", senha: "" }))).toEqual({
      email: "Informe o e-mail",
      senha: "Informe a senha",
    });
    expect(erros(loginSchema.safeParse({ email: "   ", senha: "" })).email).toBe(
      "Informe o e-mail",
    );
  });
  it("e-mail inválido", () => {
    expect(erros(loginSchema.safeParse({ email: "maria", senha: "x" })).email).toBe(
      "E-mail inválido",
    );
  });
  it("não exige tamanho mínimo de senha no login", () => {
    expect(loginSchema.safeParse({ email: "a@b.org", senha: "1" }).success).toBe(true);
  });
  it("normalizarEmail", () => {
    expect(normalizarEmail("  Maria@Paroquia.org ")).toBe("maria@paroquia.org");
  });
});

describe("sanitizarCallbackUrl", () => {
  it.each(["/catequista", "/coordenacao?x=1", "/"])("aceita %s", (u) => {
    expect(sanitizarCallbackUrl(u)).toBe(u);
  });
  it.each([
    "//evil.com",
    "https://evil.com",
    "/\\evil",
    "javascript:alert(1)",
    "",
    " /catequista",
    "/\tevil",
    "catequista",
    "/catequista/../coordenacao",
    "/..",
    "/catequista/./x",
    "/%2e%2e/coordenacao",
    "/catequista/%2E%2E/coordenacao",
    null,
    undefined,
  ])("rejeita %j", (u) => {
    expect(sanitizarCallbackUrl(u)).toBeNull();
  });
});
