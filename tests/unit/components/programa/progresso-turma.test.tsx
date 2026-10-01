// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgressoTurma } from "@/components/programa/progresso-turma";

describe("ProgressoTurma", () => {
  it("mostra realizados de total e os pendentes num <details>", () => {
    const { container } = render(
      <ProgressoTurma
        progresso={{
          realizados: 1,
          total: 3,
          pendentes: [
            { id: "b", titulo: "Batismo", numero: 2 },
            { id: "c", titulo: "Crisma", numero: 3 },
          ],
        }}
      />,
    );
    expect(screen.getByText("1 de 3 temas")).toBeTruthy();
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details?.querySelector("summary")?.textContent).toBe("Ver temas pendentes");
    expect(details?.textContent).toContain("2. Batismo");
    expect(details?.textContent).toContain("3. Crisma");
  });

  it("omite o <details> quando não há pendentes", () => {
    const { container } = render(
      <ProgressoTurma progresso={{ realizados: 2, total: 2, pendentes: [] }} />,
    );
    expect(screen.getByText("2 de 2 temas")).toBeTruthy();
    expect(container.querySelector("details")).toBeNull();
  });
});
