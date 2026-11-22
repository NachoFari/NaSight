/**
 * theme-manager.js - Motor de 20 Temas Visuales NaSuite para NaSight
 * 100% Portable (file:///), sin dependencias externas, adjunto a window.SaliencyApp.
 * Comparte la clave localStorage 'natex_theme' y 'nasight_theme' para sincronizarse
 * con NaTex Studio, NaSpire Studio y NaSuite Launcher.
 */

window.SaliencyApp = window.SaliencyApp || {};

const NASIGHT_THEMES = [
    { id: 'fox',      name: 'Zorro Clásico',      mode: 'dark',  accent: '#FF6B35', mascot: 'assets/icons/mascots/fox.png' },
    { id: 'panther',  name: 'Pantera OLED',       mode: 'dark',  accent: '#94A3B8', mascot: 'assets/icons/mascots/panther.png' },
    { id: 'owl',      name: 'Búho Académico',     mode: 'dark',  accent: '#FBBF24', mascot: 'assets/icons/mascots/owl.png' },
    { id: 'cosmos',   name: 'Cosmos Estelar',     mode: 'dark',  accent: '#8B5CF6', mascot: 'assets/icons/mascots/cosmos.png' },
    { id: 'frog',     name: 'Ranita Matcha Zen',  mode: 'dark',  accent: '#10B981', mascot: 'assets/icons/mascots/frog.png' },
    { id: 'penguin',  name: 'Pingüino Glaciar',   mode: 'dark',  accent: '#06B6D4', mascot: 'assets/icons/mascots/penguin.png' },
    { id: 'whale',    name: 'Océano Abisal',      mode: 'dark',  accent: '#38BDF8', mascot: 'assets/icons/mascots/whale.png' },
    { id: 'wolf',     name: 'Lobo Ártico',        mode: 'dark',  accent: '#60A5FA', mascot: 'assets/icons/mascots/wolf.png' },
    { id: 'octopus',  name: 'Pulpo Synthwave',    mode: 'dark',  accent: '#E879F9', mascot: 'assets/icons/mascots/octopus.png' },
    { id: 'dino',     name: 'Dino Matrix Retro',  mode: 'dark',  accent: '#22C55E', mascot: 'assets/icons/mascots/dino.png' },
    { id: 'panda',    name: 'Panda Bambú',        mode: 'dark',  accent: '#84CC16', mascot: 'assets/icons/mascots/panda.png' },
    { id: 'bee',      name: 'Abejita Dorada',     mode: 'dark',  accent: '#F59E0B', mascot: 'assets/icons/mascots/bee.png' },
    { id: 'lion',     name: 'León Solar',         mode: 'dark',  accent: '#EAB308', mascot: 'assets/icons/mascots/lion.png' },
    { id: 'coffee',   name: 'Café de Otoño',      mode: 'dark',  accent: '#D97706', mascot: 'assets/icons/mascots/coffee.png' },
    { id: 'maple',    name: 'Hoja de Otoño',      mode: 'dark',  accent: '#EA580C', mascot: 'assets/icons/mascots/maple.png' },
    { id: 'mushroom', name: 'Bosque Cottagecore', mode: 'dark',  accent: '#EF4444', mascot: 'assets/icons/mascots/mushroom.png' },
    { id: 'bat',      name: 'Murciélago Gótico',  mode: 'dark',  accent: '#E11D48', mascot: 'assets/icons/mascots/bat.png' },
    { id: 'rabbit',   name: 'Conejo Algodón',     mode: 'light', accent: '#EC4899', mascot: 'assets/icons/mascots/rabbit.png' },
    { id: 'sakura',   name: 'Flor de Cerezo',     mode: 'light', accent: '#F472B6', mascot: 'assets/icons/mascots/sakura.png' },
    { id: 'unicorn',  name: 'Unicornio Pastel',   mode: 'light', accent: '#A855F7', mascot: 'assets/icons/mascots/unicorn.png' }
];

class ThemeManager {
    constructor() {
        this.themes = NASIGHT_THEMES;
        this.currentThemeId = this.detectInitialTheme();
        this.applyTheme(this.currentThemeId, false);
        this.initDOM();
    }

    detectInitialTheme() {
        try {
            const params = new URLSearchParams(window.location.search);
            const fromUrl = params.get('theme');
            if (fromUrl && this.getThemeMeta(fromUrl)) {
                return this.getThemeMeta(fromUrl).id;
            }
            const saved = localStorage.getItem('nasight_theme') || localStorage.getItem('natex_theme');
            if (saved && this.getThemeMeta(saved)) {
                return this.getThemeMeta(saved).id;
            }
        } catch (e) {}
        return 'fox';
    }

    getThemeMeta(themeId) {
        if (!themeId) return this.themes[0];
        let norm = String(themeId).toLowerCase().trim();
        if (norm === 'dark') norm = 'fox';
        if (norm === 'light') norm = 'rabbit';
        return this.themes.find((t) => t.id === norm) || this.themes[0];
    }

    applyTheme(themeId, persist = true) {
        const meta = this.getThemeMeta(themeId);
        this.currentThemeId = meta.id;
        document.documentElement.setAttribute('data-theme', meta.id);

        if (persist) {
            try {
                localStorage.setItem('nasight_theme', meta.id);
                localStorage.setItem('natex_theme', meta.id);
            } catch (e) {}
        }

        this.updateActiveUI(meta);

        if (typeof this.onThemeChange === 'function') {
            this.onThemeChange(meta);
        }
    }

    updateActiveUI(meta) {
        const mascotImgs = document.querySelectorAll('.active-theme-mascot');
        mascotImgs.forEach((img) => {
            img.src = meta.mascot;
            img.alt = meta.name;
        });

        const nameLabels = document.querySelectorAll('.active-theme-name');
        nameLabels.forEach((el) => {
            el.textContent = meta.name;
        });

        const grid = document.getElementById('themeSelectorGrid');
        if (grid) {
            grid.querySelectorAll('.theme-card-option').forEach((card) => {
                card.classList.toggle('active', card.getAttribute('data-theme-id') === meta.id);
            });
        }
    }

    initDOM() {
        const btnOpen = document.getElementById('btnThemeModal');
        const btnClose = document.getElementById('btnCloseThemeModal');
        const modal = document.getElementById('themeModalBackdrop');
        const grid = document.getElementById('themeSelectorGrid');

        if (grid) {
            this.renderGrid(grid);
        }

        if (btnOpen && modal) {
            btnOpen.addEventListener('click', () => {
                modal.classList.remove('hidden');
            });
        }

        if (btnClose && modal) {
            btnClose.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        }

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
                modal.classList.add('hidden');
            }
        });

        this.updateActiveUI(this.getThemeMeta(this.currentThemeId));
    }

    renderGrid(container) {
        container.innerHTML = '';
        this.themes.forEach((t) => {
            const card = document.createElement('div');
            card.className = 'theme-card-option' + (t.id === this.currentThemeId ? ' active' : '');
            card.setAttribute('data-theme-id', t.id);

            const modeLabel = t.mode === 'light' ? 'Claro' : 'Oscuro';
            card.innerHTML = `
                <div class="theme-card-mascot">
                    <img class="pixel-mascot-img" src="${t.mascot}" alt="${t.name}" draggable="false">
                </div>
                <span class="theme-card-name">${t.name}</span>
                <div class="theme-card-meta">
                    <span class="theme-card-badge" style="background-color: ${t.accent}; box-shadow: 0 0 6px ${t.accent};"></span>
                    <span class="theme-card-mode">${modeLabel}</span>
                </div>
            `;

            card.addEventListener('click', () => {
                this.applyTheme(t.id, true);
            });

            container.appendChild(card);
        });
    }
}

window.SaliencyApp.NASIGHT_THEMES = NASIGHT_THEMES;
window.SaliencyApp.ThemeManager = ThemeManager;
