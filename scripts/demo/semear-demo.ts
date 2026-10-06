/**
 * Semeia o banco `acutis_demo` com dados 100% fictícios para o GIF de demonstração do README.
 * Roda via `tsx` (como tests/e2e/preparar-banco.ts), nunca contra acutis_dev nem acutis_test.
 */
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hojeCivil } from "@/modules/compartilhado/datas";
import { CATEQUISTA_DEMO } from "./credenciais";

const TABELAS = [
  "user",
  "session",
  "account",
  "verification",
  "rateLimit",
  "login_attempt",
  "perfil_membro",
  "catequizando",
  "sacramento_recebido",
  "turma",
  "designacao",
  "inscricao",
  "tema",
  "encontro",
  "ficha_autocadastro",
  "link_autocadastro",
  "limite_autocadastro",
  "presenca",
  "limite_frequencia",
];

const dia = (d: string): Date => new Date(`${d}T00:00:00Z`);

/** Data civil (YYYY-MM-DD) deslocada em `dias` a partir de hoje. */
function deslocar(dias: number): string {
  const base = new Date(`${hojeCivil()}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

/** Deslocamento (dias) até o próximo sábado, dia da turma (sempre no futuro). */
function ateProximoSabado(): number {
  const dow = new Date(`${hojeCivil()}T00:00:00Z`).getUTCDay();
  return (6 - dow + 7) % 7 || 7;
}

const CATEQUIZANDOS = [
  "Ana Lima",
  "Bruno Costa",
  "Carla Souza",
  "Davi Rocha",
  "Elisa Ramos",
  "Fábio Nunes",
  "Gabriela Dias",
  "Heitor Mendes",
];

/** Faltas por catequizando nos 6 encontros realizados (índices dos encontros em que faltou). */
const FALTAS: number[][] = [[], [3], [1, 4], [0, 2, 3, 5], [], [5], [2], [1, 2]];
const JUSTIFICADAS = new Set(["6:2", "7:1"]); // "catequizando:encontro"

const TEMAS = [
  "Quem é Deus para nós",
  "A Bíblia, Palavra de Deus",
  "Jesus Cristo, caminho e verdade",
  "O Credo: o que professamos",
  "O Batismo e a vida nova",
  "A Eucaristia, fonte e cume",
  "A Missa passo a passo",
];

async function main() {
  if (!/acutis_demo/.test(process.env.DATABASE_URL ?? "")) {
    throw new Error("A semente da demonstração só roda contra o banco acutis_demo.");
  }
  const lista = TABELAS.map((t) => `"${t}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`);

  const criado = await auth.api.createUser({
    body: {
      email: CATEQUISTA_DEMO.email,
      password: CATEQUISTA_DEMO.senha,
      name: CATEQUISTA_DEMO.nome,
      role: "catequista",
    },
  });
  const catequistaId = criado.user.id;

  const turma = await prisma.turma.create({
    data: {
      nome: "Turma São José",
      ciclo: 2026,
      diaSemana: "sabado",
      horario: "19:00",
      local: "Salão paroquial",
    },
    select: { id: true },
  });
  await prisma.designacao.create({ data: { turmaId: turma.id, userId: catequistaId } });

  const temas = [];
  for (const [i, titulo] of TEMAS.entries()) {
    temas.push(
      await prisma.tema.create({
        data: { titulo, chave: titulo.toLowerCase(), posicao: i + 1 },
        select: { id: true },
      }),
    );
  }

  const ids: string[] = [];
  for (const [i, nome] of CATEQUIZANDOS.entries()) {
    const c = await prisma.catequizando.create({
      data: {
        nome,
        dataNascimento: dia(`${1980 + i * 3}-0${(i % 9) + 1}-1${i}`),
        telefone: `1190000000${i + 1}`,
        sacramentos: i % 2 === 0 ? { create: [{ sacramento: "batismo" }] } : undefined,
      },
      select: { id: true },
    });
    await prisma.inscricao.create({
      data: { turmaId: turma.id, catequizandoId: c.id, dataEntrada: dia(deslocar(-60)) },
    });
    ids.push(c.id);
  }

  // Seis encontros realizados (semanais, terminando há 1 semana) com chamada registrada.
  for (let e = 0; e < 6; e++) {
    const encontro = await prisma.encontro.create({
      data: {
        turmaId: turma.id,
        temaId: temas[e]!.id,
        data: dia(deslocar(ateProximoSabado() - 7 * (7 - e))),
        horario: "19:00",
        situacao: "realizado",
      },
      select: { id: true },
    });
    for (const [c, catequizandoId] of ids.entries()) {
      const faltou = FALTAS[c]!.includes(e);
      await prisma.presenca.create({
        data: {
          encontroId: encontro.id,
          turmaId: turma.id,
          catequizandoId,
          status: faltou ? (JUSTIFICADAS.has(`${c}:${e}`) ? "justificado" : "ausente") : "presente",
        },
      });
    }
  }

  // Próximo encontro planejado, com tema.
  await prisma.encontro.create({
    data: {
      turmaId: turma.id,
      temaId: temas[6]!.id,
      data: dia(deslocar(ateProximoSabado())),
      horario: "19:00",
    },
  });

  // Link de autocadastro ativo e uma ficha pendente.
  const link = await prisma.linkAutocadastro.create({
    data: {
      turmaId: turma.id,
      token: randomBytes(32).toString("base64url"),
      criadoPorId: catequistaId,
    },
    select: { id: true },
  });
  await prisma.catequizando.create({
    data: {
      nome: "Isabela Torres",
      dataNascimento: dia("1990-04-12"),
      telefone: "11900000009",
      estado: "pendente",
      sacramentos: { create: [{ sacramento: "batismo" }] },
      autocadastro: {
        create: {
          turmaId: turma.id,
          linkId: link.id,
          consentidoEm: new Date(),
          versaoConsentimento: "demo",
        },
      },
    },
  });
}

main()
  .finally(() => prisma.$disconnect())
  .catch((erro: unknown) => {
    console.error(erro);
    process.exit(1);
  });
