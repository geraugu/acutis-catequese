import "server-only";
import { headers } from "next/headers";

export type Origem = { tipo: "ip"; chave: string } | { tipo: "sem-origem" };

interface CabecalhosLegiveis {
  get(nome: string): string | null;
}

/** Primeiro valor do x-forwarded-for (definido pelo proxy da Vercel); sem ele, "sem-origem" (4.1, 4.3). */
export function origemDaRequisicao(cabecalhos: CabecalhosLegiveis): Origem {
  const primeiro = cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim();
  return primeiro ? { tipo: "ip", chave: primeiro } : { tipo: "sem-origem" };
}

/** Origem da requisição atual (Server Action ou Server Component). */
export async function lerOrigem(): Promise<Origem> {
  return origemDaRequisicao(await headers());
}
