-- CreateTable
CREATE TABLE "perfil_membro" (
    "userId" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfil_membro_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "perfil_membro" ADD CONSTRAINT "perfil_membro_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
