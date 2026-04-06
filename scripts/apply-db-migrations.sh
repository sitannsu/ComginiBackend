#!/usr/bin/env bash
#
# Apply Comgini backend MySQL migrations (run on EC2 from repo root, e.g. ~/ComginiBackend).
#
# Prerequisites:
#   - mysql client installed: sudo dnf install -y mariadb105  (or mysql)
#   - .env in project root with DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
#
# Usage:
#   chmod +x scripts/apply-db-migrations.sh
#   ./scripts/apply-db-migrations.sh              # main bundle only
#   ./scripts/apply-db-migrations.sh --all        # bundle + secretarial_module_tables.sql
#   ./scripts/apply-db-migrations.sh --dry-run    # print commands only
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

DRY_RUN=false
WITH_BASE=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --all) WITH_BASE=true ;;
    -h|--help)
      grep '^#' "$0" | grep -v '^#!' | sed 's/^# \?//'
      exit 0
      ;;
  esac
done

ENV_FILE="${ROOT}/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: Missing ${ENV_FILE}"
  echo "Create it from .env.example and set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME."
  exit 1
fi

# Load .env (KEY=VALUE lines; skip comments and empty lines)
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_NAME="${DB_NAME:-comgini_db}"

if [[ -z "${DB_PASSWORD+x}" ]] || [[ "$DB_PASSWORD" == "" ]]; then
  echo "ERROR: DB_PASSWORD is empty in .env (MySQL user likely requires a password)."
  exit 1
fi

run_sql() {
  local file="$1"
  local label="$2"
  if [[ ! -f "$file" ]]; then
    echo "ERROR: SQL file not found: $file"
    exit 1
  fi
  echo "==> ${label}"
  echo "    mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p*** ${DB_NAME} < ${file}"
  if [[ "$DRY_RUN" == true ]]; then
    return 0
  fi
  MYSQL_PWD="$DB_PASSWORD" mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" "$DB_NAME" <"$file"
  echo "    OK"
}

echo "Database: ${DB_NAME} @ ${DB_HOST}:${DB_PORT} (user: ${DB_USER})"
echo ""

run_sql "${ROOT}/src/database/deploy_secretarial_migrations.sql" "deploy_secretarial_migrations.sql (MCA V2/V3, credentials, bulk, forms, DIR-2, annual filing)"

if [[ "$WITH_BASE" == true ]]; then
  run_sql "${ROOT}/src/database/secretarial_module_tables.sql" "secretarial_module_tables.sql (search reports, CSR, DIR3 KYC, etc.)"
fi

echo ""
echo "Done. Restart your Node process if needed (pm2 restart / systemctl / npm)."
