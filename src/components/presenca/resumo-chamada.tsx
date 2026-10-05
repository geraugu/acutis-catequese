import type { SituacaoEncontro } from "@/modules/programa/domain/encontro";

export interface ContagemChamada {
  presentes: number;
  ausentes: number;
  justificados: number;
  visitantes: number;
}

interface ResumoChamadaProps {
  situacao: SituacaoEncontro;
  contagem: ContagemChamada | undefined;
}

function plural(n: number, singular: string, pluralForma: string): string {
  return `${n} ${n === 1 ? singular : pluralForma}`;
}

/** Resumo da chamada de um encontro realizado (2.8); texto puro, legível por leitor de tela. */
export function ResumoChamada({ situacao, contagem }: ResumoChamadaProps) {
  if (situacao !== "realizado" || !contagem) return null;
  const texto = [
    plural(contagem.presentes, "presente", "presentes"),
    plural(contagem.ausentes, "ausente", "ausentes"),
    plural(contagem.justificados, "justificado", "justificados"),
    plural(contagem.visitantes, "visitante", "visitantes"),
  ].join(" · ");
  return <p className="presenca-contagens">{texto}</p>;
}
