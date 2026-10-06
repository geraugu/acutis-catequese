#!/usr/bin/env bash
# Gera docs/demo-turma.gif com dados 100% fictícios, sem tocar no ambiente de desenvolvimento:
#  - banco próprio `acutis_demo` (nunca acutis_dev/acutis_test);
#  - build e servidor num git worktree temporário, na porta 3100 (nunca a 3000 nem .next/ daqui).
# Requer: docker compose com o Postgres de pé (npm run db:up), ffmpeg e o Chromium do Playwright.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PORTA=3100
TMP="$(mktemp -d "${TMPDIR:-/tmp}/acutis-demo.XXXXXX")"
WT="$TMP/worktree"
SERVIDOR_PID=""

limpar() {
  if [ -n "$SERVIDOR_PID" ]; then
    # Encerra só o servidor que este script iniciou (o processo e seus filhos).
    pkill -P "$SERVIDOR_PID" 2>/dev/null || true
    kill "$SERVIDOR_PID" 2>/dev/null || true
  fi
  if [ -d "$WT" ]; then git -C "$RAIZ" worktree remove --force "$WT" 2>/dev/null || true; fi
  git -C "$RAIZ" worktree prune
  rm -rf "$TMP"
}
trap limpar EXIT

if lsof -nP -iTCP:"$PORTA" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "A porta $PORTA já está em uso; libere-a e tente de novo." >&2
  exit 1
fi
command -v ffmpeg >/dev/null || { echo "ffmpeg não encontrado." >&2; exit 1; }

cd "$RAIZ"
set -a
# shellcheck disable=SC1091
. ./.env
set +a
URL_DEMO="${DATABASE_URL/acutis_dev/acutis_demo}"
case "$URL_DEMO" in *acutis_demo*) ;; *) echo "DATABASE_URL inesperada (esperado acutis_dev)." >&2; exit 1 ;; esac

echo "==> Banco acutis_demo"
CONTAINER="$(docker compose ps -q postgres)"
[ -n "$CONTAINER" ] || { echo "Postgres do docker não está de pé (npm run db:up)." >&2; exit 1; }
USUARIO="${POSTGRES_USER:-acutis}"
if ! docker exec "$CONTAINER" psql -U "$USUARIO" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='acutis_demo'" | grep -q 1; then
  docker exec "$CONTAINER" psql -U "$USUARIO" -d postgres -c "CREATE DATABASE acutis_demo"
fi

export DATABASE_URL="$URL_DEMO" BETTER_AUTH_URL="http://localhost:$PORTA" AUTH_RATE_LIMIT=off
npx prisma migrate deploy >/dev/null

echo "==> Worktree temporário e build"
git worktree add --detach "$WT" HEAD >/dev/null
cp -R src/generated "$WT/src/generated"
cp .env "$WT/.env"
# Clone (APFS) em vez de symlink: o Turbopack rejeita node_modules fora da raiz do projeto.
cp -cR node_modules "$WT/node_modules" 2>/dev/null || cp -R node_modules "$WT/node_modules"
(cd "$WT" && npm run build >"$TMP/build.log" 2>&1) || { tail -30 "$TMP/build.log" >&2; exit 1; }

echo "==> Semente"
npx tsx scripts/demo/semear-demo.ts

echo "==> Servidor na porta $PORTA"
(cd "$WT" && exec npx next start -p "$PORTA" >"$TMP/servidor.log" 2>&1) &
SERVIDOR_PID=$!
for _ in $(seq 1 60); do
  curl -fsS -o /dev/null "http://localhost:$PORTA/login" 2>/dev/null && break
  sleep 1
done
curl -fsS -o /dev/null "http://localhost:$PORTA/login" || { echo "Servidor não subiu." >&2; exit 1; }

echo "==> Gravação"
npx tsx scripts/demo/gravar-demo.ts "http://localhost:$PORTA" "$TMP/video"

echo "==> Conversão para GIF"
ffmpeg -v error -y -i "$TMP/video/demo.webm" \
  -vf "fps=10,scale=900:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4" \
  docs/demo-turma.gif
ffprobe -v error -show_entries stream=width,height:format=duration,size -of default=nw=1 docs/demo-turma.gif
echo "Pronto: docs/demo-turma.gif"
