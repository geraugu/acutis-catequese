import { type AcaoDesligar, DesligarCatequizando } from "@/components/turmas/acoes-turma";
import { calcularIdade, type DataCivil, formatarData } from "@/modules/compartilhado/datas";
import { formatarTelefone, linkLigacao, linkWhatsApp } from "@/modules/compartilhado/telefone";
import { ROTULO_MOTIVO } from "@/modules/turmas/domain/inscricao";
import type { InscritoResumo } from "@/modules/turmas/repositorio";

/** Lista de inscritos vigentes e anteriores (7.1, 7.2, 7.4, 7.5); ações só quando passadas. */
export function Inscritos({
  vigentes,
  anteriores,
  hoje,
  baseFicha,
  turmaNome = "",
  acoes,
}: {
  vigentes: InscritoResumo[];
  anteriores: InscritoResumo[];
  hoje: DataCivil;
  baseFicha: string;
  turmaNome?: string;
  acoes?: { desligar: (inscricaoId: string) => AcaoDesligar };
}) {
  const ordenados = [...vigentes].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return (
    <div className="inscritos">
      {ordenados.length === 0 ? (
        <p>Nenhum catequizando inscrito</p>
      ) : (
        <ul className="inscritos-lista" aria-label="Inscritos vigentes">
          {ordenados.map((i) => {
            const idade = calcularIdade(i.dataNascimento, hoje);
            return (
              <li key={i.inscricaoId}>
                <a href={`${baseFicha}/${i.catequizandoId}`}>{i.nome}</a>
                <span className="inscritos-idade">
                  {idade} {idade === 1 ? "ano" : "anos"}
                </span>
                <span className="inscritos-telefone">{formatarTelefone(i.telefone)}</span>
                <span className="membro-contato">
                  <a href={linkLigacao(i.telefone)}>Ligar</a>
                  <a
                    href={linkWhatsApp(i.telefone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp (abre em nova aba)"
                  >
                    WhatsApp
                  </a>
                </span>
                {acoes ? (
                  <DesligarCatequizando
                    catequizando={i.nome}
                    turma={turmaNome}
                    hoje={hoje}
                    acao={acoes.desligar(i.inscricaoId)}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {anteriores.length > 0 ? (
        <section className="inscritos-anteriores" aria-labelledby="inscritos-anteriores-titulo">
          <h3 id="inscritos-anteriores-titulo">Inscritos anteriores</h3>
          <ul>
            {anteriores.map((i) => (
              <li key={i.inscricaoId}>
                <span>{i.nome}</span>
                <span>
                  {formatarData(i.dataEntrada)}–{i.dataSaida ? formatarData(i.dataSaida) : ""}
                </span>
                {i.motivoSaida ? <span>{ROTULO_MOTIVO[i.motivoSaida]}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
