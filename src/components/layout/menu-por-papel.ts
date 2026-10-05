import { homeDoPapel, type Papel } from "@/modules/auth/domain/papeis";

export interface ItemMenu {
  rotulo: string;
  href: string;
}

/** Itens da navegação principal de cada papel. A coordenação também gerencia a equipe, os catequizandos e as turmas, o programa e a frequência; o catequista vê as suas turmas, consulta o programa e acompanha a frequência. */
export function menuPorPapel(papel: Papel): ItemMenu[] {
  const itens: ItemMenu[] = [{ rotulo: "Início", href: homeDoPapel(papel) }];
  if (papel === "coordenacao") {
    itens.push(
      { rotulo: "Equipe", href: "/coordenacao/equipe" },
      { rotulo: "Catequizandos", href: "/coordenacao/catequizandos" },
      { rotulo: "Turmas", href: "/coordenacao/turmas" },
      { rotulo: "Programa", href: "/coordenacao/programa" },
      { rotulo: "Frequência", href: "/coordenacao/frequencia" },
    );
  }
  if (papel === "catequista") {
    itens.push(
      { rotulo: "Minhas turmas", href: "/catequista/turmas" },
      { rotulo: "Programa", href: "/catequista/programa" },
      { rotulo: "Frequência", href: "/catequista/frequencia" },
    );
  }
  return itens;
}
