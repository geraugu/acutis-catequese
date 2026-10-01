"use client";

import { useActionState, useId } from "react";
import { type AcaoConfirmacao, Confirmacao } from "@/components/comum/confirmacao";
import { type DataCivil, formatarData, formatarDataComDia } from "@/modules/compartilhado/datas";
import type { EstadoPrograma } from "@/modules/programa/actions";
import type { SituacaoEncontro } from "@/modules/programa/domain/encontro";

/** Action de encontro já vinculada (turmaId, encontroId, base) via bind. */
export type AcaoEncontro = (anterior: EstadoPrograma, dados: FormData) => Promise<EstadoPrograma>;

interface AcoesEncontroProps {
  encontro: { data: DataCivil; situacao: SituacaoEncontro; tema: string | null };
  realizar: AcaoEncontro;
  cancelar: AcaoEncontro;
  reabrir: AcaoEncontro;
}

/** Leva o primeiro erro de campo (ex.: motivo longo) para o alerta do diálogo. */
function comErroDeCampo(acao: AcaoEncontro): AcaoConfirmacao {
  return async (anterior, dados) => {
    const resultado = await acao(anterior, dados);
    if (resultado.erro || !resultado.errosCampos) return resultado;
    const erroCampo =
      resultado.errosCampos.motivo ?? Object.values(resultado.errosCampos).find(Boolean);
    return erroCampo ? { ...resultado, erro: erroCampo } : resultado;
  };
}

function Realizar({ dataComDia, acao }: { dataComDia: string; acao: AcaoEncontro }) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form action={enviar}>
      {estado.erro ? (
        <p role="alert" className="login-alerta">
          {estado.erro}
        </p>
      ) : null}
      <button type="submit" className="botao" disabled={pendente}>
        Marcar como realizado <span className="visualmente-oculto">{dataComDia}</span>
      </button>
    </form>
  );
}

/** Ações conforme a situação: realizar e cancelar (planejado) ou reabrir (5.1–5.4). */
export function AcoesEncontro({ encontro, realizar, cancelar, reabrir }: AcoesEncontroProps) {
  const idMotivo = useId();
  const dataComDia = formatarDataComDia(encontro.data);
  const data = formatarData(encontro.data);
  const descricao = `${dataComDia} (${encontro.tema ?? "Sem tema do programa"})`;

  if (encontro.situacao !== "planejado") {
    return (
      <div className="acoes-encontro">
        <Confirmacao
          rotuloAbrir={`Reabrir encontro de ${data}`}
          titulo={`Reabrir o encontro de ${descricao}?`}
          texto="O encontro volta a ficar planejado e o motivo do cancelamento, se houver, é removido."
          rotuloConfirmar="Reabrir"
          acao={comErroDeCampo(reabrir)}
        />
      </div>
    );
  }

  return (
    <div className="acoes-encontro">
      <Realizar dataComDia={dataComDia} acao={realizar} />
      <Confirmacao
        rotuloAbrir={`Cancelar encontro de ${data}`}
        titulo={`Cancelar o encontro de ${descricao}?`}
        texto="O encontro fica registrado como cancelado no cronograma."
        rotuloConfirmar="Cancelar encontro"
        perigo
        acao={comErroDeCampo(cancelar)}
      >
        <div className="campo">
          <label htmlFor={idMotivo}>Motivo (opcional)</label>
          <input id={idMotivo} name="motivo" type="text" maxLength={200} />
        </div>
      </Confirmacao>
    </div>
  );
}
