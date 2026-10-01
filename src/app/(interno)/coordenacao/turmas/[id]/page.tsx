import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/modules/auth/dal";
import {
  catequistasElegiveis,
  catequizandosParaInscricao,
  obterTurma,
} from "@/modules/turmas/repositorio";
import {
  desligarAction,
  designarCatequistaAction,
  encerrarTurmaAction,
  inscreverAction,
  removerCatequistaAction,
} from "@/modules/turmas/actions";
import { mensagemDeAviso } from "@/modules/turmas/mensagens";
import {
  ROTULO_DIA,
  estaLotada,
  formatarHorario,
  formatarOcupacao,
} from "@/modules/turmas/domain/turma";
import { formatarData, hojeCivil } from "@/modules/compartilhado/datas";
import { Aviso } from "@/components/comum/aviso";
import { DesignarCatequista } from "@/components/turmas/designar-catequista";
import { EncerrarTurma, RemoverCatequista } from "@/components/turmas/acoes-turma";
import { InscreverCatequizando } from "@/components/turmas/inscrever-catequizando";
import { Inscritos } from "@/components/turmas/inscritos";

export const metadata: Metadata = {
  title: "Turma — Acutis Catequese",
};

type Busca = Record<string, string | string[] | undefined>;

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export default async function TurmaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Busca>;
}) {
  const { id } = await params;
  await requireRole(["coordenacao"], `/coordenacao/turmas/${id}`);
  const busca = await searchParams;
  const turma = await obterTurma(id);
  if (!turma) notFound();

  const aviso = primeiro(busca.aviso);
  const termo = (primeiro(busca.q) ?? "").trim();
  const aberta = !turma.encerrada;
  const hoje = hojeCivil();

  const [elegiveis, candidatos] = aberta
    ? await Promise.all([
        catequistasElegiveis(id),
        termo ? catequizandosParaInscricao(termo) : Promise.resolve([]),
      ])
    : [[], []];

  return (
    <>
      <p>
        <Link href="/coordenacao/turmas">← Voltar para as turmas</Link>
      </p>
      <div className="pagina-cabecalho">
        <h1>{turma.nome}</h1>
      </div>
      <Aviso mensagem={mensagemDeAviso(aviso)} />

      <div className="turma-selos">
        {turma.encerrada ? (
          <span className="situacao situacao-inativo">Encerrada</span>
        ) : (
          <span className="situacao situacao-ativo">Aberta</span>
        )}
        {estaLotada(turma.inscritosVigentes, turma.vagas) ? (
          <span className="etiqueta">Lotada</span>
        ) : null}
        {turma.catequistas.length === 0 ? <span className="etiqueta">Sem catequista</span> : null}
      </div>

      <dl className="membro-dados">
        <div>
          <dt>Ciclo</dt>
          <dd>{turma.ciclo}</dd>
        </div>
        <div>
          <dt>Encontro</dt>
          <dd>
            {ROTULO_DIA[turma.diaSemana]}, {formatarHorario(turma.horario)}
          </dd>
        </div>
        <div>
          <dt>Local</dt>
          <dd>{turma.local || "Não informado"}</dd>
        </div>
        <div>
          <dt>Situação</dt>
          <dd>
            {turma.encerradaEm ? `Encerrada em ${formatarData(turma.encerradaEm)}` : "Aberta"}
          </dd>
        </div>
        {turma.vagas !== null ? (
          <div>
            <dt>Ocupação</dt>
            <dd>{formatarOcupacao(turma.inscritosVigentes, turma.vagas)}</dd>
          </div>
        ) : null}
        {turma.observacoes ? (
          <div>
            <dt>Observações</dt>
            <dd className="turma-observacoes">{turma.observacoes}</dd>
          </div>
        ) : null}
      </dl>

      {aberta ? (
        <div className="membro-acoes">
          <Link href={`/coordenacao/turmas/${id}/editar`} className="botao botao-secundario">
            Editar
          </Link>
          <EncerrarTurma
            turma={turma.nome}
            vigentes={turma.vigentes.length}
            acao={encerrarTurmaAction.bind(null, id)}
          />
        </div>
      ) : null}

      <section className="turma-secao" aria-labelledby="turma-catequistas">
        <h2 id="turma-catequistas">Catequistas</h2>
        {turma.catequistas.length === 0 ? (
          <p>Nenhum catequista designado.</p>
        ) : (
          <ul className="turma-catequistas">
            {turma.catequistas.map((c) => (
              <li key={c.id}>
                <span>{c.nome}</span>
                {aberta ? (
                  <RemoverCatequista
                    catequista={c.nome}
                    turma={turma.nome}
                    acao={removerCatequistaAction.bind(null, id, c.id)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {aberta ? (
          <DesignarCatequista
            acao={designarCatequistaAction.bind(null, id)}
            elegiveis={elegiveis}
          />
        ) : null}
      </section>

      {aberta ? (
        <section className="turma-secao" aria-labelledby="turma-inscrever">
          <h2 id="turma-inscrever">Inscrever catequizando</h2>
          <InscreverCatequizando
            turmaId={id}
            turmaNome={turma.nome}
            termo={termo}
            candidatos={candidatos}
            acao={inscreverAction.bind(null, id)}
            hoje={hoje}
          />
        </section>
      ) : null}

      <section className="turma-secao" aria-labelledby="turma-inscritos">
        <h2 id="turma-inscritos">Inscritos</h2>
        <Inscritos
          vigentes={turma.vigentes}
          anteriores={turma.anteriores}
          hoje={hoje}
          baseFicha="/coordenacao/catequizandos"
          turmaNome={turma.nome}
          acoes={
            aberta
              ? { desligar: (inscricaoId: string) => desligarAction.bind(null, id, inscricaoId) }
              : undefined
          }
        />
      </section>
    </>
  );
}
