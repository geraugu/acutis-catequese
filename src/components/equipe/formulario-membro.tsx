"use client";

import { useActionState } from "react";
import { PAPEIS, ROTULO_PAPEL } from "@/modules/auth/domain/papeis";
import type { EstadoFormulario } from "@/modules/equipe/actions";

export type AcaoFormulario = (
  anterior: EstadoFormulario,
  dados: FormData,
) => Promise<EstadoFormulario>;

type Modo = "criacao" | "edicao";
type Valores = NonNullable<EstadoFormulario["valores"]>;

interface CamposMembroProps {
  modo: Modo;
  estado: EstadoFormulario;
  pendente: boolean;
}

function idErro(campo: string) {
  return `membro-${campo}-erro`;
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

/**
 * Campos do membro (presentacional). A senha só existe na criação (4.6) e nunca
 * é reapresentada (2.10); o papel vem com catequista pré-selecionado (2.6).
 */
export function CamposMembro({ modo, estado, pendente }: CamposMembroProps) {
  const erros = estado.errosCampos ?? {};
  const v: Valores = estado.valores ?? {};
  const papel = v.papel ?? "catequista";
  return (
    <>
      {estado.erro ? (
        <p role="alert" className="login-alerta">
          {estado.erro}
        </p>
      ) : null}
      <div className="campo">
        <label htmlFor="membro-nome">Nome</label>
        <input
          id="membro-nome"
          name="nome"
          type="text"
          autoComplete="name"
          aria-required="true"
          defaultValue={v.nome ?? ""}
          {...ariaErro(erros.nome, "nome")}
        />
        <MensagemErro campo="nome" erro={erros.nome} />
      </div>
      <div className="campo">
        <label htmlFor="membro-email">E-mail</label>
        <input
          id="membro-email"
          name="email"
          type="email"
          autoComplete="off"
          aria-required="true"
          defaultValue={v.email ?? ""}
          {...ariaErro(erros.email, "email")}
        />
        <MensagemErro campo="email" erro={erros.email} />
      </div>
      <div className="campo">
        <label htmlFor="membro-telefone">Telefone</label>
        <input
          id="membro-telefone"
          name="telefone"
          type="tel"
          autoComplete="off"
          defaultValue={v.telefone ?? ""}
          {...ariaErro(erros.telefone, "telefone")}
        />
        <MensagemErro campo="telefone" erro={erros.telefone} />
      </div>
      <fieldset className="campo" {...ariaErro(erros.papel, "papel")}>
        <legend>Papel</legend>
        {PAPEIS.map((p) => (
          <label key={p} htmlFor={`membro-papel-${p}`}>
            <input
              id={`membro-papel-${p}`}
              type="radio"
              name="papel"
              value={p}
              defaultChecked={papel === p}
            />
            {ROTULO_PAPEL[p]}
          </label>
        ))}
        <MensagemErro campo="papel" erro={erros.papel} />
      </fieldset>
      {modo === "criacao" ? (
        <div className="campo">
          <label htmlFor="membro-senha">Senha inicial</label>
          <input
            id="membro-senha"
            name="senha"
            type="password"
            autoComplete="new-password"
            aria-required="true"
            defaultValue=""
            {...ariaErro(erros.senha, "senha")}
          />
          <MensagemErro campo="senha" erro={erros.senha} />
        </div>
      ) : null}
      <div className="campo">
        <label htmlFor="membro-observacoes">Observações</label>
        <textarea
          id="membro-observacoes"
          name="observacoes"
          defaultValue={v.observacoes ?? ""}
          aria-invalid={erros.observacoes ? true : undefined}
          aria-describedby={
            erros.observacoes ? `membro-observacoes-dica ${idErro("observacoes")}` : "membro-observacoes-dica"
          }
        />
        <p id="membro-observacoes-dica" className="campo-dica">
          Não registre dados sensíveis (saúde, documentos, informações familiares).
        </p>
        <MensagemErro campo="observacoes" erro={erros.observacoes} />
      </div>
      <button type="submit" className="botao botao-primario" disabled={pendente}>
        {pendente ? "Salvando…" : modo === "criacao" ? "Cadastrar membro" : "Salvar alterações"}
      </button>
    </>
  );
}

interface FormularioMembroProps {
  modo: Modo;
  /** Server action já vinculada (ex.: `editarMembroAction.bind(null, id)`). */
  acao: AcaoFormulario;
  valoresIniciais?: Valores;
}

export function FormularioMembro({ modo, acao, valoresIniciais }: FormularioMembroProps) {
  const [estado, enviar, pendente] = useActionState(acao, { valores: valoresIniciais });
  return (
    <form action={enviar} noValidate className="formulario">
      <CamposMembro
        // Remonta os campos a cada resposta para aplicar os defaultValue.
        key={JSON.stringify(estado)}
        modo={modo}
        estado={estado}
        pendente={pendente}
      />
    </form>
  );
}
