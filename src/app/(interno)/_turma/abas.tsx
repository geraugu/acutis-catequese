import "server-only";
import type { ReactElement } from "react";
import { notFound } from "next/navigation";
import { Aviso } from "@/components/comum/aviso";
import { InscreverCatequizando } from "@/components/turmas/inscrever-catequizando";
import { Inscritos } from "@/components/turmas/inscritos";
import { DesignarCatequista } from "@/components/turmas/designar-catequista";
import { RemoverCatequista } from "@/components/turmas/acoes-turma";
import { SecaoLink } from "@/components/autocadastro/secao-link";
import { env } from "@/lib/env";
import { obterLinkDaTurma } from "@/modules/autocadastro/repositorio";
import { situacaoDoLink } from "@/modules/autocadastro/domain/link";
import {
  desativarLinkAction,
  gerarLinkAction,
  regenerarLinkAction,
  salvarExpiracaoAction,
} from "@/modules/autocadastro/actions";
import { BlocoFrequenciaDaTurma } from "@/app/(interno)/_presenca/blocos";
import type { OrdemFrequencia } from "@/components/presenca/frequencia-turma";
import { hojeCivil } from "@/modules/compartilhado/datas";
import {
  desligarAction,
  designarCatequistaAction,
  inscreverAction,
  removerCatequistaAction,
} from "@/modules/turmas/actions";
import {
  catequistasElegiveis,
  catequizandosParaInscricao,
  obterTurma,
} from "@/modules/turmas/repositorio";
import { avisoDaTurma, carregarTurmaDaAba, type Papel } from "./dados";

export type PropsAba = {
  papel: Papel;
  turmaId: string;
  aviso: string | string[] | undefined;
};

/**
 * Aba Inscritos: vigentes e anteriores; a coordenação, em turma aberta, inscreve (busca por
 * `?q=` na própria aba) e desliga; o catequista só consulta (3.1 a 3.5, 8.7, 9.4).
 */
export async function AbaInscritos({
  papel,
  turmaId,
  aviso,
  termo,
}: PropsAba & { termo: string }): Promise<ReactElement> {
  await carregarTurmaDaAba(papel, turmaId, `/${papel}/turmas/${turmaId}/inscritos`);
  const turma = await obterTurma(turmaId);
  if (!turma) notFound();

  const hoje = hojeCivil();
  const podeAlterar = papel === "coordenacao" && !turma.encerrada;
  const busca = termo.trim();
  const candidatos = podeAlterar && busca ? await catequizandosParaInscricao(busca) : [];

  return (
    <>
      <Aviso mensagem={avisoDaTurma(aviso)} />

      {podeAlterar ? (
        <section className="turma-secao" aria-labelledby="turma-inscrever">
          <h2 id="turma-inscrever">Inscrever catequizando</h2>
          <InscreverCatequizando
            turmaNome={turma.nome}
            termo={busca}
            candidatos={candidatos}
            acao={inscreverAction.bind(null, turmaId)}
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
          baseFicha={`/${papel}/catequizandos`}
          turmaNome={turma.nome}
          acoes={
            podeAlterar
              ? {
                  desligar: (inscricaoId: string) =>
                    desligarAction.bind(null, turmaId, inscricaoId),
                }
              : undefined
          }
        />
      </section>
    </>
  );
}

/**
 * Aba Frequência: percentual da turma, quantidade em baixa e inscritos ordenáveis por `?ordem=`
 * na própria aba; consultável em turma encerrada (4.1 a 4.4, 8.7, 9.4).
 */
export async function AbaFrequencia({
  papel,
  turmaId,
  aviso,
  ordem,
}: PropsAba & { ordem: OrdemFrequencia }): Promise<ReactElement> {
  await carregarTurmaDaAba(papel, turmaId, `/${papel}/turmas/${turmaId}/frequencia`);
  return (
    <>
      <Aviso mensagem={avisoDaTurma(aviso)} />
      {await BlocoFrequenciaDaTurma({
        papel,
        turmaId,
        ordem,
        hrefOrdenar: (o) => `/${papel}/turmas/${turmaId}/frequencia?ordem=${o}`,
      })}
    </>
  );
}

/**
 * Aba Equipe e link: catequistas responsáveis (a coordenação, em turma aberta, designa e remove)
 * e o bloco do link de autocadastro com a quantidade de pendentes e o link da fila (6.1 a 6.5, 8.7).
 */
export async function AbaEquipe({ papel, turmaId, aviso }: PropsAba): Promise<ReactElement> {
  await carregarTurmaDaAba(papel, turmaId, `/${papel}/turmas/${turmaId}/equipe`);
  const turma = await obterTurma(turmaId);
  if (!turma) notFound();

  const hoje = hojeCivil();
  const podeAlterar = papel === "coordenacao" && !turma.encerrada;
  const elegiveis = podeAlterar ? await catequistasElegiveis(turmaId) : [];
  const link = await obterLinkDaTurma(turmaId);

  return (
    <>
      <Aviso mensagem={avisoDaTurma(aviso)} />

      <section className="turma-secao" aria-labelledby="turma-catequistas">
        <h2 id="turma-catequistas">Catequistas</h2>
        {turma.catequistas.length === 0 ? (
          <p>Nenhum catequista designado.</p>
        ) : (
          <ul className="turma-catequistas">
            {turma.catequistas.map((c) => (
              <li key={c.id}>
                <span>{c.nome}</span>
                {podeAlterar ? (
                  <RemoverCatequista
                    catequista={c.nome}
                    turma={turma.nome}
                    acao={removerCatequistaAction.bind(null, turmaId, c.id)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {podeAlterar ? (
          <DesignarCatequista
            acao={designarCatequistaAction.bind(null, turmaId)}
            elegiveis={elegiveis}
          />
        ) : null}
      </section>

      <SecaoLink
        situacao={link ? situacaoDoLink(link, turma.encerrada, hoje) : null}
        expiraEm={link?.expiraEm ?? null}
        url={link && !link.desativadoEm ? `${env.BETTER_AUTH_URL}/inscricao/${link.token}` : null}
        pendentes={link?.pendentes ?? 0}
        linkPendentes={`/${papel}/turmas/${turmaId}/pendentes`}
        encerrada={turma.encerrada}
        acoes={{
          gerar: gerarLinkAction.bind(null, turmaId),
          desativar: desativarLinkAction.bind(null, turmaId),
          regenerar: regenerarLinkAction.bind(null, turmaId),
          salvarExpiracao: salvarExpiracaoAction.bind(null, turmaId),
        }}
      />
    </>
  );
}
