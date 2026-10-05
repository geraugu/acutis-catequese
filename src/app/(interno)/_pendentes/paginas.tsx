import Link from "next/link";
import { notFound } from "next/navigation";
import { autorizarTurma } from "@/modules/autocadastro/autorizacao";
import {
  buscarCoincidencias,
  listarFila,
  obterFichaLink,
  situacaoTurma,
  type Revisor,
} from "@/modules/autocadastro/repositorio";
import { avisosDaFicha, textoDoAviso } from "@/modules/autocadastro/domain/avisos";
import { mensagemDeAviso } from "@/modules/autocadastro/mensagens";
import {
  confirmarFichaLinkAction,
  corrigirFichaLinkAction,
  descartarFichaLinkAction,
} from "@/modules/autocadastro/actions";
import { obterTurma } from "@/modules/turmas/repositorio";
import { formatarData } from "@/modules/compartilhado/datas";
import { formatarTelefone } from "@/modules/compartilhado/telefone";
import { ROTULO_SACRAMENTO, SACRAMENTOS } from "@/modules/catequizandos/domain/sacramentos";
import { Aviso } from "@/components/comum/aviso";
import { FilaPendentes } from "@/components/autocadastro/fila-pendentes";
import { RevisaoFicha } from "@/components/autocadastro/revisao-ficha";

/**
 * Fila e revisão das fichas do link, compartilhadas pelos dois papéis. Cada rota chama
 * `requireRole` com o próprio caminho; aqui `autorizarTurma` reavalia o acesso (5.4).
 * Turma encerrada continua acessível só para consulta e descarte (8.4).
 */
export type Area = "coordenacao" | "catequista";

const FORMATO_DATA_HORA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "short",
});

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

async function carregarTurma(turmaId: string) {
  const sessao = await autorizarTurma(turmaId);
  const [turma, situacao] = await Promise.all([obterTurma(turmaId), situacaoTurma(turmaId)]);
  if (!turma || !situacao) notFound();
  const revisor: Revisor = { papel: sessao.papel, userId: sessao.userId };
  return { turma, situacao, revisor };
}

export async function PaginaFila({
  area,
  turmaId,
  aviso,
}: {
  area: Area;
  turmaId: string;
  aviso: string | string[] | undefined;
}) {
  const { turma, situacao, revisor } = await carregarTurma(turmaId);
  const fila = await listarFila(turmaId);
  const itens = await Promise.all(
    fila.map(async (f) => {
      const coincidentes = await buscarCoincidencias(
        f.email,
        f.telefone,
        f.catequizandoId,
        revisor,
      );
      const avisos = avisosDaFicha({
        coincidentes,
        inscritos: situacao.inscritosVigentes,
        vagas: situacao.vagas,
      }).map(textoDoAviso);
      return { id: f.catequizandoId, nome: f.nome, recebidaEm: f.recebidaEm, avisos };
    }),
  );

  return (
    <>
      <p>
        <Link href={`/${area}/turmas/${turmaId}`}>← Voltar para {turma.nome}</Link>
      </p>
      <div className="pagina-cabecalho">
        <h1>Fichas pendentes — {turma.nome}</h1>
      </div>
      <Aviso mensagem={mensagemDeAviso(primeiro(aviso))} />
      {situacao.encerrada ? (
        <p>Turma encerrada: as fichas ficam disponíveis só para consulta e descarte.</p>
      ) : null}
      <FilaPendentes itens={itens} base={`/${area}/turmas/${turmaId}/pendentes`} />
    </>
  );
}

export async function PaginaRevisao({
  area,
  turmaId,
  fichaId,
  aviso,
}: {
  area: Area;
  turmaId: string;
  fichaId: string;
  aviso: string | string[] | undefined;
}) {
  const { turma, situacao, revisor } = await carregarTurma(turmaId);
  const ficha = await obterFichaLink(turmaId, fichaId);
  if (!ficha) notFound();
  const coincidentes = await buscarCoincidencias(ficha.email, ficha.telefone, fichaId, revisor);
  const lotada = avisosDaFicha({
    coincidentes: [],
    inscritos: situacao.inscritosVigentes,
    vagas: situacao.vagas,
  }).find((a) => a.tipo === "lotada");

  // Campos planos no formato do formulário (checkbox marcado = "on").
  const valores: Record<string, string> = {
    nome: ficha.nome,
    dataNascimento: ficha.dataNascimento,
    telefone: formatarTelefone(ficha.telefone),
    email: ficha.email ?? "",
    endereco: ficha.endereco ?? "",
    observacoes: ficha.observacoes ?? "",
  };
  for (const s of SACRAMENTOS) {
    const sf = ficha.sacramentos[s];
    if (sf.recebido) valores[`${s}Recebido`] = "on";
    valores[`${s}Data`] = sf.data ?? "";
    valores[`${s}Paroquia`] = sf.paroquia ?? "";
  }

  const encerrada = situacao.encerrada;
  return (
    <>
      <p>
        <Link href={`/${area}/turmas/${turmaId}/pendentes`}>← Voltar para as fichas pendentes</Link>
      </p>
      <div className="pagina-cabecalho">
        <h1>{ficha.nome}</h1>
      </div>
      <p>Ficha enviada pelo link da turma {turma.nome}.</p>
      <Aviso mensagem={mensagemDeAviso(primeiro(aviso))} />
      <RevisaoFicha
        dados={{
          nome: ficha.nome,
          dataNascimento: formatarData(ficha.dataNascimento),
          telefone: formatarTelefone(ficha.telefone),
          email: ficha.email,
          endereco: ficha.endereco,
          observacoes: ficha.observacoes,
          sacramentos: SACRAMENTOS.map((s) => ({
            rotulo: ROTULO_SACRAMENTO[s],
            recebido: ficha.sacramentos[s].recebido,
            data: ficha.sacramentos[s].data ? formatarData(ficha.sacramentos[s].data) : null,
            paroquia: ficha.sacramentos[s].paroquia ?? null,
          })),
        }}
        recebidaEm={FORMATO_DATA_HORA.format(ficha.recebidaEm)}
        consentimento={{
          em: FORMATO_DATA_HORA.format(ficha.consentidoEm),
          versao: ficha.versaoConsentimento,
        }}
        coincidentes={coincidentes}
        baseCoincidente={revisor.papel === "coordenacao" ? "/coordenacao/catequizandos" : null}
        avisoLotada={lotada ? textoDoAviso(lotada) : null}
        valoresIniciais={valores}
        encerrada={encerrada}
        acoes={{
          confirmar: encerrada ? undefined : confirmarFichaLinkAction.bind(null, turmaId, fichaId),
          corrigir: encerrada ? undefined : corrigirFichaLinkAction.bind(null, turmaId, fichaId),
          descartar: descartarFichaLinkAction.bind(null, turmaId, fichaId),
        }}
      />
    </>
  );
}
