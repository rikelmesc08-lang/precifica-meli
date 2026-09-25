#!/usr/bin/env bash
# Publica o site estático no GitHub Pages (branch gh-pages).
# Uso: npm run deploy
set -euo pipefail

REPO_URL="$(git remote get-url origin)"
REPO_NAME="$(basename -s .git "$REPO_URL")"

npm test
MSYS_NO_PATHCONV=1 BASE_PATH="/$REPO_NAME" npm run build
touch out/.nojekyll

cd out
rm -rf .git
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C .. config user.name)" -c user.email="$(git -C .. config user.email)" \
  commit -q -m "Deploy $(git -C .. rev-parse --short HEAD)"
git push -q -f "$REPO_URL" gh-pages
rm -rf .git
echo "Publicado em https://$(gh api user -q .login 2>/dev/null || echo '<usuario>').github.io/$REPO_NAME/"
