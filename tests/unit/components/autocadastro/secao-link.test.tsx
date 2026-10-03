// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { SecaoLink, type PropsSecaoLink } from "@/components/autocadastro/secao-link";
import { CopiarLink } from "@/components/autocadastro/copiar-link";

const acao = async () => ({});

function props(parcial: Partial<PropsSecaoLink> = {}): PropsSecaoLink {
  return {
    situacao: "ativo",
    expiraEm: "2026-12-31",
    url: "https://exemplo.org/inscricao/abc",
    pendentes: 2,
    linkPendentes: "/catequista/turmas/t1/pendentes",
    encerrada: false,
    acoes: { gerar: acao, desativar: acao, regenerar: acao, salvarExpiracao: acao },
    ...parcial,
  };
}

beforeAll(() => {
  // jsdom não implementa <dialog>.showModal/close.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

afterEach(() => vi.unstubAllGlobals());

describe("SecaoLink", () => {
  it("mostra situação, expiração, link completo e a contagem de pendentes com o atalho", () => {
    render(<SecaoLink {...props()} />);
    expect(screen.getByText("Ativo")).toBeTruthy();
    expect(screen.getByText(/31\/12\/2026/)).toBeTruthy();
    expect(screen.getByText("https://exemplo.org/inscricao/abc")).toBeTruthy();
    const atalho = screen.getByRole("link", { name: /2 fichas pendentes/ });
    expect(atalho.getAttribute("href")).toBe("/catequista/turmas/t1/pendentes");
  });

  it("pede confirmação antes de regenerar", () => {
    render(<SecaoLink {...props()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Regenerar link" }));
    const dialogo = screen.getByRole("dialog");
    expect(within(dialogo).getByText(/link atual deixará de funcionar/)).toBeTruthy();
    expect(within(dialogo).getByRole("button", { name: "Regenerar" })).toBeTruthy();
  });

  it("turma encerrada: situação Desativado, sem link nem ações", () => {
    render(<SecaoLink {...props({ situacao: "desativado", encerrada: true, url: null })} />);
    expect(screen.getByText("Desativado")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText(/inscricao/)).toBeNull();
    expect(screen.queryByLabelText(/Expira em/)).toBeNull();
  });

  it("link expirado: oferece regenerar, desativar e editar expiração, não gerar nem o link", () => {
    render(<SecaoLink {...props({ situacao: "expirado", url: null })} />);
    expect(screen.getByText("Expirado")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Gerar link" })).toBeNull();
    expect(screen.getByRole("button", { name: "Regenerar link" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Desativar link" })).toBeTruthy();
    expect(screen.getByLabelText(/Expira em/)).toBeTruthy();
    expect(screen.queryByText(/inscricao/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Copiar link" })).toBeNull();
  });

  it("link desativado em turma aberta: oferece gerar", () => {
    render(<SecaoLink {...props({ situacao: "desativado", url: null })} />);
    expect(screen.getByRole("button", { name: "Gerar link" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Regenerar link" })).toBeNull();
  });

  it("sem nenhum link, mostra a situação 'Sem link' e o botão gerar", () => {
    render(<SecaoLink {...props({ situacao: null, url: null, pendentes: 0, expiraEm: null })} />);
    expect(screen.getByText("Sem link")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Gerar link" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /pendente/ })).toBeNull();
  });
});

describe("CopiarLink", () => {
  it("mostra 'Link copiado' após copiar", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<CopiarLink url="https://exemplo.org/inscricao/abc" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));
    });
    expect(writeText).toHaveBeenCalledWith("https://exemplo.org/inscricao/abc");
    expect(screen.getByText("Link copiado")).toBeTruthy();
  });

  it("sem Clipboard API, orienta a copiar manualmente", async () => {
    vi.stubGlobal("navigator", {});
    render(<CopiarLink url="https://exemplo.org/inscricao/abc" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));
    });
    expect(screen.getByText(/Não foi possível copiar/)).toBeTruthy();
  });
});
