import { execSync } from "node:child_process";
import { loadEnv } from "vite";

/** Aplica as migrações no banco de teste (DATABASE_URL_TEST) antes da suíte de integração. */
export default function setup() {
  const url = loadEnv("test", process.cwd(), "").DATABASE_URL_TEST;
  if (!url)
    throw new Error("Variável de ambiente ausente ou inválida: DATABASE_URL_TEST (não definida)");
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
