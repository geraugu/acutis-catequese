import { z } from "zod";

/** Data civil (sem hora nem fuso) no formato AAAA-MM-DD. */
export type DataCivil = string & { readonly __marca: "DataCivil" };

const MENSAGEM_DATA = "Informe uma data válida";
const FORMATO = /^(\d{4})-(\d{2})-(\d{2})$/;

function bissexto(ano: number): boolean {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

function diasNoMes(ano: number, mes: number): number {
  if (mes === 2) return bissexto(ano) ? 29 : 28;
  return [4, 6, 9, 11].includes(mes) ? 30 : 31;
}

function partes(texto: string): [number, number, number] | null {
  const m = FORMATO.exec(texto);
  if (!m) return null;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > diasNoMes(ano, mes)) return null;
  return [ano, mes, dia];
}

function ehDataCivil(texto: string): texto is DataCivil {
  return partes(texto) !== null;
}

function partesDe(data: DataCivil): [number, number, number] {
  const p = partes(data);
  if (!p) throw new Error(`DataCivil inválida: ${data}`);
  return p;
}

/** Valida texto AAAA-MM-DD e recusa datas impossíveis (ex.: 2025-02-30). */
export const dataCivilSchema = z
  .string({ error: MENSAGEM_DATA })
  .refine(ehDataCivil, { error: MENSAGEM_DATA })
  .transform((texto) => texto as DataCivil);

/** Data civil de hoje no fuso informado (padrão: America/Sao_Paulo). */
export function hojeCivil(agora: Date = new Date(), fuso = "America/Sao_Paulo"): DataCivil {
  const formatador = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const valor = (tipo: string) =>
    formatador.formatToParts(agora).find((p) => p.type === tipo)?.value ?? "";
  const texto = `${valor("year")}-${valor("month")}-${valor("day")}`;
  if (!ehDataCivil(texto)) throw new Error(`Data inesperada: ${texto}`);
  return texto;
}

/**
 * Idade em anos completos na data `hoje`. Nascidos em 29/02 completam
 * o ano em 01/03 nos anos não bissextos.
 */
export function calcularIdade(nascimento: DataCivil, hoje: DataCivil): number {
  const [an, mn, dn] = partesDe(nascimento);
  const [ah, mh, dh] = partesDe(hoje);
  const jaFez = mh > mn || (mh === mn && dh >= dn);
  return ah - an - (jaFez ? 0 : 1);
}

/** Comparador para ordenação: negativo se `a` < `b`, 0 se iguais. */
export function compararDatas(a: DataCivil, b: DataCivil): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Formata como dd/mm/aaaa. */
export function formatarData(data: DataCivil): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}
