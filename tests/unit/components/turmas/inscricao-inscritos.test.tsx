// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/turmas/actions", () => ({}));

import { InscreverCatequizando } from "@/components/turmas/inscrever-catequizando";
import { Inscritos } from "@/components/turmas/inscritos";
import type { DataCivil } from "@/modules/compartilhado/datas";
import type { InscritoResumo } from "@/modules/turmas/repositorio";

type Estado = Record<string, unknown>;
type Acao = (anterior: unknown, dados: FormData) => Promise<Estado>;

const d = (s: string) => s as DataCivil;
const HOJE = d("2026-10-01");

const candidatos = [
  { id: "c1", nome: "Ana Lima", dataNascimento: d("2015-01-01"), turmaAtual: null },
  {
    id: "c2",
    nome: "Bruno Reis",
    dataNascimento: d("2014-05-05"),
    turmaAtual: { id: "t9", nome: "Crisma B" },
  },
];

function posterior(a: HTMLElement, b: HTMLElement) {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("InscreverCatequizando", () => {
  it("tem busca GET com campo q rotulado e lista candidatos com turma atual", () => {
    render(
      <InscreverCatequizando
        termo="an"
        candidatos={candidatos}
        acao={vi.fn<Acao>(async () => ({}))}
        hoje={HOJE}
      />,
    );
    const busca = screen.getByRole("searchbox", { name: /termo/i }) as HTMLInputElement;
    expect(busca.name).toBe("q");
    expect(busca.value).toBe("an");
    expect(busca.form?.method).toBe("get");
    expect(screen.getByRole("button", { name: "Buscar" })).toBeInTheDocument();
    expect(screen.getByText("Turma atual: Crisma B")).toBeInTheDocument();
    const datas = screen.getAllByLabelText(/data de entrada/i) as HTMLInputElement[];
    expect(datas).toHaveLength(2);
    expect(datas[0].type).toBe("date");
    expect(datas[0].value).toBe("2026-10-01");
    expect(screen.getAllByRole("button", { name: "Inscrever" })).toHaveLength(2);
  });

  it("sem candidatos após busca mostra o estado vazio", () => {
    render(
      <InscreverCatequizando
        termo="zzz"
        candidatos={[]}
        acao={vi.fn<Acao>(async () => ({}))}
        hoje={HOJE}
      />,
    );
    expect(screen.getByText("Nenhum catequizando encontrado")).toBeInTheDocument();
  });

  it("lotada e depois transferir: alertas, botões após o principal e confirmação oculta no reenvio", async () => {
    const respostas: Estado[] = [
      { lotada: { inscritos: 20, vagas: 20 } },
      { transferir: { turmaAtualNome: "Crisma B" } },
      {},
    ];
    const enviados: FormData[] = [];
    const acao = vi.fn<Acao>(async (_a, dados) => {
      enviados.push(dados);
      return respostas[enviados.length - 1];
    });
    render(<InscreverCatequizando termo="" candidatos={[candidatos[1]]} acao={acao} hoje={HOJE} />);
    fireEvent.click(screen.getByRole("button", { name: "Inscrever" }));
    const alertaLotada = await screen.findByRole("alert");
    expect(alertaLotada).toHaveTextContent("Turma lotada (20 de 20 vagas).");
    const mesmoAssim = screen.getByRole("button", { name: "Inscrever mesmo assim" });
    expect(posterior(screen.getByRole("button", { name: "Inscrever" }), mesmoAssim)).toBe(true);
    expect(enviados[0].get("catequizandoId")).toBe("c2");
    expect(enviados[0].get("dataEntrada")).toBe("2026-10-01");

    fireEvent.click(mesmoAssim);
    await waitFor(() => expect(acao).toHaveBeenCalledTimes(2));
    expect(enviados[1].get("confirmarLotacao")).toBe("1");
    const alertaTransf = await screen.findByText(
      "Já inscrito na turma Crisma B. Deseja transferir?",
    );
    expect(alertaTransf.closest("[role=alert]")).not.toBeNull();
    const transferir = screen.getByRole("button", { name: "Transferir para esta turma" });
    expect(posterior(screen.getByRole("button", { name: "Inscrever" }), transferir)).toBe(true);

    fireEvent.click(transferir);
    await waitFor(() => expect(acao).toHaveBeenCalledTimes(3));
    expect(enviados[2].get("confirmarTransferencia")).toBe("1");
    expect(enviados[2].get("confirmarLotacao")).toBe("1");
  });

  it("mostra erro geral e erro de data junto ao campo", async () => {
    const acao = vi
      .fn<Acao>()
      .mockResolvedValueOnce({ errosCampos: { dataEntrada: "Data inválida" } })
      .mockResolvedValueOnce({ erro: "Este catequizando não está ativo." });
    render(<InscreverCatequizando termo="" candidatos={[candidatos[0]]} acao={acao} hoje={HOJE} />);
    fireEvent.click(screen.getByRole("button", { name: "Inscrever" }));
    expect(await screen.findByText("Data inválida")).toBeInTheDocument();
    expect(screen.getByLabelText(/data de entrada/i)).toHaveAttribute("aria-invalid", "true");
    fireEvent.click(screen.getByRole("button", { name: "Inscrever" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Este catequizando não está ativo.");
  });
});

const inscrito = (p: Partial<InscritoResumo>): InscritoResumo => ({
  inscricaoId: "i",
  catequizandoId: "c",
  nome: "X",
  dataNascimento: d("2015-03-10"),
  telefone: "11987654321",
  dataEntrada: d("2026-02-01"),
  dataSaida: null,
  motivoSaida: null,
  ...p,
});

describe("Inscritos", () => {
  const vigentes = [
    inscrito({ inscricaoId: "i2", catequizandoId: "c2", nome: "Érica Souza" }),
    inscrito({ inscricaoId: "i1", catequizandoId: "c1", nome: "Bruno Reis" }),
    inscrito({ inscricaoId: "i3", catequizandoId: "c3", nome: "Fábio Lima" }),
  ];
  const anteriores = [
    inscrito({
      inscricaoId: "i4",
      catequizandoId: "c4",
      nome: "Dora Melo",
      dataEntrada: d("2026-02-01"),
      dataSaida: d("2026-06-15"),
      motivoSaida: "transferencia",
    }),
  ];

  it("vigentes em ordem alfabética com ficha, idade e contatos; anteriores com período e motivo", () => {
    render(
      <Inscritos
        vigentes={vigentes}
        anteriores={anteriores}
        hoje={HOJE}
        baseFicha="/coordenacao/catequizandos"
      />,
    );
    const lista = screen.getByRole("list", { name: /inscritos vigentes/i });
    const nomes = within(lista)
      .getAllByRole("link", { name: /^(Bruno|Érica|Fábio)/ })
      .map((l) => l.textContent);
    expect(nomes).toEqual(["Bruno Reis", "Érica Souza", "Fábio Lima"]);
    expect(screen.getByRole("link", { name: "Bruno Reis" })).toHaveAttribute(
      "href",
      "/coordenacao/catequizandos/c1",
    );
    expect(within(lista).getAllByText("11 anos")).toHaveLength(3);
    expect(within(lista).getAllByRole("link", { name: "Ligar" })[0].getAttribute("href")).toMatch(
      /^tel:/,
    );
    expect(
      within(lista)
        .getAllByRole("link", { name: /whatsapp/i })[0]
        .getAttribute("href"),
    ).toMatch(/wa\.me/);

    const secao = screen.getByRole("region", { name: "Inscritos anteriores" });
    expect(within(secao).getByText("Dora Melo")).toBeInTheDocument();
    expect(within(secao).getByText("01/02/2026–15/06/2026")).toBeInTheDocument();
    expect(within(secao).getByText("Transferência")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desligar" })).toBeNull();
  });

  it("com acoes, cada vigente ganha Desligar", () => {
    const desligar = vi.fn(() => vi.fn<Acao>(async () => ({})));
    render(
      <Inscritos
        vigentes={vigentes}
        anteriores={[]}
        hoje={HOJE}
        baseFicha="/f"
        turmaNome="Crisma A"
        acoes={{ desligar }}
      />,
    );
    expect(screen.getAllByRole("button", { name: "Desligar" })).toHaveLength(3);
    expect(desligar).toHaveBeenCalledWith("i1");
  });

  it("estado vazio", () => {
    render(<Inscritos vigentes={[]} anteriores={[]} hoje={HOJE} baseFicha="/f" />);
    expect(screen.getByText("Nenhum catequizando inscrito")).toBeInTheDocument();
  });
});
