import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { chaveDoTitulo } from "@/modules/programa/domain/tema";

/**
 * Semeia a estrutura da catequese Cristo Rei 2026/2027 (cronograma da paróquia): os 33 temas do
 * programa e duas turmas (segunda e terça, 20h15), cada uma com seus encontros. Sem catequizandos.
 * Idempotente: temas são casados pela chave do título, turmas pelo nome e encontros por turma e data.
 */

interface TemaSeed {
  titulo: string;
  cic: string;
  compendio: string;
}

// Ordem do programa (encontros 1 a 33 do cronograma).
const TEMAS: TemaSeed[] = [
  { titulo: "Diálogo com os crismandos", cic: "26 a 49", compendio: "01 a 05" },
  { titulo: "Querigma de Cristo / Bíblia", cic: "101 a 133", compendio: "18 a 24" },
  { titulo: "Eu creio / Fontes da Fé", cic: "26 a 175", compendio: "01 a 32" },
  { titulo: "Santíssima Trindade", cic: "232 a 267", compendio: "44 a 49" },
  { titulo: "Deus Pai - Anjos e Pecado Original", cic: "279 a 421", compendio: "50 a 78" },
  {
    titulo: "Deus Pai - Alianças e História da Salvação",
    cic: "198 a 231 e 268 a 274",
    compendio: "36 a 43 e 57 a 58",
  },
  { titulo: "Jesus histórico - O Messias", cic: "430 a 511", compendio: "79 a 100" },
  { titulo: "Jesus Cristo, o Verbo encarnado", cic: "512 a 682", compendio: "101 a 135" },
  { titulo: "Igreja como Sacramento / Espírito Santo", cic: "683 a 962", compendio: "136 a 195" },
  { titulo: "Profissão de Fé - Credo", cic: "185 a 197", compendio: "33 a 35" },
  {
    titulo: "Introdução aos Sacramentos / Batismo",
    cic: "1113/1134 e 1210/1284",
    compendio: "221/232 e 251/264",
  },
  {
    titulo: "Sacramento do Crisma / Dons do Espírito Santo",
    cic: "1285/1321 e 1830/1832",
    compendio: "265/270 e 389/390",
  },
  { titulo: "Sacramento da Eucaristia", cic: "1322 a 1419", compendio: "271 a 294" },
  {
    titulo: "Ciclo Litúrgico / Missa parte por parte 1",
    cic: "1066/1209 e 1345/1381",
    compendio: "218/249 e 277/286",
  },
  {
    titulo: "Missa parte por parte 2 / Sacramentais",
    cic: "1345/1381 a 1667/1690",
    compendio: "277/286 e 351/356",
  },
  { titulo: "Sacramento da Ordem", cic: "1536 a 1600", compendio: "322 a 336" },
  { titulo: "Sacramento do Matrimônio", cic: "1601 a 1666", compendio: "337 a 350" },
  { titulo: "Atos humanos / Consciência moral", cic: "1700 a 1802", compendio: "358 a 376" },
  { titulo: "Virtudes Teologais e Morais", cic: "1803 a 1832", compendio: "377 a 390" },
  { titulo: "Pecado", cic: "1846 a 1876", compendio: "391 a 400" },
  { titulo: "A Lei e a Graça", cic: "1949 a 2029", compendio: "415 a 428" },
  { titulo: "Novíssimos", cic: "1020 a 1060", compendio: "241 a 243" },
  { titulo: "Mandamento 1", cic: "2052 a 2141", compendio: "434 a 446" },
  { titulo: "Mandamentos 2 e 3", cic: "2142 a 2195", compendio: "447 a 454" },
  { titulo: "Mandamentos 4 e 5", cic: "2196 a 2330", compendio: "455 a 486" },
  { titulo: "Mandamentos 6 e 9", cic: "2331/2400 e 2514/2533", compendio: "487/502 e 527/530" },
  {
    titulo: "Mandamentos 7, 8 e 10 / DSI",
    cic: "1877/1948, 2401/2513 e 2534/2557",
    compendio: "401/414, 503/526 e 531/533",
  },
  { titulo: "Sacramentos de cura", cic: "1420/1498 e 1499/1532", compendio: "295/312 e 313/320" },
  { titulo: "Oração", cic: "2558 a 2758", compendio: "534 a 577" },
  {
    titulo: "Dogmas e Devoções Marianas e Santo Rosário",
    cic: "484/507 e 963/975",
    compendio: "94/100 e 196/199",
  },
  { titulo: "Oração do Pai Nosso", cic: "2759 a 2865", compendio: "578 a 598" },
  {
    titulo: "Vocações e Santidade (Obras de Misericórdia)",
    cic: "748/962 e 2447",
    compendio: "147/195 e 520",
  },
];

const TEMA_RETIRO = "Retiro de encerramento";

interface SemanaSeed {
  segunda: string; // AAAA-MM-DD; a terça é o dia seguinte
  tema: number; // número do encontro (1 a 32)
  liturgia: string;
  evangelho: string;
}

// Semanas com encontro. Recessos e feriados do cronograma ficam de fora.
const SEMANAS: SemanaSeed[] = [
  {
    segunda: "2026-10-19",
    tema: 1,
    liturgia: "29º Domingo do Tempo Comum",
    evangelho: "Mt 22,15-21",
  },
  {
    segunda: "2026-10-26",
    tema: 2,
    liturgia: "30º Domingo do Tempo Comum",
    evangelho: "Mt 22,34-40",
  },
  {
    segunda: "2026-11-09",
    tema: 3,
    liturgia: "32º Domingo do Tempo Comum",
    evangelho: "Mt 25,1-13",
  },
  {
    segunda: "2026-11-16",
    tema: 4,
    liturgia: "33º Domingo do Tempo Comum",
    evangelho: "Mt 25,14-30",
  },
  { segunda: "2026-11-23", tema: 5, liturgia: "Cristo Rei", evangelho: "Mt 25,31-46" },
  { segunda: "2026-11-30", tema: 6, liturgia: "1º Domingo do Advento", evangelho: "Mc 13,33-37" },
  {
    segunda: "2027-01-25",
    tema: 7,
    liturgia: "3º Domingo do Tempo Comum",
    evangelho: "Mc 1,14-20",
  },
  {
    segunda: "2027-02-01",
    tema: 8,
    liturgia: "4º Domingo do Tempo Comum",
    evangelho: "Mc 1,21-28",
  },
  { segunda: "2027-02-15", tema: 9, liturgia: "1º Domingo da Quaresma", evangelho: "Mc 1,12-15" },
  { segunda: "2027-02-22", tema: 10, liturgia: "2º Domingo da Quaresma", evangelho: "Mc 9,2-10" },
  { segunda: "2027-03-01", tema: 11, liturgia: "3º Domingo da Quaresma", evangelho: "Jo 2,13-25" },
  { segunda: "2027-03-08", tema: 12, liturgia: "4º Domingo da Quaresma", evangelho: "Jo 3,14-21" },
  { segunda: "2027-03-15", tema: 13, liturgia: "5º Domingo da Quaresma", evangelho: "Jo 12,20-33" },
  {
    segunda: "2027-04-05",
    tema: 14,
    liturgia: "Domingo na oitava da Páscoa",
    evangelho: "Mt 26,14-27,66",
  },
  { segunda: "2027-04-12", tema: 15, liturgia: "3º Domingo de Páscoa", evangelho: "Lc 24,35-48" },
  { segunda: "2027-04-19", tema: 16, liturgia: "4º Domingo de Páscoa", evangelho: "Jo 10,11-18" },
  { segunda: "2027-04-26", tema: 17, liturgia: "5º Domingo de Páscoa", evangelho: "Jo 15,1-8" },
  { segunda: "2027-05-03", tema: 18, liturgia: "6º Domingo da Páscoa", evangelho: "Jo 15,9-17" },
  { segunda: "2027-05-10", tema: 19, liturgia: "Ascensão do Senhor", evangelho: "Mc 16,15-20" },
  { segunda: "2027-05-17", tema: 20, liturgia: "Pentecostes", evangelho: "Jo 20,19-23" },
  {
    segunda: "2027-05-24",
    tema: 21,
    liturgia: "8º Domingo do Tempo Comum",
    evangelho: "Mt 28,16-20",
  },
  {
    segunda: "2027-05-31",
    tema: 22,
    liturgia: "9º Domingo do Tempo Comum",
    evangelho: "Mc 2,23-3,6",
  },
  {
    segunda: "2027-06-07",
    tema: 23,
    liturgia: "10º Domingo do Tempo Comum",
    evangelho: "Mc 3,20-35",
  },
  {
    segunda: "2027-06-14",
    tema: 24,
    liturgia: "11º Domingo do Tempo Comum",
    evangelho: "Mc 4,26-34",
  },
  {
    segunda: "2027-06-21",
    tema: 25,
    liturgia: "12º Domingo do Tempo Comum",
    evangelho: "Mc 4,35-41",
  },
  {
    segunda: "2027-06-28",
    tema: 26,
    liturgia: "13º Domingo do Tempo Comum",
    evangelho: "Mc 5,21-43",
  },
  {
    segunda: "2027-07-26",
    tema: 27,
    liturgia: "17º Domingo do Tempo Comum",
    evangelho: "Jo 6,1-15",
  },
  {
    segunda: "2027-08-02",
    tema: 28,
    liturgia: "18º Domingo do Tempo Comum",
    evangelho: "Jo 6,24-35",
  },
  {
    segunda: "2027-08-09",
    tema: 29,
    liturgia: "19º Domingo do Tempo Comum",
    evangelho: "Jo 6,41-51",
  },
  {
    segunda: "2027-08-16",
    tema: 30,
    liturgia: "Assunção de Nossa Senhora",
    evangelho: "Lc 1,39-56",
  },
  {
    segunda: "2027-08-23",
    tema: 31,
    liturgia: "22º Domingo do Tempo Comum",
    evangelho: "Jo 6,60-69",
  },
  {
    segunda: "2027-08-30",
    tema: 32,
    liturgia: "23º Domingo do Tempo Comum",
    evangelho: "Mc 7,1-8.14-15.21-23",
  },
];

const HORARIO = "20:15";
const OBS_TURMA =
  "Encontros das 20h15 às 22h. Turma de Cristo Rei: repõe aulas nas turmas de Páscoa.";

function dataDe(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function diaSeguinte(iso: string): string {
  const d = dataDe(iso);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function garantirTemas(): Promise<string[]> {
  const ids: string[] = [];
  const todos = [
    ...TEMAS.map((t) => ({
      titulo: t.titulo,
      descricao: `CIC: ${t.cic} · Compêndio: ${t.compendio}`,
    })),
    { titulo: TEMA_RETIRO, descricao: "Retiro de encerramento da caminhada, antes do Crisma." },
  ];
  for (const t of todos) {
    const chave = chaveDoTitulo(t.titulo);
    const existente = await prisma.tema.findUnique({ where: { chave } });
    if (existente) {
      ids.push(existente.id);
      continue;
    }
    const { _max } = await prisma.tema.aggregate({ _max: { posicao: true } });
    const criado = await prisma.tema.create({
      data: { ...t, chave, posicao: (_max.posicao ?? 0) + 1 },
    });
    ids.push(criado.id);
  }
  return ids;
}

async function garantirTurma(nome: string, diaSemana: "segunda" | "terca"): Promise<string> {
  const existente = await prisma.turma.findFirst({ where: { nome } });
  if (existente) return existente.id;
  const criada = await prisma.turma.create({
    data: { nome, ciclo: 1, diaSemana, horario: HORARIO, observacoes: OBS_TURMA },
  });
  return criada.id;
}

async function garantirEncontros(
  turmaId: string,
  data: string,
  temaId: string,
  semana: SemanaSeed,
): Promise<boolean> {
  const existente = await prisma.encontro.findFirst({ where: { turmaId, data: dataDe(data) } });
  if (existente) return false;
  await prisma.encontro.create({
    data: {
      turmaId,
      temaId,
      data: dataDe(data),
      horario: HORARIO,
      observacoes: `${semana.liturgia} · ${semana.evangelho}`,
    },
  });
  return true;
}

async function main() {
  for (const s of SEMANAS) {
    if (dataDe(s.segunda).getUTCDay() !== 1) throw new Error(`${s.segunda} não é segunda-feira`);
  }
  const temaIds = await garantirTemas();
  const segunda = await garantirTurma("Cristo Rei 2026/27 - Segunda", "segunda");
  const terca = await garantirTurma("Cristo Rei 2026/27 - Terça", "terca");

  let criados = 0;
  for (const semana of SEMANAS) {
    const temaId = temaIds[semana.tema - 1];
    if (!temaId) throw new Error(`Tema ${semana.tema} inexistente`);
    if (await garantirEncontros(segunda, semana.segunda, temaId, semana)) criados++;
    if (await garantirEncontros(terca, diaSeguinte(semana.segunda), temaId, semana)) criados++;
  }
  console.log(
    `Cristo Rei 2026/27: ${temaIds.length} temas, 2 turmas, ${criados} encontros criados (${SEMANAS.length * 2} no total)`,
  );
}

main()
  .catch((erro: unknown) => {
    console.error(`Falha no seed: ${erro instanceof Error ? erro.message : String(erro)}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
