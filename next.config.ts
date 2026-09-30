import type { NextConfig } from "next";
import { carregarEnv } from "./src/lib/env";

// Interrompe `next dev`/`next build`/`next start` se faltar ou for inválida alguma variável (requisito 1.3).
carregarEnv();

const nextConfig: NextConfig = {};

export default nextConfig;
