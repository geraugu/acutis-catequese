// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BuscaCatequizandos } from "@/components/catequizandos/busca-catequizandos";
import { ListaCatequizandos } from "@/components/catequizandos/lista-catequizandos";
import type { DataCivil } from "@/modules/compartilhado/datas";
import type { CatequizandoResumo } from "@/modules/catequizandos/repositorio";

const hoje = "2026-09-30" as DataCivil;

const catequizandos: CatequizandoResumo[] = [
  {
    id: "c1",
    nome: "Bruno Lima",
    dataNascimento: "2000-10-01" as DataCivil,
    telefone: "11987654321",
    email: null,
    estado: "ativo",
    sacramentosRecebidos: ["batismo", "eucaristia", "crisma"],
  },
  {
    id: "c2",
    nome: "Carla Dias",
    dataNascimento: "2008-01-15" as DataCivil,
    telefone: "1133334444",
    email: "c@x.com",
    estado: "pendente",
    sacramentosRecebidos: [],
  },
];

describe("ListaCatequizandos", () => {
  it("mostra nome com link, idade, telefone, selos e estado", () => {
    render(<ListaCatequizandos catequizandos={catequizandos} hoje={hoje} />);
    const itens = screen.getAllByRole("listitem");
    expect(itens).toHaveLength(2);

    const bruno = within(itens[0]!);
    expect(bruno.getByRole("link", { name: "Bruno Lima" })).toHaveAttribute(
      "href",
      "/coordenacao/catequizandos/c1",
    );
    expect(bruno.getByText("25 anos")).toBeInTheDocument();
    expect(bruno.getByText("(11) 98765-4321")).toBeInTheDocument();
    expect(bruno.getByText("Batismo, Eucaristia, Crisma")).toBeInTheDocument();
    expect(bruno.getByText("Ativo")).toBeInTheDocument();

    const carla = within(itens[1]!);
    expect(carla.getByText("18 anos")).toBeInTheDocument();
    expect(carla.getByText("(11) 3333-4444")).toBeInTheDocument();
    expect(carla.getByText("Nenhum sacramento")).toBeInTheDocument();
    expect(carla.getByText("Pendente")).toBeInTheDocument();
  });

  it("mostra o estado vazio com link para limpar a busca", () => {
    render(<ListaCatequizandos catequizandos={[]} hoje={hoje} />);
    expect(screen.getByRole("heading", { name: /nenhum catequizando/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Limpar busca" })).toHaveAttribute(
      "href",
      "/coordenacao/catequizandos",
    );
  });
});

describe("BuscaCatequizandos", () => {
  it("renderiza o formulário GET com os valores atuais", () => {
    render(<BuscaCatequizandos termo="ana" estado="pendente" semSacramento="crisma" />);
    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/coordenacao/catequizandos");
    const termo = screen.getByLabelText(/nome/i);
    expect(termo).toHaveAttribute("name", "q");
    expect(termo).toHaveValue("ana");
    const estado = screen.getByLabelText("Estado");
    expect(estado).toHaveAttribute("name", "estado");
    expect(estado).toHaveValue("pendente");
    expect(
      within(estado)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Ativos", "Pendentes", "Inativos", "Todos"]);
    const sem = screen.getByLabelText("Sacramento");
    expect(sem).toHaveAttribute("name", "sem");
    expect(sem).toHaveValue("crisma");
    expect(
      within(sem)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Qualquer", "Sem batismo", "Sem eucaristia", "Sem crisma"]);
    expect(screen.getByRole("button", { name: "Buscar" })).toBeInTheDocument();
  });

  it("usa padrões sem sacramento selecionado", () => {
    render(<BuscaCatequizandos estado="ativo" />);
    expect(screen.getByLabelText("Sacramento")).toHaveValue("");
  });
});
