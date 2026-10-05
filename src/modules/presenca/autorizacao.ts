import "server-only";
import { redirect } from "next/navigation";
import { requireRole, requireSession, type SessaoUsuario } from "@/modules/auth/dal";
import { podeVerCatequizando, podeVerTurma } from "@/modules/turmas/acesso";
import { turmasAbertasDoCatequista } from "./repositorio";

// Sessão e acesso são reavaliados a cada chamada (sem cache), antes de qualquer leitura de dados.

/** Exige sessão e acesso à turma; sem acesso, /acesso-negado (1.2, 1.3, 1.4, 1.5). */
export async function autorizarTurma(turmaId: string): Promise<SessaoUsuario> {
  const sessao = await requireSession();
  if (!(await podeVerTurma(sessao, turmaId))) redirect("/acesso-negado");
  return sessao;
}

/** Exige sessão e acesso ao catequizando; sem acesso, /acesso-negado (1.2, 1.3, 1.4, 1.5). */
export async function autorizarCatequizando(catequizandoId: string): Promise<SessaoUsuario> {
  const sessao = await requireSession();
  if (!(await podeVerCatequizando(sessao, catequizandoId))) redirect("/acesso-negado");
  return sessao;
}

/** Exige o papel coordenação; o catequista é enviado a /acesso-negado (1.1). */
export function exigirCoordenacao(): Promise<SessaoUsuario> {
  return requireRole(["coordenacao"]);
}

/** Turmas que o usuário enxerga: todas (coordenação) ou as abertas que conduz (1.2, 1.3). */
export async function turmasDoUsuario(sessao: SessaoUsuario): Promise<string[] | "todas"> {
  if (sessao.papel === "coordenacao") return "todas";
  return turmasAbertasDoCatequista(sessao.userId);
}
