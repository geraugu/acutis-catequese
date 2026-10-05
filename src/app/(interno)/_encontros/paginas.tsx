import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { SessaoUsuario } from "@/modules/auth/dal";
import { podeVerTurma } from "@/modules/turmas/acesso";
import { hojeCivil } from "@/modules/compartilhado/datas";
import {
  dadosDaTurma,
  listarEncontros,
  listarTemas,
  obterEncontro,
  temasParaSelecao,
  type DadosTurma,
} from "@/modules/programa/repositorio";
import { criarEncontroAction, editarEncontroAction } from "@/modules/programa/actions";
import { calcularProgresso } from "@/modules/programa/domain/progresso";
import { numerarTemas } from "@/modules/programa/domain/tema";
import { podeEditar } from "@/modules/programa/domain/encontro";
import {
  MSG_SO_PLANEJADO,
  MSG_TURMA_ENCERRADA,
  mensagemDeAviso,
} from "@/modules/programa/mensagens";
import { disponibilidadeDaChamada } from "@/modules/presenca/domain/chamada";
import { resumoPorEncontro } from "@/modules/presenca/repositorio";
import { ResumoChamada } from "@/components/presenca/resumo-chamada";
import { Aviso } from "@/components/comum/aviso";
import { Cronograma } from "@/components/programa/cronograma";
import { FormularioEncontro } from "@/components/programa/formulario-encontro";
import { ProgressoTurma } from "@/components/programa/progresso-turma";

/**
 * Páginas de encontros compartilhadas pelos dois papéis. Cada rota chama `requireRole` com o
 * caminho exato e entrega a sessão; aqui ficam `podeVerTurma` (1.3, 1.4) e `dadosDaTurma`.
 */
export type Papel = "coordenacao" | "catequista";

const baseDoCronograma = (papel: Papel, turmaId: string) => `/${papel}/turmas/${turmaId}/encontros`;

async function turmaVisivel(sessao: SessaoUsuario, turmaId: string): Promise<DadosTurma> {
  if (!(await podeVerTurma(sessao, turmaId))) redirect("/acesso-negado");
  const turma = await dadosDaTurma(turmaId);
  if (!turma) notFound();
  return turma;
}

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

/** Cronograma da turma com progresso (6.1, 6.4-6.7, 7.1, 7.2). */
export async function PaginaCronograma({
  sessao,
  papel,
  turmaId,
  aviso,
}: {
  sessao: SessaoUsuario;
  papel: Papel;
  turmaId: string;
  aviso: string | string[] | undefined;
}) {
  const turma = await turmaVisivel(sessao, turmaId);
  const base = baseDoCronograma(papel, turmaId);
  const [encontros, temas, resumos] = await Promise.all([
    listarEncontros(turmaId),
    listarTemas(),
    resumoPorEncontro(turmaId),
  ]);
  const temasAtivos = numerarTemas(temas).flatMap((t) =>
    t.numero === null ? [] : [{ id: t.id, titulo: t.titulo, numero: t.numero }],
  );
  const progresso = calcularProgresso(
    temasAtivos,
    encontros.map((e) => ({ temaId: e.tema?.id ?? null, situacao: e.situacao })),
  );
  const aberta = !turma.encerrada;
  const hoje = hojeCivil();
  // Chamada por encontro e resumo dos realizados (2.8, 3.4, 6.3); contagens lidas uma vez por turma.
  const complemento = (e: (typeof encontros)[number]) => {
    const disp = disponibilidadeDaChamada(e, { encerrada: turma.encerrada }, hoje);
    return (
      <>
        {disp.disponivel ? (
          <Link href={`${base}/${e.id}/chamada`} className="botao botao-secundario">
            {disp.modo === "correcao" ? "Corrigir chamada" : "Fazer chamada"}
          </Link>
        ) : null}
        <ResumoChamada situacao={e.situacao} contagem={resumos.get(e.id)} />
      </>
    );
  };

  return (
    <>
      <p>
        <Link href={`/${papel}/turmas/${turmaId}`}>← Voltar para {turma.nome}</Link>
      </p>
      <div className="pagina-cabecalho">
        <h1>Encontros — {turma.nome}</h1>
        {aberta ? (
          <Link href={`${base}/novo`} className="botao botao-primario">
            Novo encontro
          </Link>
        ) : null}
      </div>
      <Aviso mensagem={mensagemDeAviso(primeiro(aviso))} />
      {aberta ? null : (
        <p className="turma-somente-leitura" role="status">
          {MSG_TURMA_ENCERRADA}
        </p>
      )}
      <ProgressoTurma progresso={progresso} />
      {encontros.length === 0 ? (
        <div className="lista-vazia">
          <h2>Nenhum encontro planejado</h2>
          {aberta ? (
            <p>
              <Link href={`${base}/novo`}>Planejar o primeiro encontro</Link>
            </p>
          ) : null}
        </div>
      ) : (
        <Cronograma
          encontros={encontros}
          hoje={hoje}
          base={base}
          acoes={aberta}
          complemento={complemento}
        />
      )}
    </>
  );
}

/** Criação de encontro (4.1, 7.1). */
export async function PaginaNovoEncontro({
  sessao,
  papel,
  turmaId,
}: {
  sessao: SessaoUsuario;
  papel: Papel;
  turmaId: string;
}) {
  const turma = await turmaVisivel(sessao, turmaId);
  const base = baseDoCronograma(papel, turmaId);
  return (
    <>
      <p>
        <Link href={base}>← Voltar para os encontros</Link>
      </p>
      <h1>Novo encontro — {turma.nome}</h1>
      {turma.encerrada ? (
        <p className="turma-somente-leitura" role="status">
          {MSG_TURMA_ENCERRADA}
        </p>
      ) : (
        <FormularioEncontro
          modo="criar"
          acao={criarEncontroAction.bind(null, turmaId, base)}
          temas={await temasParaSelecao()}
          valoresIniciais={{ horario: turma.horario }}
        />
      )}
    </>
  );
}

/** Edição de encontro planejado (4.8, 5.7); outra turma ou id inválido → notFound. */
export async function PaginaEditarEncontro({
  sessao,
  papel,
  turmaId,
  encontroId,
}: {
  sessao: SessaoUsuario;
  papel: Papel;
  turmaId: string;
  encontroId: string;
}) {
  const turma = await turmaVisivel(sessao, turmaId);
  const encontro = await obterEncontro(encontroId);
  if (!encontro || encontro.turmaId !== turmaId) notFound();
  const base = baseDoCronograma(papel, turmaId);
  const bloqueio = turma.encerrada
    ? MSG_TURMA_ENCERRADA
    : podeEditar(encontro)
      ? null
      : MSG_SO_PLANEJADO;

  return (
    <>
      <p>
        <Link href={base}>← Voltar para os encontros</Link>
      </p>
      <h1>Editar encontro — {turma.nome}</h1>
      {bloqueio ? (
        <p className="turma-somente-leitura" role="status">
          {bloqueio}
        </p>
      ) : (
        <FormularioEncontro
          modo="editar"
          acao={editarEncontroAction.bind(null, turmaId, encontroId, base)}
          temas={await temasParaSelecao(encontro.tema?.id)}
          valoresIniciais={{
            data: encontro.data,
            horario: encontro.horario,
            temaId: encontro.tema?.id ?? "",
            observacoes: encontro.observacoes ?? "",
          }}
        />
      )}
    </>
  );
}
