import type { ReactNode } from "react";
import { LayoutDaTurma } from "@/app/(interno)/_turma/layout-turma";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <LayoutDaTurma papel="catequista" turmaId={id}>
      {children}
    </LayoutDaTurma>
  );
}
