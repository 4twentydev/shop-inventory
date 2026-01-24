#!/usr/bin/env bash
set -e
corepack enable
corepack prepare pnpm@latest --activate
npm i -g bun
