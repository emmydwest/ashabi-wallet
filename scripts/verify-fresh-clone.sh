#!/usr/bin/env bash
# Clones the repo into a temp folder and runs what CI runs: both contracts' tests and wasm
# builds, then the SDK, the MCP server and the dashboard (lint, typecheck, production build).
# Needs git, Node 24, Rust with the wasm32-unknown-unknown target and cargo-near. No keys.
# Usage: scripts/verify-fresh-clone.sh [repo-url-or-path] [branch]
set -euo pipefail

REPO=${1:-https://github.com/emmydwest/ashabi-wallet.git}
BRANCH=${2:-main}
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

step() { printf '\n==> %s\n' "$*"; }

step "Cloning $REPO ($BRANCH) into $WORK"
git clone --quiet --depth 1 --branch "$BRANCH" "$REPO" "$WORK/repo"
cd "$WORK/repo"
git log -1 --format='    commit %h  %s'

for crate in contract factory; do
  step "$crate: cargo test"
  (cd "$crate" && cargo test --quiet 2>&1 | grep -E '^test result' | head -1)
  step "$crate: wasm build"
  (cd "$crate" && cargo near build non-reproducible-wasm >/dev/null 2>&1 && ls target/near/*.wasm)
done

step "SDK: install, typecheck, build"
(cd packages/sdk && npm ci --silent && npm run --silent typecheck && npm run --silent build)

step "MCP server: install, typecheck, build"
(cd packages/mcp-server && npm ci --silent && npm run --silent typecheck && npm run --silent build)

step "Dashboard: install, lint, typecheck, build"
(cd dashboard && npm ci --silent && npm run --silent lint && npx tsc --noEmit && npm run --silent build >/dev/null)

step "All checks passed from a fresh clone"
