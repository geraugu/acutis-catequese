"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ROTULO_SACRAMENTO, SACRAMENTOS } from "@/modules/catequizandos/domain/ficha";
import type { EstadoFicha } from "@/modules/catequizandos/actions";
import { MSG_POSSIVEL_DUPLICADO } from "@/modules/catequizandos/mensagens";

export type AcaoFicha = (anterior: EstadoFicha, dados: FormData) => Promise<EstadoFicha>;

type Modo = "criacao" | "edicao";
type Valores = NonNullable<EstadoFicha["valores"]>;

interface CamposFichaProps {
  modo: Modo;
  estado: EstadoFicha;
  pendente: boolean;
}

function idCampo(campo: string) {
  return `ficha-${campo}`;
}

function idErro(campo: string) {
  return `ficha-${campo}-erro`;
}

function ariaErro(erro: string | undefined, campo: string) {
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

interface CampoTextoProps {
  campo: string;
  rotulo: string;
  tipo?: string;
  valores: Valores;
  erros: Partial<Record<string, string>>;
  obrigatorio?: boolean;
  autoComplete?: string;
}

function CampoTexto({
  campo,
  rotulo,
  tipo = "text",
  valores,
  erros,
  obrigatorio,
  autoComplete = "off",
}: CampoTextoProps) {
  return (
    <div className="campo">
      <label htmlFor={idCampo(campo)}>{rotulo}</label>
      <input
        id={idCampo(campo)}
        name={campo}
        type={tipo}
        autoComplete={autoComplete}
        aria-required={obrigatorio ? "true" : undefined}
        defaultValue={valores[campo] ?? ""}
        {...ariaErro(erros[campo], campo)}
      />
      <MensagemErro campo={campo} erro={erros[campo]} />
    </div>
  );
}

/**
 * Campos da ficha (presentacional). Sem JavaScript, data e paróquia de cada
 * sacramento ficam sempre visíveis; o servidor descarta quando não recebido.
 */
export function CamposFicha({ modo, estado, pendente }: CamposFichaProps) {
  const erros = estado.errosCampos ?? {};
  const v: Valores = estado.valores ?? {};
  return (
    <>
      {estado.erro ? (
        <p role="alert" className="login-alerta">
          {estado.erro}
        </p>
      ) : null}
      {estado.duplicado ? (
        <div role="alert" className="ficha-duplicado">
          <p>{MSG_POSSIVEL_DUPLICADO}</p>
          <p>
            Ficha existente:{" "}
            <Link href={`/coordenacao/catequizandos/${estado.duplicado.id}`}>
              {estado.duplicado.nome}
            </Link>
          </p>
        </div>
      ) : null}
      <CampoTexto
        campo="nome"
        rotulo="Nome"
        valores={v}
        erros={erros}
        obrigatorio
        autoComplete="name"
      />
      <CampoTexto
        campo="dataNascimento"
        rotulo="Data de nascimento"
        tipo="date"
        valores={v}
        erros={erros}
        obrigatorio
      />
      <CampoTexto campo="telefone" rotulo="Telefone" tipo="tel" valores={v} erros={erros} />
      <CampoTexto campo="email" rotulo="E-mail" tipo="email" valores={v} erros={erros} />
      <CampoTexto campo="endereco" rotulo="Endereço" valores={v} erros={erros} />
      {SACRAMENTOS.map((s) => (
        <fieldset key={s} className="ficha-sacramento">
          <legend>{ROTULO_SACRAMENTO[s]}</legend>
          <label htmlFor={idCampo(`${s}Recebido`)} className="ficha-sacramento-recebido">
            <input
              id={idCampo(`${s}Recebido`)}
              type="checkbox"
              name={`${s}Recebido`}
              defaultChecked={v[`${s}Recebido`] === "on"}
              {...ariaErro(erros[`${s}Recebido`], `${s}Recebido`)}
            />
            Recebido
          </label>
          <MensagemErro campo={`${s}Recebido`} erro={erros[`${s}Recebido`]} />
          <CampoTexto campo={`${s}Data`} rotulo="Data" tipo="date" valores={v} erros={erros} />
          <CampoTexto campo={`${s}Paroquia`} rotulo="Paróquia" valores={v} erros={erros} />
        </fieldset>
      ))}
      <div className="campo">
        <label htmlFor="ficha-observacoes">Observações</label>
        <textarea
          id="ficha-observacoes"
          name="observacoes"
          defaultValue={v.observacoes ?? ""}
          aria-invalid={erros.observacoes ? true : undefined}
          aria-describedby={
            erros.observacoes
              ? `ficha-observacoes-dica ${idErro("observacoes")}`
              : "ficha-observacoes-dica"
          }
        />
        <p id="ficha-observacoes-dica" className="campo-dica">
          Registre só o necessário para o acompanhamento pastoral.
        </p>
        <MensagemErro campo="observacoes" erro={erros.observacoes} />
      </div>
      <button type="submit" className="botao botao-primario" disabled={pendente}>
        {pendente
          ? "Salvando…"
          : modo === "criacao"
            ? "Cadastrar catequizando"
            : "Salvar alterações"}
      </button>
      {estado.duplicado ? (
        // Depois do botão principal: o envio implícito (Enter) nunca confirma duplicidade.
        <button
          type="submit"
          name="confirmarDuplicidade"
          value="1"
          className="botao"
          disabled={pendente}
        >
          Salvar mesmo assim
        </button>
      ) : null}
    </>
  );
}

interface FormularioFichaProps {
  modo: Modo;
  /** Server action já vinculada (ex.: `editarCatequizandoAction.bind(null, id)`). */
  acao: AcaoFicha;
  valoresIniciais?: Valores;
}

export function FormularioFicha({ modo, acao, valoresIniciais }: FormularioFichaProps) {
  const [estado, enviar, pendente] = useActionState(acao, { valores: valoresIniciais });
  return (
    <form action={enviar} noValidate className="formulario">
      <CamposFicha
        // Remonta os campos a cada resposta para aplicar os defaultValue.
        key={JSON.stringify(estado)}
        modo={modo}
        estado={{ ...estado, valores: estado.valores ?? valoresIniciais }}
        pendente={pendente}
      />
    </form>
  );
}
