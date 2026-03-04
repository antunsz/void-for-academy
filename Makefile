# Acad Editor Makefile for macOS
# Usage: make <target>
#
# REQUIREMENTS:
# - Node.js 20.x (use nvm to install: nvm install 20.18.2 && nvm use 20.18.2)
# - Python 3.11+ (for the Agno AI backend)
# - npm

# Variables
NAME := $(shell node -p "require('./product.json').nameLong")
NAME_SHORT := $(shell node -p "require('./product.json').applicationName")
ELECTRON_APP := .build/electron/$(NAME).app
GULP := node --max-old-space-size=8192 ./node_modules/gulp/bin/gulp.js
BACKEND_DIR := acad-backend
CONDA_ENV ?= acad
BACKEND_DEPS_MARKER := $(BACKEND_DIR)/.conda-deps-installed

.PHONY: help check-node check-conda check-python install install-backend ensure-backend setup buildreact compile compile-client compile-extensions compile-build watch electron rebuild-native build-darwin run run-darwin backend-start backend-stop backend-logs clean clean-all clean-backend

# Check Node.js version (required: 20.x)
check-node:
	@NODE_VERSION=$$(node -p "process.version.slice(1)") && \
	NODE_MAJOR=$${NODE_VERSION%%.*} && \
	if [ "$$NODE_MAJOR" -ne 20 ]; then \
		echo "ERROR: Node.js 20.x is required. Currently using $$NODE_VERSION"; \
		echo "Run: nvm install 20.18.2 && nvm use 20.18.2"; \
		exit 1; \
	fi

# Check Conda availability
check-conda:
	@if ! command -v conda >/dev/null 2>&1; then \
		echo "ERROR: conda is required but was not found in PATH."; \
		echo "Install Miniconda/Anaconda, then run: conda init zsh"; \
		exit 1; \
	fi

# Check Python version from conda env (required: 3.11+)
check-python: check-conda
	@PY_VER=$$(conda run -n $(CONDA_ENV) python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || echo "0.0"); \
	PY_MAJOR=$${PY_VER%%.*}; \
	PY_MINOR=$${PY_VER##*.}; \
	if [ "$$PY_MAJOR" -lt 3 ] || [ "$$PY_MINOR" -lt 11 ]; then \
		echo "ERROR: conda env '$(CONDA_ENV)' must use Python 3.11+ (found $$PY_VER)."; \
		echo "Create/fix env with:"; \
		echo "  conda create -n $(CONDA_ENV) python=3.11 -y"; \
		exit 1; \
	fi; \
	echo "Found Python in conda env '$(CONDA_ENV)': $$PY_VER"

# Default target
help:
	@echo "Acad Editor Build System"
	@echo ""
	@echo "Available targets:"
	@echo ""
	@echo "  Setup:"
	@echo "    setup            Full setup (npm install + conda backend deps)"
	@echo "    install          Install npm dependencies only"
	@echo "    install-backend  Setup Python backend (conda env + dependencies)"
	@echo "    check-conda      Verify conda is available"
	@echo "    check-node       Verify Node.js version (must be 20.x)"
	@echo "    check-python     Verify conda env Python version (must be 3.11+)"
	@echo ""
	@echo "  Build:"
	@echo "    buildreact       Build React components"
	@echo "    compile          Compile the full project (includes buildreact)"
	@echo "    compile-client   Compile only the client code"
	@echo "    compile-build    Compile with build optimizations (for distribution)"
	@echo "    rebuild-native   Rebuild native modules for Electron"
	@echo "    watch            Watch mode for development"
	@echo ""
	@echo "  Run:"
	@echo "    run              Run the app (backend auto-starts with the app)"
	@echo "    run-darwin       Build and run the app (full build)"
	@echo "    backend-start    Start only the AI backend (for development)"
	@echo "    backend-stop     Stop the AI backend"
	@echo "    backend-logs     Tail backend logs"
	@echo ""
	@echo "  Clean:"
	@echo "    clean            Clean build output"
	@echo "    clean-backend    Clean backend artifacts marker/cache"
	@echo "    clean-all        Clean everything"

# Full setup
setup: check-node check-python install install-backend
	@echo ""
	@echo "Setup complete! Run 'make run' to start Acad."

# Install npm dependencies
install:
	npm install

# Setup Python backend in conda env
install-backend: check-python
	@echo "Setting up Acad AI backend..."
	@echo "Installing Python dependencies..."
	@conda run -n $(CONDA_ENV) python -m pip install --quiet --upgrade pip
	@conda run -n $(CONDA_ENV) python -m pip install --quiet -e $(BACKEND_DIR)
	@touch $(BACKEND_DEPS_MARKER)
	@echo "Backend setup complete."

# Build React components for Void extension
buildreact:
	npm run buildreact

# Compile the full project (includes React build)
compile: check-node buildreact
	$(GULP) compile

# Compile only client code (faster for development)
compile-client: check-node buildreact
	$(GULP) compile-client

# Compile extensions
compile-extensions: check-node
	$(GULP) compile-extensions

# Compile with build optimizations (minification, mangling)
compile-build: check-node
	$(GULP) compile-build

# Watch mode for development
watch:
	npm run watch

# Get Electron binary
electron:
	npm run electron

# Rebuild native modules for Electron (fixes keymapping/native-keymap errors)
rebuild-native: check-node
	@ELECTRON_VER=$$(node -e "console.log(require('./build/lib/util').getElectronVersion().electronVersion)"); \
	ARCH=$$(node -e "console.log(process.arch)"); \
	echo "Rebuilding native modules for Electron $$ELECTRON_VER ($$ARCH)..."; \
	cd node_modules/native-keymap && npx node-gyp rebuild --release \
		--target=$$ELECTRON_VER \
		--arch=$$ARCH \
		--dist-url=https://electronjs.org/headers \
		--runtime=electron \
		--build-from-source
	@echo "Native modules rebuilt."

# Build macOS .app bundle
build-darwin: compile rebuild-native
	@echo "Building macOS app bundle..."
	node build/lib/electron.js
	@APP_PATH=""; \
	for app in .build/electron/*.app; do \
		if [ -d "$$app" ]; then APP_PATH="$$app"; break; fi; \
	done; \
	if [ -z "$$APP_PATH" ]; then \
		echo "ERROR: no .app bundle found in .build/electron"; \
		exit 1; \
	fi; \
	echo "App created at: $$APP_PATH"

# Run the built app (after build-darwin)
run-darwin: build-darwin ensure-backend
	@echo "Starting Acad..."
	@CONDA_PY=$$(conda run -n $(CONDA_ENV) python -c "import sys; print(sys.executable)"); \
	CONDA_BIN=$$(dirname "$$CONDA_PY"); \
	APP_PATH=""; \
	for app in .build/electron/*.app; do \
		if [ -d "$$app" ]; then APP_PATH="$$app"; break; fi; \
	done; \
	if [ -z "$$APP_PATH" ]; then \
		echo "ERROR: no .app bundle found in .build/electron"; \
		exit 1; \
	fi; \
	APP_NAME=$${APP_PATH##*/}; APP_NAME=$${APP_NAME%.app}; \
	EXEC_PATH="$$APP_PATH/Contents/MacOS/Electron"; \
	if [ ! -x "$$EXEC_PATH" ]; then \
		ALT_EXEC="$$APP_PATH/Contents/MacOS/$$APP_NAME"; \
		if [ -x "$$ALT_EXEC" ]; then EXEC_PATH="$$ALT_EXEC"; fi; \
	fi; \
	if [ ! -x "$$EXEC_PATH" ]; then \
		echo "ERROR: executable not found inside $$APP_PATH/Contents/MacOS"; \
		exit 1; \
	fi; \
	PATH="$$CONDA_BIN:$$PATH" NODE_ENV=development VSCODE_DEV=1 "$$EXEC_PATH" .

# Run the app directly (faster, skips recompile)
# The Python backend starts automatically via AgnoBackendLifecycleService
run: electron ensure-backend
	@echo "Starting Acad (AI backend will auto-start)..."
	@CONDA_PY=$$(conda run -n $(CONDA_ENV) python -c "import sys; print(sys.executable)"); \
	CONDA_BIN=$$(dirname "$$CONDA_PY"); \
	APP_PATH=""; \
	for app in .build/electron/*.app; do \
		if [ -d "$$app" ]; then APP_PATH="$$app"; break; fi; \
	done; \
	if [ -z "$$APP_PATH" ]; then \
		echo "ERROR: no .app bundle found in .build/electron"; \
		exit 1; \
	fi; \
	APP_NAME=$${APP_PATH##*/}; APP_NAME=$${APP_NAME%.app}; \
	EXEC_PATH="$$APP_PATH/Contents/MacOS/Electron"; \
	if [ ! -x "$$EXEC_PATH" ]; then \
		ALT_EXEC="$$APP_PATH/Contents/MacOS/$$APP_NAME"; \
		if [ -x "$$ALT_EXEC" ]; then EXEC_PATH="$$ALT_EXEC"; fi; \
	fi; \
	if [ ! -x "$$EXEC_PATH" ]; then \
		echo "ERROR: executable not found inside $$APP_PATH/Contents/MacOS"; \
		exit 1; \
	fi; \
	PATH="$$CONDA_BIN:$$PATH" NODE_ENV=development VSCODE_DEV=1 "$$EXEC_PATH" .

# Pre-flight: guarantee conda deps exist so bootstrap is fast at app launch
ensure-backend:
	@if [ ! -f "$(BACKEND_DEPS_MARKER)" ]; then \
		echo ""; \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		echo "  First run: setting up Acad AI backend..."; \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		echo ""; \
		$(MAKE) install-backend; \
	elif [ "$(BACKEND_DIR)/pyproject.toml" -nt "$(BACKEND_DEPS_MARKER)" ]; then \
		echo "Backend dependencies changed, updating..."; \
		$(MAKE) install-backend; \
	fi

# Start only the backend (useful for backend-only development)
backend-start: install-backend
	@echo "Starting Acad AI backend on http://127.0.0.1:7777..."
	@cd $(BACKEND_DIR) && conda run -n $(CONDA_ENV) python -m uvicorn acad.main:app --host 127.0.0.1 --port 7777 --reload

# Stop the backend
backend-stop:
	@if [ -f "$(BACKEND_DIR)/.acad-backend.pid" ]; then \
		PID=$$(cat $(BACKEND_DIR)/.acad-backend.pid); \
		echo "Stopping backend (PID $$PID)..."; \
		kill $$PID 2>/dev/null || true; \
		rm -f $(BACKEND_DIR)/.acad-backend.pid; \
	else \
		echo "No backend PID file found. Trying to kill by port..."; \
		lsof -ti:7777 | xargs kill 2>/dev/null || echo "No process on port 7777"; \
	fi

# Tail backend logs
backend-logs:
	@echo "Tailing backend output (Ctrl+C to stop)..."
	@if [ -f "$(BACKEND_DIR)/.acad-backend.pid" ]; then \
		PID=$$(cat $(BACKEND_DIR)/.acad-backend.pid); \
		echo "Backend PID: $$PID"; \
	fi
	@echo "---"

# Clean build output
clean:
	rm -rf out
	rm -rf out-build

# Clean Python backend
clean-backend:
	rm -f $(BACKEND_DEPS_MARKER)
	rm -rf $(BACKEND_DIR)/.acad-backend.pid
	rm -rf $(BACKEND_DIR)/*.egg-info
	find $(BACKEND_DIR) -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

# Clean all build artifacts
clean-all: clean clean-backend
	rm -rf .build
	rm -rf node_modules/.cache
