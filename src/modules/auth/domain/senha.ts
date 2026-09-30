import { z } from "zod";

export const TAMANHO_MINIMO_SENHA = 8;

/** Regra de senha (3.6): no mínimo 8 caracteres. */
export const senhaSchema = z
  .string()
  .min(TAMANHO_MINIMO_SENHA, `A senha deve ter no mínimo ${TAMANHO_MINIMO_SENHA} caracteres`);
