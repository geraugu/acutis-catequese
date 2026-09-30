import { z } from "zod";

/** Mensagem exibida quando o telefone não tem DDD + número válidos. */
const MENSAGEM_TELEFONE = "Informe um telefone com DDD";

/**
 * Normaliza um telefone brasileiro para só dígitos (DDD + número).
 * Aceita pontuação e um "+55" inicial. Exige 10 (fixo) ou 11 (celular) dígitos.
 * Devolve `null` quando a entrada não é um telefone válido.
 */
export function normalizarTelefone(entrada: string): string | null {
  const semPais = entrada.trim().replace(/^\+\s*55/, "");
  const digitos = semPais.replace(/\D/g, "");
  return digitos.length === 10 || digitos.length === 11 ? digitos : null;
}

/** "11987654321" → "(11) 98765-4321"; "1133334444" → "(11) 3333-4444". */
export function formatarTelefone(digitos: string): string {
  const ddd = digitos.slice(0, 2);
  const numero = digitos.slice(2);
  const corte = numero.length - 4;
  return `(${ddd}) ${numero.slice(0, corte)}-${numero.slice(corte)}`;
}

/** Valida o telefone e devolve só os dígitos. */
export const telefoneSchema: z.ZodType<string, string> = z
  .string()
  .transform((valor, ctx) => {
    const digitos = normalizarTelefone(valor);
    if (digitos === null) {
      ctx.addIssue({ code: "custom", message: MENSAGEM_TELEFONE });
      return z.NEVER;
    }
    return digitos;
  });

/** Link para ligar: "tel:+5511987654321". */
export function linkLigacao(digitos: string): string {
  return `tel:+55${digitos}`;
}

/** Link de conversa no WhatsApp: "https://wa.me/5511987654321". */
export function linkWhatsApp(digitos: string): string {
  return `https://wa.me/55${digitos}`;
}
