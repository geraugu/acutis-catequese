import { formatarData } from "@/modules/compartilhado/datas";
import type { ReservaDetalhada } from "@/modules/presenca/reposicao-repositorio";
import { ROTULO_DIA, type DiaSemana } from "@/modules/turmas/domain/turma";

export const ROTULO_SITUACAO_RESERVA: Record<ReservaDetalhada["situacao"], string> = {
  reservada: "Reservada",
  compareceu: "Compareceu",
  nao_compareceu: "Não compareceu",
  cancelada: "Cancelada",
};

/** Saída da turma e inativação aparecem juntas: o gatilho de inativação já encerra a inscrição. */
const TEXTO_DO_MOTIVO: Record<NonNullable<ReservaDetalhada["motivo"]>, string> = {
  "encontro-cancelado": "O encontro foi cancelado.",
  "tema-alterado": "O tema do encontro mudou.",
  "saiu-da-turma": "Saiu da turma de origem.",
  "catequizando-inativo": "Saiu da turma de origem.",
  "turma-encerrada": "A turma visitada foi encerrada.",
  "cancelada-por-usuario": "Cancelada por quem reservou.",
};

export function rotuloDoDia(diaSemana: string): string {
  return ROTULO_DIA[diaSemana as DiaSemana] ?? diaSemana;
}

interface HistoricoReservasProps {
  reservas: readonly ReservaDetalhada[];
}

/** Histórico das reservas do catequizando, com situação, turma, data e motivo (6.4). */
export function HistoricoReservas({ reservas }: HistoricoReservasProps) {
  if (reservas.length === 0) {
    return <p className="reposicao-apoio">Nenhuma reserva de reposição ainda.</p>;
  }
  return (
    <ul className="reposicao-historico" aria-label="Histórico de reservas">
      {reservas.map((r) => (
        <li key={r.id} className="reposicao-historico-item">
          <span className="reposicao-historico-tema">
            {r.temaNumero === null ? r.temaTitulo : `${r.temaNumero}. ${r.temaTitulo}`}
          </span>
          <span className={`reposicao-situacao reposicao-situacao-${r.situacao}`}>
            {ROTULO_SITUACAO_RESERVA[r.situacao]}
          </span>
          <span>{r.turmaDestinoNome}</span>
          <span className="reposicao-apoio">
            {`${rotuloDoDia(r.diaSemana)}, ${formatarData(r.data)} · ${r.horario.slice(0, 5)}`}
          </span>
          {r.situacao === "cancelada" && r.motivo !== null ? (
            <span className="reposicao-motivo">{TEXTO_DO_MOTIVO[r.motivo]}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
