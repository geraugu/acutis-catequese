"use client";

import { useActionState } from "react";
import type { EstadoPresenca } from "@/modules/presenca/actions";
import type { ReservaDaChamada } from "@/modules/presenca/reposicao-repositorio";
import { ROTULO_SITUACAO_RESERVA } from "./historico-reservas";

/** Confirmar presente (`adicionarVisitanteAction` já vinculada à turma, ao encontro e à base). */
export type AcaoConfirmarReserva = (catequizandoId: string) => Promise<EstadoPresenca>;
/** Marcar ausência (`naoCompareceuAction` já vinculada à turma, ao encontro e à base). */
export type AcaoMarcarAusencia = (catequizandoId: string) => Promise<void>;

interface ReservasDaChamadaProps {
  reservas: readonly ReservaDaChamada[];
  confirmar: AcaoConfirmarReserva;
  ausente: AcaoMarcarAusencia;
}

type Situacao = ReservaDaChamada["situacao"];
const EXIBIDAS: ReadonlySet<Situacao> = new Set(["reservada", "compareceu", "nao_compareceu"]);

function ItemReserva({
  reserva,
  confirmar,
  ausente,
}: {
  reserva: ReservaDaChamada;
  confirmar: AcaoConfirmarReserva;
  ausente: AcaoMarcarAusencia;
}) {
  const [estado, enviarConfirmacao, confirmando] = useActionState(
    async (): Promise<EstadoPresenca> => confirmar(reserva.catequizandoId),
    {},
  );
  const [, enviarAusencia, marcando] = useActionState(async () => {
    await ausente(reserva.catequizandoId);
    return {};
  }, {});
  const ativa = reserva.situacao === "reservada";
  return (
    <li className="reposicao-chamada-item">
      <div className="reposicao-chamada-dados">
        <span className="reposicao-turma">{reserva.nome}</span>
        <span className="reposicao-apoio">{`Turma de origem: ${reserva.turmaOrigemNome}`}</span>
        {ativa ? null : (
          <span className={`reposicao-situacao reposicao-situacao-${reserva.situacao}`}>
            {ROTULO_SITUACAO_RESERVA[reserva.situacao]}
          </span>
        )}
      </div>
      {ativa ? (
        <div className="reposicao-chamada-acoes">
          <form action={enviarConfirmacao}>
            <button
              type="submit"
              className="botao botao-primario"
              disabled={confirmando || marcando}
              aria-label={`Confirmar presente: ${reserva.nome}`}
            >
              Confirmar presente
            </button>
          </form>
          <form action={enviarAusencia}>
            <button
              type="submit"
              className="botao botao-secundario"
              disabled={confirmando || marcando}
              aria-label={`Marcar ausência: ${reserva.nome}`}
            >
              Marcar ausência
            </button>
          </form>
        </div>
      ) : null}
      {estado.erro ? (
        <p role="alert" className="reposicao-erro">
          {estado.erro}
        </p>
      ) : null}
    </li>
  );
}

/** Reservas do encontro, separadas dos inscritos, com confirmar e ausência (5.1, 5.2, 5.3, 7.1). */
export function ReservasDaChamada({ reservas, confirmar, ausente }: ReservasDaChamadaProps) {
  const exibidas = reservas.filter((r) => EXIBIDAS.has(r.situacao));
  if (exibidas.length === 0) return null;
  return (
    <section className="reposicao-chamada" aria-labelledby="reposicoes-reservadas">
      <h2 id="reposicoes-reservadas">Reposições reservadas</h2>
      <ul className="reposicao-chamada-lista">
        {exibidas.map((r) => (
          <ItemReserva key={r.reservaId} reserva={r} confirmar={confirmar} ausente={ausente} />
        ))}
      </ul>
    </section>
  );
}
