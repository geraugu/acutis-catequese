// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { FilaPendentes } from "@/components/autocadastro/fila-pendentes";
import { RevisaoFicha, type PropsRevisaoFicha } from "@/components/autocadastro/revisao-ficha";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

const vazia = async () => ({});

function props(parcial: Partial<PropsRevisaoFicha> = {}): PropsRevisaoFicha {
  return {
    dados: {
      nome: "Ana Souza",
      dataNascimento: "10/05/2010",
      telefone: "(11) 98888-7777",
      email: "ana@exemplo.org",
      endereco: null,
      observacoes: null,
      sacramentos: [
        { rotulo: "Batismo", recebido: true, data: "01/01/2011", paroquia: "Matriz" },
        { rotulo: "Eucaristia", recebido: false, data: null, paroquia: null },
      ],
    },
    recebidaEm: "02/10/2026 14:30",
    consentimento: { em: "02/10/2026 14:30", versao: "2026-10-01" },
    coincidentes: [],
    baseCoincidente: null,
    avisoLotada: null,
    valoresIniciais: { nome: "Ana Souza" },
    encerrada: false,
    acoes: { confirmar: vazia, corrigir: vazia, descartar: vazia },
    ...parcial,
  };
}

describe("FilaPendentes", () => {
  it("lista da mais antiga para a mais recente com data e avisos", () => {
    render(
      <FilaPendentes
        base="/catequista/turmas/t1/pendentes"
        itens={[
          {
            id: "b",
            nome: "Bruno",
            recebidaEm: new Date("2026-10-02T12:00:00Z"),
            avisos: ["Turma lotada (10/10)"],
          },
          { id: "a", nome: "Ana", recebidaEm: new Date("2026-10-01T12:00:00Z"), avisos: [] },
        ]}
      />,
    );
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Ana", "Bruno"]);
    expect(links[0].getAttribute("href")).toBe("/catequista/turmas/t1/pendentes/a");
    expect(screen.getByText("Turma lotada (10/10)")).toBeTruthy();
    expect(screen.getByText(/01\/10\/2026/)).toBeTruthy();
  });

  it("mostra estado vazio", () => {
    render(<FilaPendentes base="/x" itens={[]} />);
    expect(screen.getByText("Nenhuma ficha pendente.")).toBeTruthy();
  });
});

describe("RevisaoFicha", () => {
  it("mostra dados, consentimento e versão", () => {
    render(<RevisaoFicha {...props()} />);
    expect(screen.getAllByText("Ana Souza").length).toBeGreaterThan(0);
    expect(screen.getByText(/2026-10-01/)).toBeTruthy();
    expect(screen.getByText(/Matriz/)).toBeTruthy();
  });

  it("duplicata para a coordenação: nome com link para o cadastro", () => {
    render(
      <RevisaoFicha
        {...props({
          coincidentes: [{ id: "c1", nome: "Ana S.", visivel: true }],
          baseCoincidente: "/coordenacao/catequizandos",
        })}
      />,
    );
    const link = screen.getByRole("link", { name: "Ana S." });
    expect(link.getAttribute("href")).toBe("/coordenacao/catequizandos/c1");
    expect(screen.getByText(/Possível duplicata/)).toBeTruthy();
  });

  it("duplicata oculta para o catequista: só 'Possível duplicata', sem nome", () => {
    render(<RevisaoFicha {...props({ coincidentes: [{ id: "c1", nome: "Oculto", visivel: false }] })} />);
    expect(screen.getByText("Possível duplicata")).toBeTruthy();
    expect(screen.queryByText(/Oculto/)).toBeNull();
  });

  it("duplicata visível para o catequista: nome sem link", () => {
    render(
      <RevisaoFicha
        {...props({
          coincidentes: [
            { id: "c1", nome: "Visível", visivel: true },
            { id: "c2", nome: "Oculto", visivel: false },
          ],
        })}
      />,
    );
    expect(screen.getByText(/Visível/)).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Visível" })).toBeNull();
    expect(screen.queryByText(/Oculto/)).toBeNull();
  });

  it("turma lotada: pede 'Confirmar mesmo assim' e reenvia com confirmarLotacao=1", async () => {
    const confirmar = vi
      .fn()
      .mockResolvedValueOnce({ lotada: { inscritos: 10, vagas: 10 } })
      .mockResolvedValueOnce({});
    render(
      <RevisaoFicha
        {...props({
          avisoLotada: "Turma lotada (10/10)",
          acoes: { confirmar, corrigir: vazia, descartar: vazia },
        })}
      />,
    );
    expect(screen.getByText("Turma lotada (10/10)")).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirmar e inscrever" }));
    });
    const alerta = await screen.findByRole("alert");
    const botao = within(alerta).getByRole("button", { name: "Confirmar mesmo assim" });
    await act(async () => {
      fireEvent.click(botao);
    });
    const dados = confirmar.mock.calls[1][1] as FormData;
    expect(dados.get("confirmarLotacao")).toBe("1");
  });

  it("mostra os erros de campo da ficha gravada ao confirmar", async () => {
    const confirmar = vi.fn().mockResolvedValue({
      erro: "A ficha tem campos inválidos.",
      errosCampos: { telefone: "Telefone inválido" },
    });
    render(<RevisaoFicha {...props({ acoes: { confirmar, corrigir: vazia, descartar: vazia } })} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirmar e inscrever" }));
    });
    expect(await screen.findByText(/Telefone inválido/)).toBeTruthy();
  });

  it("aberta: correção, confirmar e descartar com confirmação explícita", () => {
    render(<RevisaoFicha {...props()} />);
    expect(screen.getByRole("button", { name: "Salvar correção" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirmar e inscrever" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Descartar ficha" }));
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Descartar" })).toBeTruthy();
  });

  it("turma encerrada: só o descarte", () => {
    render(<RevisaoFicha {...props({ encerrada: true, acoes: { descartar: vazia } })} />);
    expect(screen.queryByRole("button", { name: "Salvar correção" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Confirmar e inscrever" })).toBeNull();
    expect(screen.getByRole("button", { name: "Descartar ficha" })).toBeTruthy();
    expect(screen.getByText(/turma está encerrada/i)).toBeTruthy();
  });
});
