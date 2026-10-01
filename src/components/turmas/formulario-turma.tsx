"use client";

import { useActionState } from "react";
import type { EstadoTurma } from "@/modules/turmas/actions";
import { DIAS_SEMANA, ROTULO_DIA } from "@/modules/turmas/domain/turma";

export type AcaoTurma = (anterior: EstadoTurma, dados: FormData) => Promise<EstadoTurma>;

type Modo = "criar" | "editar";
type Valores = NonNullable<EstadoTurma["valores"]>;
type Erros = Partial<Record<string, string>>;

function idCampo(campo: string) {
  return `turma-${campo}`;
}

function idErro(campo: string) {
  return `turma-${campo}-erro`;
}

function descricao(campo: string, erro: string | undefined, dica?: string) {
  const ids = [dica, erro ? idErro(campo) : undefined].filter(Boolean).join(" ");
  return {
    "aria-invalid": erro ? true : undefined,
    "aria-describedby": ids || undefined,
  } as const;
}

function MensagemErro({ campo, erro }: { campo: string; erro?: string }) {
  return erro ? (
    <p id={idErro(campo)} className="campo-erro">
      {erro}
    </p>
  ) : null;
}

interface CampoTextoProps {
  campo: string;
  rotulo: string;
  tipo?: string;
  valores: Valores;
  erros: Erros;
  obrigatorio?: boolean;
  dica?: string;
  min?: number;
}

function CampoTexto({
  campo,
  rotulo,
  tipo = "text",
  valores,
  erros,
  obrigatorio,
  dica,
  min,
}: CampoTextoProps) {
  const idDica = dica ? `${idCampo(campo)}-dica` : undefined;
  return (
    <div className="campo">
      <label htmlFor={idCampo(campo)}>{rotulo}</label>
      <input
        id={idCampo(campo)}
        name={campo}
        type={tipo}
        min={min}
        autoComplete="off"
        aria-required={obrigatorio ? "true" : undefined}
        defaultValue={valores[campo] ?? ""}
        {...descricao(campo, erros[campo], idDica)}
      />
      {dica ? (
        <p id={idDica} className="campo-dica">
          {dica}
        </p>
      ) : null}
      <MensagemErro campo={campo} erro={erros[campo]} />
    </div>
  );
}

interface CamposTurmaProps {
  modo: Modo;
  estado: EstadoTurma;
  pendente: boolean;
}

/** Campos da turma (presentacional). */
export function CamposTurma({ modo, estado, pendente }: CamposTurmaProps) {
  const erros = estado.errosCampos ?? {};
  const v: Valores = estado.valores ?? {};
  return (
    <>
      {estado.erro ? (
        <p role="alert" className="login-alerta">
          {estado.erro}
        </p>
      ) : null}
      <CampoTexto campo="nome" rotulo="Nome" valores={v} erros={erros} obrigatorio />
      <CampoTexto
        campo="ciclo"
        rotulo="Ciclo (ano)"
        tipo="number"
        valores={v}
        erros={erros}
        obrigatorio
      />
      <div className="campo">
        <label htmlFor={idCampo("diaSemana")}>Dia da semana</label>
        <select
          id={idCampo("diaSemana")}
          name="diaSemana"
          aria-required="true"
          defaultValue={v.diaSemana ?? ""}
          {...descricao("diaSemana", erros.diaSemana)}
        >
          <option value="">Selecione</option>
          {DIAS_SEMANA.map((dia) => (
            <option key={dia} value={dia}>
              {ROTULO_DIA[dia]}
            </option>
          ))}
        </select>
        <MensagemErro campo="diaSemana" erro={erros.diaSemana} />
      </div>
      <CampoTexto
        campo="horario"
        rotulo="Horário"
        tipo="time"
        valores={v}
        erros={erros}
        obrigatorio
      />
      <CampoTexto campo="local" rotulo="Local" valores={v} erros={erros} />
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
      <CampoTexto
        campo="vagas"
        rotulo="Vagas"
        tipo="number"
        min={1}
        valores={v}
        erros={erros}
        dica="Deixe vazio para não limitar as vagas (sem limite)."
      />
      <button type="submit" className="botao botao-primario" disabled={pendente}>
        {pendente ? "Salvando…" : modo === "criar" ? "Criar turma" : "Salvar alterações"}
      </button>
    </>
  );
}

interface FormularioTurmaProps {
  modo: Modo;
  /** Server action já vinculada (ex.: `editarTurmaAction.bind(null, id)`). */
  acao: AcaoTurma;
  valoresIniciais?: Valores;
}

export function FormularioTurma({ modo, acao, valoresIniciais }: FormularioTurmaProps) {
  const [estado, enviar, pendente] = useActionState(acao, { valores: valoresIniciais });
  return (
    <form action={enviar} noValidate className="formulario">
      <CamposTurma
        // Remonta os campos a cada resposta para aplicar os defaultValue.
        key={JSON.stringify(estado)}
        modo={modo}
        estado={{ ...estado, valores: estado.valores ?? valoresIniciais }}
        pendente={pendente}
      />
    </form>
  );
}
