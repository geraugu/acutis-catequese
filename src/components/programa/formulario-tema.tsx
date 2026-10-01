"use client";

import { useActionState } from "react";
import type { EstadoPrograma } from "@/modules/programa/actions";

export type AcaoFormularioTema = (
  anterior: EstadoPrograma,
  dados: FormData,
) => Promise<EstadoPrograma>;

type Modo = "criar" | "editar";
type Valores = NonNullable<EstadoPrograma["valores"]>;

const idCampo = (campo: string) => `tema-${campo}`;
const idErro = (campo: string) => `tema-${campo}-erro`;

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

interface CamposTemaProps {
  modo: Modo;
  estado: EstadoPrograma;
  pendente: boolean;
}

/** Campos do tema (presentacional). */
export function CamposTema({ modo, estado, pendente }: CamposTemaProps) {
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
        <label htmlFor={idCampo("titulo")}>Título</label>
        <input
          id={idCampo("titulo")}
          name="titulo"
          type="text"
          autoComplete="off"
          aria-required="true"
          defaultValue={v.titulo ?? ""}
          {...descricao("titulo", erros.titulo)}
        />
        <MensagemErro campo="titulo" erro={erros.titulo} />
      </div>
      <div className="campo">
        <label htmlFor={idCampo("descricao")}>Descrição</label>
        <textarea
          id={idCampo("descricao")}
          name="descricao"
          defaultValue={v.descricao ?? ""}
          {...descricao("descricao", erros.descricao)}
        />
        <MensagemErro campo="descricao" erro={erros.descricao} />
      </div>
      <button type="submit" className="botao botao-primario" disabled={pendente}>
        {pendente ? "Salvando…" : modo === "criar" ? "Criar tema" : "Salvar alterações"}
      </button>
    </>
  );
}

interface FormularioTemaProps {
  modo: Modo;
  /** Server action já vinculada (ex.: `editarTemaAction.bind(null, id)`). */
  acao: AcaoFormularioTema;
  valoresIniciais?: Valores;
}

export function FormularioTema({ modo, acao, valoresIniciais }: FormularioTemaProps) {
  const [estado, enviar, pendente] = useActionState(acao, { valores: valoresIniciais });
  return (
    <form action={enviar} noValidate className="formulario">
      <CamposTema
        // Remonta os campos a cada resposta para aplicar os defaultValue.
        key={JSON.stringify(estado)}
        modo={modo}
        estado={{ ...estado, valores: estado.valores ?? valoresIniciais }}
        pendente={pendente}
      />
    </form>
  );
}
