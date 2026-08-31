#!/bin/sh
# Dry-run the auth migration + every cf_* RPC on a throwaway local Postgres.
#
# Not part of `npm test` (it needs a Postgres binary, not a Supabase project) —
# it is the cheap way to keep the SQL contract honest between live passes:
# shim.sql stands in for the parts of a Supabase project the migration touches
# (schemas auth/extensions, pgcrypto, the anon/authenticated roles, auth.users,
# auth.uid()/auth.jwt() over request.jwt.claims, Supabase's default grants), then
# every migration runs in order TWICE (they must be re-runnable) and scenario.sql
# exercises every RPC as the role PostgREST would use, asserting SQLSTATEs.
#
# Any FAIL line, or a missing "--- scenario complete", means the contract moved.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
DB=cfauth_test

# Two ways in, and the second one is why this file is not dead code: it needs a
# Postgres, not a Supabase project, and most machines that have one have it in a
# container rather than in /opt. Point PGDOCKER at a running container and the
# harness copies the SQL in and runs psql there; leave it unset and it starts a
# throwaway cluster from PGBIN as before. A database of its own either way -
# nothing in a container someone else is using is read or written.
#
#   PGBIN=/opt/homebrew/opt/postgresql@16/bin modules/auth/supabase/test/run.sh
#   PGDOCKER=my-postgres PGDOCKER_USER=postgres modules/auth/supabase/test/run.sh
if [ -n "${PGDOCKER:-}" ]; then
  DOCKER_USER="${PGDOCKER_USER:-postgres}"
  REMOTE="/tmp/cf-auth-test"
  docker exec -i "$PGDOCKER" rm -rf "$REMOTE"
  docker cp "$DIR/.." "$PGDOCKER:$REMOTE" >/dev/null
  # -f and not stdin: scenario.sql re-runs the migration through \ir, which
  # resolves against the file's own directory and against nothing at all when
  # the file arrives on a pipe.
  psql_f() { docker exec -i "$PGDOCKER" psql -U "$DOCKER_USER" -v ON_ERROR_STOP=1 -q -d "$1" -f "$REMOTE/$2"; }
  psql_c() { docker exec -i "$PGDOCKER" psql -U "$DOCKER_USER" -v ON_ERROR_STOP=1 -q -d template1 -c "$1"; }
  LOG="$(mktemp)"
else
  PGBIN="${PGBIN:-/opt/homebrew/opt/postgresql@16/bin}"
  SOCK="${PGSOCK:-/tmp/cfpg-auth-test}"
  PORT="${PGPORT:-55432}"
  if ! "$PGBIN/pg_isready" -h "$SOCK" -p "$PORT" >/dev/null 2>&1; then
    echo "starting a throwaway cluster in $SOCK"
    rm -rf "$SOCK"; mkdir -p "$SOCK"
    "$PGBIN/initdb" -D "$SOCK/data" -U postgres --auth=trust >"$SOCK/initdb.log" 2>&1
    "$PGBIN/pg_ctl" -D "$SOCK/data" -o "-k $SOCK -h '' -p $PORT" -l "$SOCK/log" start >/dev/null
    sleep 2
  fi
  psql_f() { "$PGBIN/psql" -h "$SOCK" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q -d "$1" -f "$DIR/../$2"; }
  psql_c() { "$PGBIN/psql" -h "$SOCK" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q -d postgres -c "$1"; }
  LOG="$SOCK/migrate.log"
fi

psql_c "drop database if exists $DB" >/dev/null
psql_c "create database $DB" >/dev/null
psql_f "$DB" test/shim.sql >/dev/null
for pass in 1 2; do
  for m in "$DIR"/../migrations/*.sql; do
    # Through a pipe the status is grep's, so a migration that failed to apply
    # was reported by nothing and scenario.sql then asserted against whatever
    # schema had made it in. Collected, checked, and only then filtered.
    if ! psql_f "$DB" "migrations/$(basename "$m")" >"$LOG" 2>&1; then
      grep -v NOTICE "$LOG" || true
      echo "FAIL $m did not apply (pass $pass)"
      exit 1
    fi
    grep -v NOTICE "$LOG" || true
  done
done
psql_f "$DB" test/scenario.sql 2>&1 \
  | sed 's/^psql:[^:]*:[0-9]*: //' | sed 's/^NOTICE:  //' | grep -E "^(ok|ERROR|FAIL|--- )"
