import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { criarEncontroAction, editarEncontroAction } from "@/modules/programa/actions";
import {
  MSG_CONFLITO_HORARIO,
  MSG_ERRO_INESPERADO,
  MSG_SO_PLANEJADO,
  MSG_TEMA_INDISPONIVEL,
  MSG_TURMA_ENCERRADA,
} from "@/modules/programa/mensagens";
import {
  capturarRedirect,
  criarCatequista,
  criarCoordenacao,
  form,
  limparSessao,
  usarSessao,
} from "../equipe/helpers";
import { criarEncontroDireto, criarTemaDireto, criarTurmaDireta, dia } from "./helpers";

vi.mock("next/headers", async () => (await import("../equipe/next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("../equipe/next-mocks")).nextNavigationMock);

afterEach(() => {
  vi.restoreAllMocks();
  limparSessao();
});

const coord = (t: string) => `/coordenacao/turmas/${t}/encontros`;
const cat = (t: string) => `/catequista/turmas/${t}/encontros`;

async function designar(turmaId: string, userId: string) {
  await prisma.designacao.create({ data: { turmaId, userId } });
}

const encontrosDa = (turmaId: string) =>
  prisma.encontro.findMany({ where: { turmaId }, orderBy: { data: "asc" } });

describe("criarEncontroAction (1.3, 1.4, 4.1-4.7, 7.1)", () => {
  it("catequista designado cria e volta para a base do catequista", async () => {
    const turmaId = await criarTurmaDireta();
    const temaId = await criarTemaDireto("Criação");
    const ator = await criarCatequista();
    await designar(turmaId, ator.id);
    usarSessao(ator);
    const url = await capturarRedirect(
      criarEncontroAction(
        turmaId,
        cat(turmaId),
        {},
        form({ data: "2026-10-10", horario: "10:30", temaId, observacoes: " Levar Bíblia " }),
      ),
    );
    expect(url).toBe(`${cat(turmaId)}?aviso=encontro-criado`);
    const [e] = await encontrosDa(turmaId);
    expect(e).toMatchObject({
      data: dia("2026-10-10"),
      horario: "10:30",
      temaId,
      observacoes: "Levar Bíblia",
      situacao: "planejado",
    });
  });

  it("coordenação cria sem tema; horário vazio usa o da turma", async () => {
    const turmaId = await criarTurmaDireta({ horario: "19:45" });
    usarSessao(await criarCoordenacao());
    const url = await capturarRedirect(
      criarEncontroAction(turmaId, coord(turmaId), {}, form({ data: "2026-10-10", horario: "" })),
    );
    expect(url).toBe(`${coord(turmaId)}?aviso=encontro-criado`);
    const [e] = await encontrosDa(turmaId);
    expect(e).toMatchObject({ horario: "19:45", temaId: null });
  });

  it("base inválida (ou de outra turma) cai na base da coordenação", async () => {
    const turmaId = await criarTurmaDireta();
    const outra = await criarTurmaDireta({ nome: "Outra" });
    usarSessao(await criarCoordenacao());
    expect(
      await capturarRedirect(
        criarEncontroAction(turmaId, "https://mal.example", {}, form({ data: "2026-10-10" })),
      ),
    ).toBe(`${coord(turmaId)}?aviso=encontro-criado`);
    expect(
      await capturarRedirect(
        criarEncontroAction(turmaId, cat(outra), {}, form({ data: "2026-10-17" })),
      ),
    ).toBe(`${coord(turmaId)}?aviso=encontro-criado`);
  });

  it("catequista não designado vai para /acesso-negado sem gravar", async () => {
    const turmaId = await criarTurmaDireta();
    usarSessao(await criarCatequista());
    expect(
      await capturarRedirect(
        criarEncontroAction(turmaId, cat(turmaId), {}, form({ data: "2026-10-10" })),
      ),
    ).toBe("/acesso-negado");
    expect(await prisma.encontro.count()).toBe(0);
  });

  it("turma encerrada é recusada; turma inexistente dá erro inesperado", async () => {
    const turmaId = await criarTurmaDireta({ encerradaEm: "2026-06-30" });
    usarSessao(await criarCoordenacao());
    const estado = await criarEncontroAction(
      turmaId,
      coord(turmaId),
      {},
      form({ data: "2026-10-10" }),
    );
    expect(estado.erro).toBe(MSG_TURMA_ENCERRADA);
    const inexistente = "00000000-0000-4000-8000-000000000000";
    const e2 = await criarEncontroAction(
      inexistente,
      coord(inexistente),
      {},
      form({ data: "2026-10-10" }),
    );
    expect(e2.erro).toBe(MSG_ERRO_INESPERADO);
    expect(await prisma.encontro.count()).toBe(0);
  });

  it("valida os campos e devolve os valores", async () => {
    const turmaId = await criarTurmaDireta();
    usarSessao(await criarCoordenacao());
    const estado = await criarEncontroAction(
      turmaId,
      coord(turmaId),
      {},
      form({ data: "", horario: "25:00" }),
    );
    expect(estado.errosCampos?.data).toBeTruthy();
    expect(estado.errosCampos?.horario).toBeTruthy();
    expect(estado.valores).toMatchObject({ horario: "25:00" });
    expect(await prisma.encontro.count()).toBe(0);
  });

  it("tema desativado é recusado na criação", async () => {
    const turmaId = await criarTurmaDireta();
    const temaId = await criarTemaDireto("Antigo", { ativo: false });
    usarSessao(await criarCoordenacao());
    const estado = await criarEncontroAction(
      turmaId,
      coord(turmaId),
      {},
      form({ data: "2026-10-10", temaId }),
    );
    expect(estado.errosCampos?.temaId).toBe(MSG_TEMA_INDISPONIVEL);
    expect(await prisma.encontro.count()).toBe(0);
  });

  it("tema repetido: sem confirmação avisa sem gravar; com confirmação grava", async () => {
    const turmaId = await criarTurmaDireta();
    const temaId = await criarTemaDireto("Criação");
    await criarEncontroDireto(turmaId, { data: "2026-09-05", temaId });
    usarSessao(await criarCoordenacao());
    const campos = { data: "2026-10-10", temaId };
    const estado = await criarEncontroAction(turmaId, coord(turmaId), {}, form(campos));
    expect(estado.temaRepetido).toEqual({ data: "05/09/2026" });
    expect(estado.valores).toMatchObject(campos);
    expect(await prisma.encontro.count()).toBe(1);

    const url = await capturarRedirect(
      criarEncontroAction(
        turmaId,
        coord(turmaId),
        {},
        form({ ...campos, confirmarTemaRepetido: "1" }),
      ),
    );
    expect(url).toBe(`${coord(turmaId)}?aviso=encontro-criado`);
    expect(await prisma.encontro.count()).toBe(2);
  });

  it("conflito de horário devolve erro no horário", async () => {
    const turmaId = await criarTurmaDireta();
    await criarEncontroDireto(turmaId, { data: "2026-10-10", horario: "09:00" });
    usarSessao(await criarCoordenacao());
    const estado = await criarEncontroAction(
      turmaId,
      coord(turmaId),
      {},
      form({ data: "2026-10-10", horario: "09:00" }),
    );
    expect(estado.errosCampos?.horario).toBe(MSG_CONFLITO_HORARIO);
    expect(await prisma.encontro.count()).toBe(1);
  });
});

describe("editarEncontroAction (4.8, 4.9, 5.7)", () => {
  it("catequista designado edita e volta com alteracoes-salvas", async () => {
    const turmaId = await criarTurmaDireta();
    const encontroId = await criarEncontroDireto(turmaId, { data: "2026-10-10" });
    const ator = await criarCatequista();
    await designar(turmaId, ator.id);
    usarSessao(ator);
    const url = await capturarRedirect(
      editarEncontroAction(
        turmaId,
        encontroId,
        cat(turmaId),
        {},
        form({ data: "2026-10-11", horario: "08:00", observacoes: "Novo" }),
      ),
    );
    expect(url).toBe(`${cat(turmaId)}?aviso=alteracoes-salvas`);
    const e = await prisma.encontro.findUniqueOrThrow({ where: { id: encontroId } });
    expect(e).toMatchObject({ data: dia("2026-10-11"), horario: "08:00", observacoes: "Novo" });
  });

  it("catequista não designado vai para /acesso-negado sem gravar", async () => {
    const turmaId = await criarTurmaDireta();
    const encontroId = await criarEncontroDireto(turmaId, { data: "2026-10-10" });
    usarSessao(await criarCatequista());
    expect(
      await capturarRedirect(
        editarEncontroAction(turmaId, encontroId, cat(turmaId), {}, form({ data: "2026-10-20" })),
      ),
    ).toBe("/acesso-negado");
    const e = await prisma.encontro.findUniqueOrThrow({ where: { id: encontroId } });
    expect(e.data).toEqual(dia("2026-10-10"));
  });

  it("mantém o tema atual desativado (4.9), mas recusa trocar para outro desativado", async () => {
    const turmaId = await criarTurmaDireta();
    const atual = await criarTemaDireto("Atual");
    const outro = await criarTemaDireto("Outro", { ativo: false });
    const encontroId = await criarEncontroDireto(turmaId, { data: "2026-10-10", temaId: atual });
    await prisma.tema.update({ where: { id: atual }, data: { ativo: false } });
    usarSessao(await criarCoordenacao());

    const recusa = await editarEncontroAction(
      turmaId,
      encontroId,
      coord(turmaId),
      {},
      form({ data: "2026-10-10", temaId: outro }),
    );
    expect(recusa.errosCampos?.temaId).toBe(MSG_TEMA_INDISPONIVEL);

    const url = await capturarRedirect(
      editarEncontroAction(
        turmaId,
        encontroId,
        coord(turmaId),
        {},
        form({ data: "2026-10-12", temaId: atual }),
      ),
    );
    expect(url).toBe(`${coord(turmaId)}?aviso=alteracoes-salvas`);
    const e = await prisma.encontro.findUniqueOrThrow({ where: { id: encontroId } });
    expect(e).toMatchObject({ temaId: atual, data: dia("2026-10-12") });
  });

  it("tema repetido ignora o próprio encontro", async () => {
    const turmaId = await criarTurmaDireta();
    const temaId = await criarTemaDireto("Criação");
    const encontroId = await criarEncontroDireto(turmaId, { data: "2026-10-10", temaId });
    usarSessao(await criarCoordenacao());
    const url = await capturarRedirect(
      editarEncontroAction(
        turmaId,
        encontroId,
        coord(turmaId),
        {},
        form({ data: "2026-10-11", temaId }),
      ),
    );
    expect(url).toBe(`${coord(turmaId)}?aviso=alteracoes-salvas`);

    await criarEncontroDireto(turmaId, { data: "2026-09-01", temaId });
    const estado = await editarEncontroAction(
      turmaId,
      encontroId,
      coord(turmaId),
      {},
      form({ data: "2026-10-12", temaId }),
    );
    expect(estado.temaRepetido).toEqual({ data: "01/09/2026" });
  });

  it("conflito de horário com outro encontro, mas não consigo mesmo", async () => {
    const turmaId = await criarTurmaDireta();
    await criarEncontroDireto(turmaId, { data: "2026-10-17", horario: "09:00" });
    const encontroId = await criarEncontroDireto(turmaId, { data: "2026-10-10", horario: "09:00" });
    usarSessao(await criarCoordenacao());
    const estado = await editarEncontroAction(
      turmaId,
      encontroId,
      coord(turmaId),
      {},
      form({ data: "2026-10-17", horario: "09:00" }),
    );
    expect(estado.errosCampos?.horario).toBe(MSG_CONFLITO_HORARIO);
    const url = await capturarRedirect(
      editarEncontroAction(
        turmaId,
        encontroId,
        coord(turmaId),
        {},
        form({ data: "2026-10-10", horario: "09:00", observacoes: "x" }),
      ),
    );
    expect(url).toBe(`${coord(turmaId)}?aviso=alteracoes-salvas`);
  });

  it("encontro realizado não pode ser editado", async () => {
    const turmaId = await criarTurmaDireta();
    const encontroId = await criarEncontroDireto(turmaId, {
      data: "2026-09-05",
      situacao: "realizado",
    });
    usarSessao(await criarCoordenacao());
    const estado = await editarEncontroAction(
      turmaId,
      encontroId,
      coord(turmaId),
      {},
      form({ data: "2026-09-06" }),
    );
    expect(estado.erro).toBe(MSG_SO_PLANEJADO);
    const e = await prisma.encontro.findUniqueOrThrow({ where: { id: encontroId } });
    expect(e.data).toEqual(dia("2026-09-05"));
  });

  it("encontro de outra turma é recusado", async () => {
    const turmaId = await criarTurmaDireta();
    const outra = await criarTurmaDireta({ nome: "Outra" });
    const encontroId = await criarEncontroDireto(outra, { data: "2026-10-10" });
    usarSessao(await criarCoordenacao());
    const estado = await editarEncontroAction(
      turmaId,
      encontroId,
      coord(turmaId),
      {},
      form({ data: "2026-10-11" }),
    );
    expect(estado.erro).toBe(MSG_ERRO_INESPERADO);
    const invalido = await editarEncontroAction(
      turmaId,
      "nao-uuid",
      coord(turmaId),
      {},
      form({ data: "2026-10-11" }),
    );
    expect(invalido.erro).toBe(MSG_ERRO_INESPERADO);
    const e = await prisma.encontro.findUniqueOrThrow({ where: { id: encontroId } });
    expect(e.data).toEqual(dia("2026-10-10"));
  });

  it("turma encerrada é recusada na edição", async () => {
    const turmaId = await criarTurmaDireta({ encerradaEm: "2026-06-30" });
    const encontroId = await criarEncontroDireto(turmaId, { data: "2026-06-01" });
    usarSessao(await criarCoordenacao());
    const estado = await editarEncontroAction(
      turmaId,
      encontroId,
      coord(turmaId),
      {},
      form({ data: "2026-06-02" }),
    );
    expect(estado.erro).toBe(MSG_TURMA_ENCERRADA);
  });
});
