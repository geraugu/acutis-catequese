import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { HEADER_CAMINHO, urlDeLogin } from "@/modules/auth/domain/rota-protegida";

/**
 * Checagem otimista: só verifica a presença do cookie de sessão. A validação real
 * (sessão no banco e papel) fica na DAL, chamada por layouts, páginas e actions.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL(urlDeLogin(pathname, search), request.url));
  }
  const cabecalhos = new Headers(request.headers);
  cabecalhos.set(HEADER_CAMINHO, pathname);
  return NextResponse.next({ request: { headers: cabecalhos } });
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|login|acesso-negado|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
