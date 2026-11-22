# -*- coding: utf-8 -*-
"""
NaSight Studio — Lanzador de Escritorio Nativo (Ecosistema NaSuite).
Autor: NachoFari (https://nachofari.github.io/)
Licencia: GNU GPLv3
"""

from __future__ import annotations

import os
import pathlib
import sys
import webbrowser

APP_NAME = "NaSight Studio"
APP_VERSION = "1.1.0"


def get_resource_dir() -> str:
    if getattr(sys, "frozen", False):
        return getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(sys.executable)))
    return os.path.dirname(os.path.abspath(__file__))


def main() -> int:
    res_dir = get_resource_dir()
    html_path = os.path.join(res_dir, "ABRIR_PROGRAMA.html")
    if not os.path.isfile(html_path):
        exe_dir = os.path.dirname(os.path.abspath(sys.executable)) if getattr(sys, "frozen", False) else res_dir
        html_path = os.path.join(exe_dir, "ABRIR_PROGRAMA.html")

    file_url = pathlib.Path(html_path).resolve().as_uri()

    try:
        import webview  # type: ignore

        webview.create_window(
            title=f"{APP_NAME} v{APP_VERSION} — NaSuite • Visual Saliency & Heatmaps",
            url=file_url,
            width=1380,
            height=880,
            min_size=(1024, 680),
            background_color="#101116",
        )
        webview.start()
        return 0
    except Exception:
        webbrowser.open(file_url)
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
