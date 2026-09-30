/**
 * Estado e fábricas dos mocks de `next/headers` e `next/navigation` para os testes de
 * integração da equipe. Este módulo NÃO importa `@/lib/auth` para poder ser carregado
 * dentro das fábricas de `vi.mock` (que são içadas) sem ciclos.
 *
 * Uso num arquivo de teste:
 *   vi.mock("next/headers", async () => (await import("./next-mocks")).nextHeadersMock);
 *   vi.mock("next/navigation", async () => (await import("./next-mocks")).nextNavigationMock);
 */

/** Jarra de cookies mutável da requisição simulada (compartilhada por todo o arquivo de teste). */
export const jarra = new Map<string, string>();

export function cabecalhoCookie(): string {
  return [...jarra].map(([k, v]) => `${k}=${v}`).join("; ");
}

export const nextHeadersMock = {
  headers: async () => {
    const h = new Headers();
    if (jarra.size) h.set("cookie", cabecalhoCookie());
    return h;
  },
  cookies: async () => ({
    set: (k: string, v: string) => void jarra.set(k, v),
    get: (k: string) => (jarra.has(k) ? { name: k, value: jarra.get(k) } : undefined),
    delete: (k: string) => void jarra.delete(k),
  }),
};

export class RedirectErro extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT;${url}`);
  }
}

export const nextNavigationMock = {
  redirect: (url: string) => {
    throw new RedirectErro(url);
  },
};
