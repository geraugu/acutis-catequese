"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CamposFicha } from "@/components/catequizandos/formulario-ficha";
import { Confirmacao } from "@/components/comum/confirmacao";
import type { EstadoConfirmacao, EstadoRevisao } from "@/modules/autocadastro/actions";
import type { Coincidente } from "@/modules/autocadastro/domain/avisos";
import { MSG_TURMA_ENCERRADA_FICHA } from "@/modules/autocadastro/mensagens";

export type AcaoConfirmarFicha = (
  anterior: EstadoConfirmacao,
  dados: FormData,
) => Promise<EstadoConfirmacao>;
export type AcaoRevisao = (anterior: EstadoRevisao, dados: FormData) => Promise<EstadoRevisao>;

export interface SacramentoExibido {
  rotulo: string;
  recebido: boolean;
  data: string | null;
  paroquia: string | null;
}

/** Dados da ficha já formatados no servidor (o cliente não importa datas/telefone com zod). */
export interface DadosExibidos {
  nome: string;
  dataNascimento: string;
  telefone: string;
  email: string | null;
  endereco: string | null;
  observacoes: string | null;
  sacramentos: SacramentoExibido[];
}

export interface PropsRevisaoFicha {
  dados: DadosExibidos;
  recebidaEm: string;
  consentimento: { em: string; versao: string };
  coincidentes: Coincidente[];
  /** Base do link do coincidente (só coordenação, 6.2); null mostra apenas o nome. */
  baseCoincidente: string | null;
  /** Texto do aviso de lotação, ou null. */
  avisoLotada: string | null;
  /** Ficha gravada nos campos planos do formulário. */
  valoresIniciais: Record<string, string>;
  encerrada: boolean;
  acoes: { confirmar?: AcaoConfirmarFicha; corrigir?: AcaoRevisao; descartar: AcaoRevisao };
}

const ROTULO_CAMPO: Record<string, string> = {
  nome: "Nome",
  dataNascimento: "Data de nascimento",
  telefone: "Telefone",
  email: "E-mail",
  endereco: "Endereço",
  observacoes: "Observações",
};

function AvisoDuplicata({
  coincidentes,
  base,
}: {
  coincidentes: Coincidente[];
  base: string | null;
}) {
  // Coincidentes ocultos nunca têm o nome exibido (6.3).
  const visiveis = coincidentes.filter((c) => c.visivel);
  if (visiveis.length === 0) return <li>Possível duplicata</li>;
  return (
    <li>
      Possível duplicata:{" "}
      {visiveis.map((c, i) => (
        <span key={c.id}>
          {i > 0 ? ", " : null}
          {base ? <Link href={`${base}/${c.id}`}>{c.nome}</Link> : c.nome}
        </span>
      ))}
    </li>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div>
      <dt>{rotulo}</dt>
      <dd>{valor || "Não informado"}</dd>
    </div>
  );
}

function ConfirmarFicha({ acao }: { acao: AcaoConfirmarFicha }) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const erros = Object.entries(estado.errosCampos ?? {});
  return (
    <form action={enviar}>
      {estado.erro ? (
        <div role="alert">
          <p>{estado.erro}</p>
          {erros.length > 0 ? (
            <ul>
              {erros.map(([campo, msg]) => (
                <li key={campo}>
                  {ROTULO_CAMPO[campo] ?? campo}: {msg}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <button type="submit" className="botao botao-primario" disabled={pendente}>
        Confirmar e inscrever
      </button>
      {estado.lotada ? (
        <div role="alert" className="inscrever-confirmacao">
          <p>
            A turma está lotada ({estado.lotada.inscritos}/{estado.lotada.vagas}). Deseja confirmar
            mesmo assim?
          </p>
          <button
            type="submit"
            name="confirmarLotacao"
            value="1"
            className="botao botao-secundario"
            disabled={pendente}
          >
            Confirmar mesmo assim
          </button>
        </div>
      ) : null}
    </form>
  );
}

function CorrigirFicha({
  acao,
  valoresIniciais,
}: {
  acao: AcaoRevisao;
  valoresIniciais: Record<string, string>;
}) {
  const [estado, enviar, pendente] = useActionState(acao, { valores: valoresIniciais });
  return (
    <form action={enviar} noValidate className="formulario">
      <CamposFicha
        key={JSON.stringify(estado)}
        modo="edicao"
        idPrefixo="revisao"
        textoEnviar="Salvar correção"
        estado={{ ...estado, valores: estado.valores ?? valoresIniciais }}
        pendente={pendente}
      />
    </form>
  );
}

/** Detalhe da ficha pendente com avisos, correção, confirmação e descarte (5.2, 5.5, 6.x, 7.x, 8.x). */
export function RevisaoFicha(p: PropsRevisaoFicha) {
  const { dados } = p;
  const temAvisos = p.coincidentes.length > 0 || p.avisoLotada !== null;
  return (
    <>
      {temAvisos ? (
        <section className="turma-secao" aria-labelledby="revisao-avisos">
          <h2 id="revisao-avisos">Avisos</h2>
          <ul className="avisos-ficha">
            {p.coincidentes.length > 0 ? (
              <AvisoDuplicata coincidentes={p.coincidentes} base={p.baseCoincidente} />
            ) : null}
            {p.avisoLotada ? <li>{p.avisoLotada}</li> : null}
          </ul>
        </section>
      ) : null}

      <section className="turma-secao" aria-labelledby="revisao-dados">
        <h2 id="revisao-dados">Dados enviados</h2>
        <dl className="membro-dados">
          <Campo rotulo="Nome" valor={dados.nome} />
          <Campo rotulo="Data de nascimento" valor={dados.dataNascimento} />
          <Campo rotulo="Telefone" valor={dados.telefone} />
          <Campo rotulo="E-mail" valor={dados.email} />
          <Campo rotulo="Endereço" valor={dados.endereco} />
          <Campo rotulo="Observações" valor={dados.observacoes} />
          {dados.sacramentos.map((s) => (
            <Campo
              key={s.rotulo}
              rotulo={s.rotulo}
              valor={
                s.recebido
                  ? ["Recebido", s.data, s.paroquia].filter(Boolean).join(" — ")
                  : "Não recebido"
              }
            />
          ))}
          <Campo rotulo="Enviada em" valor={p.recebidaEm} />
          <Campo
            rotulo="Consentimento"
            valor={`${p.consentimento.em} (versão ${p.consentimento.versao})`}
          />
        </dl>
      </section>

      <section className="turma-secao" aria-labelledby="revisao-acoes">
        <h2 id="revisao-acoes">Revisão</h2>
        {p.encerrada ? <p>{MSG_TURMA_ENCERRADA_FICHA}</p> : null}
        {!p.encerrada && p.acoes.confirmar ? <ConfirmarFicha acao={p.acoes.confirmar} /> : null}
        <Confirmacao
          rotuloAbrir="Descartar ficha"
          titulo="Descartar ficha"
          texto="A ficha sai da fila e não pode ser recuperada aqui. Quem enviou não é avisado."
          rotuloConfirmar="Descartar"
          perigo
          acao={p.acoes.descartar}
        />
      </section>

      {!p.encerrada && p.acoes.corrigir ? (
        <section className="turma-secao" aria-labelledby="revisao-corrigir">
          <h2 id="revisao-corrigir">Corrigir ficha</h2>
          <CorrigirFicha acao={p.acoes.corrigir} valoresIniciais={p.valoresIniciais} />
        </section>
      ) : null}
    </>
  );
}
