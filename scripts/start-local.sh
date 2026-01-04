#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="calsee"
CONTAINER_NAME="${PROJECT_NAME}-db"
POSTGRES_DB="calsee"
POSTGRES_USER="calsee"
POSTGRES_PASSWORD="calsee_local"
POSTGRES_PORT="5432"
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or not on PATH."
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running. Please start Docker Desktop and retry."
  exit 1
fi

if docker ps -a --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  docker start "${CONTAINER_NAME}" >/dev/null
else
  docker run -d \
    --name "${CONTAINER_NAME}" \
    -e POSTGRES_DB="${POSTGRES_DB}" \
    -e POSTGRES_USER="${POSTGRES_USER}" \
    -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
    -p "${POSTGRES_PORT}:5432" \
    postgres:16 >/dev/null
fi

printf "Database container '%s' is running.\n" "${CONTAINER_NAME}"
printf "DATABASE_URL=%s\n" "${DATABASE_URL}"

if command -v npx >/dev/null 2>&1; then
  npx prisma migrate dev --name init
  npx prisma generate
else
  echo "npx not found; skip prisma migrate/generate."
fi
