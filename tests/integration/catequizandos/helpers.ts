/**
 * Helpers dos testes de integração dos catequizandos: reusa os atores, a sessão e o
 * redirect da equipe. Os `vi.mock` de next/headers e next/navigation ficam em cada teste:
 *   vi.mock("next/headers", async () => (await import("../equipe/next-mocks")).nextHeadersMock);
 *   vi.mock("next/navigation", async () => (await import("../equipe/next-mocks")).nextNavigationMock);
 */
export {
  capturarRedirect,
  criarCatequista,
  criarCoordenacao,
  form,
  limparSessao,
  usarSessao,
} from "../equipe/helpers";

/** Campos planos de uma ficha válida (maior de 16 anos). */
export const camposFicha = (extra: Record<string, string> = {}): Record<string, string> => ({
  nome: "Maria Souza",
  dataNascimento: "2000-05-10",
  telefone: "(11) 98765-4321",
  email: "maria@exemplo.com",
  endereco: "Rua A, 1",
  observacoes: "Obs",
  batismoRecebido: "on",
  batismoData: "2001-01-31",
  batismoParoquia: "Sé",
  eucaristiaRecebido: "on",
  ...extra,
});
