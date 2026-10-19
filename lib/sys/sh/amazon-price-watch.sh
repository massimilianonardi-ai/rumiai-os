#!/bin/bash

#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
M="${RUMIAI_M:-$SCRIPT_DIR/m}"
DATA_DIR="${AMAZON_PRICE_WATCH_HOME:-$HOME/.local/share/amazon-price-watch}"
REGISTRY="$DATA_DIR/wishlists.tsv"
LOG_DIR="$DATA_DIR/logs"

fail() {
  printf 'Errore: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'HELP'
Uso:
  amazon-price-watch.sh add NOME URL [STATE.json]
  amazon-price-watch.sh remove NOME
  amazon-price-watch.sh list
  amazon-price-watch.sh update [NOME|all]
  amazon-price-watch.sh report [NOME|all]
  amazon-price-watch.sh status [NOME|all]
  amazon-price-watch.sh html NOME
  amazon-price-watch.sh target NOME ASIN EUR|clear
  amazon-price-watch.sh note NOME ASIN TESTO|clear
  amazon-price-watch.sh baseline NOME ASIN EUR|clear
  amazon-price-watch.sh import-sheet NOME FILE.csv

NOME usa lettere minuscole, cifre e trattini.
Il comando remove elimina solo la registrazione, non i file storici.
Configurazione e log: ~/.local/share/amazon-price-watch
HELP
}

[[ -x "$M" ]] || fail "launcher m non trovato: $M"
mkdir -p -- "$DATA_DIR" "$LOG_DIR"
[[ -e "$REGISTRY" ]] || : > "$REGISTRY"
[[ -f "$REGISTRY" && ! -L "$REGISTRY" ]] || fail 'registro non valido'
chmod 600 -- "$REGISTRY"

check_name() {
  [[ "$1" =~ ^[a-z][a-z0-9-]*$ ]] || fail "nome wishlist non valido: $1"
}

STATE=''
URL=''

lookup() {
  local wanted="$1" name url state

  check_name "$wanted"
  URL=''
  STATE=''

  while IFS=$'\t' read -r name url state; do
    if [[ "$name" == "$wanted" ]]; then
      URL="$url"
      STATE="$state"
      return 0
    fi
  done < "$REGISTRY"

  return 1
}

register() {
  [[ $# -ge 2 && $# -le 3 ]] || { usage; return 2; }

  local name="$1" url="$2" file="${3:-$DATA_DIR/$1.json}"
  local oldName oldUrl oldFile

  check_name "$name"

  [[ "$url" =~ ^https://(www\.)?amazon\.it/hz/wishlist/ls/[[:alnum:]]+/?(\?.*)?$ ]] ||
    fail 'URL wishlist Amazon.it non valido'

  if lookup "$name"; then
    fail "wishlist già registrata: $name"
  fi

  [[ "$file" != *$'\t'* && "$file" != *$'\n'* ]] ||
    fail 'percorso JSON non valido'

  [[ "$file" == /* ]] || file="$PWD/$file"
  mkdir -p -- "$(dirname -- "$file")"

  file="$(CDPATH= cd -- "$(dirname -- "$file")" && pwd -P)/$(basename -- "$file")"

  while IFS=$'\t' read -r oldName oldUrl oldFile; do
    [[ "$oldFile" != "$file" ]] ||
      fail "file JSON già assegnato a $oldName"
  done < "$REGISTRY"

  printf '%s\t%s\t%s\n' "$name" "$url" "$file" >> "$REGISTRY"
  printf 'Registrata %s → %s\n' "$name" "$file"
}

remove() {
  [[ $# -eq 1 ]] || fail 'remove richiede un nome'

  local wanted="$1" tmp name url state

  lookup "$wanted" ||
    fail "wishlist non registrata: $wanted"

  tmp="$(mktemp "$DATA_DIR/.wishlists.XXXXXXXX")" ||
    fail 'impossibile creare il registro temporaneo'

  if ! (
    while IFS=$'\t' read -r name url state; do
      if [[ "$name" != "$wanted" ]]; then
        printf '%s\t%s\t%s\n' "$name" "$url" "$state" || exit 1
      fi
    done < "$REGISTRY"
  ) > "$tmp"; then
    rm -f -- "$tmp"
    fail 'impossibile aggiornare il registro'
  fi

  if ! mv -f -- "$tmp" "$REGISTRY"; then
    rm -f -- "$tmp"
    fail 'impossibile sostituire il registro'
  fi

  printf 'Wishlist rimossa: %s (storico conservato)\n' "$wanted"
}

list_all() {
  local name url file

  while IFS=$'\t' read -r name url file; do
    [[ -n "$name" ]] || continue
    printf '%-14s %s\n' "$name" "$file"
  done < "$REGISTRY"
}

html_path() {
  local file="$1"

  case "$file" in
    *.json) printf '%s.html\n' "${file%.json}" ;;
    *) printf '%s.html\n' "$file" ;;
  esac
}

update_one() {
  local name="$1" log

  lookup "$name" ||
    fail "wishlist sconosciuta: $name"

  log="$LOG_DIR/$(date +%F).log"

  printf '[%s] Controllo: %s\n' "$(date -Is)" "$name" |
    tee -a "$log"

  "$M" amazon-wishlist-monitor "$URL" "$STATE" 2>&1 |
    tee -a "$log"
}

report_one() {
  lookup "$1" ||
    fail "wishlist sconosciuta: $1"

  "$M" amazon-wishlist-monitor report "$STATE"
}

status_one() {
  local name="$1"

  lookup "$name" ||
    fail "wishlist sconosciuta: $name"

  if [[ ! -f "$STATE" ]]; then
    printf '%s: non ancora monitorata\n' "$name"
    return 0
  fi

  "$M" node -e '
    const fs = require("node:fs");
    const s = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const x = s.summary;

    console.log(`${process.argv[2]} · ${s.lastCheckedAt}`);
    console.log(`  Prodotti: ${x.listedCount} | Prezzi verificati: ${x.verifiedCurrentCount}`);
    console.log(`  Target raggiunti: ${x.atOrBelowTargetCount} | Sopra target: ${x.aboveTargetCount}`);
    console.log(`  Non verificati: ${x.unverifiedCurrentCount} | Fuori wishlist: ${x.missingProductsCount}`);
  ' "$STATE" "$name"

  printf '  HTML: %s\n' "$(html_path "$STATE")"
}

run_selected() {
  local action="$1" selection="${2:-all}"
  local name url file failed=0

  if [[ "$selection" != all ]]; then
    "${action}_one" "$selection"
    return
  fi

  [[ -s "$REGISTRY" ]] ||
    fail 'nessuna wishlist registrata'

  while IFS=$'\t' read -r name url file; do
    [[ -n "$name" ]] || continue

    if ! "${action}_one" "$name"; then
      printf 'Errore nel comando %s per %s\n' "$action" "$name" >&2
      failed=1
    fi
  done < "$REGISTRY"

  return "$failed"
}

command="${1:-help}"
shift || :

case "$command" in
  add)
    register "$@"
    ;;

  remove)
    remove "$@"
    ;;

  list)
    [[ $# -eq 0 ]] || fail 'list non accetta argomenti'
    list_all
    ;;

  update|report|status)
    [[ $# -le 1 ]] || fail 'troppi argomenti'
    run_selected "$command" "${1:-all}"
    ;;

  html)
    [[ $# -eq 1 ]] || fail 'html richiede un nome'
    lookup "$1" || fail "wishlist sconosciuta: $1"
    html_path "$STATE"
    ;;

  target|note|baseline)
    [[ $# -eq 3 ]] ||
      fail "$command richiede: NOME ASIN VALORE"

    lookup "$1" || fail "wishlist sconosciuta: $1"

    "$M" amazon-wishlist-monitor \
      "$command" "$STATE" "$2" "$3"
    ;;

  import-sheet)
    [[ $# -eq 2 ]] ||
      fail 'import-sheet richiede NOME FILE.csv'

    lookup "$1" || fail "wishlist sconosciuta: $1"

    "$M" amazon-wishlist-monitor \
      import-sheet "$STATE" "$2"
    ;;

  help|-h|--help)
    usage
    ;;

  *)
    usage
    exit 2
    ;;
esac

