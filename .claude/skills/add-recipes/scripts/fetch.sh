#!/usr/bin/env bash
# Скачивает статьи-подборки Gastronom.ru и все рецепты /recipe/ID из них.
# Последовательно и с паузой: параллельные запросы получают HTTP 503.
# Использование: fetch.sh <папка> <url статьи> [<url> …]
set -euo pipefail
dir=$1; shift
mkdir -p "$dir/r"
UA="Mozilla/5.0"

get() { # get <url> <файл>
  [ -s "$2" ] && return 0
  for try in 1 2 3; do
    if curl -sf -A "$UA" "$1" -o "$2"; then sleep 1; return 0; fi
    sleep $((try * 3))
  done
  echo "не скачалось: $1" >&2
}

for url in "$@"; do
  id=$(grep -oE '[0-9]+$' <<<"${url%/}")
  get "$url" "$dir/a$id.html"
  [ -s "$dir/a$id.html" ] || continue
  recipes=$(grep -oE '/recipe/[0-9]+[^"?#]*' "$dir/a$id.html" | sort -u || true)
  echo "статья $id: $(wc -w <<<"$recipes" | tr -d ' ') рецептов"
  for path in $recipes; do
    rid=$(grep -oE '^/recipe/[0-9]+' <<<"$path" | grep -oE '[0-9]+')
    get "https://www.gastronom.ru$path" "$dir/r/$rid.html"
  done
done
