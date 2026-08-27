#!/usr/bin/env python3
"""Benchmark honesto: tokens de entender el proyecto con Netrunner vs grep/read.
Mide bytes de output (proxy de tokens) de:
  A) Leer todo el código fuente (grep/read masivo) — el approach sin Netrunner
  B) Netrunner status + explore de un símbolo — el approach con Netrunner
"""
import subprocess, os, sys

REPO = os.environ.get("NETRUNNER_REPO", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BIN = os.path.join(REPO, "dist", "netrunner")

def bytes_of(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=REPO)
    return len(r.stdout.encode())

# A) Leer todo el código fuente (grep/read masivo)
src_bytes = bytes_of("find src -name '*.ts' -exec cat {} +")
print(f"A) Leer todo el código fuente (grep/read): {src_bytes} bytes")

# B) Netrunner: status + explore de un símbolo real
status_bytes = bytes_of(f"{BIN} status")
# explora un símbolo real del grafo
explore_bytes = bytes_of(f"{BIN} explore install")
netrunner_bytes = status_bytes + explore_bytes
print(f"B) Netrunner (status + explore): {netrunner_bytes} bytes")

# Reducción
reduction = (1 - netrunner_bytes / src_bytes) * 100
print(f"\nReducción de tokens: {reduction:.1f}%")
print(f"Ratio: {src_bytes / netrunner_bytes:.1f}x menos tokens")
