#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
export DATA_DIR="$PROJECT_DIR/data/open-webui"
export OLLAMA_BASE_URL="http://127.0.0.1:11434"
# Keep retrieval local while avoiding a second, CPU-only embedding model.
export RAG_EMBEDDING_ENGINE="ollama"
export RAG_EMBEDDING_MODEL="nomic-embed-text"

mkdir -p "$DATA_DIR"
exec "$PROJECT_DIR/.open-webui-venv/bin/open-webui" serve --port 3000
