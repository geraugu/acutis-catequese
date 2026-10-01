import Link from "next/link";
import { formatarData, type DataCivil } from "@/modules/compartilhado/datas";
import { ROTULO_MOTIVO, type MotivoSaida } from "@/modules/turmas/domain/inscricao";

export interface PassagemPorTurma {
  turmaId: string;
  turmaNome: string;
  ciclo: number;
  dataEntrada: DataCivil;
  dataSaida: DataCivil | null;
  motivoSaida: MotivoSaida | null;
}

/** Seção "Turma" da página do catequizando: turma atual e histórico de inscrições. */
export function TurmaDoCatequizando({
  historico,
  baseTurma,
}: {
  historico: PassagemPorTurma[];
  baseTurma: string;
}) {
  const atual = historico.find((h) => h.dataSaida === null);
  return (
    <section aria-labelledby="turma-catequizando-titulo">
      <h2 id="turma-catequizando-titulo">Turma</h2>
      {atual ? (
        <p data-testid="turma-atual">
          <Link href={`${baseTurma}/${atual.turmaId}`}>{atual.turmaNome}</Link>, desde{" "}
          {formatarData(atual.dataEntrada)}
        </p>
      ) : (
        <p data-testid="turma-atual">Sem turma no momento</p>
      )}
      {historico.length > 0 ? (
        <>
          <h3>Histórico</h3>
          <ul>
            {historico.map((h) => (
              <li key={`${h.turmaId}-${h.dataEntrada}`}>
                <span>{h.turmaNome}</span> · <span>Ciclo {h.ciclo}</span> ·{" "}
                <span>
                  {formatarData(h.dataEntrada)}–{h.dataSaida ? formatarData(h.dataSaida) : "atual"}
                </span>
                {h.motivoSaida ? (
                  <>
                    {" "}
                    · <span>{ROTULO_MOTIVO[h.motivoSaida]}</span>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
