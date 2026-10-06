import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { hojeCivil } from "@/modules/compartilhado/datas";
import { listarEncontros } from "@/modules/programa/repositorio";
import { BlocoChamadaDeHoje, BlocoFrequenciaDaTurma } from "@/app/(interno)/_presenca/blocos";
import {
  criarCatequizandoDireto,
  criarEncontroDireto,
  criarInscricaoDireta,
  criarTurmaDireta,
} from "./helpers";

async function chamada(turmaId: string, encerrada = false) {
  const encontros = await listarEncontros(turmaId);
  return renderToStaticMarkup(
    await BlocoChamadaDeHoje({ papel: "catequista", turmaId, encerrada, encontros }),
  );
}

describe("BlocoChamadaDeHoje (2.3)", () => {
  it("mostra o encontro planejado de hoje com o link da chamada", async () => {
    const turmaId = await criarTurmaDireta();
    const enc = await criarEncontroDireto(turmaId, { data: hojeCivil() });
    const h = await chamada(turmaId);
    expect(h).toContain("Encontro de hoje");
    expect(h).toContain(`href="/catequista/turmas/${turmaId}/encontros/${enc}/chamada"`);
  });

  it("não aparece sem encontro hoje", async () => {
    const turmaId = await criarTurmaDireta();
    await criarEncontroDireto(turmaId, { data: "2020-03-07" });
    expect(await chamada(turmaId)).toBe("");
  });

  it("não aparece quando o encontro de hoje não está planejado", async () => {
    const turmaId = await criarTurmaDireta();
    await criarEncontroDireto(turmaId, { data: hojeCivil(), situacao: "realizado" });
    expect(await chamada(turmaId)).toBe("");
  });

  it("não aparece em turma encerrada", async () => {
    const turmaId = await criarTurmaDireta({ nome: "Velha", encerradaEm: "2021-01-01" });
    await criarEncontroDireto(turmaId, { data: hojeCivil() });
    expect(await chamada(turmaId, true)).toBe("");
  });
});

describe("BlocoFrequenciaDaTurma (4.1, 4.2)", () => {
  it("usa o hrefOrdenar recebido nos links de ordenação e não traz a chamada de hoje", async () => {
    const turmaId = await criarTurmaDireta();
    const c = await criarCatequizandoDireto({ nome: "Ana Souza" });
    await criarInscricaoDireta(turmaId, c, { dataEntrada: "2019-01-01" });
    await criarEncontroDireto(turmaId, { data: hojeCivil() });
    const h = renderToStaticMarkup(
      await BlocoFrequenciaDaTurma({
        papel: "coordenacao",
        turmaId,
        ordem: "nome",
        hrefOrdenar: (o) => `/destino/aba?ordem=${o}`,
      }),
    );
    expect(h).toContain("Ana Souza");
    expect(h).toContain('href="/destino/aba?ordem=frequencia"');
    expect(h).not.toContain("Encontro de hoje");
  });
});
