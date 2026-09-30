import { homeDoPapel, type Papel } from "@/modules/auth/domain/papeis";

export interface ItemMenu {
  rotulo: string;
  href: string;
}

/** Itens da navegação principal de cada papel. A coordenação também gerencia a equipe e os catequizandos. */
export function menuPorPapel(papel: Papel): ItemMenu[] {
  const itens: ItemMenu[] = [{ rotulo: "Início", href: homeDoPapel(papel) }];
  if (papel === "coordenacao") {
    itens.push(
      { rotulo: "Equipe", href: "/coordenacao/equipe" },
      { rotulo: "Catequizandos", href: "/coordenacao/catequizandos" },
    );
  }
  return itens;
}
