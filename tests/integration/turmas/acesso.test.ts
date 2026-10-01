import { describe, expect, it } from "vitest";
import type { SessaoUsuario } from "@/modules/auth/dal";
import type { DataCivil } from "@/modules/compartilhado/datas";
import { podeVerCatequizando, podeVerTurma } from "@/modules/turmas/acesso";
import { designar, desligar, removerDesignacao } from "@/modules/turmas/repositorio";
import {
  criarCatequizandoDireto,
  criarTurmaDireta,
  criarUsuarioDireto,
  inscreverDireto,
} from "./helpers";

const sessao = (userId: string, papel: SessaoUsuario["papel"]): SessaoUsuario => ({
  userId,
  nome: "X",
  email: `${userId}@exemplo.com`,
  papel,
});

async function cenario() {
  const designado = await criarUsuarioDireto("Ana");
  const outro = await criarUsuarioDireto("Bia");
  const coord = await criarUsuarioDireto("Coord", { role: "coordenacao" });
  const turmaId = await criarTurmaDireta();
  await designar(turmaId, designado);
  const catequizandoId = await criarCatequizandoDireto("Pedro");
  const inscricaoId = await inscreverDireto(turmaId, catequizandoId, "2026-02-01");
  return { designado, outro, coord, turmaId, catequizandoId, inscricaoId };
}

describe("podeVerTurma (1.2, 1.3, 9.3, 9.4)", () => {
  it("coordenação e designado veem; não designado não; remoção revoga na hora", async () => {
    const c = await cenario();
    expect(await podeVerTurma(sessao(c.coord, "coordenacao"), c.turmaId)).toBe(true);
    expect(await podeVerTurma(sessao(c.designado, "catequista"), c.turmaId)).toBe(true);
    expect(await podeVerTurma(sessao(c.outro, "catequista"), c.turmaId)).toBe(false);
    await removerDesignacao(c.turmaId, c.designado);
    expect(await podeVerTurma(sessao(c.designado, "catequista"), c.turmaId)).toBe(false);
  });

  it("id inválido retorna false sem lançar", async () => {
    const coord = await criarUsuarioDireto("C", { role: "coordenacao" });
    await expect(podeVerTurma(sessao(coord, "coordenacao"), "nao-uuid")).resolves.toBe(false);
    await expect(podeVerTurma(sessao(coord, "catequista"), "")).resolves.toBe(false);
  });
});

describe("podeVerCatequizando (1.2, 1.3, 9.3, 9.4)", () => {
  it("coordenação e designado veem; não designado não; desligamento revoga na hora", async () => {
    const c = await cenario();
    expect(await podeVerCatequizando(sessao(c.coord, "coordenacao"), c.catequizandoId)).toBe(true);
    expect(await podeVerCatequizando(sessao(c.designado, "catequista"), c.catequizandoId)).toBe(
      true,
    );
    expect(await podeVerCatequizando(sessao(c.outro, "catequista"), c.catequizandoId)).toBe(false);
    await desligar(c.inscricaoId, "2026-09-30" as DataCivil);
    expect(await podeVerCatequizando(sessao(c.designado, "catequista"), c.catequizandoId)).toBe(
      false,
    );
  });

  it("remoção da designação revoga o acesso ao catequizando", async () => {
    const c = await cenario();
    await removerDesignacao(c.turmaId, c.designado);
    expect(await podeVerCatequizando(sessao(c.designado, "catequista"), c.catequizandoId)).toBe(
      false,
    );
  });

  it("id inválido retorna false sem lançar", async () => {
    const coord = await criarUsuarioDireto("C", { role: "coordenacao" });
    await expect(podeVerCatequizando(sessao(coord, "coordenacao"), "x'; drop")).resolves.toBe(
      false,
    );
  });
});
