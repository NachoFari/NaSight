/**
 * vision-sim.js - Simulador de Visión Cromática (Daltonismo) en Canvas 2D
 * 100% portable, sin dependencias externas. Utiliza matrices estándar de Brettel/Viénot.
 */

window.SaliencyApp = window.SaliencyApp || {};

window.SaliencyApp.VisionSimulator = {
    MATRICES: {
        normal: null,
        deuteranopia: [
            0.625, 0.375, 0.000,
            0.700, 0.300, 0.000,
            0.000, 0.300, 0.700
        ],
        protanopia: [
            0.567, 0.433, 0.000,
            0.558, 0.442, 0.000,
            0.000, 0.242, 0.758
        ],
        tritanopia: [
            0.950, 0.050, 0.000,
            0.000, 0.433, 0.567,
            0.000, 0.475, 0.525
        ],
        achromatopsia: [
            0.299, 0.587, 0.114,
            0.299, 0.587, 0.114,
            0.299, 0.587, 0.114
        ]
    },

    /**
     * Dibuja sourceImage en targetCanvas aplicando la simulación cromática elegida
     */
    renderSimulated(targetCanvas, sourceImage, mode = 'normal') {
        const w = sourceImage.width || sourceImage.naturalWidth;
        const h = sourceImage.height || sourceImage.naturalHeight;
        targetCanvas.width = w;
        targetCanvas.height = h;

        const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(sourceImage, 0, 0, w, h);

        const matrix = this.MATRICES[mode];
        if (!matrix) return;

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const len = data.length;

        const m0 = matrix[0], m1 = matrix[1], m2 = matrix[2];
        const m3 = matrix[3], m4 = matrix[4], m5 = matrix[5];
        const m6 = matrix[6], m7 = matrix[7], m8 = matrix[8];

        for (let i = 0; i < len; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            data[i]     = Math.min(255, Math.max(0, r * m0 + g * m1 + b * m2));
            data[i + 1] = Math.min(255, Math.max(0, r * m3 + g * m4 + b * m5));
            data[i + 2] = Math.min(255, Math.max(0, r * m6 + g * m7 + b * m8));
        }

        ctx.putImageData(imgData, 0, 0);
    }
};
