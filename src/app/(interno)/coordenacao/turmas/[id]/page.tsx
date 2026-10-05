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
import { hojeCivil } from "@/modules/compartilhado/datas";
import { Aviso } from "@/components/comum/aviso";
import { env } from "@/lib/env";
import { obterLinkDaTurma } from "@/modules/autocadastro/repositorio";
import { situacaoDoLink } from "@/modules/autocadastro/domain/link";
import { mensagemDeAviso as mensagemDeAvisoLink } from "@/modules/autocadastro/mensagens";
import {
  desativarLinkAction,
  gerarLinkAction,
  regenerarLinkAction,
  salvarExpiracaoAction,
} from "@/modules/autocadastro/actions";
import { SecaoLink } from "@/components/autocadastro/secao-link";
import { listarEncontros } from "@/modules/programa/repositorio";
import { proximoEncontro } from "@/modules/programa/domain/encontro";
import { ProximoEncontro } from "@/components/programa/proximo-encontro";
import { BlocoFrequenciaDaTurma, ordemDaBusca } from "@/app/(interno)/_presenca/blocos";
import { DadosTurma } from "@/components/turmas/dados-turma";
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
  const encontros = await listarEncontros(id);
  const proximo = proximoEncontro(encontros, hoje);
  const link = await obterLinkDaTurma(id);

  return (
    <>
      <p>
        <Link href="/coordenacao/turmas">← Voltar para as turmas</Link>
      </p>
      <div className="pagina-cabecalho">
        <h1>{turma.nome}</h1>
      </div>
      <Aviso mensagem={mensagemDeAviso(aviso) ?? mensagemDeAvisoLink(aviso)} />

      <DadosTurma turma={turma} />

      <ProximoEncontro encontro={proximo} linkCronograma={`/coordenacao/turmas/${id}/encontros`} />

      {await BlocoFrequenciaDaTurma({
        papel: "coordenacao",
        turmaId: id,
        encerrada: turma.encerrada,
        encontros,
        ordem: ordemDaBusca(busca.ordem),
      })}

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

      <SecaoLink
        situacao={link ? situacaoDoLink(link, turma.encerrada, hoje) : null}
        expiraEm={link?.expiraEm ?? null}
        url={link && !link.desativadoEm ? `${env.BETTER_AUTH_URL}/inscricao/${link.token}` : null}
        pendentes={link?.pendentes ?? 0}
        linkPendentes={`/coordenacao/turmas/${id}/pendentes`}
        encerrada={turma.encerrada}
        acoes={{
          gerar: gerarLinkAction.bind(null, id),
          desativar: desativarLinkAction.bind(null, id),
          regenerar: regenerarLinkAction.bind(null, id),
          salvarExpiracao: salvarExpiracaoAction.bind(null, id),
        }}
      />

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
