import { layerTypes, MODULE_ID, ModuleFlags } from "../data/Constants";
import { libWrapper } from "../libwrapperShim";
import Tagify from "@yaireo/tagify";
import { getUserSceneFlags } from "./helpers";

Hooks.on('createDrawing', async (document) => {
    if(!game.user.isGM) return;
    const userLayers = getUserSceneFlags();
    const activeCanvasLayers = Object.values(userLayers).filter(x => x.active);
    if(activeCanvasLayers.length === 0) return;

    await document.setFlag(MODULE_ID, ModuleFlags.Drawing.CanvasLayers, activeCanvasLayers.map(x => x.id));
});

Hooks.on('renderDrawingConfig', async (config, html, _, options) => {
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

    const drawingLayers = config.document.getFlag(MODULE_ID, ModuleFlags.Drawing.CanvasLayers) ?? [];
    const selectedLayers = Object.values(canvasLayers).filter(x => drawingLayers.includes(x.id)).map(x => x.name);

    const canvasEntityLayersTemplate = Handlebars.partials[`modules/${MODULE_ID}/templates/canvas-entity-layers.hbs`]({ active: layersActive, updatePath: `flags.${MODULE_ID}.${ModuleFlags.Drawing.CanvasLayers}`, selectedLayers: selectedLayers }, {allowProtoMethodsByDefault: true, allowProtoPropertiesByDefault: true});
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

Hooks.on('preUpdateDrawing', (document, update) => {
    const drawingLayers = update.flags?.[MODULE_ID]?.[ModuleFlags.Drawing.CanvasLayers];
    if(drawingLayers && typeof drawingLayers === 'string'){
        const newLayers = JSON.parse(drawingLayers).map(x => x.value);
        if(document.flags[MODULE_ID]?.[ModuleFlags.Drawing.CanvasLayers]){
            document.flags[MODULE_ID][ModuleFlags.Drawing.CanvasLayers] = newLayers;
        }
        else {
            document.flags[MODULE_ID] = {
                [ModuleFlags.Drawing.CanvasLayers]: newLayers,
            };
        }

        update.flags[MODULE_ID][ModuleFlags.Drawing.CanvasLayers] = newLayers;

        document._object._refreshState();
    }
});

export const registerLibwrapperDrawing = () => {
    libWrapper.register(
        MODULE_ID,
        "foundry.canvas.placeables.Drawing.prototype.isVisible",
        function (wrapped, ...args) {
            const canvasLayers = canvas.scene?.getFlag(MODULE_ID, ModuleFlags.Scene.CanvasLayers);
            if(!canvasLayers || Object.keys(canvasLayers) === 0) return wrapped(args);
            
            const drawingUsedLayers = this.document.getFlag(MODULE_ID, ModuleFlags.Drawing.CanvasLayers);
            if(!drawingUsedLayers || drawingUsedLayers.length === 0) return wrapped(args);

            const userLayers = getUserSceneFlags();
            
            const canvasLayerValues = Object.values(canvasLayers);
            const matchingLayers = canvasLayerValues.filter(x => drawingUsedLayers.some(value => value === x.id));
            if(userLayers && matchingLayers.length > 0 && (Object.values(userLayers).some(userLayer => {
                const matchingLayer = matchingLayers.some(x => userLayer.id === x.id);

                return userLayer.active && matchingLayer;
            }) || (!game.user.isGM && matchingLayers.some(x => x.type === layerTypes.controlled.value && x.controlledPlayers?.includes(game.user.id))))) {
                return wrapped(args);
            }
            
            return false;
        }
    );
};
