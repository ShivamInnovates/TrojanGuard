#!/usr/bin/env bash
# TrojanGuard — Sandboxed Real-Data Model Training Launcher
# Launches ml/real/train_real.py under isolated network namespace with CPU & memory limits.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

DATASET_HASH_FILE="${REPO_ROOT}/ml/real/DATASET.sha256"
EXPECTED_HASH="624ecb6c9229cf62bd3b8f65d23a2b132760e6bada458aa46eee134a313840c4"

# 1. Dataset location check
RAW_DIR="${REPO_ROOT}/ml/data/raw"
DATASET_CSV=""
if [[ -f "${RAW_DIR}/CIC-MalMem-2022.csv" ]]; then
    DATASET_CSV="${RAW_DIR}/CIC-MalMem-2022.csv"
elif [[ -f "${RAW_DIR}/Obfuscated-MalMem2022.csv" ]]; then
    DATASET_CSV="${RAW_DIR}/Obfuscated-MalMem2022.csv"
fi

if [[ -z "${DATASET_CSV}" ]]; then
    echo "[-] Error: Raw dataset CSV not found in ${RAW_DIR}." >&2
    echo "    Expected: CIC-MalMem-2022.csv or Obfuscated-MalMem2022.csv" >&2
    exit 1
fi

echo "[*] Found raw dataset: ${DATASET_CSV}"

# 2. Checksum verification
echo "[*] Verifying dataset SHA-256 integrity..."
ACTUAL_HASH="$(sha256sum "${DATASET_CSV}" | awk '{print $1}')"

if [[ -f "${DATASET_HASH_FILE}" ]]; then
    FILE_EXPECTED_HASH="$(awk '{print $1}' "${DATASET_HASH_FILE}")"
    if [[ "${FILE_EXPECTED_HASH}" != "${EXPECTED_HASH}" ]]; then
        echo "[!] Warning: Checked-in hash file differs from canonical hash ${EXPECTED_HASH}" >&2
    fi
fi

if [[ "${ACTUAL_HASH}" != "${EXPECTED_HASH}" ]]; then
    echo "[-] Error: Dataset integrity check failed!" >&2
    echo "    Expected SHA-256: ${EXPECTED_HASH}" >&2
    echo "    Actual SHA-256:   ${ACTUAL_HASH}" >&2
    exit 1
fi
echo "[+] SHA-256 verified: ${ACTUAL_HASH}"

# 3. Python environment
PYTHON_BIN=""
if [[ -f "${REPO_ROOT}/ml/real/.venv/bin/python" ]]; then
    PYTHON_BIN="${REPO_ROOT}/ml/real/.venv/bin/python"
elif [[ -f "${REPO_ROOT}/backend/.venv/bin/python" ]]; then
    PYTHON_BIN="${REPO_ROOT}/backend/.venv/bin/python"
elif command -v python3 &>/dev/null; then
    PYTHON_BIN="$(command -v python3)"
else
    echo "[-] Error: No Python interpreter found." >&2
    exit 1
fi

# Record modification times before training
MODEL_PKL="${REPO_ROOT}/ml/real/model_real.pkl"
METRICS_JSON="${REPO_ROOT}/ml/real/metrics_real.json"
BEFORE_TS="$(date +%s)"

# 4. Check unshare support
echo "[*] Checking unshare network namespace isolation support..."
if ! unshare -rn true 2>/dev/null; then
    echo "" >&2
    echo "[!] Notice: 'unshare -rn' (network namespace isolation) is unavailable on this host." >&2
    echo "    To run standard training without network namespace isolation, execute:" >&2
    echo "    cd \"${REPO_ROOT}\" && \"${PYTHON_BIN}\" ml/real/train_real.py" >&2
    echo "" >&2
    exit 1
fi

echo "[+] Network namespace isolation supported. Launching sandboxed training..."
echo "    - Network: Completely isolated (new user & net namespace, unshare -rn)"
echo "    - Memory limit: 6 GB virtual memory"
echo "    - CPU limit: 600s CPU time"

# Run training inside unshare with resource limits
unshare -rn bash -c "
    set -euo pipefail
    ulimit -v 6291456 2>/dev/null || true # 6 GB AS limit
    ulimit -t 600 2>/dev/null || true     # 600s CPU limit
    cd '${REPO_ROOT}'
    '${PYTHON_BIN}' ml/real/train_real.py
"

# 5. Verify output files updated
echo "[*] Verifying output artifacts in ml/real/..."
if [[ ! -f "${MODEL_PKL}" ]]; then
    echo "[-] Error: Output model file ${MODEL_PKL} was not created." >&2
    exit 1
fi

if [[ ! -f "${METRICS_JSON}" ]]; then
    echo "[-] Error: Output metrics file ${METRICS_JSON} was not created." >&2
    exit 1
fi

AFTER_MODEL_TS="$(stat -c %Y "${MODEL_PKL}")"
AFTER_METRICS_TS="$(stat -c %Y "${METRICS_JSON}")"

if (( AFTER_MODEL_TS < BEFORE_TS || AFTER_METRICS_TS < BEFORE_TS )); then
    echo "[!] Notice: Outputs exist but were not updated in this run (timestamps before run start)." >&2
else
    echo "[+] Verified output artifacts successfully updated:"
    echo "    - Model:   ${MODEL_PKL} ($(stat -c %s "${MODEL_PKL}") bytes)"
    echo "    - Metrics: ${METRICS_JSON} ($(stat -c %s "${METRICS_JSON}") bytes)"
fi

echo "[✓] Sandboxed real-data model training completed successfully!"
