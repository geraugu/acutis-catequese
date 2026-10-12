import Link from "next/link";

import { formatarDataComDia } from "@/modules/compartilhado/datas";
import { ROTULO_SITUACAO } from "@/modules/programa/domain/encontro";
import type { EncontroEquivalente } from "@/modules/programa/repositorio";
import { formatarHorario } from "@/modules/turmas/domain/turma";

/** Encontros de todas as turmas abertas que trabalham o tema (8.2, 9.4). */
export function EncontrosEquivalentes({
  encontros,
  baseTurma,
}: {
  encontros: readonly EncontroEquivalente[];
  baseTurma: string;
}) {
  if (encontros.length === 0) return <p>Nenhuma turma trabalhou este tema ainda.</p>;
  return (
    <table className="tabela">
      <caption>Encontros das turmas com este tema</caption>
      <thead>
        <tr>
          <th scope="col">Turma</th>
          <th scope="col">Data</th>
          <th scope="col">Horário</th>
          <th scope="col">Situação</th>
        </tr>
      </thead>
      <tbody>
        {encontros.map((e) => (
          <tr key={e.id}>
            <td data-label="Turma">
              <Link href={`${baseTurma}/${e.turmaId}`}>{e.turmaNome}</Link>
            </td>
            <td data-label="Data">{formatarDataComDia(e.data)}</td>
            <td data-label="Horário">{formatarHorario(e.horario)}</td>
            <td data-label="Situação">
              <span className={`situacao situacao-${e.situacao}`}>
                {ROTULO_SITUACAO[e.situacao]}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
