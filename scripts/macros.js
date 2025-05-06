
import { MODULE_ID, ModuleFlags } from "../data/Constants.js";
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
    const tiles = game.canvas.tiles.controlledObjects;
    if(drawings.size === 0 && tiles.size === 0) {
        ui.notifications.error(game.i18n.localize("CanvasLayers.Errors.NoPlaceablesSelected"));
        return;
    }

    new AddToLayerDialog(game.canvas.scene, Object.values(sceneLayers), drawings.size > 0 ? drawings : tiles).render(true);
};