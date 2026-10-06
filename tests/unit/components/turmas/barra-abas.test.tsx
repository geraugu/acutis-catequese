// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const segmento = vi.hoisted(() => ({ atual: null as string | null }));
vi.mock("next/navigation", () => ({ useSelectedLayoutSegment: () => segmento.atual }));

import { BarraAbas } from "@/components/turmas/barra-abas";
import { CabecalhoTurma } from "@/components/turmas/cabecalho-turma";

const BASE = "/coordenacao/turmas/t1";

beforeEach(() => {
  segmento.atual = null;
});

describe("BarraAbas", () => {
  it("mostra as cinco abas na ordem, com os endereços certos (1.2)", () => {
    render(<BarraAbas base={BASE} pendentes={0} />);
    const nav = screen.getByRole("navigation", { name: "Seções da turma" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual([
      "Resumo",
      "Inscritos",
      "Frequência",
      "Encontros",
      "Equipe e link",
    ]);
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      BASE,
      `${BASE}/inscritos`,
      `${BASE}/frequencia`,
      `${BASE}/encontros`,
      `${BASE}/equipe`,
    ]);
  });

  it("não usa role tablist (11.3)", () => {
    const { container } = render(<BarraAbas base={BASE} pendentes={0} />);
    expect(container.querySelector('[role="tablist"], [role="tab"]')).toBeNull();
  });

  it("segmento nulo marca só o Resumo com aria-current (1.4)", () => {
    render(<BarraAbas base={BASE} pendentes={0} />);
    const atuais = screen.getAllByRole("link").filter((l) => l.hasAttribute("aria-current"));
    expect(atuais).toHaveLength(1);
    expect(atuais[0]).toHaveTextContent("Resumo");
    expect(atuais[0]).toHaveAttribute("aria-current", "page");
  });

  it.each([
    ["inscritos", "Inscritos"],
    ["frequencia", "Frequência"],
    ["encontros", "Encontros"],
    ["equipe", "Equipe e link"],
  ])("segmento %s marca só a aba %s", (seg, rotulo) => {
    segmento.atual = seg;
    render(<BarraAbas base={BASE} pendentes={0} />);
    const atuais = screen.getAllByRole("link").filter((l) => l.hasAttribute("aria-current"));
    expect(atuais).toHaveLength(1);
    expect(atuais[0]).toHaveTextContent(rotulo);
  });

  it("segmento desconhecido não marca nenhuma aba", () => {
    segmento.atual = "pendentes";
    render(<BarraAbas base={BASE} pendentes={0} />);
    expect(screen.getAllByRole("link").some((l) => l.hasAttribute("aria-current"))).toBe(false);
  });

  it("sem pendentes não mostra contagem (1.6)", () => {
    const { container } = render(<BarraAbas base={BASE} pendentes={0} />);
    expect(container.querySelector(".aba-contagem")).toBeNull();
    expect(screen.queryByText(/pendente/)).toBeNull();
  });

  it("com pendentes mostra a contagem só em Equipe e link, com texto para leitor de tela (1.6)", () => {
    const { container } = render(<BarraAbas base={BASE} pendentes={3} />);
    const contagens = container.querySelectorAll(".aba-contagem");
    expect(contagens).toHaveLength(1);
    const equipe = screen.getByRole("link", { name: /Equipe e link/ });
    expect(equipe).toContainElement(contagens[0] as HTMLElement);
    expect(contagens[0]).toHaveTextContent("3");
    expect(within(equipe).getByText("3 fichas pendentes")).toHaveClass("visualmente-oculto");
    expect(screen.getByRole("link", { name: "Inscritos" })).toBeInTheDocument();
  });

  it("usa o singular com uma ficha pendente", () => {
    render(<BarraAbas base={BASE} pendentes={1} />);
    expect(screen.getByText("1 ficha pendente")).toBeInTheDocument();
  });
});

describe("CabecalhoTurma", () => {
  it("coordenação: link para as turmas e h1 com o nome (1.1)", () => {
    render(<CabecalhoTurma papel="coordenacao" nome="Turma Crisma" />);
    expect(screen.getByRole("link", { name: "← Voltar para as turmas" })).toHaveAttribute(
      "href",
      "/coordenacao/turmas",
    );
    expect(screen.getByRole("heading", { level: 1, name: "Turma Crisma" })).toBeInTheDocument();
  });

  it("catequista: link para minhas turmas", () => {
    render(<CabecalhoTurma papel="catequista" nome="Turma Crisma" />);
    expect(screen.getByRole("link", { name: "← Voltar para minhas turmas" })).toHaveAttribute(
      "href",
      "/catequista/turmas",
    );
  });
});
