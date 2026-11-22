/**
 * core-filters.js - Filtros de Visión por Computadora Livianos
 * Operaciones de bajo nivel sobre buffers Float32Array en O(N) para máxima velocidad.
 */

window.SaliencyApp = window.SaliencyApp || {};

window.SaliencyApp.CoreFilters = {
    /**
     * Extrae canales de luminancia BT.709 y oponencia cromática completa (R-G, G-R, B-Y, Y-B)
     */
    extractChannels(rgbaData, totalPixels) {
        const lum = new Float32Array(totalPixels);
        const rg = new Float32Array(totalPixels);
        const gr = new Float32Array(totalPixels);
        const by = new Float32Array(totalPixels);
        const yb = new Float32Array(totalPixels);
        let meanLum = 0;

        for (let i = 0, p = 0; p < totalPixels; p++, i += 4) {
            const r = rgbaData[i] / 255;
            const g = rgbaData[i + 1] / 255;
            const b = rgbaData[i + 2] / 255;

            const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            lum[p] = l;
            meanLum += l;

            rg[p] = Math.max(0, r - (g + b) * 0.5);
            gr[p] = Math.max(0, g - (r + b) * 0.5);
            by[p] = Math.max(0, b - (r + g) * 0.5);
            yb[p] = Math.max(0, (r + g) * 0.5 - b);
        }

        return { lum, rg, gr, by, yb, meanLum: meanLum / (totalPixels || 1) };
    },

    /**
     * Filtro Sobel para gradientes y densidad de bordes (texto, líneas, diagramas)
     */
    sobelGradients(lum, width, height) {
        const edges = new Float32Array(width * height);
        const stride = width;

        for (let y = 1; y < height - 1; y++) {
            const row = y * stride;
            for (let x = 1; x < width - 1; x++) {
                const idx = row + x;
                const gx =
                    -lum[idx - stride - 1] + lum[idx - stride + 1]
                    - 2 * lum[idx - 1] + 2 * lum[idx + 1]
                    - lum[idx + stride - 1] + lum[idx + stride + 1];
                const gy =
                    -lum[idx - stride - 1] - 2 * lum[idx - stride] - lum[idx - stride + 1]
                    + lum[idx + stride - 1] + 2 * lum[idx + stride] + lum[idx + stride + 1];
                edges[idx] = Math.sqrt(gx * gx + gy * gy);
            }
        }
        return edges;
    },

    /**
     * Desenfoque en caja (Box Blur) 2D separable en O(N) mediante ventana deslizante
     */
    boxBlur(input, width, height, radius) {
        const total = input.length;
        const out = new Float32Array(total);
        const tmp = new Float32Array(total);
        const r = Math.max(1, radius | 0);

        // Pasada horizontal con acumulador deslizante
        for (let y = 0; y < height; y++) {
            const row = y * width;
            let sum = 0;
            let count = 0;
            const initEnd = Math.min(width - 1, r);
            for (let k = 0; k <= initEnd; k++) {
                sum += input[row + k];
                count++;
            }
            for (let x = 0; x < width; x++) {
                tmp[row + x] = sum / count;
                const addIdx = x + r + 1;
                if (addIdx < width) {
                    sum += input[row + addIdx];
                    count++;
                }
                const remIdx = x - r;
                if (remIdx >= 0) {
                    sum -= input[row + remIdx];
                    count--;
                }
            }
        }

        // Pasada vertical con acumulador deslizante
        for (let x = 0; x < width; x++) {
            let sum = 0;
            let count = 0;
            const initEnd = Math.min(height - 1, r);
            for (let k = 0; k <= initEnd; k++) {
                sum += tmp[k * width + x];
                count++;
            }
            for (let y = 0; y < height; y++) {
                out[y * width + x] = sum / count;
                const addY = y + r + 1;
                if (addY < height) {
                    sum += tmp[addY * width + x];
                    count++;
                }
                const remY = y - r;
                if (remY >= 0) {
                    sum -= tmp[remY * width + x];
                    count--;
                }
            }
        }

        return out;
    },

    /**
     * Suavizado Gaussiano aproximado mediante 3 pasadas de Box Blur O(N)
     */
    gaussianBlur(input, width, height, radius) {
        let cur = input;
        const r = Math.max(1, Math.round(radius * 0.57));
        for (let p = 0; p < 3; p++) {
            cur = this.boxBlur(cur, width, height, r);
        }
        return cur;
    }
};
