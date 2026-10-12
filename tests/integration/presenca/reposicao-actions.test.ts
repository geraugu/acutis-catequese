import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  MSG_CONFLITO_DATA_RESERVA,
  MSG_ERRO_INESPERADO,
  MSG_OPCAO_INDISPONIVEL,
  MSG_RESERVA_SEM_TURMA_ORIGEM,
  MSG_TEMA_JA_RESERVADO,
} from "@/modules/presenca/mensagens";
import {
  cancelarReservaAction,
  naoCompareceuAction,
  reservarReposicaoAction,
} from "@/modules/presenca/reposicao-actions";
import * as reposicaoRepositorio from "@/modules/presenca/reposicao-repositorio";
import { designar } from "@/modules/turmas/repositorio";
import {
  capturarRedirect,
  criarCatequista,
  criarCoordenacao,
  form,
  limparSessao,
  usarSessao,
} from "../equipe/helpers";
import {
  criarCatequizandoDireto,
  criarEncontroDireto,
  criarEncontroPlanejadoDireto,
  criarEncontroRealizadoDireto,
  criarInscricaoDireta,
  criarReservaDireta,
  criarTemaDireto,
  criarTurmaDireta,
} from "./helpers-reposicao";

vi.mock("next/headers", async () => (await import("../equipe/next-mocks")).nextHeadersMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", async () => (await import("../equipe/next-mocks")).nextNavigationMock);
vi.mock("@/modules/presenca/reposicao-repositorio", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/modules/presenca/reposicao-repositorio")>();
  return {
    ...real,
    reservar: vi.fn(real.reservar),
    visaoOQueFalta: vi.fn(real.visaoOQueFalta),
    cancelar: vi.fn(real.cancelar),
    marcarNaoCompareceu: vi.fn(real.marcarNaoCompareceu),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(reposicaoRepositorio.reservar).mockClear();
  vi.mocked(reposicaoRepositorio.cancelar).mockClear();
  vi.mocked(reposicaoRepositorio.marcarNaoCompareceu).mockClear();
  limparSessao();
});

// Convenção: `base` é a rota do catequizando; a volta é `${base}/reposicao`.
const baseCoord = (c: string) => `/coordenacao/catequizandos/${c}`;
const baseCat = (c: string) => `/catequista/catequizandos/${c}`;
const volta = (base: string, aviso: string) => `${base}/reposicao?aviso=${aviso}`;

async function cenario() {
  const origem = await criarTurmaDireta({ nome: `Origem ${Math.random()}` });
  const destino = await criarTurmaDireta({ nome: `Destino ${Math.random()}` });
  const catequizandoId = await criarCatequizandoDireto({ nome: "Ana" });
  await criarInscricaoDireta(origem, catequizandoId, { dataEntrada: "2020-01-01" });
  const t1 = await criarTemaDireto(`Tema ${Math.random()}`);
  const t2 = await criarTemaDireto(`Tema ${Math.random()}`);
  await criarEncontroRealizadoDireto(origem, t1, "2020-03-07");
  await criarEncontroRealizadoDireto(origem, t2, "2020-03-14");
  const enc1 = await criarEncontroPlanejadoDireto(destino, t1, "2099-03-07");
  const enc2 = await criarEncontroPlanejadoDireto(destino, t2, "2099-03-14");
  return { origem, destino, catequizandoId, t1, t2, enc1, enc2 };
}

const reservar = (
  c: { catequizandoId: string },
  base: string,
  campos: { encontroId: string; temaId: string },
) => reservarReposicaoAction(c.catequizandoId, base, {}, form(campos));

const reservas = (catequizandoId: string) =>
  prisma.reservaReposicao.findMany({ where: { catequizandoId } });

describe("reservarReposicaoAction (1.1 a 1.4, 4.5, 7.2)", () => {
  it("coordenação reserva para qualquer catequizando, com aviso e criadoPorId da sessão", async () => {
    const c = await cenario();
    const coord = await criarCoordenacao();
    usarSessao(coord);
    const url = await capturarRedirect(
      reservar(c, baseCoord(c.catequizandoId), { encontroId: c.enc1, temaId: c.t1 }),
    );
    expect(url).toBe(volta(baseCoord(c.catequizandoId), "reserva-criada"));
    const linhas = await reservas(c.catequizandoId);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      encontroId: c.enc1,
      temaId: c.t1,
      turmaOrigemId: c.origem,
      situacao: "reservada",
      criadoPorId: coord.id,
    });
  });

  it("catequista reserva só para catequizando das suas turmas", async () => {
    const c = await cenario();
    const catequista = await criarCatequista();
    await designar(c.origem, catequista.id);
    usarSessao(catequista);
    const url = await capturarRedirect(
      reservar(c, baseCat(c.catequizandoId), { encontroId: c.enc1, temaId: c.t1 }),
    );
    expect(url).toBe(volta(baseCat(c.catequizandoId), "reserva-criada"));
    expect(await reservas(c.catequizandoId)).toHaveLength(1);
  });

  it("catequista sem acesso é enviado a /acesso-negado sem ler dados nem criar reserva", async () => {
    const c = await cenario();
    usarSessao(await criarCatequista());
    const visao = vi.mocked(reposicaoRepositorio.visaoOQueFalta);
    visao.mockClear();
    const url = await capturarRedirect(
      reservar(c, baseCat(c.catequizandoId), { encontroId: c.enc1, temaId: c.t1 }),
    );
    expect(url).toBe("/acesso-negado");
    expect(visao).not.toHaveBeenCalled();
    expect(reposicaoRepositorio.reservar).not.toHaveBeenCalled();
    expect(await reservas(c.catequizandoId)).toEqual([]);
  });

  it("sem sessão vai ao login", async () => {
    const c = await cenario();
    limparSessao();
    expect(
      await capturarRedirect(
        reservar(c, baseCoord(c.catequizandoId), { encontroId: c.enc1, temaId: c.t1 }),
      ),
    ).toBe("/login");
    expect(await reservas(c.catequizandoId)).toEqual([]);
  });

  it("base fora das rotas do catequizando cai na rota da coordenação (sem open redirect)", async () => {
    const c = await cenario();
    usarSessao(await criarCoordenacao());
    const url = await capturarRedirect(
      reservar(c, "https://malicioso.example/x", { encontroId: c.enc1, temaId: c.t1 }),
    );
    expect(url).toBe(volta(baseCoord(c.catequizandoId), "reserva-criada"));
  });

  it("recusa chamada forjada: opção fora da visão, tema cumprido ou ids inválidos", async () => {
    const c = await cenario();
    usarSessao(await criarCoordenacao());
    const base = baseCoord(c.catequizandoId);
    // encontro de outro tema que não consta das opções do tema informado
    expect(await reservar(c, base, { encontroId: c.enc1, temaId: c.t2 })).toEqual({
      erro: MSG_OPCAO_INDISPONIVEL,
    });
    // encontro da própria origem (não é opção)
    const daOrigem = await criarEncontroPlanejadoDireto(c.origem, c.t1, "2099-04-01");
    expect(await reservar(c, base, { encontroId: daOrigem, temaId: c.t1 })).toEqual({
      erro: MSG_OPCAO_INDISPONIVEL,
    });
    // tema cumprido: presença presente na origem
    const realizado = await criarEncontroDireto(c.origem, {
      data: "2020-04-04",
      temaId: c.t1,
      situacao: "realizado",
    });
    await prisma.presenca.create({
      data: {
        encontroId: realizado,
        turmaId: c.origem,
        catequizandoId: c.catequizandoId,
        status: "presente",
      },
    });
    expect(await reservar(c, base, { encontroId: c.enc1, temaId: c.t1 })).toEqual({
      erro: MSG_OPCAO_INDISPONIVEL,
    });
    // ids inválidos
    expect(await reservar(c, base, { encontroId: "x", temaId: c.t1 })).toEqual({
      erro: MSG_OPCAO_INDISPONIVEL,
    });
    expect(await reservarReposicaoAction(c.catequizandoId, base, {}, new FormData())).toEqual({
      erro: MSG_OPCAO_INDISPONIVEL,
    });
    expect(reposicaoRepositorio.reservar).not.toHaveBeenCalled();
    expect(await reservas(c.catequizandoId)).toEqual([]);
  });

  it("tema já reservado e conflito de data voltam como mensagem", async () => {
    const c = await cenario();
    usarSessao(await criarCoordenacao());
    const base = baseCoord(c.catequizandoId);
    // Reserva do t1 em enc1; t2 em encontro na mesma data → conflito.
    await criarReservaDireta({
      catequizandoId: c.catequizandoId,
      temaId: c.t1,
      encontroId: c.enc1,
      turmaOrigemId: c.origem,
    });
    const outraTurma = await criarTurmaDireta({ nome: `Outra ${Math.random()}` });
    const mesmaData = await criarEncontroPlanejadoDireto(outraTurma, c.t2, "2099-03-07");
    expect(await reservar(c, base, { encontroId: mesmaData, temaId: c.t2 })).toEqual({
      erro: MSG_CONFLITO_DATA_RESERVA,
    });
    // t1 já tem reserva ativa: sem opções na visão (indisponível para a action)
    const outro = await criarEncontroPlanejadoDireto(c.destino, c.t1, "2099-05-02");
    expect(await reservar(c, base, { encontroId: outro, temaId: c.t1 })).toEqual({
      erro: MSG_OPCAO_INDISPONIVEL,
    });
    expect(await reservas(c.catequizandoId)).toHaveLength(1);
  });

  it("mapeia os motivos do repositório às mensagens", async () => {
    const c = await cenario();
    usarSessao(await criarCoordenacao());
    const base = baseCoord(c.catequizandoId);
    const mock = vi.mocked(reposicaoRepositorio.reservar);
    const casos = [
      ["indisponivel", MSG_OPCAO_INDISPONIVEL],
      ["conflito-de-data", MSG_CONFLITO_DATA_RESERVA],
      ["ja-reservada", MSG_TEMA_JA_RESERVADO],
      ["sem-origem", MSG_RESERVA_SEM_TURMA_ORIGEM],
    ] as const;
    for (const [motivo, msg] of casos) {
      mock.mockResolvedValueOnce({ ok: false, motivo });
      expect(await reservar(c, base, { encontroId: c.enc1, temaId: c.t1 })).toEqual({ erro: msg });
    }
  });

  it("falha inesperada devolve a mensagem padrão e registra só ids e o nome do erro", async () => {
    const c = await cenario();
    usarSessao(await criarCoordenacao());
    vi.mocked(reposicaoRepositorio.reservar).mockRejectedValueOnce(new Error("boom"));
    const erroLog = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      await reservar(c, baseCoord(c.catequizandoId), { encontroId: c.enc1, temaId: c.t1 }),
    ).toEqual({ erro: MSG_ERRO_INESPERADO });
    expect(erroLog).toHaveBeenCalledWith("[presenca] falha ao reservar a reposição", {
      catequizandoId: c.catequizandoId,
      erro: "Error",
    });
    expect(await reservas(c.catequizandoId)).toEqual([]);
  });
});

describe("cancelarReservaAction (4.5, 7.2)", () => {
  async function comReserva() {
    const c = await cenario();
    const reservaId = await criarReservaDireta({
      catequizandoId: c.catequizandoId,
      temaId: c.t1,
      encontroId: c.enc1,
      turmaOrigemId: c.origem,
    });
    return { ...c, reservaId };
  }

  it("cancela e avisa", async () => {
    const c = await comReserva();
    usarSessao(await criarCoordenacao());
    const url = await capturarRedirect(
      cancelarReservaAction(c.catequizandoId, c.reservaId, baseCoord(c.catequizandoId)),
    );
    expect(url).toBe(volta(baseCoord(c.catequizandoId), "reserva-cancelada"));
    const r = await prisma.reservaReposicao.findUniqueOrThrow({ where: { id: c.reservaId } });
    expect(r.situacao).toBe("cancelada");
  });

  it("reserva inexistente ou já cancelada volta sem aviso e sem lançar", async () => {
    const c = await comReserva();
    usarSessao(await criarCoordenacao());
    const base = baseCoord(c.catequizandoId);
    await capturarRedirect(cancelarReservaAction(c.catequizandoId, c.reservaId, base));
    const url = await capturarRedirect(cancelarReservaAction(c.catequizandoId, c.reservaId, base));
    expect(url).toBe(`${base}/reposicao`);
  });

  it("catequista sem acesso é negado e a reserva permanece", async () => {
    const c = await comReserva();
    usarSessao(await criarCatequista());
    const url = await capturarRedirect(
      cancelarReservaAction(c.catequizandoId, c.reservaId, baseCat(c.catequizandoId)),
    );
    expect(url).toBe("/acesso-negado");
    expect(reposicaoRepositorio.cancelar).not.toHaveBeenCalled();
    const r = await prisma.reservaReposicao.findUniqueOrThrow({ where: { id: c.reservaId } });
    expect(r.situacao).toBe("reservada");
  });

  it("sem sessão vai ao login", async () => {
    const c = await comReserva();
    limparSessao();
    expect(
      await capturarRedirect(
        cancelarReservaAction(c.catequizandoId, c.reservaId, baseCoord(c.catequizandoId)),
      ),
    ).toBe("/login");
  });
});

describe("naoCompareceuAction (5.3, 7.2)", () => {
  const baseCronograma = (t: string) => `/coordenacao/turmas/${t}/encontros`;

  async function comReservaNoPassado() {
    const c = await cenario();
    const encontroId = await criarEncontroDireto(c.destino, {
      data: "2020-06-06",
      temaId: c.t1,
      situacao: "planejado",
    });
    const reservaId = await criarReservaDireta({
      catequizandoId: c.catequizandoId,
      temaId: c.t1,
      encontroId,
      turmaOrigemId: c.origem,
    });
    return { ...c, encontroId, reservaId };
  }

  it("marca a ausência e volta à chamada com aviso", async () => {
    const c = await comReservaNoPassado();
    usarSessao(await criarCoordenacao());
    const url = await capturarRedirect(
      naoCompareceuAction(c.destino, c.encontroId, c.catequizandoId, baseCronograma(c.destino)),
    );
    expect(url).toBe(`${baseCronograma(c.destino)}/${c.encontroId}/chamada?aviso=ausencia-marcada`);
    const r = await prisma.reservaReposicao.findUniqueOrThrow({ where: { id: c.reservaId } });
    expect(r.situacao).toBe("nao_compareceu");
  });

  it("catequista de outra turma é negado; sem sessão vai ao login", async () => {
    const c = await comReservaNoPassado();
    usarSessao(await criarCatequista());
    expect(
      await capturarRedirect(
        naoCompareceuAction(c.destino, c.encontroId, c.catequizandoId, baseCronograma(c.destino)),
      ),
    ).toBe("/acesso-negado");
    limparSessao();
    expect(
      await capturarRedirect(
        naoCompareceuAction(c.destino, c.encontroId, c.catequizandoId, baseCronograma(c.destino)),
      ),
    ).toBe("/login");
    expect(reposicaoRepositorio.marcarNaoCompareceu).not.toHaveBeenCalled();
    const r = await prisma.reservaReposicao.findUniqueOrThrow({ where: { id: c.reservaId } });
    expect(r.situacao).toBe("reservada");
  });

  it("encontro de OUTRA turma com turmaId autorizado não marca nada", async () => {
    const c = await comReservaNoPassado();
    const outraTurma = await criarTurmaDireta({ nome: `Outra ${Math.random()}` });
    usarSessao(await criarCoordenacao());
    const url = await capturarRedirect(
      naoCompareceuAction(outraTurma, c.encontroId, c.catequizandoId, baseCronograma(outraTurma)),
    );
    expect(url).toBe(`${baseCronograma(outraTurma)}/${c.encontroId}/chamada`);
    expect(reposicaoRepositorio.marcarNaoCompareceu).not.toHaveBeenCalled();
    const r = await prisma.reservaReposicao.findUniqueOrThrow({ where: { id: c.reservaId } });
    expect(r.situacao).toBe("reservada");
  });

  it("catequizando sem reserva naquele encontro não marca nada", async () => {
    const c = await comReservaNoPassado();
    const outro = await criarCatequizandoDireto({ nome: "Bia" });
    usarSessao(await criarCoordenacao());
    const url = await capturarRedirect(
      naoCompareceuAction(c.destino, c.encontroId, outro, baseCronograma(c.destino)),
    );
    expect(url).toBe(`${baseCronograma(c.destino)}/${c.encontroId}/chamada`);
    const r = await prisma.reservaReposicao.findUniqueOrThrow({ where: { id: c.reservaId } });
    expect(r.situacao).toBe("reservada");
  });

  it("ids malformados redirecionam à lista de encontros sem o valor no caminho nem tocar o repositório", async () => {
    const c = await comReservaNoPassado();
    usarSessao(await criarCoordenacao());
    const lista = baseCronograma(c.destino);
    expect(
      await capturarRedirect(naoCompareceuAction(c.destino, "../x", c.catequizandoId, lista)),
    ).toBe(lista);
    expect(
      await capturarRedirect(naoCompareceuAction(c.destino, c.encontroId, "../y", lista)),
    ).toBe(lista);
    expect(reposicaoRepositorio.marcarNaoCompareceu).not.toHaveBeenCalled();
    const r = await prisma.reservaReposicao.findUniqueOrThrow({ where: { id: c.reservaId } });
    expect(r.situacao).toBe("reservada");
  });

  it("catequista designado na turma visitada marca a ausência com a base do catequista", async () => {
    const c = await comReservaNoPassado();
    const catequista = await criarCatequista();
    await designar(c.destino, catequista.id);
    usarSessao(catequista);
    const base = `/catequista/turmas/${c.destino}/encontros`;
    const url = await capturarRedirect(
      naoCompareceuAction(c.destino, c.encontroId, c.catequizandoId, base),
    );
    expect(url).toBe(`${base}/${c.encontroId}/chamada?aviso=ausencia-marcada`);
    const r = await prisma.reservaReposicao.findUniqueOrThrow({ where: { id: c.reservaId } });
    expect(r.situacao).toBe("nao_compareceu");
  });

  it("recusa quando a chamada não está disponível (encontro futuro) sem marcar", async () => {
    const c = await cenario(); // enc1 em 2099
    await criarReservaDireta({
      catequizandoId: c.catequizandoId,
      temaId: c.t1,
      encontroId: c.enc1,
      turmaOrigemId: c.origem,
    });
    usarSessao(await criarCoordenacao());
    const url = await capturarRedirect(
      naoCompareceuAction(c.destino, c.enc1, c.catequizandoId, baseCronograma(c.destino)),
    );
    expect(url).toBe(`${baseCronograma(c.destino)}/${c.enc1}/chamada`);
    expect(reposicaoRepositorio.marcarNaoCompareceu).not.toHaveBeenCalled();
  });
});
