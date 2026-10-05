"use client";

import { useActionState } from "react";

import type { EstadoPresenca } from "@/modules/presenca/actions";

export type AcaoLimite = (anterior: EstadoPresenca, dados: FormData) => Promise<EstadoPresenca>;

interface FormularioLimiteProps {
  limiteAtual: number;
  salvarLimiteAction: AcaoLimite;
}

/** Formulário do limite de frequência (7.6, 7.7). */
export function FormularioLimite({ limiteAtual, salvarLimiteAction }: FormularioLimiteProps) {
  const [estado, enviar, pendente] = useActionState<EstadoPresenca, FormData>(
    salvarLimiteAction,
    {},
  );
  const erro = estado.errosCampos?.percentual;
  return (
    <form action={enviar} noValidate className="formulario">
      {estado.erro ? (
        <p role="alert" className="login-alerta">
          {estado.erro}
        </p>
      ) : null}
      <div className="campo">
        <label htmlFor="limite-percentual">Limite de frequência (%)</label>
        <input
          // Remonta o campo a cada resposta para aplicar o valor devolvido.
          key={JSON.stringify(estado)}
          id="limite-percentual"
          name="percentual"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-required="true"
          defaultValue={estado.valores?.percentual ?? String(limiteAtual)}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? "limite-percentual-erro" : undefined}
        />
        {erro ? (
          <p id="limite-percentual-erro" className="campo-erro">
            {erro}
          </p>
        ) : null}
      </div>
      <button type="submit" className="botao botao-primario" disabled={pendente}>
        {pendente ? "Salvando…" : "Salvar limite"}
      </button>
    </form>
  );
}
