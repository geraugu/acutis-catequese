import "server-only";
import { redirect } from "next/navigation";
import { requireSession, type SessaoUsuario } from "@/modules/auth/dal";
import { podeVerTurma } from "@/modules/turmas/acesso";

/** Exige sessão e acesso à turma, reavaliado a cada chamada; sem acesso, /acesso-negado (1.10, 5.4). */
export async function autorizarTurma(turmaId: string): Promise<SessaoUsuario> {
  const sessao = await requireSession();
  if (!(await podeVerTurma(sessao, turmaId))) redirect("/acesso-negado");
  return sessao;
}
