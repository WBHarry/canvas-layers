import Tagify from "@yaireo/tagify";
import { MODULE_ID, ModuleFlags } from "../canvas-layers";
import { libWrapper } from "../libwrapperShim";
import { safeJSONParse } from "./helpers";

Hooks.on('createTile', async (document) => {
    if(!game.user.isGM) return;
    const userLayers = game.user.getFlag(MODULE_ID, ModuleFlags.User.CanvasLayers) ?? {};
    const activeCanvasLayers = Object.values(userLayers).filter(x => x.active);
    if(activeCanvasLayers.length === 0) return;

    await document.setFlag(MODULE_ID, ModuleFlags.Tile.CanvasLayers, activeCanvasLayers.map(x => x.id));
});

Hooks.on('renderTileConfig', async (config, html, _, options) => {
    if(!game.user.isGM || (options.parts && !options.parts.includes('tabs'))) return;

    const canvasLayers = game.canvas.scene.getFlag(MODULE_ID, ModuleFlags.Scene.CanvasLayers);
    if(!canvasLayers || Object.keys(canvasLayers).length === 0) return;

    const layersActive = config.tabGroups.sheet === 'layers';
    html.querySelector('.sheet-tabs').insertAdjacentHTML('beforeend', `
        <a data-action="tab" data-group="sheet" data-tab="layers"${layersActive ? ' class="active"': ''}>
            <i class="fa-solid fa-paint-roller" inert=""></i>
            <span>${game.i18n.localize('CanvasLayers.General.Layers')}</span>
        </a>    
    `);

    const tileLayers = config.document.getFlag(MODULE_ID, ModuleFlags.Tile.CanvasLayers) ?? [];
    const userLayers = game.user.getFlag(MODULE_ID, ModuleFlags.User.CanvasLayers) ?? {};
    const userLayerValues = Object.values(userLayers);
    const selectedLayers = options.preview ? Object.values(canvasLayers).filter(x => userLayerValues.some(y => x.id === y.id && y.active)).map(x => x.name) : Object.values(canvasLayers).filter(x => tileLayers.includes(x.id)).map(x => x.name);

    const canvasEntityLayersTemplate = Handlebars.partials[`modules/${MODULE_ID}/templates/canvas-entity-layers.hbs`]({ preview: options.preview, active: layersActive, updatePath: `flags.${MODULE_ID}.${ModuleFlags.Tile.CanvasLayers}`, selectedLayers: selectedLayers }, {allowProtoMethodsByDefault: true, allowProtoPropertiesByDefault: true});
    html.querySelector('.window-content .form-footer').insertAdjacentHTML('beforebegin', canvasEntityLayersTemplate);
    const canvasEntityLayersTab = html.querySelector('.window-content div[data-tab="layers"]');

    const layerOptions = Object.values(game.canvas.scene.getFlag(MODULE_ID, ModuleFlags.Scene.CanvasLayers)).map(x => ({ value: x.id, name: x.name }));
    const input = canvasEntityLayersTab.querySelector('.layer-tagify');
    if(input) {
        new Tagify(input, {
            tagTextProp: "name",
            enforceWhitelist: true,
            whitelist: layerOptions,
            dropdown: {
                mapValueTo: "name",
                searchKeys: ["name"],
                enabled: 0,
                maxItems: 20,
                closeOnSelect: true,
                highlightFirst: false,
            },
        });
    }  
});

Hooks.on('refreshTile', (tile, test) => {
    const tileLayersData = tile.document.flags?.[MODULE_ID]?.[ModuleFlags.Tile.CanvasLayers];
    const tileLayers = Array.isArray(tileLayersData) ? tileLayersData[0] : tileLayersData; // Strange. Better way to do it?
    if(tileLayers !== undefined && typeof tileLayers === 'string'){
        const newLayers = tileLayers ? (safeJSONParse(tileLayers)?.map(x => x.value) ?? null) : [];
        if(!newLayers) return;
        
        if(tile.document.flags[MODULE_ID]?.[ModuleFlags.Tile.CanvasLayers] !== undefined){
            tile.document.flags[MODULE_ID][ModuleFlags.Tile.CanvasLayers] = newLayers;
        }
        else {
            tile.document.flags[MODULE_ID] = {
                [ModuleFlags.Tile.CanvasLayers]: newLayers,
            };
        }

        tile._refreshState();
    }
});

export const registerLibwrapperTile = () => {
    libWrapper.register(
        MODULE_ID,
        "foundry.canvas.placeables.Tile.prototype.isVisible",
        function (wrapped, ...args) {
            if(this.isPreview) return wrapped(args);

            const canvasLayers = canvas.scene?.getFlag(MODULE_ID, ModuleFlags.Scene.CanvasLayers);
            if(!canvasLayers || Object.keys(canvasLayers) === 0) return wrapped(args);
            
            const tileUsedLayers = this.document.getFlag(MODULE_ID, ModuleFlags.Tile.CanvasLayers);
            if(!tileUsedLayers || typeof tileUsedLayers === 'string' || tileUsedLayers.length === 0) return wrapped(args);

            const userLayers = game.user.getFlag(MODULE_ID, ModuleFlags.User.CanvasLayers);
            
            const canvasLayerValues = Object.values(canvasLayers);
            const matchingLayers = tileUsedLayers.filter(x => canvasLayerValues.some(value => value.id === x));
            if(userLayers && matchingLayers.length > 0 && Object.values(userLayers).some(userLayer => userLayer.active && matchingLayers.some(x => userLayer.id === x))) {
                return wrapped(args);
            }
            
            return false;
        }
    );
};