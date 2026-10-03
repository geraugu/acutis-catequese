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
  /**
   * Prefixo dos ids e referências aria (padrão `"ficha"`). Use um valor distinto
   * quando houver mais de um formulário de ficha na mesma página.
   */
  idPrefixo?: string;
}

const PREFIXO_PADRAO = "ficha";

function idCampo(prefixo: string, campo: string) {
  return `${prefixo}-${campo}`;
}

function idErro(prefixo: string, campo: string) {
  return `${prefixo}-${campo}-erro`;
}

function ariaErro(prefixo: string, erro: string | undefined, campo: string) {
  return {
    "aria-invalid": erro ? true : undefined,
    "aria-describedby": erro ? idErro(prefixo, campo) : undefined,
  } as const;
}

function MensagemErro({ prefixo, campo, erro }: { prefixo: string; campo: string; erro?: string }) {
  return erro ? (
    <p id={idErro(prefixo, campo)} className="campo-erro">
      {erro}
    </p>
  ) : null;
}

interface CampoTextoProps {
  prefixo: string;
  campo: string;
  rotulo: string;
  tipo?: string;
  valores: Valores;
  erros: Partial<Record<string, string>>;
  obrigatorio?: boolean;
  autoComplete?: string;
}

function CampoTexto({
  prefixo,
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
      <label htmlFor={idCampo(prefixo, campo)}>{rotulo}</label>
      <input
        id={idCampo(prefixo, campo)}
        name={campo}
        type={tipo}
        autoComplete={autoComplete}
        aria-required={obrigatorio ? "true" : undefined}
        defaultValue={valores[campo] ?? ""}
        {...ariaErro(prefixo, erros[campo], campo)}
      />
      <MensagemErro prefixo={prefixo} campo={campo} erro={erros[campo]} />
    </div>
  );
}

/**
 * Campos da ficha (presentacional). Sem JavaScript, data e paróquia de cada
 * sacramento ficam sempre visíveis; o servidor descarta quando não recebido.
 */
export function CamposFicha({
  modo,
  estado,
  pendente,
  idPrefixo = PREFIXO_PADRAO,
}: CamposFichaProps) {
  const p = idPrefixo;
  const idDicaObs = `${p}-observacoes-dica`;
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
        prefixo={p}
        campo="nome"
        rotulo="Nome"
        valores={v}
        erros={erros}
        obrigatorio
        autoComplete="name"
      />
      <CampoTexto
        prefixo={p}
        campo="dataNascimento"
        rotulo="Data de nascimento"
        tipo="date"
        valores={v}
        erros={erros}
        obrigatorio
      />
      <CampoTexto
        prefixo={p}
        campo="telefone"
        rotulo="Telefone"
        tipo="tel"
        valores={v}
        erros={erros}
      />
      <CampoTexto
        prefixo={p}
        campo="email"
        rotulo="E-mail"
        tipo="email"
        valores={v}
        erros={erros}
      />
      <CampoTexto prefixo={p} campo="endereco" rotulo="Endereço" valores={v} erros={erros} />
      {SACRAMENTOS.map((s) => (
        <fieldset key={s} className="ficha-sacramento">
          <legend>{ROTULO_SACRAMENTO[s]}</legend>
          <label htmlFor={idCampo(p, `${s}Recebido`)} className="ficha-sacramento-recebido">
            <input
              id={idCampo(p, `${s}Recebido`)}
              type="checkbox"
              name={`${s}Recebido`}
              defaultChecked={v[`${s}Recebido`] === "on"}
              {...ariaErro(p, erros[`${s}Recebido`], `${s}Recebido`)}
            />
            Recebido
          </label>
          <MensagemErro prefixo={p} campo={`${s}Recebido`} erro={erros[`${s}Recebido`]} />
          <CampoTexto
            prefixo={p}
            campo={`${s}Data`}
            rotulo="Data"
            tipo="date"
            valores={v}
            erros={erros}
          />
          <CampoTexto
            prefixo={p}
            campo={`${s}Paroquia`}
            rotulo="Paróquia"
            valores={v}
            erros={erros}
          />
        </fieldset>
      ))}
      <div className="campo">
        <label htmlFor={idCampo(p, "observacoes")}>Observações</label>
        <textarea
          id={idCampo(p, "observacoes")}
          name="observacoes"
          defaultValue={v.observacoes ?? ""}
          aria-invalid={erros.observacoes ? true : undefined}
          aria-describedby={
            erros.observacoes ? `${idDicaObs} ${idErro(p, "observacoes")}` : idDicaObs
          }
        />
        <p id={idDicaObs} className="campo-dica">
          Registre só o necessário para o acompanhamento pastoral.
        </p>
        <MensagemErro prefixo={p} campo="observacoes" erro={erros.observacoes} />
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
