-- CreateEnum
CREATE TYPE "status_presenca" AS ENUM ('presente', 'ausente', 'justificado');

-- CreateTable
CREATE TABLE "presenca" (
    "id" TEXT NOT NULL,
    "encontroId" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "catequizandoId" TEXT NOT NULL,
    "status" "status_presenca" NOT NULL,
    "visitante" BOOLEAN NOT NULL DEFAULT false,
    "turmaOrigemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presenca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "limite_frequencia" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "percentual" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "limite_frequencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "presenca_turmaId_catequizandoId_idx" ON "presenca"("turmaId", "catequizandoId");

-- CreateIndex
CREATE INDEX "presenca_catequizandoId_idx" ON "presenca"("catequizandoId");

-- CreateIndex
CREATE UNIQUE INDEX "presenca_encontroId_catequizandoId_key" ON "presenca"("encontroId", "catequizandoId");

-- AddForeignKey
ALTER TABLE "presenca" ADD CONSTRAINT "presenca_encontroId_fkey" FOREIGN KEY ("encontroId") REFERENCES "encontro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presenca" ADD CONSTRAINT "presenca_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presenca" ADD CONSTRAINT "presenca_turmaOrigemId_fkey" FOREIGN KEY ("turmaOrigemId") REFERENCES "turma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presenca" ADD CONSTRAINT "presenca_catequizandoId_fkey" FOREIGN KEY ("catequizandoId") REFERENCES "catequizando"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Restrições de integridade da presença (SQL manual; o Prisma não as modela)
ALTER TABLE "presenca" ADD CONSTRAINT "presenca_visitante_ck"
  CHECK (NOT "visitante" OR ("status" = 'presente' AND "turmaOrigemId" IS NOT NULL AND "turmaOrigemId" <> "turmaId"));

ALTER TABLE "presenca" ADD CONSTRAINT "presenca_origem_ck"
  CHECK ("visitante" OR "turmaOrigemId" IS NULL);

ALTER TABLE "limite_frequencia" ADD CONSTRAINT "limite_frequencia_ck"
  CHECK ("id" = 1 AND "percentual" BETWEEN 1 AND 100);
