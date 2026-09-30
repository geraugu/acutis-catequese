import { describe, expect, it } from "vitest";
import type { DataCivil } from "@/modules/compartilhado/datas";
import type { FichaDados } from "@/modules/catequizandos/domain/ficha";
import {
  atualizarFicha,
  contarPendentes,
  criarCatequizando,
  listarCatequizandos,
  mudarEstado,
  obterCatequizando,
} from "@/modules/catequizandos/repositorio";

const d = (s: string) => s as DataCivil;

function ficha(extra: Partial<FichaDados> = {}): FichaDados {
  return {
    nome: "Maria Souza",
    dataNascimento: d("2000-05-10"),
    telefone: "11987654321",
    email: "maria@exemplo.com",
    endereco: "Rua A, 1",
    observacoes: "Obs",
    sacramentos: {
      batismo: { recebido: true, data: d("2001-01-31"), paroquia: "Sé" },
      eucaristia: { recebido: true },
      crisma: { recebido: false },
    },
    ...extra,
  };
}

describe("repositório de catequizandos", () => {
  it("cria e lê com sacramentos e datas preservadas", async () => {
    const id = await criarCatequizando(ficha(), "ativo");
    const lido = await obterCatequizando(id);
    expect(lido).not.toBeNull();
    expect(lido!.nome).toBe("Maria Souza");
    expect(lido!.dataNascimento).toBe("2000-05-10");
    expect(lido!.email).toBe("maria@exemplo.com");
    expect(lido!.endereco).toBe("Rua A, 1");
    expect(lido!.estado).toBe("ativo");
    expect(lido!.criadoEm).toBeInstanceOf(Date);
    expect(lido!.sacramentosRecebidos).toEqual(["batismo", "eucaristia"]);
    expect(lido!.sacramentos).toEqual({
      batismo: { recebido: true, data: "2001-01-31", paroquia: "Sé" },
      eucaristia: { recebido: true },
      crisma: { recebido: false },
    });

    const lista = await listarCatequizandos();
    expect(lista).toHaveLength(1);
    expect(lista[0]).toEqual({
      id,
      nome: "Maria Souza",
      dataNascimento: "2000-05-10",
      telefone: "11987654321",
      email: "maria@exemplo.com",
      estado: "ativo",
      sacramentosRecebidos: ["batismo", "eucaristia"],
    });
  });

  it("atualiza a ficha substituindo sacramentos e limpando opcionais", async () => {
    const id = await criarCatequizando(ficha(), "ativo");
    await atualizarFicha(id, {
      nome: "Maria S.",
      dataNascimento: d("2000-05-11"),
      telefone: "11911112222",
      sacramentos: {
        batismo: { recebido: false },
        eucaristia: { recebido: false },
        crisma: { recebido: true, data: d("2020-12-31") },
      },
    });
    const lido = await obterCatequizando(id);
    expect(lido!.nome).toBe("Maria S.");
    expect(lido!.dataNascimento).toBe("2000-05-11");
    expect(lido!.email).toBeNull();
    expect(lido!.endereco).toBeNull();
    expect(lido!.observacoes).toBeNull();
    expect(lido!.sacramentosRecebidos).toEqual(["crisma"]);
    expect(lido!.sacramentos.crisma).toEqual({ recebido: true, data: "2020-12-31" });
    expect(lido!.sacramentos.batismo).toEqual({ recebido: false });
  });

  it("mudarEstado só muda a partir do estado de origem", async () => {
    const id = await criarCatequizando(ficha(), "pendente");
    expect(await mudarEstado(id, "pendente", "ativo")).toBe(true);
    expect(await mudarEstado(id, "pendente", "inativo")).toBe(false);
    expect((await obterCatequizando(id))!.estado).toBe("ativo");
  });

  it("conta pendentes", async () => {
    await criarCatequizando(ficha(), "pendente");
    await criarCatequizando(ficha({ nome: "Outro" }), "pendente");
    await criarCatequizando(ficha({ nome: "Ativo" }), "ativo");
    expect(await contarPendentes()).toBe(2);
  });

  it("id inválido ou inexistente retorna null", async () => {
    expect(await obterCatequizando("nao-e-uuid")).toBeNull();
    expect(await obterCatequizando("00000000-0000-4000-8000-000000000000")).toBeNull();
  });
});
