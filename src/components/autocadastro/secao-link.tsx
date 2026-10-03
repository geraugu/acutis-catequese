"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { type AcaoConfirmacao, Confirmacao } from "@/components/comum/confirmacao";
import { CopiarLink } from "./copiar-link";

/** Espelha `SituacaoLink` de domain/link (sem importar o domínio no cliente). */
export type SituacaoSecaoLink = "ativo" | "desativado" | "expirado";

/** Actions de link já vinculadas ao turmaId (devolvem `EstadoLink`). */
export interface AcoesLink {
  gerar: AcaoConfirmacao;
  desativar: AcaoConfirmacao;
  regenerar: AcaoConfirmacao;
  salvarExpiracao: AcaoConfirmacao;
}

export interface PropsSecaoLink {
  /** null = a turma nunca teve link. */
  situacao: SituacaoSecaoLink | null;
  /** Data civil aaaa-mm-dd. */
  expiraEm: string | null;
  /** Link completo; só quando ativo. */
  url: string | null;
  pendentes: number;
  linkPendentes: string;
  encerrada: boolean;
  acoes: AcoesLink;
}

const ROTULO_SITUACAO: Record<SituacaoSecaoLink, string> = {
  ativo: "Ativo",
  desativado: "Desativado",
  expirado: "Expirado",
};

function formatar(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function textoPendentes(n: number): string {
  return n === 1 ? "1 ficha pendente" : `${n} fichas pendentes`;
}

function GerarLink({ acao }: { acao: AcaoConfirmacao }) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form action={enviar}>
      {estado.erro ? <p role="alert">{estado.erro}</p> : null}
      <button type="submit" className="botao botao-primario" disabled={pendente}>
        Gerar link
      </button>
    </form>
  );
}

function EditarExpiracao({ acao, expiraEm }: { acao: AcaoConfirmacao; expiraEm: string | null }) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const id = useId();
  return (
    <form action={enviar} className="campo">
      <label htmlFor={id}>Expira em (deixe vazio para não expirar)</label>
      <input
        id={id}
        name="expiraEm"
        type="date"
        defaultValue={expiraEm ?? ""}
        aria-invalid={estado.erro ? true : undefined}
      />
      {estado.erro ? (
        <p role="alert" className="campo-erro">
          {estado.erro}
        </p>
      ) : null}
      <button type="submit" className="botao botao-secundario" disabled={pendente}>
        Salvar expiração
      </button>
    </form>
  );
}

/** Seção do link de autocadastro na página da turma (1.2, 1.5, 1.8, 1.9, 5.3). */
export function SecaoLink({
  situacao,
  expiraEm,
  url,
  pendentes,
  linkPendentes,
  encerrada,
  acoes,
}: PropsSecaoLink) {
  const situacaoFinal: SituacaoSecaoLink | null = encerrada ? "desativado" : situacao;
  const ativo = !encerrada && situacaoFinal === "ativo";
  // Link expirado continua sendo a linha ativa no banco: gerar daria conflito (1.3).
  const gerenciavel = ativo || (!encerrada && situacaoFinal === "expirado");
  return (
    <section className="turma-secao" aria-labelledby="turma-link">
      <h2 id="turma-link">Link de autocadastro</h2>
      <p>
        Situação: <strong>{situacaoFinal ? ROTULO_SITUACAO[situacaoFinal] : "Sem link"}</strong>
        {expiraEm && situacaoFinal !== null ? ` · expira em ${formatar(expiraEm)}` : null}
      </p>
      {ativo && url ? (
        <p>
          <code>{url}</code> <CopiarLink url={url} />
        </p>
      ) : null}
      {pendentes > 0 ? (
        <p>
          <Link href={linkPendentes}>{textoPendentes(pendentes)}</Link>
        </p>
      ) : null}
      {encerrada ? null : gerenciavel ? (
        <>
          <div className="membro-acoes">
            <Confirmacao
              rotuloAbrir="Regenerar link"
              titulo="Regenerar o link?"
              texto="O link atual deixará de funcionar e um novo será gerado."
              rotuloConfirmar="Regenerar"
              perigo
              acao={acoes.regenerar}
            />
            <Confirmacao
              rotuloAbrir="Desativar link"
              titulo="Desativar o link?"
              texto="O link deixará de aceitar novas fichas."
              rotuloConfirmar="Desativar"
              perigo
              acao={acoes.desativar}
            />
          </div>
          <EditarExpiracao acao={acoes.salvarExpiracao} expiraEm={expiraEm} />
        </>
      ) : (
        <GerarLink acao={acoes.gerar} />
      )}
    </section>
  );
}
