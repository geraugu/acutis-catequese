import "server-only";
import type { SessaoUsuario } from "@/modules/auth/dal";
import { podeVerCatequizandoRegra, podeVerTurmaRegra, type Ator } from "./domain/acesso";
import { catequistasDoCatequizando, designadosVigentes } from "./repositorio";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ator = (sessao: SessaoUsuario): Ator => ({ id: sessao.userId, papel: sessao.papel });

/** Reavaliado a cada chamada, sem cache (9.3, 9.4). Id inválido nega sem lançar. */
export async function podeVerTurma(sessao: SessaoUsuario, turmaId: string): Promise<boolean> {
  if (!UUID.test(turmaId)) return false;
  if (sessao.papel === "coordenacao") return true;
  return podeVerTurmaRegra(ator(sessao), await designadosVigentes(turmaId));
}

export async function podeVerCatequizando(
  sessao: SessaoUsuario,
  catequizandoId: string,
): Promise<boolean> {
  if (!UUID.test(catequizandoId)) return false;
  if (sessao.papel === "coordenacao") return true;
  return podeVerCatequizandoRegra(ator(sessao), await catequistasDoCatequizando(catequizandoId));
}
