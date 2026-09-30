/** Credenciais fixas usadas só no banco de teste do e2e (não são segredos). */
export const COORDENACAO = {
  nome: "Coordenação Teste",
  email: "coordenacao.e2e@teste.local",
  senha: "SenhaCoord#2026",
  estado: "playwright/.auth/coordenacao.json",
} as const;

export const CATEQUISTA = {
  nome: "Catequista Teste",
  email: "catequista.e2e@teste.local",
  senha: "SenhaCateq#2026",
  estado: "playwright/.auth/catequista.json",
} as const;
