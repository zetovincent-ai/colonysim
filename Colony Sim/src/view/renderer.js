import { HexMath } from '../world/hexMath.js';
import { WorldGen } from '../world/worldGen.js';
import { AssetLibrary, BiomeVisuals, UnitVisuals, StructureVisuals } from './visuals/assetLibrary.js'; 
import { GlobalGradients } from './visuals/assets/gradients.js'; 

export const HexRenderer = {
    svgElement: null,
    cameraLayer: null,    
    
    // LAYERS
    groundLayer: null,    
    trunkLayer: null,     
    foliageLayer: null,   
    settlementGroup: null,
    selectionGroup: null,
    highlightGroup: null, 
    unitGroup: null,      
    cursorGroup: null,    
    
    cursor: null,         
    defs: null, 

    // DATA CACHES
    worldDataCache: new Map(), 
    visualCache: new Map(),    
    renderedTiles: new Map(), 

    cameraX: 0,
    cameraY: 0,
    cameraScale: 1,
    
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    lastHoverCoords: { q: null, r: null },

    init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        this.svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svgElement.setAttribute('width', '100%');
        this.svgElement.setAttribute('height', '100%');
        this.svgElement.style.willChange = "transform";
        this.svgElement.style.transform = "translateZ(0)"; 
        
        this.defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        this.defs.innerHTML = GlobalGradients; 
        this.svgElement.appendChild(this.defs);
        
        try { this.initAssets(); } catch (e) { console.error("Asset Init Failed", e); }

        this.cameraLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.svgElement.appendChild(this.cameraLayer);

        // LAYERS
        this.groundLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.cameraLayer.appendChild(this.groundLayer);

        this.trunkLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.trunkLayer.style.pointerEvents = "none";
        this.cameraLayer.appendChild(this.trunkLayer);

        this.foliageLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.foliageLayer.style.pointerEvents = "none";
        this.cameraLayer.appendChild(this.foliageLayer);

        this.settlementGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.settlementGroup.style.pointerEvents = "none"; 
        this.cameraLayer.appendChild(this.settlementGroup);

        this.selectionGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.selectionGroup.style.pointerEvents = "none";
        this.cameraLayer.appendChild(this.selectionGroup);

        this.highlightGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.highlightGroup.style.pointerEvents = "none";
        this.cameraLayer.appendChild(this.highlightGroup);
        
        this.unitGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.unitGroup.style.pointerEvents = "none"; 
        this.cameraLayer.appendChild(this.unitGroup);

        this.cursorGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.cursorGroup.style.pointerEvents = "none";
        this.cameraLayer.appendChild(this.cursorGroup);
        
        this.cursor = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        this.cursor.setAttribute("id", "cursor");
        this.cursor.style.display = "none";
        this.cursorGroup.appendChild(this.cursor);

        container.appendChild(this.svgElement);
        this.makeInteractive(container);
    },

    initAssets() {
        if (!AssetLibrary) return;
        Object.entries(AssetLibrary).forEach(([key, asset]) => {
            if (!asset) return;
            if (asset.type === 'complex' && asset.variations) {
                asset.variations.forEach((variant, i) => {
                    if (variant.trunk) {
                        const t = document.createElementNS("http://www.w3.org/2000/svg", "path");
                        t.setAttribute("id", `${key}_v${i}_trunk`);
                        t.setAttribute("d", variant.trunk);
                        this.defs.appendChild(t);
                    }
                    if (variant.foliage) {
                        const f = document.createElementNS("http://www.w3.org/2000/svg", "path");
                        f.setAttribute("id", `${key}_v${i}_foliage`);
                        f.setAttribute("d", variant.foliage);
                        this.defs.appendChild(f);
                    }
                });
            } else if (asset.type === 'simple' && asset.variations) {
                asset.variations.forEach((d, i) => {
                    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    p.setAttribute("id", `${key}_v${i}`);
                    p.setAttribute("d", d);
                    this.defs.appendChild(p);
                });
            }
        });
    },

    makeInteractive(container) {
        container.style.cursor = "grab";
        container.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.dragStart = { x: e.clientX, y: e.clientY };
            container.style.cursor = "grabbing";
        });
        window.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const dx = e.clientX - this.dragStart.x;
                const dy = e.clientY - this.dragStart.y;
                this.cameraX += dx;
                this.cameraY += dy;
                this.updateCameraTransform();
                this.dragStart = { x: e.clientX, y: e.clientY };
                return;
            }
            this.updateCursor(e.clientX, e.clientY);
        });
        window.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                container.style.cursor = "grab";
                this.renderViewport();
            }
        });
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.handleZoom(e);
        }, { passive: false });
    },

    updateCursor(mouseX, mouseY) {
        const rect = this.svgElement.getBoundingClientRect();
        const worldX = (mouseX - rect.left - this.cameraX) / this.cameraScale;
        const worldY = (mouseY - rect.top - this.cameraY) / this.cameraScale;

        // DEBUGGING: Check if Math exists
        if (!HexMath || !HexMath.pixelToGrid) {
            console.error("Renderer: HexMath or pixelToGrid is missing!");
            return; 
        }
        
        const hex = HexMath.pixelToGrid({ x: worldX, y: worldY });
        const q = hex.q;
        const r = hex.r;

        // Only update if tile changed
        if (q !== this.lastHoverCoords.q || r !== this.lastHoverCoords.r) {
            this.lastHoverCoords = { q, r };
            
            // Dispatch event for UI
            window.dispatchEvent(new CustomEvent('hex-hover', { detail: { q, r } }));

            const tileKey = `${q},${r}`;
            if (this.worldDataCache.has(tileKey)) {
                const center = HexMath.gridToPixel(q, r);
                if (!this.cursor.getAttribute("points")) {
                    const points = HexMath.getHexCorners(0, 0); 
                    this.cursor.setAttribute("points", points);
                }
                this.cursor.style.display = "block";
                this.cursor.setAttribute("transform", `translate(${center.x}, ${center.y})`);
            } else {
                this.cursor.style.display = "none";
            }
        }
    },

    handleZoom(e) {
        const zoomSpeed = 0.001;
        const delta = -e.deltaY * zoomSpeed;
        const oldScale = this.cameraScale;
        let newScale = Math.min(Math.max(0.2, oldScale + delta), 2.5); 

        const rect = this.svgElement.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldX = (mouseX - this.cameraX) / oldScale;
        const worldY = (mouseY - this.cameraY) / oldScale;

        this.cameraX = mouseX - worldX * newScale;
        this.cameraY = mouseY - worldY * newScale;
        this.cameraScale = newScale;

        if (this.cameraScale < 0.8) {
            this.svgElement.classList.add('high-altitude');
        } else {
            this.svgElement.classList.remove('high-altitude');
        }
        this.updateCameraTransform();
    },

    updateCameraTransform() {
        this.cameraLayer.setAttribute("transform", `translate(${this.cameraX}, ${this.cameraY}) scale(${this.cameraScale})`);
        if (!this.renderFrameRequest) {
            this.renderFrameRequest = requestAnimationFrame(() => {
                this.renderViewport();
                this.renderFrameRequest = null;
            });
        }
    },

    centerCameraOn(q, r) {
        const pixel = HexMath.gridToPixel(q, r);
        const rect = this.svgElement.getBoundingClientRect();
        
        // Center pixel in the middle of the screen
        this.cameraX = (rect.width / 2) - (pixel.x * this.cameraScale);
        this.cameraY = (rect.height / 2) - (pixel.y * this.cameraScale);
        
        this.updateCameraTransform();
    },

    renderViewport() {
        const rect = this.svgElement.getBoundingClientRect();
        const minX = (0 - this.cameraX) / this.cameraScale;
        const maxX = (rect.width - this.cameraX) / this.cameraScale;
        const minY = (0 - this.cameraY) / this.cameraScale;
        const maxY = (rect.height - this.cameraY) / this.cameraScale;
        const PAD = 300; 

        this.worldDataCache.forEach((tileData, key) => {
            const centerPixel = HexMath.gridToPixel(tileData.q, tileData.r);
            const inView = (centerPixel.x > minX - PAD && centerPixel.x < maxX + PAD && 
                            centerPixel.y > minY - PAD && centerPixel.y < maxY + PAD);

            const isRendered = this.renderedTiles.has(key);

            if (inView) {
                if (!isRendered) {
                    try {
                        this.drawHex(tileData);
                    } catch (e) {
                        console.error(`❌ DrawHex Failed for ${key}:`, e);
                        this.renderedTiles.set(key, { ground: null });
                    }
                }
            } else {
                if (isRendered) {
                    this.removeHex(key);
                }
            }
        });
    },

    renderInitialView(centerQ, centerR, viewRadius) {
        this.groundLayer.innerHTML = '';
        this.trunkLayer.innerHTML = '';
        this.foliageLayer.innerHTML = '';
        this.settlementGroup.innerHTML = '';
        this.unitGroup.innerHTML = '';
        this.highlightGroup.innerHTML = ''; 
        this.selectionGroup.innerHTML = ''; 
        
        this.renderedTiles.clear();
        this.worldDataCache.clear();

        const allTiles = WorldGen.getWorldMap();
        allTiles.forEach(tile => {
            this.worldDataCache.set(`${tile.q},${tile.r}`, tile);
        });
        
        this.renderViewport();
    },

    drawHex(tileData) {
        const key = `${tileData.q},${tileData.r}`;
        const centerPixel = HexMath.gridToPixel(tileData.q, tileData.r);
        const cornersStr = HexMath.getHexCorners(centerPixel.x, centerPixel.y);

        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.setAttribute("points", cornersStr);
        polygon.setAttribute("id", `hex-${key}`);
        
        let classes = `hex-tile`;
        if (tileData.isExplored) classes += ` type-${tileData.type}`;
        else classes += ` fog`;
        polygon.setAttribute("class", classes);
        
        polygon.addEventListener('click', (e) => {
             const event = new CustomEvent('explore-tile', { detail: tileData });
             window.dispatchEvent(event);
        });
        this.groundLayer.appendChild(polygon);

        let trunkGroup = null;
        let foliageGroup = null;
        
        const config = BiomeVisuals ? BiomeVisuals[tileData.type] : null;
        if (config) {
            let visualData = this.visualCache.get(key);
            
            if (!visualData) {
                const count = Math.floor(Math.random() * (config.count[1] - config.count[0] + 1)) + config.count[0];
                const points = this.generateDistributedPoints(count, config.radius, config.minDist);
                const items = points.map(p => {
                    let assetKey = config.asset;
                    let scaleRange = config.scale; // Default: Use the Biome (Tree) scale

                    // CHECK FOR MIX
                    if (config.mix && Math.random() < config.mix.chance) {
                        assetKey = config.mix.asset;
                        // NEW: If the mix has its own scale, use it!
                        if (config.mix.scale) {
                            scaleRange = config.mix.scale;
                        }
                    }

                    const hasAsset = AssetLibrary && AssetLibrary[assetKey];
                    return {
                        x: p.x, y: p.y,
                        assetKey: assetKey,
                        // Now uses the correct range (Tree vs Grass)
                        scale: Math.random() * (scaleRange[1] - scaleRange[0]) + scaleRange[0],
                        variantIdx: hasAsset ? Math.floor(Math.random() * AssetLibrary[assetKey].variations.length) : 0
                    };
                });
                visualData = { count, items };
                this.visualCache.set(key, visualData);
            }

            trunkGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            foliageGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            
            const transformStr = `translate(${centerPixel.x}, ${centerPixel.y})`;
            trunkGroup.setAttribute("transform", transformStr);
            foliageGroup.setAttribute("transform", transformStr);
            
            if (!tileData.isExplored) {
                trunkGroup.classList.add('hidden');
                foliageGroup.classList.add('hidden');
            }
            trunkGroup.classList.add('decor-layer');
            foliageGroup.classList.add('decor-layer');

            const randColor = (arr, index) => {
                if (!arr || arr.length === 0) return "#fff";
                const safeIndex = Math.abs(tileData.q + tileData.r + index);
                return arr[safeIndex % arr.length];
            };

            visualData.items.forEach((item, idx) => {
                const assetData = AssetLibrary[item.assetKey];
                if (!assetData) return;

                const itemGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
                itemGroup.setAttribute("transform", `translate(${item.x}, ${item.y}) scale(${item.scale})`);

                if (assetData.type === 'complex') {
                    if (!assetData.variations || !assetData.variations[item.variantIdx]) return;
                    const variant = assetData.variations[item.variantIdx];
                    
                    // 1. SHADOW & TRUNK (Go into trunkLayer via itemGroup)
                    if (assetData.shadow && variant.foliage) {
                        const shadow = document.createElementNS("http://www.w3.org/2000/svg", "use");
                        shadow.setAttribute("href", `#${item.assetKey}_v${item.variantIdx}_foliage`);
                        shadow.setAttribute("fill", "black");
                        shadow.setAttribute("fill-opacity", "0.2");
                        shadow.setAttribute("transform", "translate(2, 4)"); 
                        itemGroup.appendChild(shadow);
                    }

                    if (variant.trunk) {
                        const trunk = document.createElementNS("http://www.w3.org/2000/svg", "use");
                        trunk.setAttribute("href", `#${item.assetKey}_v${item.variantIdx}_trunk`);
                        const trunkColor = (assetData.colors && assetData.colors.trunk) ? randColor(assetData.colors.trunk, idx) : "#4e342e";
                        trunk.setAttribute("fill", trunkColor); 
                        trunk.setAttribute("stroke", "none");
                        itemGroup.appendChild(trunk);
                    }
                    trunkGroup.appendChild(itemGroup);

                    // 2. FOLIAGE & TEXTURES (Go into foliageLayer)
                    const itemFolGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
                    itemFolGroup.setAttribute("transform", `translate(${item.x}, ${item.y}) scale(${item.scale})`);

                    // A. The Foliage Blob
                    if (variant.foliage) {
                        const fol = document.createElementNS("http://www.w3.org/2000/svg", "use");
                        fol.setAttribute("href", `#${item.assetKey}_v${item.variantIdx}_foliage`);
                        fol.setAttribute("fill", assetData.colors.foliage ? randColor(assetData.colors.foliage, idx) : "#2ecc71");
                        itemFolGroup.appendChild(fol);
                    }

                    // B. Shadow Texture (Dark Green/Black)
                    if (variant.shadowPath) {
                        const shadowEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
                        shadowEl.setAttribute("d", variant.shadowPath);
                        shadowEl.setAttribute("fill", "none");
                        shadowEl.setAttribute("stroke", "#002200"); // Dark Green
                        shadowEl.setAttribute("stroke-width", "1");
                        shadowEl.setAttribute("stroke-opacity", "0.25");
                        shadowEl.setAttribute("stroke-linecap", "round");
                        itemFolGroup.appendChild(shadowEl);
                    }

                    // C. Highlight Texture (White Sun)
                    if (variant.highlightPath) {
                        const lightEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
                        lightEl.setAttribute("d", variant.highlightPath);
                        lightEl.setAttribute("fill", "none");
                        lightEl.setAttribute("stroke", "#FFFFFF"); // White
                        lightEl.setAttribute("stroke-width", "1");
                        lightEl.setAttribute("stroke-opacity", "0.4");
                        lightEl.setAttribute("stroke-linecap", "round");
                        itemFolGroup.appendChild(lightEl);
                    }

                    if (itemFolGroup.hasChildNodes()) {
                        foliageGroup.appendChild(itemFolGroup);
                    }

                } else if (assetData.type === 'simple') {
                    const el = document.createElementNS("http://www.w3.org/2000/svg", "use");
                    el.setAttribute("href", `#${item.assetKey}_v${item.variantIdx}`);
                    el.setAttribute("stroke", assetData.stroke ? randColor(assetData.stroke, idx) : "#FFF");
                    el.setAttribute("stroke-width", "1.5");
                    el.setAttribute("stroke-linecap", "round");
                    el.setAttribute("fill", "none");
                    itemGroup.appendChild(el);
                    trunkGroup.appendChild(itemGroup);
                }
            });
            this.trunkLayer.appendChild(trunkGroup);
            this.foliageLayer.appendChild(foliageGroup);
        }

        this.renderedTiles.set(key, { 
            ground: polygon, 
            trunk: trunkGroup, 
            foliage: foliageGroup 
        });
    },

    removeHex(key) {
        const els = this.renderedTiles.get(key);
        if (els) {
            if (els.ground) els.ground.remove();
            if (els.trunk) els.trunk.remove();
            if (els.foliage) els.foliage.remove();
            this.renderedTiles.delete(key);
        }
    },

    generateDistributedPoints(count, radius, minDist) {
        const points = [];
        for (let i = 0; i < count; i++) {
            let bestPoint = null;
            for (let attempt = 0; attempt < 10; attempt++) {
                const angle = Math.random() * Math.PI * 2;
                const r = Math.sqrt(Math.random()) * radius; 
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                let tooClose = false;
                for (const p of points) {
                    if (Math.sqrt((p.x - x)**2 + (p.y - y)**2) < minDist) {
                        tooClose = true; break;
                    }
                }
                if (!tooClose) { bestPoint = { x, y }; break; }
            }
            if (bestPoint) points.push(bestPoint);
        }
        return points;
    },

    setVisualFog(q, r, isVisible) {
        const key = `${q},${r}`;
        const tileData = this.worldDataCache.get(key);
        if (!tileData) return;

        const els = this.renderedTiles.get(key);
        if (els && els.ground) {
            const { ground, trunk, foliage } = els;
            if (isVisible) {
                ground.classList.remove('fog');
                ground.classList.add(`type-${tileData.type}`);
                if (trunk) trunk.classList.remove('hidden');
                if (foliage) foliage.classList.remove('hidden');
            } else {
                if (!tileData.isExplored) {
                    ground.classList.add('fog');
                    if (trunk) trunk.classList.add('hidden');
                    if (foliage) foliage.classList.add('hidden');
                }
            }
        }
        
        if (!this.renderFrameRequest) {
            this.renderFrameRequest = requestAnimationFrame(() => {
                this.renderViewport();
                this.renderFrameRequest = null;
            });
        }
    },

    revealTile(q, r) {
        const key = `${q},${r}`;
        const tileData = this.worldDataCache.get(key);
        if (!tileData) return;
        
        tileData.isExplored = true;
        
        const els = this.renderedTiles.get(key);
        if (els && els.ground) {
            const { ground, trunk, foliage } = els;
            ground.setAttribute("class", `hex-tile type-${tileData.type}`);
            if (trunk) trunk.classList.remove('hidden');
            if (foliage) foliage.classList.remove('hidden');
        }
        this.renderViewport();
    },

    renderUnits(units, tribePos) {
        this.unitGroup.innerHTML = ''; 
        if (tribePos) {
            this.drawUnitIcon(tribePos.q, tribePos.r, 'explorer', '#e74c3c');
        }
        if (units) {
            units.forEach(u => {
                let visualType = 'explorer';
                let color = '#3498db'; 
                if (u.type === 'settler') { visualType = 'settler'; color = '#f1c40f'; }
                this.drawUnitIcon(u.location.q, u.location.r, visualType, color);
            });
        }
    },

    drawUnitIcon(q, r, type, color) {
        if (q === undefined || r === undefined) return;
        
        const tileData = WorldGen.getTileData(q, r);
        if (!tileData || !tileData.isExplored) return;

        const center = HexMath.gridToPixel(q, r);
        if (!center || isNaN(center.x) || isNaN(center.y)) return;

        const visual = UnitVisuals ? UnitVisuals[type] : null;
        if (!visual) return;

        const outerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        outerGroup.setAttribute("transform", `translate(${center.x}, ${center.y})`);

        const innerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        innerGroup.setAttribute("transform", `scale(${visual.scale})`);
        
        const artGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        if (visual.offset) {
            artGroup.setAttribute("transform", `translate(${visual.offset.x}, ${visual.offset.y})`);
        }

        visual.parts.forEach(part => {
            this.renderSvgPart(part, artGroup, color);
        });

        innerGroup.appendChild(artGroup);
        outerGroup.appendChild(innerGroup);
        this.unitGroup.appendChild(outerGroup);
    },

    renderSvgPart(part, parent, playerColor) {
        const tag = part.type || "path"; 
        
        if (tag === 'g' && part.children) {
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            if (part.transform) g.setAttribute("transform", part.transform);
            if (part.fill) g.setAttribute("fill", part.fill);
            part.children.forEach(child => this.renderSvgPart(child, g, playerColor));
            parent.appendChild(g);
            return;
        }

        const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
        
        Object.entries(part).forEach(([k, v]) => {
            if (k === 'type' || k === 'children') return; 
            
            if (k === 'anim') {
                el.classList.add(v);
                return;
            }

            if (k === 'fill' && v === 'playerColor') {
                el.setAttribute("fill", playerColor);
            } else if (k === 'stroke' && v === 'playerColor') {
                el.setAttribute("stroke", playerColor);
            } else {
                el.setAttribute(k, v);
            }
        });

        parent.appendChild(el);
    },

    renderSettlement(q, r, population = 1) {
        const center = HexMath.gridToPixel(q, r);
        if (!center) return;

        const outerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        outerGroup.setAttribute("transform", `translate(${center.x}, ${center.y})`);
        outerGroup.style.pointerEvents = "none"; 

        // 1. DRAW CAMPFIRE (Parts-based)
        if (StructureVisuals && StructureVisuals["campfire"]) {
            const fireVisual = StructureVisuals["campfire"];
            const fireScaleGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            if (fireVisual.scale) {
                fireScaleGroup.setAttribute("transform", `scale(${fireVisual.scale})`);
            }
            const fireArtGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            if (fireVisual.offset) {
                fireArtGroup.setAttribute("transform", `translate(${fireVisual.offset.x}, ${fireVisual.offset.y})`);
            }
            // Campfire still uses 'parts', so we use the existing helper
            fireVisual.parts.forEach(part => {
                this.renderSvgPart(part, fireArtGroup);
            });
            fireScaleGroup.appendChild(fireArtGroup);
            outerGroup.appendChild(fireScaleGroup);
        }

        // 2. DRAW TENTS (Complex Asset-based)
        const tentCount = Math.min(Math.ceil(population / 6), 5);
        const tentVisual = StructureVisuals["tent_small"];
        
        if (tentVisual) {
            const offsets = [{x: -9, y: 3}, {x: 9, y: -3}, {x: -5, y: -8}, {x: 5, y: 8}];
            
            for (let i = 0; i < tentCount; i++) {
                const offset = offsets[i % offsets.length];
                
                // Randomize which tent variant we use (0, 1, or 2)
                const variantIdx = Math.floor(Math.random() * tentVisual.variations.length);
                
                const tentGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
                tentGroup.setAttribute("transform", `translate(${offset.x}, ${offset.y}) scale(${tentVisual.scale})`);
                
                // A. SHADOW (If enabled)
                if (tentVisual.shadow) {
                    const shadow = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
                    shadow.setAttribute("cx", "0");
                    shadow.setAttribute("cy", "5");
                    shadow.setAttribute("rx", "10");
                    shadow.setAttribute("ry", "3");
                    shadow.setAttribute("fill", "rgba(0,0,0,0.3)");
                    tentGroup.appendChild(shadow);
                }

                // B. TRUNK (The Light Canvas)
                // We use <use> tags to reference the IDs created in initAssets
                // ID format: assetKey_vIndex_trunk
                const trunk = document.createElementNS("http://www.w3.org/2000/svg", "use");
                trunk.setAttribute("href", `#tent_small_v${variantIdx}_trunk`);
                trunk.setAttribute("fill", "url(#canvasLight)"); // Using the gradient we added
                tentGroup.appendChild(trunk);

                // C. FOLIAGE (The Dark Interior/Shadow)
                const foliage = document.createElementNS("http://www.w3.org/2000/svg", "use");
                foliage.setAttribute("href", `#tent_small_v${variantIdx}_foliage`);
                foliage.setAttribute("fill", "url(#canvasDark)");
                tentGroup.appendChild(foliage);

                outerGroup.appendChild(tentGroup);
            }
        }
        this.settlementGroup.appendChild(outerGroup);
    },

    clearUnits() { this.unitGroup.innerHTML = ''; },
    clearSettlements() { this.settlementGroup.innerHTML = ''; },

    drawMovementPath(startCoords, pathTiles, isLocked = false) {
        // If it's a hover path (not locked), clear previous highlights first.
        // If it's locked, we might want to APPEND it to a "planned" layer?
        // To keep it simple: We will just redraw EVERYTHING for now.
        
        if (!isLocked) this.clearHighlights(); 

        if (!pathTiles || pathTiles.length === 0) return;

        const points = [HexMath.gridToPixel(startCoords.q, startCoords.r), ...pathTiles.map(t => HexMath.gridToPixel(t.q, t.r))];

        if (points.length < 2) return;

        // Bezier Logic...
        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i+1];
            const midX = (p0.x + p1.x) / 2;
            const midY = (p0.y + p1.y) / 2;
            d += ` Q ${p0.x} ${p0.y} ${midX} ${midY}`;
        }
        const last = points[points.length - 1];
        d += ` L ${last.x} ${last.y}`;

        // Create Path Element
        const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathEl.setAttribute("d", d);
        
        // CSS CLASS SWITCHING
        if (isLocked) {
            pathEl.setAttribute("class", "move-path-line locked"); // Needs CSS
        } else {
            pathEl.setAttribute("class", "move-path-line");
        }
        
        this.highlightGroup.appendChild(pathEl);

        // Destination Circle
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", last.x);
        circle.setAttribute("cy", last.y);
        circle.setAttribute("r", isLocked ? "12" : "15"); 
        circle.setAttribute("class", isLocked ? "move-dest-circle locked" : "move-dest-circle");
        
        this.highlightGroup.appendChild(circle);
    },

    drawSelectionReticle(q, r) {
        this.clearSelection(); 

        const center = HexMath.gridToPixel(q, r);
        
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", center.x);
        circle.setAttribute("cy", center.y);
        circle.setAttribute("r", "25"); 
        circle.setAttribute("class", "selection-ring"); 
        
        this.selectionGroup.appendChild(circle);
    },

    // --- NEW: Territory Visualization (Outline Only) ---
    drawTerritory(centerQ, centerR, radius) {
        if (!this.svgElement) return;

        // 1. Get Tiles
        const tiles = HexMath.getHexesInRange(centerQ, centerR, radius);
        if (!tiles || tiles.length === 0) {
            console.warn("Territory: No tiles found.");
            return;
        }

        console.log(`Territory: Drawing border for ${tiles.length} tiles.`); // Debug Log
        
        const tileSet = new Set(tiles.map(t => `${t.q},${t.r}`));
        const group = this.selectionGroup; 

        // 2. Neighbor Offsets (Standard Order)
        // If lines appear on the WRONG side, we just rotate this array.
        const offsets = [
            {q: 1, r: -1}, // Edge 0: NE
            {q: 1, r: 0},  // Edge 1: E
            {q: 0, r: 1},  // Edge 2: SE
            {q: -1, r: 1}, // Edge 3: SW
            {q: -1, r: 0}, // Edge 4: W
            {q: 0, r: -1}  // Edge 5: NW
        ];

        tiles.forEach(t => {
            // A. Get the exact corners for THIS tile from the engine
            const center = HexMath.gridToPixel(t.q, t.r);
            const cornersStr = HexMath.getHexCorners(center.x, center.y);
            
            // Parse "x,y x,y x,y..." into an array of objects
            // Handle different separators (space or comma) just in case
            const points = cornersStr.trim().split(/[\s,]+/).map(Number);
            
            // We expect 12 numbers (6 pairs of x,y)
            const corners = [];
            for (let i = 0; i < points.length; i += 2) {
                corners.push({ x: points[i], y: points[i+1] });
            }

            // Safety: If parsing failed
            if (corners.length < 6) return;

            // B. Check all 6 directions
            for (let i = 0; i < 6; i++) {
                const neighbor = offsets[i];
                const nQ = t.q + neighbor.q;
                const nR = t.r + neighbor.r;

                // C. Draw edge ONLY if neighbor is OUTSIDE the zone
                if (!tileSet.has(`${nQ},${nR}`)) {
                    
                    // The edge corresponding to neighbor 'i' is usually between
                    // corner 'i' and corner '(i+1)%6' (depending on start angle).
                    // Let's try direct mapping first.
                    
                    // If your hexes start at "Pointy Top" (30 deg), Corner 0 is usually top-rightish.
                    // Let's assume standard mapping: Edge i connects Corner i to Corner i+1
                    // We wrap around using % 6
                    const c1 = corners[(i + 5) % 6];
                    const c2 = corners[i];

                    // Draw the line
                    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    line.setAttribute("x1", c1.x);
                    line.setAttribute("y1", c1.y);
                    line.setAttribute("x2", c2.x);
                    line.setAttribute("y2", c2.y);
                    
                    line.setAttribute("class", "territory-border");
                    group.appendChild(line);
                    
                }
            }
        });
    },

    clearTerritory() {
        // Handled implicitly by clearSelection() if we use selectionGroup,
        // or we can explicit clear here if we made a separate group.
        // For now, doing nothing relies on UI.deselect calling clearSelection.
    },

    clearSelection() {
        if (this.selectionGroup) this.selectionGroup.innerHTML = '';
    },

    clearHighlights() {
        if (this.highlightGroup) this.highlightGroup.innerHTML = '';
    },

    setTileStatus(q, r, type) {},
    clearTileStatus(q, r) {}
};