"use client";

import { useActionState } from "react";
import type { EstadoPrograma } from "@/modules/programa/actions";
import { MSG_TEMA_REPETIDO } from "@/modules/programa/mensagens";

export type AcaoFormularioEncontro = (
  anterior: EstadoPrograma,
  dados: FormData,
) => Promise<EstadoPrograma>;

/** Formato devolvido por `temasParaSelecao`. */
export interface TemaParaSelecao {
  id: string;
  titulo: string;
  numero: number | null;
  ativo: boolean;
}

type Modo = "criar" | "editar";
type Valores = NonNullable<EstadoPrograma["valores"]>;

const idCampo = (campo: string) => `encontro-${campo}`;
const idErro = (campo: string) => `encontro-${campo}-erro`;

function descricao(campo: string, erro: string | undefined) {
  return {
    "aria-invalid": erro ? true : undefined,
    "aria-describedby": erro ? idErro(campo) : undefined,
  } as const;
}

function MensagemErro({ campo, erro }: { campo: string; erro?: string }) {
  return erro ? (
    <p id={idErro(campo)} className="campo-erro">
      {erro}
    </p>
  ) : null;
}

/** Rótulo da opção: número do programa, ou o tema desativado identificado (4.9). */
function rotuloTema(t: TemaParaSelecao): string {
  if (!t.ativo) return `${t.titulo} (Desativado)`;
  return t.numero !== null ? `${t.numero}. ${t.titulo}` : t.titulo;
}

interface CamposEncontroProps {
  modo: Modo;
  temas: readonly TemaParaSelecao[];
  estado: EstadoPrograma;
  pendente: boolean;
}

/** Campos do encontro (presentacional). */
export function CamposEncontro({ modo, temas, estado, pendente }: CamposEncontroProps) {
  const erros = estado.errosCampos ?? {};
  const v: Valores = estado.valores ?? {};
  return (
    <>
      {estado.erro ? (
        <p role="alert" className="login-alerta">
          {estado.erro}
        </p>
      ) : null}
      <div className="campo">
        <label htmlFor={idCampo("data")}>Data</label>
        <input
          id={idCampo("data")}
          name="data"
          type="date"
          aria-required="true"
          defaultValue={v.data ?? ""}
          {...descricao("data", erros.data)}
        />
        <MensagemErro campo="data" erro={erros.data} />
      </div>
      <div className="campo">
        <label htmlFor={idCampo("horario")}>Horário</label>
        <input
          id={idCampo("horario")}
          name="horario"
          type="time"
          aria-required="true"
          defaultValue={v.horario ?? ""}
          {...descricao("horario", erros.horario)}
        />
        <MensagemErro campo="horario" erro={erros.horario} />
      </div>
      <div className="campo">
        <label htmlFor={idCampo("temaId")}>Tema</label>
        <select
          id={idCampo("temaId")}
          name="temaId"
          defaultValue={v.temaId ?? ""}
          {...descricao("temaId", erros.temaId)}
        >
          <option value="">Sem tema do programa</option>
          {temas.map((t) => (
            <option key={t.id} value={t.id}>
              {rotuloTema(t)}
            </option>
          ))}
        </select>
        <MensagemErro campo="temaId" erro={erros.temaId} />
      </div>
      <div className="campo">
        <label htmlFor={idCampo("observacoes")}>Observações</label>
        <textarea
          id={idCampo("observacoes")}
          name="observacoes"
          defaultValue={v.observacoes ?? ""}
          {...descricao("observacoes", erros.observacoes)}
        />
        <MensagemErro campo="observacoes" erro={erros.observacoes} />
      </div>
      <button type="submit" className="botao botao-primario" disabled={pendente}>
        {pendente ? "Salvando…" : modo === "criar" ? "Criar encontro" : "Salvar alterações"}
      </button>
      {estado.temaRepetido ? (
        <div className="encontro-tema-repetido">
          <p role="alert" className="login-alerta">
            {MSG_TEMA_REPETIDO(estado.temaRepetido.data)}
          </p>
          {/* Reenvia o formulário com a confirmação (4.6). */}
          <button
            type="submit"
            name="confirmarTemaRepetido"
            value="1"
            className="botao botao-secundario"
            disabled={pendente}
          >
            Salvar mesmo assim
          </button>
        </div>
      ) : null}
    </>
  );
}

interface FormularioEncontroProps {
  modo: Modo;
  /** Server action já vinculada (ex.: `criarEncontroAction.bind(null, turmaId, base)`). */
  acao: AcaoFormularioEncontro;
  temas: readonly TemaParaSelecao[];
  /** Em criação, inclua `horario` com o horário da turma. */
  valoresIniciais?: Valores;
}

export function FormularioEncontro({
  modo,
  acao,
  temas,
  valoresIniciais,
}: FormularioEncontroProps) {
  const [estado, enviar, pendente] = useActionState(acao, { valores: valoresIniciais });
  return (
    <form action={enviar} noValidate className="formulario">
      <CamposEncontro
        // Remonta os campos a cada resposta para aplicar os defaultValue.
        key={JSON.stringify(estado)}
        modo={modo}
        temas={temas}
        estado={{ ...estado, valores: estado.valores ?? valoresIniciais }}
        pendente={pendente}
      />
    </form>
  );
}
