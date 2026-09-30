"use client";

import { Confirmacao } from "@/components/comum/confirmacao";
import type { EstadoFormulario } from "@/modules/equipe/actions";
import type { Situacao } from "@/modules/equipe/domain/membro";

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
  const textos = TEXTOS[situacao];
  return (
    <Confirmacao
      rotuloAbrir={textos.abrir}
      titulo={`${textos.abrir} ${nome}?`}
      texto={textos.efeito}
      rotuloConfirmar={textos.confirmar}
      perigo={situacao === "ativo"}
      acao={situacao === "ativo" ? inativar : reativar}
    />
  );
}
