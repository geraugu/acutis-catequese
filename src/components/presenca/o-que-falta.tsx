"use client";

import { useActionState, useId } from "react";
import { Confirmacao } from "@/components/comum/confirmacao";
import { formatarData } from "@/modules/compartilhado/datas";
import type { EstadoPresenca } from "@/modules/presenca/actions";
import type { VisaoDoCatequizando } from "@/modules/presenca/reposicao-repositorio";
import { rotuloDoDia, ROTULO_SITUACAO_RESERVA } from "./historico-reservas";

/** Ação já vinculada (`reservarReposicaoAction.bind(null, catequizandoId, base)`). */
export type AcaoReservar = (anterior: EstadoPresenca, dados: FormData) => Promise<EstadoPresenca>;
/** Ação já vinculada (`cancelarReservaAction.bind(null, catequizandoId)` com a base). */
export type AcaoCancelarReserva = (reservaId: string) => Promise<void>;

interface OQueFaltaProps {
  visao: VisaoDoCatequizando;
  reservar: AcaoReservar;
  cancelar: AcaoCancelarReserva;
}

type TemaDaVisao = VisaoDoCatequizando["temas"][number];
type Opcao = TemaDaVisao["opcoes"][number];

const quando = (o: { diaSemana: string; data: Opcao["data"]; horario: string }) =>
  `${rotuloDoDia(o.diaSemana)}, ${formatarData(o.data)} · ${o.horario.slice(0, 5)}`;

function OpcaoDeReposicao({ opcao, reservar }: { opcao: Opcao; reservar: AcaoReservar }) {
  const [estado, enviar, pendente] = useActionState(reservar, {});
  const idAviso = useId();
  const descricao = `${opcao.turmaNome}, ${quando(opcao)}`;
  return (
    <li className="reposicao-opcao">
      <form action={enviar} className="reposicao-opcao-form">
        <input type="hidden" name="encontroId" value={opcao.encontroId} />
        <input type="hidden" name="temaId" value={opcao.temaId} />
        <div className="reposicao-opcao-dados">
          <span className="reposicao-turma">{opcao.turmaNome}</span>
          <span className="reposicao-apoio">{quando(opcao)}</span>
          {opcao.conflito ? (
            <span id={idAviso} className="reposicao-conflito">
              Conflito de data: já há encontro ou reserva neste dia.
            </span>
          ) : null}
        </div>
        <button
          type="submit"
          className="botao botao-secundario reposicao-botao"
          disabled={opcao.conflito || pendente}
          aria-describedby={opcao.conflito ? idAviso : undefined}
          aria-label={`Reservar ${descricao}`}
        >
          Reservar
        </button>
      </form>
      {estado.erro ? (
        <p role="alert" className="reposicao-erro">
          {estado.erro}
        </p>
      ) : null}
    </li>
  );
}

function ReservaEmDestaque({
  tema,
  cancelar,
}: {
  tema: TemaDaVisao;
  cancelar: AcaoCancelarReserva;
}) {
  const r = tema.reserva!;
  return (
    <div
      role="group"
      aria-label={`Reserva do tema ${tema.tema.numero}. ${tema.tema.titulo}`}
      className="reposicao-reserva"
    >
      <span className="reposicao-situacao reposicao-situacao-reservada">
        {ROTULO_SITUACAO_RESERVA.reservada}
      </span>
      <span className="reposicao-turma">{r.turmaDestinoNome}</span>
      <span className="reposicao-apoio">{quando(r)}</span>
      <Confirmacao
        rotuloAbrir="Cancelar reserva"
        titulo="Cancelar a reserva?"
        texto={`As opções de reposição do tema voltam a aparecer. Reserva: ${r.turmaDestinoNome}, ${quando(r)}.`}
        rotuloConfirmar="Cancelar a reserva"
        perigo
        acao={async () => {
          await cancelar(r.id);
          return {};
        }}
      />
    </div>
  );
}

/** Temas a repor, opções de reposição e reserva em destaque (2.1, 2.5, 2.6, 3.5, 3.6, 7.1). */
export function OQueFalta({ visao, reservar, cancelar }: OQueFaltaProps) {
  if (visao.origemTurmaIds.length === 0) {
    return (
      <section className="lista-vazia">
        <h2>Sem turma de origem</h2>
        <p>
          Este catequizando não tem inscrição vigente em turma, então não há reposição a reservar.
        </p>
      </section>
    );
  }
  if (visao.temas.length === 0) {
    return (
      <section className="lista-vazia">
        <h2>Nenhuma reposição pendente</h2>
        <p>Todos os temas trabalhados na turma já foram cumpridos.</p>
      </section>
    );
  }
  return (
    <ul className="reposicao-temas" aria-label="Temas a repor">
      {visao.temas.map((t) => (
        <li key={t.tema.id} className="reposicao-tema">
          <h3>{`${t.tema.numero}. ${t.tema.titulo}`}</h3>
          {t.reserva ? (
            <ReservaEmDestaque tema={t} cancelar={cancelar} />
          ) : t.opcoes.length === 0 ? (
            <p className="reposicao-apoio">Não há encontro futuro com este tema.</p>
          ) : (
            <ul className="reposicao-opcoes" aria-label={`Opções para ${t.tema.titulo}`}>
              {t.opcoes.map((o) => (
                <OpcaoDeReposicao key={o.encontroId} opcao={o} reservar={reservar} />
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
