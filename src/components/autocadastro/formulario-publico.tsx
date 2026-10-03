"use client";

import { useActionState } from "react";
import { CamposFicha } from "@/components/catequizandos/formulario-ficha";
import type { EstadoEnvio } from "@/modules/autocadastro/actions-publicas";
import { TEXTO_CONSENTIMENTO } from "@/modules/autocadastro/domain/consentimento";
import {
  CAMPO_CONSENTIMENTO,
  MSG_INDISPONIVEL,
  MSG_LIMITE,
  MSG_RECEBIDA,
} from "@/modules/autocadastro/mensagens";
import estilos from "@/app/inscricao/[token]/inscricao.module.css";

export type AcaoEnvio = (anterior: EstadoEnvio, dados: FormData) => Promise<EstadoEnvio>;

const PREFIXO = "autocadastro";
const ID_CONSENTIMENTO = `${PREFIXO}-${CAMPO_CONSENTIMENTO}`;
const ID_ERRO_CONSENTIMENTO = `${ID_CONSENTIMENTO}-erro`;
const ESTADO_INICIAL: EstadoEnvio = { tipo: "inicial" };
const MSG_RESUMO_ERROS = "Confira os campos destacados e corrija para enviar.";

interface FormularioPublicoProps {
  /** `enviarFichaAction` já vinculada ao token. */
  acao: AcaoEnvio;
  estadoInicial?: EstadoEnvio;
}

export function FormularioPublico({ acao, estadoInicial }: FormularioPublicoProps) {
  const [estado, enviar, pendente] = useActionState(acao, estadoInicial ?? ESTADO_INICIAL);

  if (estado.tipo === "recebida") {
    // Nunca repete os dados enviados (3.6).
    return (
      <p role="status" className={estilos.recebida}>
        {MSG_RECEBIDA}
      </p>
    );
  }
  if (estado.tipo === "indisponivel") {
    return (
      <p role="alert" className={estilos.aviso}>
        {MSG_INDISPONIVEL}
      </p>
    );
  }

  const invalido = estado.tipo === "invalido" ? estado : null;
  const erroConsentimento = invalido?.erroConsentimento;
  const valores = invalido?.valores ?? {};
  return (
    <form action={enviar} noValidate className={`formulario ${estilos.formulario}`}>
      {estado.tipo === "limite" ? (
        <p role="alert" className="login-alerta">
          {MSG_LIMITE}
        </p>
      ) : null}
      <CamposFicha
        // Remonta os campos a cada resposta para aplicar os defaultValue.
        key={JSON.stringify(estado)}
        modo="criacao"
        idPrefixo={PREFIXO}
        estado={{
          errosCampos: invalido?.errosCampos,
          valores,
          erro: invalido ? MSG_RESUMO_ERROS : undefined,
        }}
        pendente={pendente}
        textoEnviar="Enviar ficha"
        dicaObservacoes="Se quiser, conte algo que ajude o catequista a acolher melhor."
        antesDoEnvio={
          <div className={estilos.consentimento}>
            <input
              id={ID_CONSENTIMENTO}
              type="checkbox"
              name={CAMPO_CONSENTIMENTO}
              defaultChecked={valores[CAMPO_CONSENTIMENTO] === "on"}
              aria-required="true"
              aria-invalid={erroConsentimento ? true : undefined}
              aria-describedby={erroConsentimento ? ID_ERRO_CONSENTIMENTO : undefined}
            />
            <label htmlFor={ID_CONSENTIMENTO}>{TEXTO_CONSENTIMENTO}</label>
            {erroConsentimento ? (
              <p id={ID_ERRO_CONSENTIMENTO} className="campo-erro">
                {erroConsentimento}
              </p>
            ) : null}
          </div>
        }
      />
    </form>
  );
}
