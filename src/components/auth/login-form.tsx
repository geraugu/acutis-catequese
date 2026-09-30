"use client";

import { useActionState } from "react";
import { entrarAction, type EstadoLogin } from "@/modules/auth/actions";

const ESTADO_INICIAL: EstadoLogin = {};

interface CamposLoginProps {
  estado: EstadoLogin;
  pendente: boolean;
  callbackUrl?: string;
}

/**
 * Campos do formulário de login (presentacional; testável sem a action).
 * `aria-required` em vez de `required`: o formulário usa `noValidate` para que
 * as mensagens de validação em pt-BR venham sempre do servidor (3.3), de forma
 * consistente, sem os balões nativos do navegador.
 */
export function CamposLogin({ estado, pendente, callbackUrl }: CamposLoginProps) {
  const erroEmail = estado.errosCampos?.email;
  const erroSenha = estado.errosCampos?.senha;
  return (
    <>
      {estado.erro ? (
        <p role="alert" className="login-alerta">
          {estado.erro}
        </p>
      ) : null}
      {callbackUrl ? <input type="hidden" name="callbackUrl" value={callbackUrl} /> : null}
      <div className="campo">
        <label htmlFor="login-email">E-mail</label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          aria-required="true"
          aria-invalid={erroEmail ? true : undefined}
          aria-describedby={erroEmail ? "login-email-erro" : undefined}
          defaultValue={estado.email ?? ""}
        />
        {erroEmail ? (
          <p id="login-email-erro" className="campo-erro">
            {erroEmail}
          </p>
        ) : null}
      </div>
      <div className="campo">
        <label htmlFor="login-senha">Senha</label>
        <input
          id="login-senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          aria-required="true"
          aria-invalid={erroSenha ? true : undefined}
          aria-describedby={erroSenha ? "login-senha-erro" : undefined}
        />
        {erroSenha ? (
          <p id="login-senha-erro" className="campo-erro">
            {erroSenha}
          </p>
        ) : null}
      </div>
      <button type="submit" className="botao botao-primario" disabled={pendente}>
        {pendente ? "Entrando…" : "Entrar"}
      </button>
    </>
  );
}

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [estado, acao, pendente] = useActionState(entrarAction, ESTADO_INICIAL);
  return (
    <form action={acao} noValidate className="login-form">
      <CamposLogin
        // Remonta os campos a cada resposta para aplicar o defaultValue do e-mail.
        key={JSON.stringify(estado)}
        estado={estado}
        pendente={pendente}
        callbackUrl={callbackUrl}
      />
    </form>
  );
}
