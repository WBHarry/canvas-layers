import { CanvasLayerData } from "./data/CanvasLayer.js";
import { MODULE_ID } from "./canvas-layers.js";

export const ModuleSettings = {
    canvasLayerData: 'canvas-layer-data',
};

export const setup = () => {
    game.settings.register(MODULE_ID, ModuleSettings.canvasLayerData, {
        name: '',
        hint: '',
        scope: "world",
        config: false,
        type: CanvasLayerData,
        default: {},
    });
};