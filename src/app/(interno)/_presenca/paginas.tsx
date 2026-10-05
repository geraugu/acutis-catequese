import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { SessaoUsuario } from "@/modules/auth/dal";
import { podeVerTurma } from "@/modules/turmas/acesso";
import { turmasDoUsuario } from "@/modules/presenca/autorizacao";
import { formatarDataComDia, hojeCivil } from "@/modules/compartilhado/datas";
import { ROTULO_SITUACAO } from "@/modules/programa/domain/encontro";
import {
  buscarVisitantes,
  dadosDoEncontro,
  inscritosNaData,
  inscritosSemOTema,
  alertasDeFrequencia,
  obterLimite,
  presencasDoEncontro,
} from "@/modules/presenca/repositorio";
import {
  adicionarVisitanteAction,
  removerVisitanteAction,
  salvarChamadaAction,
  salvarLimiteAction,
} from "@/modules/presenca/actions";
import {
  disponibilidadeDaChamada,
  montarLinhas,
  podeGerenciarVisitantes,
} from "@/modules/presenca/domain/chamada";
import {
  MSG_TURMA_ENCERRADA,
  MSG_VISITANTE_SEM_TEMA,
  mensagemDeAviso,
} from "@/modules/presenca/mensagens";
import { Aviso } from "@/components/comum/aviso";
import { AlertasFrequencia } from "@/components/presenca/alertas-frequencia";
import { FormularioLimite } from "@/components/presenca/formulario-limite";
import { BuscaVisitante } from "@/components/presenca/busca-visitante";
import { ChamadaForm } from "@/components/presenca/chamada-form";
import { ListaVisitantes } from "@/components/presenca/lista-visitantes";
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

/** Visitantes do encontro: lista, busca em outras turmas e adição (4.1, 4.4, 4.9). */
export async function PaginaVisitantes({
  sessao,
  papel,
  turmaId,
  encontroId,
  termo,
  aviso,
}: {
  sessao: SessaoUsuario;
  papel: Papel;
  turmaId: string;
  encontroId: string;
  termo: string | string[] | undefined;
  aviso: string | string[] | undefined;
}) {
  if (!(await podeVerTurma(sessao, turmaId))) redirect("/acesso-negado");
  const encontro = await dadosDoEncontro(turmaId, encontroId);
  if (!encontro) notFound();

  const base = baseDoCronograma(papel, turmaId);
  const situacaoTurma = { encerrada: encontro.turmaEncerrada };
  const permitido = podeGerenciarVisitantes(encontro, situacaoTurma, hojeCivil());
  const visitantes = (await presencasDoEncontro(encontroId))
    .filter((r) => r.visitante)
    .map((r) => ({
      catequizandoId: r.catequizandoId,
      nome: r.nome,
      turmaOrigemNome: r.turmaOrigemNome,
    }));
  const tema =
    encontro.temaNumero !== null && encontro.temaTitulo !== null
      ? `Tema ${encontro.temaNumero} — ${encontro.temaTitulo}`
      : encontro.temaTitulo;

  const q = primeiro(termo)?.trim();
  const termoBusca = primeiro(termo) === undefined ? null : (q ?? "");
  const candidatos = permitido && q ? await buscarVisitantes(turmaId, encontroId, q) : [];

  const disp = disponibilidadeDaChamada(encontro, situacaoTurma, hojeCivil());
  const motivo = encontro.turmaEncerrada
    ? MSG_TURMA_ENCERRADA
    : !disp.disponivel
      ? disp.mensagem
      : MSG_VISITANTE_SEM_TEMA;

  return (
    <>
      <p>
        <Link href={`${base}/${encontroId}/chamada`}>Voltar para a chamada</Link>
      </p>
      <div className="pagina-cabecalho">
        <h1>Visitantes</h1>
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
      </dl>
      <Aviso mensagem={mensagemDeAviso(primeiro(aviso))} />
      {permitido ? (
        <>
          <ListaVisitantes
            visitantes={visitantes}
            remover={removerVisitanteAction.bind(null, turmaId, encontroId, base)}
          />
          <BuscaVisitante
            termo={termoBusca}
            candidatos={candidatos}
            adicionar={adicionarVisitanteAction.bind(null, turmaId, encontroId, base)}
          />
        </>
      ) : (
        <>
          <p className="turma-somente-leitura" role="status">
            {motivo}
          </p>
          {visitantes.length > 0 ? (
            <section aria-label="Visitantes registrados">
              <h2>Visitantes registrados</h2>
              <ul className="presenca-lista-visitantes">
                {visitantes.map((v) => (
                  <li key={v.catequizandoId}>
                    <span>{v.nome}</span>
                    <span className="presenca-selo-visitante">Visitante</span>
                    {v.turmaOrigemNome ? (
                      <span className="presenca-origem">Turma de origem: {v.turmaOrigemNome}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </>
  );
}

/** Área "Frequência": alertas de baixa frequência e, só para a coordenação, o limite (1.2, 7.6, 7.7, 7.10, 7.11). */
export async function PaginaFrequencia({
  sessao,
  papel,
  aviso,
}: {
  sessao: SessaoUsuario;
  papel: Papel;
  aviso: string | string[] | undefined;
}) {
  const limite = await obterLimite();
  const alertas = await alertasDeFrequencia(await turmasDoUsuario(sessao), limite);

  return (
    <>
      <div className="pagina-cabecalho">
        <h1>Frequência</h1>
      </div>
      <p>
        Catequizandos com frequência abaixo do limite nas turmas abertas. A lista é recalculada a
        cada visita.
      </p>
      <Aviso mensagem={mensagemDeAviso(primeiro(aviso))} />
      <AlertasFrequencia
        limite={limite}
        alertas={alertas.map((a) => ({
          ...a,
          href: `/${papel}/catequizandos/${a.catequizandoId}`,
        }))}
      />
      {papel === "coordenacao" ? (
        <FormularioLimite limiteAtual={limite} salvarLimiteAction={salvarLimiteAction} />
      ) : null}
    </>
  );
}
