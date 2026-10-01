import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/modules/auth/dal";
import { listarTurmas } from "@/modules/turmas/repositorio";
import { hojeCivil } from "@/modules/compartilhado/datas";
import {
  cicloPadrao,
  filtrarTurmas,
  type FiltroSituacaoTurma,
} from "@/modules/turmas/domain/filtros";
import { mensagemDeAviso } from "@/modules/turmas/mensagens";
import { Aviso } from "@/components/comum/aviso";
import { FiltrosTurmas } from "@/components/turmas/filtros-turmas";
import { ListaTurmas } from "@/components/turmas/lista-turmas";

export const metadata: Metadata = {
  title: "Turmas — Acutis Catequese",
};

type Params = Record<string, string | string[] | undefined>;

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

function lerSituacao(valor: string | undefined): FiltroSituacaoTurma {
  return valor === "encerradas" || valor === "todas" ? valor : "abertas";
}

function lerCiclo(valor: string | undefined, padrao: number): number | "todos" {
  if (valor === "todos") return "todos";
  return valor !== undefined && /^\d{4}$/.test(valor) ? Number(valor) : padrao;
}

export default async function TurmasPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireRole(["coordenacao"], "/coordenacao/turmas");
  const params = await searchParams;
  const anoAtual = Number(hojeCivil().slice(0, 4));

  // listarTurmas já devolve as turmas ordenadas por dia, horário e nome (ordenarTurmas).
  const turmas = await listarTurmas();
  const existentes = [...new Set(turmas.map((t) => t.ciclo))].sort((a, b) => b - a);
  const situacao = lerSituacao(primeiro(params.situacao));
  const ciclo = lerCiclo(primeiro(params.ciclo), cicloPadrao(existentes, anoAtual));
  const ciclos =
    typeof ciclo === "number" && !existentes.includes(ciclo)
      ? [...existentes, ciclo].sort((a, b) => b - a)
      : existentes;
  const filtradas = filtrarTurmas(turmas, { situacao, ciclo });

  return (
    <>
      <div className="pagina-cabecalho">
        <h1>Turmas</h1>
        <Link href="/coordenacao/turmas/nova" className="botao botao-primario">
          Nova turma
        </Link>
      </div>
      <Aviso mensagem={mensagemDeAviso(primeiro(params.aviso))} />
      <FiltrosTurmas situacao={situacao} ciclo={ciclo} ciclos={ciclos} />
      {filtradas.length === 0 ? (
        <div className="lista-vazia">
          <h2>Nenhuma turma encontrada</h2>
          <p>Mude os filtros ou crie uma nova turma.</p>
          <Link href="/coordenacao/turmas" className="botao botao-secundario">
            Limpar filtros
          </Link>
        </div>
      ) : (
        <ListaTurmas turmas={filtradas} base="/coordenacao/turmas" />
      )}
    </>
  );
}
