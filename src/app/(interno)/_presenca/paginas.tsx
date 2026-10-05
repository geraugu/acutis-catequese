import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { SessaoUsuario } from "@/modules/auth/dal";
import { podeVerTurma } from "@/modules/turmas/acesso";
import { formatarDataComDia, hojeCivil } from "@/modules/compartilhado/datas";
import { ROTULO_SITUACAO } from "@/modules/programa/domain/encontro";
import {
  dadosDoEncontro,
  inscritosNaData,
  inscritosSemOTema,
  presencasDoEncontro,
} from "@/modules/presenca/repositorio";
import { salvarChamadaAction } from "@/modules/presenca/actions";
import {
  disponibilidadeDaChamada,
  montarLinhas,
  podeGerenciarVisitantes,
} from "@/modules/presenca/domain/chamada";
import { mensagemDeAviso } from "@/modules/presenca/mensagens";
import { Aviso } from "@/components/comum/aviso";
import { ChamadaForm } from "@/components/presenca/chamada-form";
import { SemTemaDoEncontro } from "@/components/presenca/sem-tema-do-encontro";
import { StatusPresenca } from "@/components/presenca/status-presenca";

/**
 * Páginas de presença compartilhadas pelos dois papéis. Cada rota chama `requireRole` com o
 * caminho exato e entrega a sessão; aqui ficam `podeVerTurma` (1.4) e a leitura dos dados.
 */
export type Papel = "coordenacao" | "catequista";

const baseDoCronograma = (papel: Papel, turmaId: string) => `/${papel}/turmas/${turmaId}/encontros`;

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

/** Chamada do encontro: formulário, visitantes e quem ainda não viu o tema (2.1, 2.5, 3.1, 3.5, 9.1, 10.5). */
export async function PaginaChamada({
  sessao,
  papel,
  turmaId,
  encontroId,
  aviso,
}: {
  sessao: SessaoUsuario;
  papel: Papel;
  turmaId: string;
  encontroId: string;
  aviso: string | string[] | undefined;
}) {
  if (!(await podeVerTurma(sessao, turmaId))) redirect("/acesso-negado");
  const encontro = await dadosDoEncontro(turmaId, encontroId);
  if (!encontro) notFound();

  const base = baseDoCronograma(papel, turmaId);
  const hoje = hojeCivil();
  const disp = disponibilidadeDaChamada(encontro, { encerrada: encontro.turmaEncerrada }, hoje);
  const registros = await presencasDoEncontro(encontroId);
  const visitantes = registros
    .filter((r) => r.visitante)
    .map((r) => ({
      catequizandoId: r.catequizandoId,
      nome: r.nome,
      turmaOrigemNome: r.turmaOrigemNome,
    }));
  const tema =
    encontro.temaId !== null && encontro.temaNumero !== null && encontro.temaTitulo !== null
      ? `Tema ${encontro.temaNumero} — ${encontro.temaTitulo}`
      : encontro.temaTitulo !== null
        ? encontro.temaTitulo
        : null;
  const semOTema =
    encontro.temaId !== null
      ? await inscritosSemOTema(turmaId, encontro.data, encontro.temaId)
      : null;
  const linhas = disp.disponivel
    ? montarLinhas(await inscritosNaData(turmaId, encontro.data), registros)
    : [];
  const permiteVisitantes = podeGerenciarVisitantes(
    encontro,
    { encerrada: encontro.turmaEncerrada },
    hoje,
  );

  return (
    <>
      <p>
        <Link href={base}>← Voltar para os encontros</Link>
      </p>
      <div className="pagina-cabecalho">
        <h1>
          {disp.disponivel && disp.modo === "correcao" ? "Corrigir chamada" : "Fazer chamada"}
        </h1>
        {permiteVisitantes ? (
          <Link
            href={`${base}/${encontroId}/chamada/visitantes`}
            className="botao botao-secundario"
          >
            Adicionar visitante
          </Link>
        ) : null}
      </div>
      <dl className="presenca-encontro">
        <div>
          <dt>Turma</dt>
          <dd>{encontro.turmaNome}</dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>{formatarDataComDia(encontro.data)}</dd>
        </div>
        <div>
          <dt>Horário</dt>
          <dd>{encontro.horario}</dd>
        </div>
        <div>
          <dt>Tema</dt>
          <dd>{tema ?? "Sem tema do programa"}</dd>
        </div>
        <div>
          <dt>Situação</dt>
          <dd>{ROTULO_SITUACAO[encontro.situacao]}</dd>
        </div>
      </dl>
      <Aviso mensagem={mensagemDeAviso(primeiro(aviso))} />
      {disp.disponivel ? (
        <ChamadaForm
          linhas={linhas}
          visitantes={visitantes}
          modo={disp.modo}
          action={salvarChamadaAction.bind(null, turmaId, encontroId, base)}
        />
      ) : (
        <>
          <p className="turma-somente-leitura" role="status">
            {disp.mensagem}
          </p>
          {registros.length > 0 ? (
            <section aria-label="Presenças registradas">
              <h2>Presenças registradas</h2>
              <ul className="presenca-lista-visitantes">
                {registros.map((r) => (
                  <li key={r.catequizandoId}>
                    <span>{r.nome}</span>
                    <StatusPresenca status={r.status} />
                    {r.visitante ? (
                      <span className="presenca-selo-visitante">Visitante</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
      {semOTema !== null && tema !== null ? (
        <SemTemaDoEncontro tema={tema} inscritos={semOTema} />
      ) : null}
    </>
  );
}
