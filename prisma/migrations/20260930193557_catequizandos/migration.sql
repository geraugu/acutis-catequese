-- CreateEnum
CREATE TYPE "estado_catequizando" AS ENUM ('pendente', 'ativo', 'inativo');

-- CreateEnum
CREATE TYPE "sacramento" AS ENUM ('batismo', 'eucaristia', 'crisma');

-- CreateTable
CREATE TABLE "catequizando" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dataNascimento" DATE NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "endereco" TEXT,
    "observacoes" TEXT,
    "estado" "estado_catequizando" NOT NULL DEFAULT 'ativo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catequizando_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sacramento_recebido" (
    "catequizandoId" TEXT NOT NULL,
    "sacramento" "sacramento" NOT NULL,
    "data" DATE,
    "paroquia" TEXT,

    CONSTRAINT "sacramento_recebido_pkey" PRIMARY KEY ("catequizandoId","sacramento")
);

-- CreateIndex
CREATE INDEX "catequizando_estado_idx" ON "catequizando"("estado");

-- AddForeignKey
ALTER TABLE "sacramento_recebido" ADD CONSTRAINT "sacramento_recebido_catequizandoId_fkey" FOREIGN KEY ("catequizandoId") REFERENCES "catequizando"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
