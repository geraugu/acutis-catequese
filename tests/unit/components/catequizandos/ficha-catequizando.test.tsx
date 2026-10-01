// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FichaCatequizando } from "@/components/catequizandos/ficha-catequizando";
import type { CatequizandoDetalhe } from "@/modules/catequizandos/repositorio";
import type { DataCivil } from "@/modules/compartilhado/datas";

const ficha: CatequizandoDetalhe = {
  id: "00000000-0000-4000-8000-000000000001",
  nome: "João Lima",
  dataNascimento: "2000-05-10" as DataCivil,
  telefone: "11987654321",
  email: "joao@exemplo.com",
  estado: "ativo",
  endereco: "Rua A, 10",
  observacoes: null,
  sacramentosRecebidos: ["batismo"],
  criadoEm: new Date("2026-01-15T12:00:00Z"),
  sacramentos: {
    batismo: { recebido: true, data: "2000-08-01" as DataCivil, paroquia: "São José" },
    eucaristia: { recebido: false },
    crisma: { recebido: false },
  },
};

describe("FichaCatequizando", () => {
  it("exibe os dados da ficha", () => {
    render(<FichaCatequizando catequizando={ficha} />);
    expect(screen.getByText("joao@exemplo.com")).toBeTruthy();
    expect(screen.getByText("Rua A, 10")).toBeTruthy();
    expect(screen.getByText(/10\/05\/2000/)).toBeTruthy();
    expect(screen.getByText(/na paróquia São José/)).toBeTruthy();
    expect(screen.getByText("Nenhuma")).toBeTruthy();
    expect(screen.getByText("Ativo")).toBeTruthy();
    expect(screen.getByText("15/01/2026")).toBeTruthy();
  });

  it("não tem nenhuma ação de alteração", () => {
    render(<FichaCatequizando catequizando={ficha} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryByRole("link", { name: /editar/i })).toBeNull();
  });
});
