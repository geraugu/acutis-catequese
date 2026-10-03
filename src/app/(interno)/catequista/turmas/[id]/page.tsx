import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/modules/auth/dal";
import { podeVerTurma } from "@/modules/turmas/acesso";
import { obterTurma } from "@/modules/turmas/repositorio";
import { hojeCivil } from "@/modules/compartilhado/datas";
import { listarEncontros } from "@/modules/programa/repositorio";
import { proximoEncontro } from "@/modules/programa/domain/encontro";
import { ProximoEncontro } from "@/components/programa/proximo-encontro";
import { DadosTurma } from "@/components/turmas/dados-turma";
import { Inscritos } from "@/components/turmas/inscritos";
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

export const metadata: Metadata = {
  title: "Turma — Acutis Catequese",
};

/** Turma em modo leitura para o catequista designado (7.4, 9.1, 9.3). */
export default async function TurmaCatequistaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { aviso } = await searchParams;
  const sessao = await requireRole(["catequista"], `/catequista/turmas/${id}`);
  if (!(await podeVerTurma(sessao, id))) redirect("/acesso-negado");
  const turma = await obterTurma(id);
  if (!turma) notFound();
  const hoje = hojeCivil();
  const proximo = proximoEncontro(await listarEncontros(id), hoje);
  const link = await obterLinkDaTurma(id);

  return (
    <>
      <p>
        <Link href="/catequista/turmas">← Voltar para minhas turmas</Link>
      </p>
      <div className="pagina-cabecalho">
        <h1>{turma.nome}</h1>
      </div>
      <Aviso mensagem={mensagemDeAvisoLink(Array.isArray(aviso) ? aviso[0] : aviso)} />

      <DadosTurma turma={turma} />

      <ProximoEncontro encontro={proximo} linkCronograma={`/catequista/turmas/${id}/encontros`} />

      <SecaoLink
        situacao={link ? situacaoDoLink(link, turma.encerrada, hoje) : null}
        expiraEm={link?.expiraEm ?? null}
        url={link && !link.desativadoEm ? `${env.BETTER_AUTH_URL}/inscricao/${link.token}` : null}
        pendentes={link?.pendentes ?? 0}
        linkPendentes={`/catequista/turmas/${id}/pendentes`}
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
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="turma-secao" aria-labelledby="turma-inscritos">
        <h2 id="turma-inscritos">Inscritos</h2>
        <Inscritos
          vigentes={turma.vigentes}
          anteriores={turma.anteriores}
          hoje={hoje}
          baseFicha="/catequista/catequizandos"
          turmaNome={turma.nome}
        />
      </section>
    </>
  );
}
