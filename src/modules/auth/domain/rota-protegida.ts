/** Header interno com o caminho da requisição, definido pelo proxy e lido pelo layout (interno). */
export const HEADER_CAMINHO = "x-caminho";

/** Endereço do login levando o caminho atual (com a query) como endereço de retorno. */
export function urlDeLogin(pathname: string, search: string): string {
  const caminho = `${pathname}${search}`;
  if (caminho === "/") return "/login";
  return `/login?callbackUrl=${encodeURIComponent(caminho)}`;
}
