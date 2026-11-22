/**
 * ui-controller.js - Controlador de Interfaz de Usuario de NaSight Studio
 * Maneja eventos, 8 modelos, ajuste fino de pesos, zoom/pan, Split A/B,
 * simulador de daltonismo, Áreas de Interés (AOI), Test 3s, i18n y exportación PNG.
 */

window.SaliencyApp = window.SaliencyApp || {};

class UIController {
    constructor() {
        this.engine = new window.SaliencyApp.SaliencyEngine();
        this.generator = window.SaliencyApp.PosterGenerator;
        this.visionSim = window.SaliencyApp.VisionSimulator;
        this.themeManager = window.SaliencyApp.ThemeManager ? new window.SaliencyApp.ThemeManager() : null;
        this.i18n = window.SaliencyApp.I18nManager ? new window.SaliencyApp.I18nManager() : null;

        if (this.themeManager) {
            this.themeManager.onThemeChange = () => this.renderOverlayLayer();
        }

        this.sourceImage = null;
        this.compareImage = null;
        this.saliencyResult = null;
        this.compareResult = null;

        this.options = {
            modelId: 'consenso',
            colormap: 'turbo',
            opacity: 0.65,
            blurRadius: 16,
            contrastWeight: 1.0,
            edgeWeight: 1.2,
            readingBias: 0.4,
            centerPrior: 0.2,
            threshold: 0.0,
            spotlightMode: false,
            showScanpath: true,
            visionMode: 'normal'
        };

        // Estado de Zoom, Pan, Split A/B, AOIs y Test 3s
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };

        this.splitActive = false;
        this.splitRatio = 0.5;
        this.isDraggingSplit = false;

        this.aoiMode = false;
        this.isDrawingAoi = false;
        this.aoiStart = { nx: 0, ny: 0 };
        this.aoiDraft = null;
        this.aois = [];
        this.aoiCounter = 1;

        this.testTimerId = null;

        this.initElements();
        this.bindEvents();
        this.updateThermalLegend();
        this.loadSample();
    }

    initElements() {
        this.dom = {
            dropZone: document.getElementById('dropZone'),
            viewerStage: document.getElementById('viewerStage'),
            canvasWrapper: document.getElementById('canvasWrapper'),
            fileInput: document.getElementById('fileInput'),
            fileInputB: document.getElementById('fileInputB'),
            btnSample: document.getElementById('btnSample'),
            btnExport: document.getElementById('btnExport'),
            btnLangToggle: document.getElementById('btnLangToggle'),

            modelSelect: document.getElementById('modelSelect'),
            modelBadge: document.getElementById('modelBadge'),
            modelDesc: document.getElementById('modelDesc'),

            sliderContrast: document.getElementById('sliderContrast'),
            valContrast: document.getElementById('valContrast'),
            sliderEdge: document.getElementById('sliderEdge'),
            valEdge: document.getElementById('valEdge'),
            sliderReading: document.getElementById('sliderReading'),
            valReading: document.getElementById('valReading'),
            sliderCenter: document.getElementById('sliderCenter'),
            valCenter: document.getElementById('valCenter'),
            btnResetWeights: document.getElementById('btnResetWeights'),

            colormapSelect: document.getElementById('colormapSelect'),
            sliderOpacity: document.getElementById('sliderOpacity'),
            valOpacity: document.getElementById('valOpacity'),
            sliderBlur: document.getElementById('sliderBlur'),
            valBlur: document.getElementById('valBlur'),
            sliderThreshold: document.getElementById('sliderThreshold'),
            valThreshold: document.getElementById('valThreshold'),
            checkScanpath: document.getElementById('checkScanpath'),
            checkSpotlight: document.getElementById('checkSpotlight'),

            visionSimSelect: document.getElementById('visionSimSelect'),
            btnRun3sTest: document.getElementById('btnRun3sTest'),
            btnToggleSplit: document.getElementById('btnToggleSplit'),
            btnViewerSplit: document.getElementById('btnViewerSplit'),
            splitDivider: document.getElementById('splitDivider'),

            btnZoomIn: document.getElementById('btnZoomIn'),
            btnZoomOut: document.getElementById('btnZoomOut'),
            btnZoomReset: document.getElementById('btnZoomReset'),
            zoomLabel: document.getElementById('zoomLabel'),

            btnDrawAoi: document.getElementById('btnDrawAoi'),
            btnClearAoi: document.getElementById('btnClearAoi'),
            aoiList: document.getElementById('aoiList'),

            countdownOverlay: document.getElementById('countdownOverlay'),
            countdownTime: document.getElementById('countdownTime'),
            thermalGradientBar: document.getElementById('thermalGradientBar'),

            baseCanvas: document.getElementById('baseCanvas'),
            compareCanvas: document.getElementById('compareCanvas'),
            heatCanvas: document.getElementById('heatCanvas'),
            scanpathCanvas: document.getElementById('scanpathCanvas'),

            metricVerdict: document.getElementById('metricVerdict'),
            metricHeader: document.getElementById('metricHeader'),
            metricDominance: document.getElementById('metricDominance'),
            metricClutter: document.getElementById('metricClutter'),
            metricClutterBar: document.getElementById('metricClutterBar'),
            hotspotsList: document.getElementById('hotspotsList'),
            adviceList: document.getElementById('adviceList'),

            abCompareBox: document.getElementById('abCompareBox'),
            abHeaderComp: document.getElementById('abHeaderComp'),
            abDomComp: document.getElementById('abDomComp'),
            abClutterComp: document.getElementById('abClutterComp')
        };
    }

    bindEvents() {
        window.addEventListener('dragover', (e) => e.preventDefault());
        window.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                this.loadFile(e.dataTransfer.files[0], false);
            }
        });

        window.addEventListener('paste', (e) => {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            for (const item of items) {
                if (item.type.indexOf('image') !== -1) {
                    const blob = item.getAsFile();
                    this.loadFile(blob, false);
                    break;
                }
            }
        });

        if (this.dom.btnLangToggle && this.i18n) {
            this.dom.btnLangToggle.addEventListener('click', () => {
                this.i18n.toggle();
                this.updateAOIUI();
            });
        }

        this.dom.fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.loadFile(e.target.files[0], false);
            }
        });

        if (this.dom.fileInputB) {
            this.dom.fileInputB.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.loadFile(e.target.files[0], true);
                }
            });
        }

        this.dom.btnSample.addEventListener('click', () => this.loadSample());

        this.dom.modelSelect.addEventListener('change', (e) => {
            this.options.modelId = e.target.value;
            this.recompute();
        });

        this.dom.colormapSelect.addEventListener('change', (e) => {
            this.options.colormap = e.target.value;
            this.updateThermalLegend();
            this.renderHeatmapOnly();
        });

        this.dom.sliderOpacity.addEventListener('input', (e) => {
            this.options.opacity = parseFloat(e.target.value);
            this.dom.valOpacity.textContent = Math.round(this.options.opacity * 100) + '%';
            this.renderHeatmapOnly();
        });

        this.dom.sliderBlur.addEventListener('input', (e) => {
            this.options.blurRadius = parseInt(e.target.value, 10);
            this.dom.valBlur.textContent = this.options.blurRadius + ' px';
            this.recompute();
        });

        this.dom.sliderThreshold.addEventListener('input', (e) => {
            this.options.threshold = parseFloat(e.target.value);
            this.dom.valThreshold.textContent = Math.round(this.options.threshold * 100) + '%';
            this.recompute();
        });

        // 4 Sliders de ajuste fino del modelo
        const weightBindings = [
            ['sliderContrast', 'valContrast', 'contrastWeight'],
            ['sliderEdge', 'valEdge', 'edgeWeight'],
            ['sliderReading', 'valReading', 'readingBias'],
            ['sliderCenter', 'valCenter', 'centerPrior']
        ];
        weightBindings.forEach(([sliderKey, valKey, optKey]) => {
            const slider = this.dom[sliderKey];
            if (!slider) return;
            slider.addEventListener('input', (e) => {
                const v = parseFloat(e.target.value);
                this.options[optKey] = v;
                this.dom[valKey].textContent = v.toFixed(2);
                this.recompute();
            });
        });

        if (this.dom.btnResetWeights) {
            this.dom.btnResetWeights.addEventListener('click', () => this.resetModelWeights());
        }

        this.dom.checkScanpath.addEventListener('change', (e) => {
            this.options.showScanpath = e.target.checked;
            this.renderOverlayLayer();
        });

        this.dom.checkSpotlight.addEventListener('change', (e) => {
            this.options.spotlightMode = e.target.checked;
            this.renderHeatmapOnly();
        });

        if (this.dom.visionSimSelect) {
            this.dom.visionSimSelect.addEventListener('change', (e) => {
                this.options.visionMode = e.target.value;
                this.renderBaseImage();
            });
        }

        if (this.dom.btnRun3sTest) {
            this.dom.btnRun3sTest.addEventListener('click', () => this.runThreeSecondTest());
        }

        [this.dom.btnToggleSplit, this.dom.btnViewerSplit].forEach((btn) => {
            if (btn) btn.addEventListener('click', () => this.toggleSplitView());
        });

        this.bindViewerInteractions();
        this.dom.btnExport.addEventListener('click', () => this.exportCombinedPNG());
    }

    bindViewerInteractions() {
        // Zoom botones y rueda
        if (this.dom.btnZoomIn) {
            this.dom.btnZoomIn.addEventListener('click', () => this.setZoom(this.zoom + 0.2));
        }
        if (this.dom.btnZoomOut) {
            this.dom.btnZoomOut.addEventListener('click', () => this.setZoom(this.zoom - 0.2));
        }
        if (this.dom.btnZoomReset) {
            this.dom.btnZoomReset.addEventListener('click', () => this.resetZoomPan());
        }

        if (this.dom.dropZone) {
            this.dom.dropZone.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 0.12 : -0.12;
                this.setZoom(this.zoom + delta);
            }, { passive: false });
        }

        // Toggle Dibujar AOI
        if (this.dom.btnDrawAoi) {
            this.dom.btnDrawAoi.addEventListener('click', () => {
                this.aoiMode = !this.aoiMode;
                this.dom.btnDrawAoi.classList.toggle('active', this.aoiMode);
                this.dom.canvasWrapper.classList.toggle('aoi-drawing', this.aoiMode);
            });
        }

        if (this.dom.btnClearAoi) {
            this.dom.btnClearAoi.addEventListener('click', () => {
                this.aois = [];
                this.aoiCounter = 1;
                this.updateAOIUI();
                this.renderOverlayLayer();
            });
        }

        // Split Divider Drag
        if (this.dom.splitDivider) {
            this.dom.splitDivider.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.isDraggingSplit = true;
            });
        }

        // Canvas MouseDown: Dibujar AOI o Pan
        this.dom.canvasWrapper.addEventListener('mousedown', (e) => {
            if (this.isDraggingSplit) return;

            if (this.aoiMode) {
                const pt = this.getNormalizedCoords(e);
                this.isDrawingAoi = true;
                this.aoiStart = pt;
                this.aoiDraft = { nx: pt.nx, ny: pt.ny, nw: 0, nh: 0 };
                this.renderOverlayLayer();
                return;
            }

            this.isPanning = true;
            this.panStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isDraggingSplit && this.splitActive) {
                const rect = this.dom.canvasWrapper.getBoundingClientRect();
                if (rect.width > 0) {
                    this.splitRatio = Math.min(0.98, Math.max(0.02, (e.clientX - rect.left) / rect.width));
                    this.applySplitClip();
                }
                return;
            }

            if (this.isDrawingAoi) {
                const pt = this.getNormalizedCoords(e);
                const nx = Math.min(this.aoiStart.nx, pt.nx);
                const ny = Math.min(this.aoiStart.ny, pt.ny);
                const nw = Math.abs(pt.nx - this.aoiStart.nx);
                const nh = Math.abs(pt.ny - this.aoiStart.ny);
                this.aoiDraft = { nx, ny, nw, nh };
                this.renderOverlayLayer();
                return;
            }

            if (this.isPanning) {
                this.panX = e.clientX - this.panStart.x;
                this.panY = e.clientY - this.panStart.y;
                this.applyTransform();
            }
        });

        window.addEventListener('mouseup', () => {
            this.isDraggingSplit = false;
            this.isPanning = false;

            if (this.isDrawingAoi) {
                this.isDrawingAoi = false;
                if (this.aoiDraft && this.aoiDraft.nw > 0.02 && this.aoiDraft.nh > 0.02) {
                    const num = this.aoiCounter++;
                    this.aois.push({
                        id: 'aoi-' + num,
                        label: `AOI #${num}`,
                        ...this.aoiDraft
                    });
                    this.updateAOIUI();
                }
                this.aoiDraft = null;
                this.renderOverlayLayer();
            }
        });
    }

    getNormalizedCoords(e) {
        const rect = this.dom.canvasWrapper.getBoundingClientRect();
        const nx = Math.min(1, Math.max(0, (e.clientX - rect.left) / (rect.width || 1)));
        const ny = Math.min(1, Math.max(0, (e.clientY - rect.top) / (rect.height || 1)));
        return { nx, ny };
    }

    setZoom(nextZoom) {
        this.zoom = Math.min(3.0, Math.max(0.5, Math.round(nextZoom * 100) / 100));
        if (this.dom.zoomLabel) {
            this.dom.zoomLabel.textContent = Math.round(this.zoom * 100) + '%';
        }
        this.applyTransform();
    }

    resetZoomPan() {
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        if (this.dom.zoomLabel) this.dom.zoomLabel.textContent = '100%';
        this.applyTransform();
    }

    applyTransform() {
        if (this.dom.viewerStage) {
            this.dom.viewerStage.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
        }
    }

    resetModelWeights() {
        this.options.contrastWeight = 1.0;
        this.options.edgeWeight = 1.2;
        this.options.readingBias = 0.4;
        this.options.centerPrior = 0.2;

        if (this.dom.sliderContrast) {
            this.dom.sliderContrast.value = 1.0;
            this.dom.valContrast.textContent = '1.00';
        }
        if (this.dom.sliderEdge) {
            this.dom.sliderEdge.value = 1.2;
            this.dom.valEdge.textContent = '1.20';
        }
        if (this.dom.sliderReading) {
            this.dom.sliderReading.value = 0.4;
            this.dom.valReading.textContent = '0.40';
        }
        if (this.dom.sliderCenter) {
            this.dom.sliderCenter.value = 0.2;
            this.dom.valCenter.textContent = '0.20';
        }
        this.recompute();
    }

    loadFile(file, isVersionB = false) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                if (isVersionB) {
                    this.compareImage = img;
                    if (!this.splitActive) this.toggleSplitView(true);
                    this.renderBaseImage();
                    this.recomputeCompare();
                } else {
                    this.sourceImage = img;
                    this.engine.invalidateCache();
                    this.resetZoomPan();
                    this.renderBaseImage();
                    this.recompute();
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    loadSample() {
        const sampleCanvas = this.generator.createSamplePoster();
        this.sourceImage = sampleCanvas;
        this.compareImage = null;
        if (this.dom.abCompareBox) this.dom.abCompareBox.classList.add('hidden');
        if (this.dom.compareCanvas) this.dom.compareCanvas.style.display = 'none';
        this.engine.invalidateCache();
        this.resetZoomPan();
        this.renderBaseImage();
        this.recompute();
    }

    renderBaseImage() {
        if (!this.sourceImage) return;
        const w = this.sourceImage.width || this.sourceImage.naturalWidth;
        const h = this.sourceImage.height || this.sourceImage.naturalHeight;

        if (this.visionSim) {
            this.visionSim.renderSimulated(this.dom.baseCanvas, this.sourceImage, this.options.visionMode);
        } else {
            this.dom.baseCanvas.width = w;
            this.dom.baseCanvas.height = h;
            this.dom.baseCanvas.getContext('2d').drawImage(this.sourceImage, 0, 0);
        }

        if (this.compareImage && this.dom.compareCanvas) {
            this.dom.compareCanvas.style.display = 'block';
            if (this.visionSim) {
                this.visionSim.renderSimulated(this.dom.compareCanvas, this.compareImage, this.options.visionMode);
            } else {
                this.dom.compareCanvas.width = w;
                this.dom.compareCanvas.height = h;
                this.dom.compareCanvas.getContext('2d').drawImage(this.compareImage, 0, 0, w, h);
            }
        } else if (this.dom.compareCanvas) {
            this.dom.compareCanvas.style.display = 'none';
        }

        this.dom.heatCanvas.width = w;
        this.dom.heatCanvas.height = h;
        this.dom.scanpathCanvas.width = w;
        this.dom.scanpathCanvas.height = h;
        this.applySplitClip();
    }

    recompute() {
        if (!this.sourceImage) return;

        this.saliencyResult = this.engine.process(this.sourceImage, this.options);

        const model = this.saliencyResult.modelInfo;
        this.dom.modelBadge.textContent = model.badge;
        this.dom.modelDesc.textContent = model.description;

        this.renderHeatmapOnly();
        this.renderOverlayLayer();
        this.updateMetricsUI();
        this.updateAOIUI();

        if (this.compareImage) {
            this.recomputeCompare();
        }
    }

    recomputeCompare() {
        if (!this.compareImage || !this.saliencyResult) return;
        // Procesar sin pisar la caché principal de sourceImage
        const prevCache = {
            src: this.engine._cachedSource,
            ch: this.engine._cachedChannels,
            w: this.engine._cachedWidth,
            h: this.engine._cachedHeight
        };
        this.compareResult = this.engine.process(this.compareImage, this.options);
        // Restaurar caché principal
        this.engine._cachedSource = prevCache.src;
        this.engine._cachedChannels = prevCache.ch;
        this.engine._cachedWidth = prevCache.w;
        this.engine._cachedHeight = prevCache.h;

        if (this.dom.abCompareBox) {
            const mA = this.saliencyResult.metrics;
            const mB = this.compareResult.metrics;
            this.dom.abHeaderComp.textContent = `${mA.headerShare}% vs ${mB.headerShare}%`;
            this.dom.abDomComp.textContent = `${mA.focalDominance}% vs ${mB.focalDominance}%`;
            this.dom.abClutterComp.textContent = `${mA.cognitiveLoad} vs ${mB.cognitiveLoad}`;
            this.dom.abCompareBox.classList.remove('hidden');
        }
    }

    toggleSplitView(forceState = null) {
        this.splitActive = forceState !== null ? forceState : !this.splitActive;
        if (this.dom.btnToggleSplit) this.dom.btnToggleSplit.classList.toggle('active', this.splitActive);
        if (this.dom.btnViewerSplit) this.dom.btnViewerSplit.classList.toggle('active', this.splitActive);
        if (this.dom.splitDivider) this.dom.splitDivider.classList.toggle('active', this.splitActive);
        this.applySplitClip();
    }

    applySplitClip() {
        const pct = Math.round(this.splitRatio * 1000) / 10;
        if (this.dom.splitDivider) {
            this.dom.splitDivider.style.left = pct + '%';
        }

        if (!this.splitActive) {
            this.dom.heatCanvas.style.clipPath = 'none';
            this.dom.scanpathCanvas.style.clipPath = 'none';
            if (this.dom.compareCanvas) this.dom.compareCanvas.style.clipPath = 'none';
            return;
        }

        if (this.compareImage && this.dom.compareCanvas) {
            // Versión A a la izquierda, Versión B a la derecha
            this.dom.compareCanvas.style.clipPath = `inset(0 0 0 ${pct}%)`;
            this.dom.heatCanvas.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
            this.dom.scanpathCanvas.style.clipPath = 'none';
        } else {
            // Original limpio a la izquierda, Mapa de Calor + Scanpath a la derecha
            this.dom.heatCanvas.style.clipPath = `inset(0 0 0 ${pct}%)`;
            this.dom.scanpathCanvas.style.clipPath = `inset(0 0 0 ${pct}%)`;
        }
    }

    runThreeSecondTest() {
        if (!this.sourceImage) return;
        if (this.testTimerId) {
            clearInterval(this.testTimerId);
            this.testTimerId = null;
        }

        // Ocultar mapa durante 3.0s y luego activar Spotlight real
        const prevOpacity = this.options.opacity;
        const prevScanpath = this.options.showScanpath;
        this.dom.heatCanvas.style.opacity = '0';
        this.dom.scanpathCanvas.style.opacity = '0';

        if (this.dom.countdownOverlay) {
            this.dom.countdownOverlay.classList.remove('hidden');
        }

        let remaining = 3.0;
        if (this.dom.countdownTime) {
            this.dom.countdownTime.textContent = remaining.toFixed(1) + ' s';
        }

        this.testTimerId = setInterval(() => {
            remaining = Math.max(0, remaining - 0.1);
            if (this.dom.countdownTime) {
                this.dom.countdownTime.textContent = remaining.toFixed(1) + ' s';
            }

            if (remaining <= 0.01) {
                clearInterval(this.testTimerId);
                this.testTimerId = null;
                if (this.dom.countdownOverlay) {
                    this.dom.countdownOverlay.classList.add('hidden');
                }
                this.dom.heatCanvas.style.opacity = '1';
                this.dom.scanpathCanvas.style.opacity = '1';
                this.options.opacity = prevOpacity;
                this.options.showScanpath = prevScanpath;
                this.options.spotlightMode = true;
                if (this.dom.checkSpotlight) this.dom.checkSpotlight.checked = true;
                this.renderHeatmapOnly();
                this.renderOverlayLayer();
            }
        }, 100);
    }

    updateThermalLegend() {
        if (!this.dom.thermalGradientBar || !window.SaliencyApp.ColorMaps) return;
        const lut = window.SaliencyApp.ColorMaps[this.options.colormap] || window.SaliencyApp.ColorMaps.turbo;
        const stops = [];
        for (let s = 0; s <= 10; s++) {
            const idx = Math.min(255, Math.round((s / 10) * 255)) * 3;
            stops.push(`rgb(${lut[idx]}, ${lut[idx + 1]}, ${lut[idx + 2]}) ${s * 10}%`);
        }
        this.dom.thermalGradientBar.style.background = `linear-gradient(90deg, ${stops.join(', ')})`;
    }

    renderHeatmapOnly() {
        if (!this.saliencyResult) return;
        this.engine.renderHeatmap(
            this.dom.heatCanvas,
            this.saliencyResult.normalizedMap,
            this.saliencyResult.width,
            this.saliencyResult.height,
            this.options
        );
    }

    renderOverlayLayer() {
        if (!this.saliencyResult) return;
        const canvas = this.dom.scanpathCanvas;
        const w = this.saliencyResult.width;
        const h = this.saliencyResult.height;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);

        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--fox-orange').trim() || '#FF6B35';

        // 1. Dibujar trayectoria ocular sacádica (1 -> 2 -> 3)
        if (this.options.showScanpath && this.saliencyResult.scanpath.length) {
            const path = this.saliencyResult.scanpath;

            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            path.forEach((pt, idx) => {
                if (idx === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();
            ctx.setLineDash([]);

            path.forEach((pt) => {
                const radius = 22;
                ctx.fillStyle = 'rgba(14, 16, 21, 0.45)';
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, radius + 7, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = accentColor;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#0e1015';
                ctx.lineWidth = 2.5;
                ctx.stroke();

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, radius - 2, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 16px system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(pt.order.toString(), pt.x, pt.y);
            });
        }

        // 2. Dibujar cajas AOI guardadas + borrador en curso
        const aoiStats = this.engine.computeAOIMetrics(
            this.saliencyResult.normalizedMap,
            w,
            h,
            this.aois
        );

        aoiStats.forEach((aoi) => {
            const rx = aoi.nx * w;
            const ry = aoi.ny * h;
            const rw = aoi.nw * w;
            const rh = aoi.nh * h;

            ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
            ctx.fillRect(rx, ry, rw, rh);

            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(rx, ry, rw, rh);

            const tag = `${aoi.label}: ${aoi.sharePct}%`;
            ctx.font = 'bold 13px system-ui, sans-serif';
            const tw = ctx.measureText(tag).width + 14;
            const ty = ry > 26 ? ry - 24 : ry + 4;

            ctx.fillStyle = '#0e1015';
            ctx.fillRect(rx, ty, tw, 22);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(rx, ty, tw, 22);

            ctx.fillStyle = '#f3f4f8';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(tag, rx + 7, ty + 11);
        });

        if (this.aoiDraft && this.aoiDraft.nw > 0.005) {
            ctx.fillStyle = 'rgba(255, 107, 53, 0.16)';
            ctx.fillRect(this.aoiDraft.nx * w, this.aoiDraft.ny * h, this.aoiDraft.nw * w, this.aoiDraft.nh * h);
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 4]);
            ctx.strokeRect(this.aoiDraft.nx * w, this.aoiDraft.ny * h, this.aoiDraft.nw * w, this.aoiDraft.nh * h);
            ctx.setLineDash([]);
        }
    }

    updateAOIUI() {
        if (!this.dom.aoiList || !this.saliencyResult) return;
        this.dom.aoiList.innerHTML = '';

        if (!this.aois.length) {
            const li = document.createElement('li');
            li.className = 'aoi-empty';
            const lang = this.i18n ? this.i18n.lang : 'es';
            li.textContent = (window.SaliencyApp.I18N && window.SaliencyApp.I18N[lang].aoi_empty) ||
                'Activa "Dibujar AOI" en el visor y arrastra sobre cualquier bloque para medir su % de atención.';
            this.dom.aoiList.appendChild(li);
            return;
        }

        const stats = this.engine.computeAOIMetrics(
            this.saliencyResult.normalizedMap,
            this.saliencyResult.width,
            this.saliencyResult.height,
            this.aois
        );

        stats.forEach((aoi) => {
            const li = document.createElement('li');
            li.className = 'aoi-item';
            li.innerHTML = `
                <div class="aoi-item-left">
                    <span class="aoi-item-name">${aoi.label}</span>
                    <span class="aoi-item-meta">Pico: ${aoi.peakPct}% • Densidad: ${aoi.avgDensity}%</span>
                </div>
                <div class="aoi-item-right">
                    <span class="badge-score">${aoi.sharePct}%</span>
                    <button type="button" class="aoi-del-btn" title="Eliminar AOI">
                        <img class="px-icon" src="assets/icons/trash.png" width="14" height="14" alt="x">
                    </button>
                </div>
            `;
            li.querySelector('.aoi-del-btn').addEventListener('click', () => {
                this.aois = this.aois.filter((item) => item.id !== aoi.id);
                this.updateAOIUI();
                this.renderOverlayLayer();
            });
            this.dom.aoiList.appendChild(li);
        });
    }

    updateMetricsUI() {
        const m = this.saliencyResult.metrics;

        this.dom.metricVerdict.textContent = m.verdict;
        this.dom.metricVerdict.className = 'metric-status ' + m.status;

        this.dom.metricHeader.textContent = m.headerShare + '%';
        this.dom.metricDominance.textContent = m.focalDominance + '%';
        this.dom.metricClutter.textContent = m.cognitiveLoad + '/100';
        if (this.dom.metricClutterBar) {
            this.dom.metricClutterBar.style.width = Math.min(100, Math.max(4, m.cognitiveLoad)) + '%';
        }

        this.dom.hotspotsList.innerHTML = '';
        this.saliencyResult.hotspots.slice(0, 4).forEach((h, i) => {
            const li = document.createElement('li');
            li.innerHTML = `<span><strong>#${i + 1}</strong> Foco (${h.nx}%, ${h.ny}%)</span> <span class="badge-score">${h.score}%</span>`;
            this.dom.hotspotsList.appendChild(li);
        });

        this.dom.adviceList.innerHTML = '';
        m.advice.forEach((adv) => {
            const li = document.createElement('li');
            li.textContent = adv;
            this.dom.adviceList.appendChild(li);
        });
    }

    exportCombinedPNG() {
        if (!this.sourceImage) return;

        const w = this.dom.baseCanvas.width;
        const h = this.dom.baseCanvas.height;

        const out = document.createElement('canvas');
        out.width = w;
        out.height = h;
        const ctx = out.getContext('2d');

        ctx.drawImage(this.dom.baseCanvas, 0, 0, w, h);
        ctx.drawImage(this.dom.heatCanvas, 0, 0, w, h);
        if (this.options.showScanpath || this.aois.length > 0) {
            ctx.drawImage(this.dom.scanpathCanvas, 0, 0, w, h);
        }

        const link = document.createElement('a');
        link.download = `NaSight-Mapa-Calor-${this.options.modelId}.png`;
        link.href = out.toDataURL('image/png');
        link.click();
    }
}

window.SaliencyApp.UIController = UIController;
