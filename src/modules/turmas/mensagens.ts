export const CODIGOS_AVISO = [
  "turma-criada",
  "alteracoes-salvas",
  "turma-encerrada",
  "catequista-designado",
  "catequista-removido",
  "inscrito",
  "transferido",
  "desligado",
] as const;
export type CodigoAviso = (typeof CODIGOS_AVISO)[number];

export const MENSAGEM_AVISO: Record<CodigoAviso, string> = {
  "turma-criada": "Turma criada.",
  "alteracoes-salvas": "Alterações salvas.",
  "turma-encerrada": "Turma encerrada.",
  "catequista-designado": "Catequista designado.",
  "catequista-removido": "Catequista removido.",
  inscrito: "Catequizando inscrito.",
  transferido: "Catequizando transferido.",
  desligado: "Catequizando desligado.",
};

export const MSG_NOME_EM_USO = "Já existe uma turma aberta com este nome neste ciclo.";
export const MSG_TURMA_ENCERRADA = "Esta turma está encerrada e não pode ser alterada.";
export const MSG_JA_INSCRITO = "Este catequizando já está inscrito nesta turma.";

export function MSG_TRANSFERIR(turma: string): string {
  return `Já inscrito na turma ${turma}. Deseja transferir?`;
}

export function MSG_LOTADA(inscritos: number, vagas: number): string {
  return `Turma lotada (${inscritos} de ${vagas} vagas).`;
}

export function isCodigoAviso(valor: unknown): valor is CodigoAviso {
  return (CODIGOS_AVISO as readonly unknown[]).includes(valor);
}

/** Traduz o `?aviso=` da URL; só códigos conhecidos geram mensagem, o resto vira null. */
export function mensagemDeAviso(codigo: unknown): string | null {
  return isCodigoAviso(codigo) ? MENSAGEM_AVISO[codigo] : null;
}

export const MSG_ERRO_INESPERADO = "Não foi possível concluir agora. Tente novamente em instantes.";
