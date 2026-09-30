export const PAPEIS = ["coordenacao", "catequista"] as const;
export type Papel = (typeof PAPEIS)[number];

export const ROTULO_PAPEL: Record<Papel, string> = {
  coordenacao: "Coordenação",
  catequista: "Catequista",
};

/** Papéis que cada papel satisfaz, além de si mesmo. */
const HERDA: Record<Papel, readonly Papel[]> = {
  coordenacao: ["catequista"],
  catequista: [],
};

/** A coordenação satisfaz qualquer exigência de catequista (6.5). */
export function podeAcessar(papel: Papel, permitidos: readonly Papel[]): boolean {
  return permitidos.some((p) => p === papel || HERDA[papel].includes(p));
}

export function homeDoPapel(papel: Papel): "/coordenacao" | "/catequista" {
  return papel === "coordenacao" ? "/coordenacao" : "/catequista";
}

export function isPapel(valor: unknown): valor is Papel {
  return typeof valor === "string" && (PAPEIS as readonly string[]).includes(valor);
}
