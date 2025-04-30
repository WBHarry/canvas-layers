import { MODULE_ID, ModuleFlags } from "../canvas-layers";
import AddToLayerDialog from "../module/AddToLayerDialog.js";

export const SetLayers = () => {
    if(!game.user.isGM) {
        ui.notifications.error(game.i18n.localize("CanvasLayers.Errors.GMOnly"));
        return;
    }

    const sceneLayers = game.canvas.scene?.getFlag(MODULE_ID, ModuleFlags.Scene.CanvasLayers) ?? {};
    if(Object.keys(sceneLayers).length === 0) {
        ui.notifications.error(game.i18n.localize("CanvasLayers.Errors.NoSceneLayers"));
        return;
    }

    const drawings = game.canvas.drawings.controlledObjects;
    if(drawings.size === 0) {
        ui.notifications.error(game.i18n.localize("CanvasLayers.Errors.NoDrawingsSelected"));
        return;
    }

    new AddToLayerDialog(Object.values(sceneLayers), drawings).render(true);
};