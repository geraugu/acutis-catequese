// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("exibe o título em pt-BR", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Acutis Catequese");
    expect(screen.getByText("Sistema de gestão da catequese paroquial.")).toBeInTheDocument();
  });
});
