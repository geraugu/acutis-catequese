import { expect, test as setup } from "@playwright/test";

setup("aplicação responde antes dos testes", async ({ request }) => {
  const resposta = await request.get("/");
  expect(resposta.ok()).toBe(true);
});
