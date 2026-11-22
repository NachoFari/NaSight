/**
 * i18n.js - Soporte Bilingüe (Español / Inglés) para NaSight Studio
 * 100% Portable (file:///), sin dependencias externas.
 */

window.SaliencyApp = window.SaliencyApp || {};

window.SaliencyApp.I18N = {
    es: {
        btn_sample: 'Póster Ejemplo',
        btn_upload: 'Subir Mi Póster',
        btn_export: 'Descargar con Mapa de Calor',
        panel_model: 'Modelo de IA (Estado del Arte)',
        panel_heatmap: 'Visualización del Mapa de Calor',
        panel_audit: 'Auditoría de Congresos y Visión',
        panel_diagnosis: 'Diagnóstico del Póster',
        panel_aoi: 'Áreas de Interés (AOI)',
        panel_hotspots: 'Puntos Focales Detectados',
        panel_advice: 'Recomendaciones de Diseño',
        lbl_colormap: 'Paleta Térmica',
        lbl_opacity: 'Opacidad del Mapa',
        lbl_blur: 'Dispersión Foveal (Radio de mirada)',
        lbl_threshold: 'Filtro de Umbral (Solo focos altos)',
        chk_scanpath: 'Recorrido Visual (1 ➔ 2 ➔ 3)',
        chk_spotlight: 'Modo Spotlight (Prueba 3 seg)',
        adv_summary: 'Ajuste Fino del Modelo (Pesos)',
        lbl_w_contrast: 'Peso de Contraste',
        lbl_w_edge: 'Peso de Bordes / Texto',
        lbl_w_reading: 'Sesgo de Lectura (Sup-Izq)',
        lbl_w_center: 'Sesgo Central Humano',
        btn_reset_weights: 'Restablecer Pesos',
        lbl_colorblind: 'Simulador de Daltonismo',
        btn_test3s: 'Iniciar Test 3 Segundos',
        btn_split: 'Cortina Split A/B',
        btn_upload_b: 'Cargar Versión B',
        btn_draw_aoi: 'Dibujar AOI',
        btn_clear_aoi: 'Limpiar',
        lbl_header_share: 'Captura Cabecera',
        lbl_focal_dom: 'Fuerza Punto #1',
        lbl_clutter: 'Saturación / Carga Cognitiva',
        aoi_empty: 'Activa "Dibujar AOI" en el visor y arrastra sobre cualquier bloque (Título, Gráfico, QR) para medir su % exacto de atención.',
        legend_cold: 'Frío (0%)',
        legend_hot: 'Foco (100%)',
        hint_drag: 'Arrastra tu póster aquí o presiona <kbd>Ctrl + V</kbd> para pegar una captura',
        theme_modal_title: 'Temas Visuales • Ecosistema NaSuite',
        theme_modal_sub: 'Selecciona cualquiera de los 20 temas y mascotas Pixel Art 32×32 de NaTex Studio'
    },
    en: {
        btn_sample: 'Sample Poster',
        btn_upload: 'Upload Poster',
        btn_export: 'Download with Heatmap',
        panel_model: 'AI Saliency Model (SOTA)',
        panel_heatmap: 'Heatmap Visualization',
        panel_audit: 'Conference & Vision Audit',
        panel_diagnosis: 'Poster Diagnosis',
        panel_aoi: 'Areas of Interest (AOI)',
        panel_hotspots: 'Detected Focal Points',
        panel_advice: 'Design Recommendations',
        lbl_colormap: 'Thermal Palette',
        lbl_opacity: 'Heatmap Opacity',
        lbl_blur: 'Foveal Spread (Gaze Radius)',
        lbl_threshold: 'Threshold Filter (Top Peaks)',
        chk_scanpath: 'Visual Scanpath (1 ➔ 2 ➔ 3)',
        chk_spotlight: 'Spotlight Mode (3-Sec Test)',
        adv_summary: 'Fine-Tune Model Weights',
        lbl_w_contrast: 'Contrast Weight',
        lbl_w_edge: 'Edge / Text Weight',
        lbl_w_reading: 'Reading Bias (Top-Left)',
        lbl_w_center: 'Human Center Prior',
        btn_reset_weights: 'Reset Weights',
        lbl_colorblind: 'Color Blindness Simulator',
        btn_test3s: 'Run 3-Second Test',
        btn_split: 'Split Curtain A/B',
        btn_upload_b: 'Load Version B',
        btn_draw_aoi: 'Draw AOI',
        btn_clear_aoi: 'Clear',
        lbl_header_share: 'Header Capture',
        lbl_focal_dom: 'Peak #1 Dominance',
        lbl_clutter: 'Visual Clutter / Load',
        aoi_empty: 'Enable "Draw AOI" in the viewer toolbar and drag over any region (Title, Chart, QR) to measure its exact attention share %.',
        legend_cold: 'Low (0%)',
        legend_hot: 'Peak (100%)',
        hint_drag: 'Drag & drop your poster here or press <kbd>Ctrl + V</kbd> to paste a screenshot',
        theme_modal_title: 'Visual Themes • NaSuite Ecosystem',
        theme_modal_sub: 'Choose any of the 20 NaTex Studio themes and 32×32 Pixel Art mascots'
    }
};

class I18nManager {
    constructor() {
        this.lang = this.detectInitialLang();
        this.apply(this.lang, false);
    }

    detectInitialLang() {
        try {
            const saved = localStorage.getItem('nasight_lang');
            if (saved === 'en' || saved === 'es') return saved;
        } catch (e) {}
        return 'es';
    }

    toggle() {
        const next = this.lang === 'es' ? 'en' : 'es';
        this.apply(next, true);
        return next;
    }

    apply(lang, persist = true) {
        this.lang = lang === 'en' ? 'en' : 'es';
        const dict = window.SaliencyApp.I18N[this.lang];

        if (persist) {
            try {
                localStorage.setItem('nasight_lang', this.lang);
            } catch (e) {}
        }

        document.documentElement.lang = this.lang;

        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (dict[key] !== undefined) {
                el.textContent = dict[key];
            }
        });

        document.querySelectorAll('[data-i18n-html]').forEach((el) => {
            const key = el.getAttribute('data-i18n-html');
            if (dict[key] !== undefined) {
                el.innerHTML = dict[key];
            }
        });

        const langBtnLabel = document.getElementById('langToggleLabel');
        if (langBtnLabel) {
            langBtnLabel.textContent = this.lang.toUpperCase();
        }
    }
}

window.SaliencyApp.I18nManager = I18nManager;
