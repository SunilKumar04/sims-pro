#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  SIMS Pro – Master Setup & Deployment Script
#  Usage: ./scripts/setup.sh [command]
#  Commands: install | dev | build | docker | seed | reset
# ═══════════════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

print_banner() {
cat << 'EOF'
  ╔══════════════════════════════════════════════════════╗
  ║        SIMS Pro – School Management System          ║
  ║    NestJS + Next.js + PostgreSQL + Prisma           ║
  ╚══════════════════════════════════════════════════════╝
EOF
}

log()     { echo -e "${GREEN}✅ $1${NC}"; }
warn()    { echo -e "${YELLOW}⚠️  $1${NC}"; }
error()   { echo -e "${RED}❌ $1${NC}"; exit 1; }
info()    { echo -e "${CYAN}ℹ️  $1${NC}"; }
section() { echo -e "\n${BOLD}${BLUE}━━━ $1 ━━━${NC}\n"; }

# ── Check prerequisites ──
check_deps() {
  section "Checking Prerequisites"
  for cmd in node npm docker; do
    if command -v "$cmd" &>/dev/null; then
      log "$cmd: $(${cmd} --version 2>/dev/null | head -1)"
    else
      warn "$cmd not found – some commands may not work"
    fi
  done
  node -e "if(parseInt(process.version.slice(1))<18) process.exit(1)" 2>/dev/null \
    || warn "Node.js 18+ recommended"
}

# ── Install all dependencies ──
install_deps() {
  section "Installing Dependencies"

  info "Installing backend dependencies..."
  cd backend && npm install && cd ..
  log "Backend dependencies installed"

  info "Installing frontend dependencies..."
  cd frontend && npm install && cd ..
  log "Frontend dependencies installed"
}

# ── Setup environment files ──
setup_env() {
  section "Setting Up Environment"

  if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    warn "Created backend/.env from example – update DATABASE_URL and JWT_SECRET!"
  else
    log "backend/.env already exists"
  fi

  if [ ! -f frontend/.env.local ]; then
    cat > frontend/.env.local << 'ENV'
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=sims-nextauth-secret-change-in-production
NEXT_PUBLIC_SCHOOL_NAME="Guru Nanak Public Senior Secondary School"
NEXT_PUBLIC_SCHOOL_SHORT="GNPSS"
NEXT_PUBLIC_SCHOOL_CODE="1630247"
NEXT_PUBLIC_SCHOOL_CITY="Ludhiana, Punjab"
ENV
    log "Created frontend/.env.local"
  else
    log "frontend/.env.local already exists"
  fi
}

# ── Database setup ──
setup_db() {
  section "Database Setup"
  cd backend

  info "Generating Prisma client..."
  npx prisma generate
  log "Prisma client generated"

  info "Running migrations..."
  npx prisma migrate deploy 2>/dev/null || npx prisma migrate dev --name init
  log "Migrations complete"

  info "Seeding database..."
  npx ts-node --require tsconfig-paths/register prisma/seed/seed.ts
  log "Database seeded"

  cd ..
}

# ── Start development servers ──
start_dev() {
  section "Starting Development Servers"

  info "Starting backend on http://localhost:4000 ..."
  info "Starting frontend on http://localhost:3000 ..."
  info "API Docs available at http://localhost:4000/api/docs"
  echo ""

  # Check if tmux is available
  if command -v tmux &>/dev/null; then
    tmux new-session -d -s sims -n backend "cd backend && npm run start:dev; read"
    tmux new-window -t sims -n frontend "cd frontend && npm run dev; read"
    tmux attach -t sims
  else
    # Fallback: run in background
    (cd backend  && npm run start:dev) &
    (cd frontend && npm run dev) &
    wait
  fi
}

# ── Docker compose ──
start_docker() {
  section "Starting with Docker Compose"
  cd docker
  docker compose up --build -d
  echo ""
  log "All services started!"
  echo -e "  Frontend:  ${CYAN}http://localhost:3000${NC}"
  echo -e "  Backend:   ${CYAN}http://localhost:4000${NC}"
  echo -e "  API Docs:  ${CYAN}http://localhost:4000/api/docs${NC}"
  echo -e "  pgAdmin:   ${CYAN}http://localhost:5050${NC} (use --profile dev)"
  cd ..
}

# ── Build for production ──
build_prod() {
  section "Building for Production"
  cd backend  && npm run build && log "Backend built" && cd ..
  cd frontend && npm run build && log "Frontend built" && cd ..
  log "Production build complete!"
}

# ── Reset database ──
reset_db() {
  section "Resetting Database"
  warn "This will DELETE all data!"
  read -p "Type 'yes' to confirm: " confirm
  if [ "$confirm" = "yes" ]; then
    cd backend
    npx prisma migrate reset --force
    npx ts-node --require tsconfig-paths/register prisma/seed/seed.ts
    cd ..
    log "Database reset and reseeded"
  else
    info "Reset cancelled"
  fi
}

# ── Full install ──
full_install() {
  print_banner
  check_deps
  install_deps
  setup_env
  echo ""
  echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${GREEN}║     Installation Complete! 🎉             ║${NC}"
  echo -e "${BOLD}${GREEN}╠══════════════════════════════════════════╣${NC}"
  echo -e "${BOLD}${GREEN}║  Next steps:                              ║${NC}"
  echo -e "${BOLD}${GREEN}║  1. Update backend/.env DATABASE_URL      ║${NC}"
  echo -e "${BOLD}${GREEN}║  2. Run: ./scripts/setup.sh db            ║${NC}"
  echo -e "${BOLD}${GREEN}║  3. Run: ./scripts/setup.sh dev           ║${NC}"
  echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════╝${NC}"
}

# ── Main ──
print_banner

case "${1:-install}" in
  install) full_install    ;;
  deps)    install_deps    ;;
  env)     setup_env       ;;
  db)      setup_db        ;;
  dev)     start_dev       ;;
  docker)  start_docker    ;;
  build)   build_prod      ;;
  reset)   reset_db        ;;
  *)
    echo "Usage: $0 [install|deps|env|db|dev|docker|build|reset]"
    echo ""
    echo "  install  – Full first-time setup (deps + env)"
    echo "  deps     – Install npm packages"
    echo "  env      – Create .env files"
    echo "  db       – Run migrations + seed data"
    echo "  dev      – Start dev servers (backend + frontend)"
    echo "  docker   – Start via Docker Compose"
    echo "  build    – Build for production"
    echo "  reset    – Reset and reseed database"
    exit 1
    ;;
esac
