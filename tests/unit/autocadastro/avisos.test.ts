import { describe, expect, it } from "vitest";
import {
  avisosDaFicha,
  normalizarEmail,
  normalizarTelefone,
  textoDoAviso,
} from "@/modules/autocadastro/domain/avisos";

describe("avisosDaFicha", () => {
  it("não gera avisos sem coincidentes e com vagas sobrando", () => {
    expect(avisosDaFicha({ coincidentes: [], inscritos: 3, vagas: 20 })).toEqual([]);
  });

  it("avisa duplicata com coincidente visível", () => {
    const coincidentes = [{ id: "c1", nome: "Ana Souza", visivel: true }];
    expect(avisosDaFicha({ coincidentes, inscritos: 0, vagas: 10 })).toEqual([
      { tipo: "duplicata", coincidentes },
    ]);
  });

  it("avisa duplicata com coincidente oculto, sem expor o nome no texto", () => {
    const coincidentes = [{ id: "c2", nome: "Bruno Lima", visivel: false }];
    const [aviso] = avisosDaFicha({ coincidentes, inscritos: 0, vagas: null });
    expect(aviso).toEqual({ tipo: "duplicata", coincidentes });
    expect(textoDoAviso(aviso)).toBe("Possível duplicata");
  });

  it("mostra os nomes visíveis no texto da duplicata", () => {
    const [aviso] = avisosDaFicha({
      coincidentes: [
        { id: "c1", nome: "Ana Souza", visivel: true },
        { id: "c2", nome: "Bruno Lima", visivel: false },
      ],
      inscritos: 0,
      vagas: null,
    });
    expect(textoDoAviso(aviso)).toBe("Possível duplicata: Ana Souza");
  });

  it("avisa lotação quando os inscritos alcançam as vagas", () => {
    const avisos = avisosDaFicha({ coincidentes: [], inscritos: 20, vagas: 20 });
    expect(avisos).toEqual([{ tipo: "lotada", inscritos: 20, vagas: 20 }]);
    expect(textoDoAviso(avisos[0])).toBe("Turma lotada (20 de 20 vagas)");
  });

  it("não avisa lotação quando as vagas são nulas", () => {
    expect(avisosDaFicha({ coincidentes: [], inscritos: 500, vagas: null })).toEqual([]);
  });

  it("junta duplicata e lotação, nessa ordem", () => {
    const coincidentes = [{ id: "c1", nome: "Ana", visivel: true }];
    expect(avisosDaFicha({ coincidentes, inscritos: 11, vagas: 10 }).map((a) => a.tipo)).toEqual([
      "duplicata",
      "lotada",
    ]);
  });
});

describe("normalização", () => {
  it("normaliza o e-mail para minúsculas e sem espaços", () => {
    expect(normalizarEmail("A@B.com ")).toBe(normalizarEmail("a@b.com"));
    expect(normalizarEmail(" Fulano @Ex.COM")).toBe("fulano@ex.com");
  });

  it("devolve null para e-mail vazio ou ausente", () => {
    expect(normalizarEmail("   ")).toBeNull();
    expect(normalizarEmail(null)).toBeNull();
  });

  it("mantém só os dígitos do telefone", () => {
    expect(normalizarTelefone("(11) 9 8888-7777")).toBe("11988887777");
    expect(normalizarTelefone("(11) 9 8888-7777")).toBe(normalizarTelefone("11988887777"));
  });
});
