"use client";

import { useActionState, useId } from "react";
import type { DataCivil } from "@/modules/compartilhado/datas";
import type { EstadoTurma } from "@/modules/turmas/actions";
import { MSG_LOTADA, MSG_TRANSFERIR } from "@/modules/turmas/mensagens";
import type { CandidatoInscricao } from "@/modules/turmas/repositorio";

/** Action de inscrição já vinculada ao turmaId via bind. */
export type AcaoInscrever = (anterior: EstadoTurma, dados: FormData) => Promise<EstadoTurma>;

const CONFIRMACOES = ["confirmarLotacao", "confirmarTransferencia"] as const;

function FormularioCandidato({
  candidato,
  acao,
  hoje,
}: {
  candidato: CandidatoInscricao;
  acao: AcaoInscrever;
  hoje: DataCivil;
}) {
  // Guarda as confirmações enviadas mesmo que a action não as ecoe em `valores`.
  const acaoComConfirmacoes: AcaoInscrever = async (anterior, dados) => {
    const resultado = await acao(anterior, dados);
    const valores = { ...resultado.valores };
    for (const c of CONFIRMACOES) if (dados.get(c) === "1") valores[c] = "1";
    return { ...resultado, valores };
  };
  const [estado, formAction, pendente] = useActionState<EstadoTurma, FormData>(
    acaoComConfirmacoes,
    {},
  );
  const idData = useId();
  const idErro = useId();
  const erroData = estado.errosCampos?.dataEntrada;
  // 5.2/5.3: confirmações já dadas seguem ocultas no reenvio.
  const confirmadas = CONFIRMACOES.filter((c) => estado.valores?.[c] === "1");

  return (
    <form action={formAction} className="inscrever-candidato">
      <input type="hidden" name="catequizandoId" value={candidato.id} />
      {confirmadas.map((c) => (
        <input key={c} type="hidden" name={c} value="1" />
      ))}
      <div className="campo">
        <label htmlFor={idData}>Data de entrada</label>
        <input
          id={idData}
          type="date"
          name="dataEntrada"
          defaultValue={estado.valores?.dataEntrada ?? hoje}
          aria-invalid={erroData ? true : undefined}
          aria-describedby={erroData ? idErro : undefined}
        />
        {erroData ? (
          <p id={idErro} className="campo-erro">
            {erroData}
          </p>
        ) : null}
      </div>
      {estado.erro ? <p role="alert">{estado.erro}</p> : null}
      <button type="submit" disabled={pendente}>
        Inscrever
      </button>
      {estado.lotada ? (
        <div role="alert" className="inscrever-confirmacao">
          <p>{MSG_LOTADA(estado.lotada.inscritos, estado.lotada.vagas)}</p>
          <button type="submit" name="confirmarLotacao" value="1" disabled={pendente}>
            Inscrever mesmo assim
          </button>
        </div>
      ) : null}
      {estado.transferir ? (
        <div role="alert" className="inscrever-confirmacao">
          <p>{MSG_TRANSFERIR(estado.transferir.turmaAtualNome)}</p>
          <button type="submit" name="confirmarTransferencia" value="1" disabled={pendente}>
            Transferir para esta turma
          </button>
        </div>
      ) : null}
    </form>
  );
}

/** Busca de catequizandos ativos e inscrição na turma (5.1, 5.2, 5.3). */
export function InscreverCatequizando({
  turmaNome,
  termo,
  candidatos,
  acao,
  hoje,
}: {
  turmaId: string;
  turmaNome?: string;
  termo: string;
  candidatos: CandidatoInscricao[];
  acao: AcaoInscrever;
  hoje: DataCivil;
}) {
  const idBusca = useId();
  return (
    <section className="inscrever-catequizando" aria-label="Inscrever catequizando">
      <form method="get" role="search" className="inscrever-busca">
        <label htmlFor={idBusca}>Buscar catequizando por termo</label>
        <input id={idBusca} type="search" name="q" defaultValue={termo} />
        <button type="submit">Buscar</button>
      </form>
      {candidatos.length === 0 ? (
        termo ? (
          <p>Nenhum catequizando encontrado</p>
        ) : null
      ) : (
        <ul
          className="inscrever-candidatos"
          aria-label={turmaNome ? `Candidatos para ${turmaNome}` : "Candidatos"}
        >
          {candidatos.map((c) => (
            <li key={c.id}>
              <strong>{c.nome}</strong>
              {c.turmaAtual ? <span> Turma atual: {c.turmaAtual.nome}</span> : null}
              <FormularioCandidato candidato={c} acao={acao} hoje={hoje} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
