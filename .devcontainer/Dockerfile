FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Postman CLI, installed system-wide (/usr/local/bin) while still root
RUN curl -fsSL https://dl-cli.pstmn.io/install/unix.sh | sh \
    && postman --version

USER node

ENV PATH="/home/node/.local/bin:${PATH}"

RUN curl -fsSL https://claude.ai/install.sh | bash -s stable \
    && claude --version
