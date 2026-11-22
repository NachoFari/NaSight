/**
 * models.js - Especificación y algoritmos de los Modelos SOTA de Salencia + Modelos de Congresos/Pósters
 *
 * 1. Consenso IA (Coincidencia UMSI + DeepGaze IIE + TranSalNet)
 * 2. UMSI / PredImportance (MIT CSAIL - Diseño Gráfico y Pósters)
 * 3. DeepGaze IIE (Matthias Bethge Lab - Fijación Biológica Humana)
 * 4. TranSalNet (Vision Transformer - Relaciones Globales Multi-Columna)
 * 5. Prueba 3 Segundos / Congreso 2m (Macro-contraste y Gancho Rápido)
 * 6. Escaneo F-Pattern / Z-Flow (Lectura Académica Eye-Tracking NN/g)
 * 7. SALICON Pop-Out Multiescala (Oponencia Cromática Completa R-G/B-Y)
 * 8. EML-NET Jerarquía Figuras vs. Texto (ResNet/DenseNet Saliency)
 */

window.SaliencyApp = window.SaliencyApp || {};

window.SaliencyApp.SOTAModels = {
    consenso: {
        id: 'consenso',
        name: 'Consenso IA (Coincidencia 3 Redes)',
        badge: 'Máxima Certeza · Ensemble',
        description: 'Cruza simultáneamente UMSI, DeepGaze IIE y TranSalNet mediante media geométrica ponderada por acuerdo. Solo enciende en rojo las zonas donde las 3 arquitecturas coinciden.',
        target: 'Validación Robusta Multi-Modelo',
        isEnsemble: true,
        calculatePixelScore: (ctx) => {
            const s1 = window.SaliencyApp.SOTAModels.umsi.calculatePixelScore(ctx);
            const s2 = window.SaliencyApp.SOTAModels.deepgaze.calculatePixelScore(ctx);
            const s3 = window.SaliencyApp.SOTAModels.transalnet.calculatePixelScore(ctx);
            return Math.cbrt(Math.max(0, s1) * Math.max(0, s2) * Math.max(0, s3));
        }
    },

    umsi: {
        id: 'umsi',
        name: 'UMSI / PredImportance (MIT CSAIL)',
        badge: 'Recomendado para Pósters',
        description: 'Entrenado sobre el dataset IMP1K (pósters, infografías, interfaces y anuncios). Modela la importancia semántica de títulos, bloques de texto, figuras y jerarquía gráfica.',
        target: 'Diseño Gráfico, Pósters y Documentos Estructurados',
        calculatePixelScore: (ctx) => {
            const textSal = (ctx.edge > 0.12) ? (ctx.edge * 1.55 + ctx.localContrast * 1.25) : 0;
            const graphicSal = (ctx.regionalContrast * 1.75 + ctx.colorPop * 1.3);

            return (textSal * ctx.edgeWeight * 0.9) +
                   (graphicSal * ctx.contrastWeight * 1.0) +
                   (ctx.topBias * ctx.readingBias * 1.3) +
                   (ctx.readingFlow * ctx.readingBias * 0.45);
        }
    },

    deepgaze: {
        id: 'deepgaze',
        name: 'DeepGaze IIE (Benchmark MIT Líder)',
        badge: 'Fijación Biológica Humana',
        description: 'Líder del MIT/Tübingen Benchmark para imágenes naturales. Predice la densidad probabilística de la mirada humana foveal, saturación de color y sesgo central.',
        target: 'Fotografía Natural y Foveación Biológica',
        calculatePixelScore: (ctx) => {
            return (ctx.localContrast * 1.35 + ctx.regionalContrast * 1.25) * ctx.contrastWeight +
                   (ctx.colorPop * 1.8) +
                   (ctx.centerBias * ctx.centerPrior * 2.6) +
                   (ctx.edge * ctx.edgeWeight * 0.35);
        }
    },

    transalnet: {
        id: 'transalnet',
        name: 'TranSalNet (Vision Transformer)',
        badge: 'Relaciones Globales',
        description: 'Utiliza Transformers para modelar dependencias espaciales de largo alcance. Detecta figuras aisladas, equilibrio entre columnas y distribución del lienzo.',
        target: 'Composiciones Complejas y Multi-Columna',
        calculatePixelScore: (ctx) => {
            const isolation = Math.abs(ctx.lum - ctx.meanLum) * 1.45;
            return (ctx.regionalContrast * 1.55 + isolation * 1.2) * ctx.contrastWeight +
                   (ctx.edge * ctx.edgeWeight * 0.85) +
                   (ctx.colorPop * 1.35) +
                   ((ctx.topBias * 0.6 + ctx.centerBias * 0.4) * (ctx.readingBias + ctx.centerPrior));
        }
    },

    gaze3s: {
        id: 'gaze3s',
        name: 'Prueba 3 Segundos (Congreso a 2m)',
        badge: 'Gancho a Distancia · Congreso',
        description: 'Simula a un asistente caminando a 2 metros durante 3 segundos. Amplifica macro-bloques de alto contraste, gráficos grandes y títulos, ignorando texto denso pequeño.',
        target: 'Impacto Inicial en Congresos Científicos',
        calculatePixelScore: (ctx) => {
            const macroBlock = ctx.regionalContrast * 2.4 + Math.abs(ctx.macroLum - ctx.meanLum) * 1.65;
            const coarsePop = ctx.fullColorPop * 1.65;
            // Penaliza ruido de bordes muy finos sin respaldo de macro-contraste
            const fineTextPenalty = (ctx.edge > 0.25 && ctx.regionalContrast < 0.08) ? 0.55 : 1.0;
            return (macroBlock * ctx.contrastWeight + coarsePop + ctx.topBias * ctx.readingBias * 1.5) * fineTextPenalty;
        }
    },

    fpattern: {
        id: 'fpattern',
        name: 'Escaneo Académico F-Pattern / Z-Flow',
        badge: 'Eye-Tracking Documental',
        description: 'Modela el recorrido real de lectura en F y Z (Nielsen Norman Group). Da prioridad a la cabecera, margen izquierdo de entrada de columnas y subtítulos destacados.',
        target: 'Flujo de Lectura en Pósters e Infografías',
        calculatePixelScore: (ctx) => {
            const fWeight = ctx.fPattern * (0.8 + ctx.readingBias * 1.5);
            const headingSignal = (ctx.edge * 1.15 + ctx.regionalContrast * 1.6) * ctx.contrastWeight;
            return headingSignal * (0.55 + fWeight * 0.9) + ctx.colorPop * 0.85 + fWeight * 0.7;
        }
    },

    salicon: {
        id: 'salicon',
        name: 'SALICON (Pop-Out Multiescala)',
        badge: 'Oponencia Cromática 4 Canales',
        description: 'Inspirado en Saliency in Context. Combina oponencia cromática completa (Rojo-Verde, Verde-Rojo, Azul-Amarillo, Amarillo-Azul) con contraste local/regional para hallar pop-out visual.',
        target: 'Detección de Callouts, Badges y Gráficos Coloridos',
        calculatePixelScore: (ctx) => {
            const multiScale = ctx.localContrast * 1.2 + ctx.regionalContrast * 1.65;
            return multiScale * ctx.contrastWeight +
                   ctx.fullColorPop * 2.05 +
                   ctx.edge * ctx.edgeWeight * 0.7 +
                   ctx.centerBias * ctx.centerPrior * 0.6;
        }
    },

    emlnet: {
        id: 'emlnet',
        name: 'EML-NET (Jerarquía Figuras vs. Texto)',
        badge: 'Separación Figura / Párrafo',
        description: 'Evalúa la densidad estructural multiescala y el aislamiento respecto al fondo blanco (whitespace), resaltando diagramas limpios y penalizando bloques de texto apretados.',
        target: 'Auditoría de Diagramas y Espacios en Blanco',
        calculatePixelScore: (ctx) => {
            const figureEdge = Math.min(1.2, ctx.edge) * (0.7 + ctx.regionalContrast * 2.2);
            const isolation = Math.abs(ctx.lum - ctx.meanLum) * 1.35;
            return (figureEdge * ctx.edgeWeight * 0.95) +
                   (isolation * ctx.contrastWeight * 1.15) +
                   (ctx.fullColorPop * 1.1) +
                   (ctx.topBias * ctx.readingBias * 0.85);
        }
    }
};
