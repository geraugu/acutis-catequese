/**
 * Aceita somente caminhos internos ("/..."). Rejeita URLs absolutas,
 * protocol-relative ("//"), "/\\", caracteres de controle e espaços.
 */
export function sanitizarCallbackUrl(valor: string | null | undefined): string | null {
  if (typeof valor !== "string" || valor.length === 0) return null;
  if (!valor.startsWith("/")) return null;
  if (valor.startsWith("//") || valor.startsWith("/\\")) return null;
  if (/[\u0000-\u001f\u007f\s]/.test(valor)) return null;
  return valor;
}
