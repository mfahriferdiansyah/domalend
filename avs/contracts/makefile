-include .env

# Default values
DEFAULT_NETWORK := $(shell grep 'default_network' foundry.toml | cut -d '"' -f2)
FORK_NETWORK := $(shell grep 'mainnet =' foundry.toml | cut -d '"' -f2)

# Custom network can be set via make network=<network_name>
network ?= $(DEFAULT_NETWORK)
$(info Network: $(network))

# Access PRIVATE_KEY from .env
PRIVATE_KEY := $(PRIVATE_KEY)

# Get network URL from [rpc_endpoints] section
NETWORK_URL := $(shell awk -v net="$(network)" 'BEGIN{found=0} /^\[rpc_endpoints\]/ {found=1; next} /^\[.*\]/ {found=0} found && $$0 ~ net {split($$0, a, "="); gsub(/[ \t"]/, "", a[2]); print a[2]}' foundry.toml)

ETHERSCAN_KEY := $(shell awk -v net="$(network)" 'match($$0, net" *= *\\{[^}]*key *= *\"[^\"]+\"") { \
  n = split($$0, a, /key *= *"/); \
  split(a[2], b, /"/); \
  print b[1]; \
  exit \
}' foundry.toml)

# Get verifier name and URL from verifier.toml
VERIFIER := $(shell awk -v net="$(network)" 'BEGIN{p=0} $$0 ~ "\\["net"\\]" {p=1; next} /^\[.*\]/ {p=0} p && $$1=="name" {gsub(/"/, "", $$3); print $$3}' foundry.toml)
VERIFIER_URL := $(shell awk -v net="$(network)" 'BEGIN{p=0} $$0 ~ "\\["net"\\]" {p=1; next} /^\[.*\]/ {p=0} p && $$1=="url" {gsub(/"/, "", $$3); print $$3}' foundry.toml)

VERIFIER_CONFIG := $(shell \
	args=""; \
	[ -n "$(VERIFIER)" ] && args="$$args\"--verifier\",\"$(VERIFIER)\","; \
	[ -n "$(VERIFIER_URL)" ] && args="$$args\"--verifier-url\",\"$(VERIFIER_URL)\","; \
	[ -n "$(ETHERSCAN_KEY)" ] && args="$$args\"--etherscan-api-key\",\"$(ETHERSCAN_KEY)\","; \
	echo "[$${args%,}]" \
)


$(info Network URL: $(NETWORK_URL))
$(info Verifier: $(VERIFIER))
$(info Verifier URL: $(VERIFIER_URL))
$(info Etherscan KEY: $(ETHERSCAN_KEY))
$(info Verifier Config: $(VERIFIER_CONFIG))

# Ensure NETWORK_URL is not empty
ifeq ($(strip $(NETWORK_URL)),)
$(error NETWORK_URL is not set for network '$(network)'. Please check your foundry.toml configuration.)
endif

# Helper function to run forge script
define forge_script
	forge script $(1) --rpc-url $(NETWORK_URL) --broadcast --private-key $(PRIVATE_KEY) $(2) --legacy
endef
# --skip-simulation 

# Define a target to deploy core contracts using the specified network
deploy-core: build
	$(call forge_script,script/DeployEigenLayerCore.s.sol,)

# Define a target to deploy domalend contracts using the specified network
deploy-domalend: build
	$(call forge_script,script/ContractDeployer.s.sol,)

# Define a target to verify core deployment using the specified network
deploy-verify-core: build
	$(call forge_script,script/DeployEigenLayerCore.s.sol,--verify)

# Define a target to verify domalend deployment using the specified network
deploy-verify-domalend: build
	$(call forge_script,script/ContractDeployer.s.sol,--verify)

# Define a target to verify contracts using the specified network
verify: build
	forge script script/VerifyAll.s.sol --ffi --sig "run(string,string[])" "$(file)" "$(VERIFIER_CONFIG)" --rpc-url $(NETWORK_URL)

# Define a target to compile the contracts
compile:
	forge compile

# Define a target to run tests
test:
	forge test

# Define a target to lint the code
lint:
	forge fmt

# Define a target to build the project
build:
	forge build --build-info --build-info-path out/build-info/

# Define a target to display help information
help:
	@echo "Makefile targets:"
	@echo "  deploy-core          - Deploy core contracts using the specified network"
	@echo "  deploy-domalend      - Deploy domalend contracts using the specified network"
	@echo "  deploy-verify-core   - Deploy and verify core contracts using the specified network"
	@echo "  deploy-verify-domalend - Deploy and verify domalend contracts using the specified network"
	@echo "  verify               - Verify contracts using the specified network"
	@echo "  compile              - Compile the contracts"
	@echo "  test                 - Run tests"
	@echo "  lint                 - Lint the code"
	@echo "  help                 - Display this help information"