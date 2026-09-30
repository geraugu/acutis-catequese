import { sanitizarCallbackUrl } from "./callback-url";
import { homeDoPapel, podeAcessar, type Papel } from "./papeis";

const AREAS: ReadonlyArray<readonly [string, readonly Papel[]]> = [
  ["/coordenacao", ["coordenacao"]],
  ["/catequista", ["catequista"]],
];

/** Papéis exigidos por um caminho interno; null quando qualquer papel pode acessar. */
export function papeisExigidosPorCaminho(caminho: string): readonly Papel[] | null {
  const pathname = caminho.split(/[?#]/, 1)[0];
  for (const [prefixo, papeis] of AREAS) {
    if (pathname === prefixo || pathname.startsWith(`${prefixo}/`)) return papeis;
  }
  return null;
}

/**
 * Destino após o login: o callbackUrl sanitizado, se o papel puder acessá-lo;
 * caso contrário, a home do papel (3.1, 6.2).
 */
export function destinoAposLogin(papel: Papel, callbackUrl: string | null | undefined): string {
  const caminho = sanitizarCallbackUrl(callbackUrl);
  if (!caminho) return homeDoPapel(papel);
  const pathname = caminho.split(/[?#]/, 1)[0];
  if (pathname === "/login" || pathname.startsWith("/login/")) return homeDoPapel(papel);
  const exigidos = papeisExigidosPorCaminho(caminho);
  if (exigidos && !podeAcessar(papel, exigidos)) return homeDoPapel(papel);
  return caminho;
}
