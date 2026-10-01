import { homeDoPapel, type Papel } from "@/modules/auth/domain/papeis";

export interface ItemMenu {
  rotulo: string;
  href: string;
}

/** Itens da navegação principal de cada papel. A coordenação também gerencia a equipe, os catequizandos e as turmas; o catequista vê as suas turmas. */
export function menuPorPapel(papel: Papel): ItemMenu[] {
  const itens: ItemMenu[] = [{ rotulo: "Início", href: homeDoPapel(papel) }];
  if (papel === "coordenacao") {
    itens.push(
      { rotulo: "Equipe", href: "/coordenacao/equipe" },
      { rotulo: "Catequizandos", href: "/coordenacao/catequizandos" },
      { rotulo: "Turmas", href: "/coordenacao/turmas" },
    );
  }
  if (papel === "catequista") {
    itens.push({ rotulo: "Minhas turmas", href: "/catequista/turmas" });
  }
  return itens;
}
