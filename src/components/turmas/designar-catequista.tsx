"use client";

import { useActionState, useId } from "react";
import type { EstadoTurma } from "@/modules/turmas/actions";

/** Action de designação já vinculada ao id da turma (via bind). */
export type AcaoDesignar = (anterior: EstadoTurma, dados: FormData) => Promise<EstadoTurma>;

interface DesignarCatequistaProps {
  acao: AcaoDesignar;
  elegiveis: { id: string; nome: string }[];
}

/** Formulário de designação de catequista elegível (4.1, 4.4). */
export function DesignarCatequista({ acao, elegiveis }: DesignarCatequistaProps) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const idSelect = useId();

  if (elegiveis.length === 0) {
    return <p>Nenhum catequista disponível</p>;
  }

  return (
    <form action={enviar}>
      <div className="campo">
        <label htmlFor={idSelect}>Catequista</label>
        <select id={idSelect} name="userId" required>
          {elegiveis.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>
      {estado.erro ? <p role="alert">{estado.erro}</p> : null}
      <button type="submit" className="botao botao-primario" disabled={pendente}>
        Designar
      </button>
    </form>
  );
}
