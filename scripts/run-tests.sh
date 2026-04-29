#!/bin/bash
# Runs the Vitest unit-test suite (server + shared).
# Used in CI and locally as: bash scripts/run-tests.sh
set -e
exec npx vitest run "$@"
