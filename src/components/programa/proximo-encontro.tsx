import Link from "next/link";

import { formatarDataComDia } from "@/modules/compartilhado/datas";
import type { EncontroResumo } from "@/modules/programa/repositorio";
import { formatarHorario } from "@/modules/turmas/domain/turma";

function textoTema(tema: EncontroResumo["tema"]): string {
  if (!tema) return "Sem tema do programa";
  return tema.numero !== null ? `${tema.numero}. ${tema.titulo}` : tema.titulo;
}

/** Próximo encontro da turma (6.3, 9.4), com link para o cronograma. */
export function ProximoEncontro({
  encontro,
  linkCronograma,
}: {
  encontro: EncontroResumo | null;
  linkCronograma: string;
}) {
  return (
    <section className="proximo-encontro" aria-labelledby="proximo-encontro-titulo">
      <h2 id="proximo-encontro-titulo">Próximo encontro</h2>
      {encontro ? (
        <>
          <p>
            <span className="cronograma-data">{formatarDataComDia(encontro.data)}</span>{" "}
            <span className="cronograma-horario">{formatarHorario(encontro.horario)}</span>
          </p>
          <p className="cronograma-tema">{textoTema(encontro.tema)}</p>
        </>
      ) : (
        <p>Nenhum encontro planejado</p>
      )}
      <Link href={linkCronograma}>Ver cronograma</Link>
    </section>
  );
}
