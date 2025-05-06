import { MODULE_ID, ModuleFlags } from "../data/Constants";

export function safeJSONParse(jsonText) {
    try {
        const jsonResult = JSON.parse(jsonText);
        return jsonResult;
    } catch (e) {
        return null;
    }
}

export const getUserSceneFlags = (sceneId) => {
    const scene = sceneId ? game.scenes.get(sceneId) : game.canvas.scene;
    if (!scene) return {};
    const flags = game.user.getFlag(MODULE_ID, ModuleFlags.User.CanvasLayers) ?? {};
    return flags[scene.id] ?? {};
};

export const setUserSceneFlags = async (layerId, update) => {
    if(!game.canvas.scene) return;
    const flags = getUserSceneFlags();
    const test = {
        [game.canvas.scene.id]: {
            [layerId]: {
                id: layerId,
                ...(flags?.[layerId] ?? {}),
                ...update(flags?.[layerId] ?? {}),
            }
        },
    };
    await game.user.setFlag(MODULE_ID, ModuleFlags.User.CanvasLayers, test);
};

export const refreshPlaceables = (scene, layerId) => {
    for(var drawing of scene.drawings) {
        if(!drawing) continue;

        const drawingFlags = drawing.getFlag(MODULE_ID, ModuleFlags.Drawing.CanvasLayers) ?? [];
        if(drawingFlags?.includes(layerId)){
            drawing._object._refreshState();
        }
    }

    for(var tile of scene.tiles) {
        if(!tile) continue;

        const tileFlags = tile.getFlag(MODULE_ID, ModuleFlags.Tile.CanvasLayers) ?? [];
        if(tileFlags?.includes(layerId)){
            tile._object._refreshState();
        }
    }
};