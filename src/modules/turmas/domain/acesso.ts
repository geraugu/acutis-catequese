import type { Papel } from "@/modules/auth/domain/papeis";

export interface Ator {
  id: string;
  papel: Papel;
}

/** Coordenação sempre pode; catequista só quando está na lista (1.1, 1.2). */
function podeVer(ator: Ator, permitidos: readonly string[]): boolean {
  if (ator.papel === "coordenacao") return true;
  if (ator.papel === "catequista") return permitidos.includes(ator.id);
  return false;
}

export function podeVerTurmaRegra(ator: Ator, designadosVigentes: readonly string[]): boolean {
  return podeVer(ator, designadosVigentes);
}

export function podeVerCatequizandoRegra(
  ator: Ator,
  catequistasDasTurmasVigentes: readonly string[],
): boolean {
  return podeVer(ator, catequistasDasTurmasVigentes);
}
