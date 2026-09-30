import { defineConfig, devices } from "@playwright/test";
import { loadEnv } from "vite";

const variaveis = loadEnv("test", process.cwd(), "");
const PORTA = 3000;
const baseURL = `http://localhost:${PORTA}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "on-first-retry" },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/, use: { channel: "chromium" } },
    {
      name: "chromium",
      // channel "chromium" usa o navegador completo em modo headless novo.
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // A aplicação sob e2e usa sempre o banco de teste.
    env: {
      ...variaveis,
      DATABASE_URL: variaveis.DATABASE_URL_TEST ?? "",
      PORT: String(PORTA),
      // Sem limite de taxa no e2e: vários logins seguidos do mesmo IP.
      AUTH_RATE_LIMIT: "off",
    },
  },
});
