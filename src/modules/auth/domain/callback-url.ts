/**
 * Aceita somente caminhos internos ("/..."). Rejeita URLs absolutas,
 * protocol-relative ("//"), "/\\", caracteres de controle, espaços e segmentos
 * "." ou ".." (inclusive codificados, como "%2e%2e").
 */
export function sanitizarCallbackUrl(valor: string | null | undefined): string | null {
  if (typeof valor !== "string" || valor.length === 0) return null;
  if (!valor.startsWith("/")) return null;
  if (valor.startsWith("//") || valor.startsWith("/\\")) return null;
  if (/[\u0000-\u001f\u007f\s]/.test(valor)) return null;
  if (temSegmentoRelativo(valor)) return null;
  return valor;
}

function temSegmentoRelativo(valor: string): boolean {
  const caminho = valor.split(/[?#]/, 1)[0];
  return caminho.split("/").some((segmento) => {
    const normalizado = segmento.replace(/%2e/gi, ".");
    return normalizado === "." || normalizado === "..";
  });
}
