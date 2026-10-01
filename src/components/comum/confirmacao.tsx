"use client";

import { type ReactNode, useActionState, useEffect, useId, useRef, useState } from "react";
import estilos from "./confirmacao.module.css";

export interface EstadoConfirmacao {
  erro?: string;
}

/**
 * Action já vinculada (via bind) executada ao confirmar. Recebe o FormData do
 * formulário do diálogo — útil quando há campos extras passados como `children`.
 */
export type AcaoConfirmacao = (
  anterior: EstadoConfirmacao,
  dados: FormData,
) => Promise<EstadoConfirmacao>;

interface ConfirmacaoProps {
  rotuloAbrir: string;
  titulo: string;
  texto: string;
  rotuloConfirmar: string;
  perigo?: boolean;
  acao: AcaoConfirmacao;
  /** Campos extras renderizados dentro do formulário (enviados junto na confirmação). */
  children?: ReactNode;
}

/** Botão que abre um <dialog> modal de confirmação; o erro da ação aparece como alerta. */
export function Confirmacao({
  rotuloAbrir,
  titulo,
  texto,
  rotuloConfirmar,
  perigo = false,
  acao,
  children,
}: ConfirmacaoProps) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const [aberto, setAberto] = useState(false);
  const dialogo = useRef<HTMLDialogElement>(null);
  const tituloId = useId();
  const classeAcao = perigo ? estilos.perigo : undefined;

  useEffect(() => {
    const el = dialogo.current;
    if (!el) return;
    if (aberto && !el.open) el.showModal();
    if (!aberto && el.open) el.close();
  }, [aberto]);

  return (
    <>
      <button
        type="button"
        className={`botao ${classeAcao ?? "botao-secundario"}`}
        onClick={() => setAberto(true)}
      >
        {rotuloAbrir}
      </button>
      <dialog
        ref={dialogo}
        className={estilos.dialogo}
        aria-labelledby={tituloId}
        onClose={() => setAberto(false)}
      >
        {aberto ? (
          <form action={enviar}>
            <h2 id={tituloId} className={estilos.titulo}>
              {titulo}
            </h2>
            <p className={estilos.texto}>{texto}</p>
            {children}
            {estado.erro ? (
              <p role="alert" className={estilos.alerta}>
                {estado.erro}
              </p>
            ) : null}
            <div className={estilos.botoes}>
              <button
                type="button"
                className="botao botao-secundario"
                autoFocus
                onClick={() => setAberto(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`botao ${classeAcao ?? "botao-primario"}`}
                disabled={pendente}
              >
                {rotuloConfirmar}
              </button>
            </div>
          </form>
        ) : null}
      </dialog>
    </>
  );
}
