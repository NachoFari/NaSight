# -*- coding: utf-8 -*-
"""
Script oficial de compilación de NaSight Studio (NaSuite).
Genera:
  - dist/NaSight/NaSight.exe (Ejecutable portable de escritorio)
  - dist_installer/NaSight-Setup-v<ver>.exe (Instalador Windows vía Inno Setup 6)
  - dist_installer/NaSight-v<ver>-Windows-Portable.zip (Paquete portable)
"""

import os
import shutil
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from app import APP_VERSION


def find_pyinstaller() -> str:
    candidates = [
        os.path.join(ROOT, ".venv", "Scripts", "pyinstaller.exe"),
        r"C:\Users\Nacho\AppData\Local\Programs\Python\Python312\Scripts\pyinstaller.exe",
        shutil.which("pyinstaller") or "",
    ]
    for cand in candidates:
        if cand and os.path.isfile(cand):
            return cand
    return ""


def main() -> int:
    os.chdir(ROOT)
    pyinstaller = find_pyinstaller()
    py_exe = sys.executable

    print(f"=== Compilando NaSight Studio v{APP_VERSION} ===")
    base_cmd = [pyinstaller] if pyinstaller else [py_exe, "-m", "PyInstaller"]
    cmd = base_cmd + [
        "--noconfirm",
        "--onedir",
        "--windowed",
        "--name", "NaSight",
        "--icon", "nasight.ico",
        "--add-data", "ABRIR_PROGRAMA.html;.",
        "--add-data", "modules;modules",
        "--add-data", "styles;styles",
        "--add-data", "assets;assets",
        "--add-data", "nasight.ico;.",
        "app.py",
    ]
    if subprocess.call(cmd) != 0:
        print("[ERROR] Falló PyInstaller.")
        return 1

    dist_dir = os.path.join(ROOT, "dist", "NaSight")

    # Inno Setup 6
    iscc_candidates = [
        r"C:\Users\Nacho\AppData\Local\Programs\Inno Setup 6\ISCC.exe",
        r"C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
        r"C:\Program Files\Inno Setup 6\ISCC.exe",
        shutil.which("ISCC") or "",
    ]
    iscc = next((p for p in iscc_candidates if p and os.path.isfile(p)), None)
    if iscc:
        print("=== Generando instalador Windows (Inno Setup 6) ===")
        subprocess.check_call([iscc, "installer.iss"])
    else:
        print("[AVISO] Inno Setup 6 no encontrado; se omitió el instalador.")

    # ZIP Portable
    os.makedirs(os.path.join(ROOT, "dist_installer"), exist_ok=True)
    zip_path = os.path.join(ROOT, "dist_installer", f"NaSight-v{APP_VERSION}-Windows-Portable.zip")
    print(f"=== Empaquetando {os.path.basename(zip_path)} ===")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for folder, _, files in os.walk(dist_dir):
            for fn in files:
                full = os.path.join(folder, fn)
                rel = os.path.relpath(full, dist_dir)
                zf.write(full, rel)

    print("[OK] Build completado en dist/NaSight y dist_installer/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
