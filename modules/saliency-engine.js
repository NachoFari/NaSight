/**
 * saliency-engine.js - Orquestador del Pipeline de Salencia
 * Coordina caché de canales, filtros O(N), 8 modelos (Consenso + 7 SOTA/Congreso),
 * colormaps, análisis de scanpath y métricas de Áreas de Interés (AOI).
 */

window.SaliencyApp = window.SaliencyApp || {};

class SaliencyEngine {
    constructor() {
        this.colormaps = window.SaliencyApp.ColorMaps;
        this.models = window.SaliencyApp.SOTAModels;
        this.filters = window.SaliencyApp.CoreFilters;
        this.scanpathModule = window.SaliencyApp.ScanpathAnalysis;
        this._cachedSource = null;
        this._cachedChannels = null;
        this._cachedWidth = 0;
        this._cachedHeight = 0;
    }

    /**
     * Invalida la caché de canales (ej. cuando cambia la imagen fuente)
     */
    invalidateCache() {
        this._cachedSource = null;
        this._cachedChannels = null;
    }

    /**
     * Normaliza un buffer Float32Array al rango [0, 1]
     */
    normalizeBuffer(buf) {
        const total = buf.length;
        let max = 0;
        let min = Infinity;
        for (let i = 0; i < total; i++) {
            if (buf[i] > max) max = buf[i];
            if (buf[i] < min) min = buf[i];
        }
        const delta = (max - min) || 1;
        const out = new Float32Array(total);
        for (let i = 0; i < total; i++) {
            out[i] = (buf[i] - min) / delta;
        }
        return out;
    }

    /**
     * Evalúa un modelo específico sobre los canales extraídos
     */
    evaluateSingleModel(model, channels, width, height, weights) {
        const { lum, rg, gr, by, yb, meanLum, edges, localBlur, macroBlur } = channels;
        const { contrastWeight, edgeWeight, readingBias, centerPrior } = weights;
        const total = width * height;
        const rawMap = new Float32Array(total);

        for (let y = 0; y < height; y++) {
            const ny = y / height;
            const row = y * width;
            const topBias = Math.exp(-Math.pow(ny / 0.32, 2)) * 1.5;
            const yBand2 = Math.exp(-Math.pow((ny - 0.38) / 0.14, 2)) * 0.65;

            for (let x = 0; x < width; x++) {
                const nx = x / width;
                const idx = row + x;

                const localContrast = Math.abs(lum[idx] - localBlur[idx]);
                const regionalContrast = Math.abs(localBlur[idx] - macroBlur[idx]);
                const colorPop = rg[idx] * 1.6 + by[idx] * 1.3;
                const fullColorPop = rg[idx] * 1.45 + gr[idx] * 1.15 + by[idx] * 1.3 + yb[idx] * 1.25;
                const edge = edges[idx];

                const readingFlow = (1.0 - nx * 0.25) * (1.0 - ny * 0.35);
                const leftStem = Math.exp(-Math.pow(nx / 0.22, 2)) * (1.0 - ny * 0.3) * 0.9;
                const fPattern = topBias * 0.85 + yBand2 * (1.0 - nx * 0.45) + leftStem;

                const cx = (nx - 0.5) * 2;
                const cy = (ny - 0.5) * 2;
                const centerBias = Math.exp(-(cx * cx + cy * cy) / 0.85);

                const score = model.calculatePixelScore({
                    lum: lum[idx],
                    macroLum: macroBlur[idx],
                    meanLum,
                    localContrast,
                    regionalContrast,
                    colorPop,
                    fullColorPop,
                    edge,
                    topBias,
                    readingFlow,
                    fPattern,
                    centerBias,
                    contrastWeight,
                    edgeWeight,
                    readingBias,
                    centerPrior
                });

                rawMap[idx] = Math.max(0, score);
            }
        }
        return rawMap;
    }

    /**
     * Extrae o reutiliza los canales base desde la imagen fuente
     */
    getOrExtractChannels(sourceElement) {
        if (this._cachedSource === sourceElement && this._cachedChannels) {
            return {
                width: this._cachedWidth,
                height: this._cachedHeight,
                channels: this._cachedChannels
            };
        }

        const maxDim = 1000;
        let width = sourceElement.width || sourceElement.naturalWidth;
        let height = sourceElement.height || sourceElement.naturalHeight;

        if (width > maxDim || height > maxDim) {
            if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
            } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
            }
        }

        const procCanvas = document.createElement('canvas');
        procCanvas.width = width;
        procCanvas.height = height;
        const ctx = procCanvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(sourceElement, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const total = width * height;

        const { lum, rg, gr, by, yb, meanLum } = this.filters.extractChannels(imgData.data, total);
        const edges = this.filters.sobelGradients(lum, width, height);
        const localBlur = this.filters.boxBlur(lum, width, height, 4);
        const macroBlur = this.filters.boxBlur(lum, width, height, 18);

        const channels = { lum, rg, gr, by, yb, meanLum, edges, localBlur, macroBlur };
        this._cachedSource = sourceElement;
        this._cachedChannels = channels;
        this._cachedWidth = width;
        this._cachedHeight = height;

        return { width, height, channels };
    }

    /**
     * Procesa una imagen y retorna el mapa de atención y sus métricas
     */
    process(sourceElement, options = {}) {
        const {
            modelId = 'consenso',
            blurRadius = 16,
            contrastWeight = 1.0,
            edgeWeight = 1.2,
            readingBias = 0.4,
            centerPrior = 0.2,
            threshold = 0.0
        } = options;

        const model = this.models[modelId] || this.models.consenso;
        const { width, height, channels } = this.getOrExtractChannels(sourceElement);
        const total = width * height;
        const weights = { contrastWeight, edgeWeight, readingBias, centerPrior };

        let rawMap;

        // Inferencia: Modo Consenso (3 Redes) vs Modelo Individual
        if (modelId === 'consenso') {
            const mapUmsi = this.normalizeBuffer(
                this.evaluateSingleModel(this.models.umsi, channels, width, height, weights)
            );
            const mapDeep = this.normalizeBuffer(
                this.evaluateSingleModel(this.models.deepgaze, channels, width, height, weights)
            );
            const mapTran = this.normalizeBuffer(
                this.evaluateSingleModel(this.models.transalnet, channels, width, height, weights)
            );

            rawMap = new Float32Array(total);
            for (let i = 0; i < total; i++) {
                const u = mapUmsi[i];
                const d = mapDeep[i];
                const t = mapTran[i];

                const geomMean = Math.cbrt(u * d * t);
                const mean = (u + d + t) / 3;
                const variance = ((u - mean) ** 2 + (d - mean) ** 2 + (t - mean) ** 2) / 3;
                const agreement = Math.max(0, 1 - Math.sqrt(variance));

                rawMap[i] = geomMean * (0.5 + 0.5 * agreement);
            }
        } else {
            rawMap = this.evaluateSingleModel(model, channels, width, height, weights);
        }

        // Suavizado foveal (O(N))
        const smoothRadius = Math.max(3, Math.round(blurRadius * (width / 800)));
        const smoothed = this.filters.gaussianBlur(rawMap, width, height, smoothRadius);

        // Normalización no lineal y corte de umbral
        const normSmooth = this.normalizeBuffer(smoothed);
        const normalized = new Float32Array(total);

        for (let i = 0; i < total; i++) {
            let v = Math.pow(normSmooth[i], 1.8);
            if (v < threshold) v = 0;
            normalized[i] = v;
        }

        // Hotspots, trayectoria y diagnóstico
        const { hotspots, scanpath } = this.scanpathModule.extract(normalized, width, height);
        const metrics = this.scanpathModule.diagnosePoster(normalized, width, height, hotspots);

        return {
            width,
            height,
            normalizedMap: normalized,
            hotspots,
            scanpath,
            metrics,
            modelInfo: model
        };
    }

    /**
     * Calcula qué porcentaje de la atención total del póster captura cada AOI (Área de Interés)
     * aois: [{ id, label, nx, ny, nw, nh }] en coordenadas normalizadas [0, 1]
     */
    computeAOIMetrics(normalizedMap, width, height, aois) {
        if (!aois || !aois.length) return [];

        let totalAttention = 0;
        const total = width * height;
        for (let i = 0; i < total; i++) {
            totalAttention += normalizedMap[i];
        }
        const safeTotal = totalAttention || 1;

        return aois.map((aoi) => {
            const x0 = Math.max(0, Math.floor(aoi.nx * width));
            const y0 = Math.max(0, Math.floor(aoi.ny * height));
            const x1 = Math.min(width, Math.ceil((aoi.nx + aoi.nw) * width));
            const y1 = Math.min(height, Math.ceil((aoi.ny + aoi.nh) * height));

            let regionSum = 0;
            let regionMax = 0;
            let pixelCount = 0;

            for (let y = y0; y < y1; y++) {
                const row = y * width;
                for (let x = x0; x < x1; x++) {
                    const v = normalizedMap[row + x];
                    regionSum += v;
                    if (v > regionMax) regionMax = v;
                    pixelCount++;
                }
            }

            const sharePct = Math.round((regionSum / safeTotal) * 1000) / 10;
            const peakPct = Math.round(regionMax * 100);
            const avgDensity = pixelCount > 0 ? Math.round((regionSum / pixelCount) * 100) : 0;

            return {
                ...aoi,
                sharePct,
                peakPct,
                avgDensity
            };
        });
    }

    /**
     * Dibuja el mapa de calor sobre un canvas de salida
     */
    renderHeatmap(targetCanvas, normalizedMap, width, height, options = {}) {
        const {
            colormap = 'turbo',
            opacity = 0.65,
            spotlightMode = false
        } = options;

        targetCanvas.width = width;
        targetCanvas.height = height;
        const ctx = targetCanvas.getContext('2d');
        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;
        const lut = this.colormaps[colormap] || this.colormaps.turbo;
        const total = width * height;

        for (let p = 0, i = 0; p < total; p++, i += 4) {
            const val = normalizedMap[p];

            if (val <= 0.03) {
                data[i] = 0;
                data[i + 1] = 0;
                data[i + 2] = 0;
                data[i + 3] = spotlightMode ? 200 : 0;
                continue;
            }

            const lutIdx = Math.min(255, Math.max(0, Math.round(val * 255))) * 3;
            data[i] = lut[lutIdx];
            data[i + 1] = lut[lutIdx + 1];
            data[i + 2] = lut[lutIdx + 2];

            const alpha = Math.min(1.0, val * 1.4) * opacity * 255;
            data[i + 3] = Math.round(alpha);
        }

        ctx.putImageData(imgData, 0, 0);
    }
}

window.SaliencyApp.SaliencyEngine = SaliencyEngine;
