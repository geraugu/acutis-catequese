"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import type { EstadoFormulario } from "@/modules/equipe/actions";
import type { Situacao } from "@/modules/equipe/domain/membro";
import estilos from "./acoes-situacao.module.css";

/** Action de situação já vinculada ao id do membro (via bind). */
export type AcaoSituacao = (anterior: EstadoFormulario) => Promise<EstadoFormulario>;

interface AcoesSituacaoProps {
  nome: string;
  situacao: Situacao;
  inativar: AcaoSituacao;
  reativar: AcaoSituacao;
}

const TEXTOS = {
  ativo: {
    abrir: "Inativar",
    confirmar: "Inativar",
    efeito:
      "A pessoa deixa de entrar no sistema e as sessões abertas são encerradas. O cadastro é mantido e pode ser reativado depois.",
  },
  inativo: {
    abrir: "Reativar",
    confirmar: "Reativar",
    efeito: "A pessoa volta a entrar no sistema com o mesmo e-mail e senha.",
  },
} as const;

/** Botão com confirmação nomeada em <dialog> modal para inativar ou reativar (6.2). */
export function AcoesSituacao({ nome, situacao, inativar, reativar }: AcoesSituacaoProps) {
  const acao = situacao === "ativo" ? inativar : reativar;
  const [estado, enviar, pendente] = useActionState(acao, {});
  const [aberto, setAberto] = useState(false);
  const dialogo = useRef<HTMLDialogElement>(null);
  const textos = TEXTOS[situacao];
  const tituloId = useId();

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
        className={`botao ${situacao === "ativo" ? estilos.perigo : "botao-secundario"}`}
        onClick={() => setAberto(true)}
      >
        {textos.abrir}
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
              {textos.abrir} {nome}?
            </h2>
            <p className={estilos.texto}>{textos.efeito}</p>
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
                className={`botao ${situacao === "ativo" ? estilos.perigo : "botao-primario"}`}
                disabled={pendente}
              >
                {textos.confirmar}
              </button>
            </div>
          </form>
        ) : null}
      </dialog>
    </>
  );
}
