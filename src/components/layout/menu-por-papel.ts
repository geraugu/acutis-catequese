import { homeDoPapel, type Papel } from "@/modules/auth/domain/papeis";

export interface ItemMenu {
  rotulo: string;
  href: string;
}

/** Itens da navegação principal de cada papel. Por enquanto, só "Início". */
export function menuPorPapel(papel: Papel): ItemMenu[] {
  return [{ rotulo: "Início", href: homeDoPapel(papel) }];
}
