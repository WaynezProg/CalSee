#!/bin/bash

# CalSee Local Development Script
# Usage: ./run.sh [start|stop|status]

set -e

PROJECT_NAME="calsee"
POSTGRES_CONTAINER="calsee-db"
MINIO_CONTAINER="calsee-minio"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
}

start_postgres() {
    if docker ps -q -f name="^${POSTGRES_CONTAINER}$" | grep -q .; then
        log_info "PostgreSQL is already running"
    elif docker ps -aq -f name="^${POSTGRES_CONTAINER}$" | grep -q .; then
        log_info "Starting existing PostgreSQL container..."
        docker start "$POSTGRES_CONTAINER"
    else
        log_info "Creating and starting PostgreSQL container..."
        docker run -d \
            --name "$POSTGRES_CONTAINER" \
            -e POSTGRES_DB=calsee \
            -e POSTGRES_USER=calsee \
            -e POSTGRES_PASSWORD=calsee_local \
            -p 5432:5432 \
            postgres:16
    fi
}

start_minio() {
    if docker ps -q -f name="^${MINIO_CONTAINER}$" | grep -q .; then
        log_info "MinIO is already running"
    elif docker ps -aq -f name="^${MINIO_CONTAINER}$" | grep -q .; then
        log_info "Starting existing MinIO container..."
        docker start "$MINIO_CONTAINER"
    else
        log_info "Creating and starting MinIO container..."
        docker run -d \
            --name "$MINIO_CONTAINER" \
            -p 9000:9000 \
            -p 9001:9001 \
            -v "$(pwd)/minio-data:/data" \
            -e MINIO_ROOT_USER=minioadmin \
            -e MINIO_ROOT_PASSWORD=minioadmin123 \
            minio/minio:latest \
            server /data --console-address ":9001"
    fi
}

stop_services() {
    log_info "Stopping services..."

    # Stop PostgreSQL
    if docker ps -q -f name="^${POSTGRES_CONTAINER}$" | grep -q .; then
        log_info "Stopping PostgreSQL..."
        docker stop "$POSTGRES_CONTAINER"
    else
        log_info "PostgreSQL is not running"
    fi

    # Stop MinIO
    if docker ps -q -f name="^${MINIO_CONTAINER}$" | grep -q .; then
        log_info "Stopping MinIO..."
        docker stop "$MINIO_CONTAINER"
    else
        log_info "MinIO is not running"
    fi

    log_info "All services stopped"
}

show_status() {
    echo ""
    echo "=== CalSee Services Status ==="
    echo ""

    # PostgreSQL status
    if docker ps -q -f name="^${POSTGRES_CONTAINER}$" | grep -q .; then
        echo -e "PostgreSQL: ${GREEN}Running${NC} (localhost:5432)"
    elif docker ps -aq -f name="^${POSTGRES_CONTAINER}$" | grep -q .; then
        echo -e "PostgreSQL: ${YELLOW}Stopped${NC}"
    else
        echo -e "PostgreSQL: ${RED}Not Created${NC}"
    fi

    # MinIO status
    if docker ps -q -f name="^${MINIO_CONTAINER}$" | grep -q .; then
        echo -e "MinIO:      ${GREEN}Running${NC} (API: localhost:9000, Console: localhost:9001)"
    elif docker ps -aq -f name="^${MINIO_CONTAINER}$" | grep -q .; then
        echo -e "MinIO:      ${YELLOW}Stopped${NC}"
    else
        echo -e "MinIO:      ${RED}Not Created${NC}"
    fi

    echo ""
}

start_services() {
    log_info "Starting CalSee development environment..."
    echo ""

    # Start Docker services
    start_postgres
    start_minio

    echo ""
    log_info "Waiting for services to be ready..."
    sleep 2

    show_status

    log_info "Starting Next.js development server..."
    echo ""

    # Run npm dev (this will block until Ctrl+C)
    npm run dev
}

cleanup() {
    echo ""
    log_warn "Received interrupt signal, shutting down..."
    stop_services
    exit 0
}

# Trap Ctrl+C to stop Docker containers when stopping npm run dev
trap cleanup SIGINT SIGTERM

# Main
check_docker

case "${1:-start}" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: $0 [start|stop|status]"
        echo ""
        echo "Commands:"
        echo "  start   - Start PostgreSQL, MinIO, and Next.js dev server (default)"
        echo "  stop    - Stop PostgreSQL and MinIO containers"
        echo "  status  - Show status of all services"
        exit 1
        ;;
esac
