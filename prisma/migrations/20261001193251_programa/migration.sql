-- CreateEnum
CREATE TYPE "situacao_encontro" AS ENUM ('planejado', 'realizado', 'cancelado');

-- CreateTable
CREATE TABLE "tema" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "descricao" TEXT,
    "posicao" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encontro" (
    "id" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "temaId" TEXT,
    "data" DATE NOT NULL,
    "horario" TEXT NOT NULL,
    "observacoes" TEXT,
    "situacao" "situacao_encontro" NOT NULL DEFAULT 'planejado',
    "motivoCancelamento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "encontro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tema_posicao_idx" ON "tema"("posicao");

-- CreateIndex
CREATE UNIQUE INDEX "tema_chave_unica" ON "tema"("chave");

-- CreateIndex
CREATE INDEX "encontro_turmaId_data_idx" ON "encontro"("turmaId", "data");

-- CreateIndex
CREATE INDEX "encontro_temaId_idx" ON "encontro"("temaId");

-- AddForeignKey
ALTER TABLE "encontro" ADD CONSTRAINT "encontro_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encontro" ADD CONSTRAINT "encontro_temaId_fkey" FOREIGN KEY ("temaId") REFERENCES "tema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Um encontro não cancelado por turma, data e horário
CREATE UNIQUE INDEX encontro_horario_unico ON encontro ("turmaId", data, horario) WHERE situacao <> 'cancelado';
