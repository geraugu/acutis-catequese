"use client";

import { useId } from "react";
import { type AcaoConfirmacao, Confirmacao } from "@/components/comum/confirmacao";
import type { EstadoTurma } from "@/modules/turmas/actions";

/** Action de desligamento já vinculada (turmaId, inscricaoId) via bind. */
export type AcaoDesligar = (anterior: EstadoTurma, dados: FormData) => Promise<EstadoTurma>;

function textoDesligados(n: number): string {
  if (n === 0) return "Nenhum catequizando será desligado.";
  if (n === 1) return "1 catequizando será desligado.";
  return `${n} catequizandos serão desligados.`;
}

/** Encerramento com a contagem de inscritos vigentes que serão desligados (8.2). */
export function EncerrarTurma({
  turma,
  vigentes,
  acao,
}: {
  turma: string;
  vigentes: number;
  acao: AcaoConfirmacao;
}) {
  return (
    <Confirmacao
      rotuloAbrir="Encerrar turma"
      titulo={`Encerrar a turma ${turma}?`}
      texto={`${textoDesligados(vigentes)} A turma deixa de aceitar alterações; o histórico é preservado.`}
      rotuloConfirmar="Encerrar turma"
      perigo
      acao={acao}
    />
  );
}

/** Remoção da designação de um catequista (4.2). */
export function RemoverCatequista({
  catequista,
  turma,
  acao,
}: {
  catequista: string;
  turma: string;
  acao: AcaoConfirmacao;
}) {
  return (
    <Confirmacao
      rotuloAbrir="Remover"
      titulo={`Remover ${catequista} da turma ${turma}?`}
      texto="A designação é encerrada e o histórico é preservado."
      rotuloConfirmar="Remover"
      perigo
      acao={acao}
    />
  );
}

/** Desligamento de um catequizando com data de saída (padrão hoje) (6.1, 6.2). */
export function DesligarCatequizando({
  catequizando,
  turma,
  hoje,
  acao,
}: {
  catequizando: string;
  turma: string;
  hoje: string;
  acao: AcaoDesligar;
}) {
  const idData = useId();
  // 6.3: erros de campo (ex.: data inválida) viram o alerta exibido pelo Confirmacao.
  const acaoComErroCampo: AcaoConfirmacao = async (anterior, dados) => {
    const resultado = await acao(anterior, dados);
    if (resultado.erro || !resultado.errosCampos) return resultado;
    const erroCampo =
      resultado.errosCampos.dataSaida ?? Object.values(resultado.errosCampos).find(Boolean);
    return erroCampo ? { ...resultado, erro: erroCampo } : resultado;
  };
  return (
    <Confirmacao
      rotuloAbrir="Desligar"
      titulo={`Desligar ${catequizando} da turma ${turma}?`}
      texto="A inscrição é encerrada na data de saída; o histórico é preservado."
      rotuloConfirmar="Desligar"
      perigo
      acao={acaoComErroCampo}
    >
      <div className="campo">
        <label htmlFor={idData}>Data de saída</label>
        <input id={idData} name="dataSaida" type="date" defaultValue={hoje} max={hoje} required />
      </div>
    </Confirmacao>
  );
}
