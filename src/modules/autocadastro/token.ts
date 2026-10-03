import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

/** Token opaco do link: 32 bytes aleatórios em base64url (43 caracteres) (1.1). */
export function gerarToken(): string {
  return randomBytes(32).toString("base64url");
}

/** HMAC-SHA256 do IP com AUTOCADASTRO_SEGREDO, em hex; o IP nunca é guardado em claro (4.1). */
export function hashOrigem(ip: string): string {
  return createHmac("sha256", env.AUTOCADASTRO_SEGREDO).update(ip).digest("hex");
}
