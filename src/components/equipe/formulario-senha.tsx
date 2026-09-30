"use client";

import { useActionState } from "react";
import type { EstadoFormulario } from "@/modules/equipe/actions";
import type { AcaoFormulario } from "@/components/equipe/formulario-membro";

interface CamposSenhaProps {
  estado: EstadoFormulario;
  pendente: boolean;
}

/** Campo único de nova senha (5.2); nunca reapresentado após erro. */
export function CamposSenha({ estado, pendente }: CamposSenhaProps) {
  const erro = estado.errosCampos?.senha;
  return (
    <>
      {estado.erro ? (
        <p role="alert" className="login-alerta">
          {estado.erro}
        </p>
      ) : null}
      <div className="campo">
        <label htmlFor="senha-nova">Nova senha</label>
        <input
          id="senha-nova"
          name="senha"
          type="password"
          autoComplete="new-password"
          aria-required="true"
          defaultValue=""
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? "senha-nova-erro" : undefined}
        />
        {erro ? (
          <p id="senha-nova-erro" className="campo-erro">
            {erro}
          </p>
        ) : null}
      </div>
      <button type="submit" className="botao botao-primario" disabled={pendente}>
        {pendente ? "Salvando…" : "Redefinir senha"}
      </button>
    </>
  );
}

export function FormularioSenha({ acao }: { acao: AcaoFormulario }) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form action={enviar} noValidate className="formulario">
      <CamposSenha key={JSON.stringify(estado)} estado={estado} pendente={pendente} />
    </form>
  );
}
