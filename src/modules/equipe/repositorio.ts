import "server-only";
import { prisma } from "@/lib/prisma";
import { isPapel, type Papel } from "@/modules/auth/domain/papeis";
import type { Situacao } from "./domain/membro";

export interface MembroResumo {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  telefone: string | null;
  situacao: Situacao;
}

export interface MembroDetalhe extends MembroResumo {
  observacoes: string | null;
  criadoEm: Date;
}

const selecao = {
  id: true,
  name: true,
  email: true,
  role: true,
  banned: true,
  createdAt: true,
  perfil: { select: { telefone: true, observacoes: true } },
} as const;

type Linha = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  createdAt: Date;
  perfil: { telefone: string; observacoes: string | null } | null;
};

function paraDetalhe(u: Linha): MembroDetalhe | null {
  if (!isPapel(u.role)) return null;
  return {
    id: u.id,
    nome: u.name,
    email: u.email,
    papel: u.role,
    telefone: u.perfil?.telefone ?? null,
    situacao: u.banned ? "inativo" : "ativo",
    observacoes: u.perfil?.observacoes ?? null,
    criadoEm: u.createdAt,
  };
}

/** Todos os membros (o filtro é feito no domínio); omite papéis inválidos. */
export async function listarMembros(): Promise<MembroResumo[]> {
  const linhas = await prisma.user.findMany({ select: selecao, orderBy: { name: "asc" } });
  const membros: MembroResumo[] = [];
  for (const linha of linhas) {
    const d = paraDetalhe(linha);
    if (d) {
      const { id, nome, email, papel, telefone, situacao } = d;
      membros.push({ id, nome, email, papel, telefone, situacao });
    }
  }
  return membros;
}

export async function obterMembro(id: string): Promise<MembroDetalhe | null> {
  const linha = await prisma.user.findUnique({ where: { id }, select: selecao });
  return linha ? paraDetalhe(linha) : null;
}

/** O e-mail já está gravado em minúsculas; `excetoId` ignora o próprio membro. */
export async function emailEmUso(email: string, excetoId?: string): Promise<boolean> {
  const n = await prisma.user.count({
    where: { email, ...(excetoId ? { id: { not: excetoId } } : {}) },
  });
  return n > 0;
}

export async function salvarPerfil(
  userId: string,
  dados: { telefone: string; observacoes?: string },
): Promise<void> {
  const valores = { telefone: dados.telefone, observacoes: dados.observacoes ?? null };
  await prisma.perfilMembro.upsert({
    where: { userId },
    create: { userId, ...valores },
    update: valores,
  });
}

export async function contarCoordenacoesAtivas(): Promise<number> {
  return prisma.user.count({
    where: { role: "coordenacao", OR: [{ banned: false }, { banned: null }] },
  });
}
