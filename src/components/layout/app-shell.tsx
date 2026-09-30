import Link from "next/link";
import type { ReactNode } from "react";
import { SairButton } from "@/components/auth/sair-button";
import { menuPorPapel } from "@/components/layout/menu-por-papel";
import type { SessaoUsuario } from "@/modules/auth/dal";
import { ROTULO_PAPEL } from "@/modules/auth/domain/papeis";

interface AppShellProps {
  sessao: SessaoUsuario;
  caminhoAtual?: string;
  children: ReactNode;
}

export function AppShell({ sessao, caminhoAtual, children }: AppShellProps) {
  const itens = menuPorPapel(sessao.papel);
  return (
    <>
      <a href="#conteudo" className="pular-link">
        Pular para o conteúdo
      </a>
      <header className="cabecalho">
        <div className="container cabecalho-conteudo">
          <span className="marca">Acutis Catequese</span>
          <div className="usuario">
            <span className="usuario-nome">{sessao.nome}</span>
            <span className="usuario-papel">{ROTULO_PAPEL[sessao.papel]}</span>
            <SairButton />
          </div>
        </div>
        <nav aria-label="Principal" className="navegacao">
          <ul className="container navegacao-lista">
            {itens.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={item.href === caminhoAtual ? "page" : undefined}
                >
                  {item.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="conteudo" tabIndex={-1} className="container conteudo">
        {children}
      </main>
    </>
  );
}
