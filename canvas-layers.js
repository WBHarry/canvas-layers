import { libWrapper } from "./libwrapperShim.js";
import LayerMenu from "./module/LayerMenu.js";
import { setup } from "./setup.js";
import * as macros from "./scripts/macros.js";
import { registerLibwrapperDrawing } from "./scripts/drawing.js";
import { registerLibwrapperTile } from "./scripts/tile.js";
import { layerTypes, MODULE_ID, ModuleFlags, SOCKET_ID } from "./data/Constants.js";
import PlayerSelectDialog from "./module/PlayerSelectDialog.js";
import { getUserSceneFlags, refreshPlaceables, setUserSceneFlags } from "./scripts/helpers.js";
import { handleSocketEvent, socketEvent } from "./scripts/sockets.js";
import { handleMigration } from "./scripts/migration.js";

Hooks.once("init", () => {
    setup();
    game.socket.on(SOCKET_ID, handleSocketEvent);
    game.modules.get(MODULE_ID).macros = macros;
    foundry.applications.handlebars.loadTemplates([
        `modules/${MODULE_ID}/templates/canvas-layer-header.hbs`,
        `modules/${MODULE_ID}/templates/canvas-entity-layers.hbs`
    ]);

    if (typeof libWrapper === "function") {
        registerLibwrapperDrawing();
        registerLibwrapperTile();
    }

    game.settings.register(MODULE_ID, 'menuVertical', {
        scope: 'world',
        config: true,
        type: Boolean,
        defaultValue: false
    });
});

Hooks.once("ready", async () => {
    handleMigration();
});

Hooks.on("renderSceneNavigation", async (config, html, _, options) => {  
    if (options.isFirstRender) return;
    const existing = html.closest('#ui-left').querySelector('#ui-left-column-3');
    if (existing) existing.remove();

    const layersFlag = game.canvas.scene?.getFlag(MODULE_ID, ModuleFlags.Scene.CanvasLayers);
    const userFlag = getUserSceneFlags();
    const layersData = layersFlag ? Object.values(layersFlag)
    .filter(x => {
        if(!game.user.isGM && x.type === layerTypes.controlled.value) return false;

        return true;
    })
    .map(x => ({
        ...x,
        active: userFlag?.[x.id] ? userFlag[x.id].active : false,
        playerMarkers: x.controlledPlayers ? game.users.filter(user => x.controlledPlayers.includes(user.id)).map(x => ({ name: x.name, color: x.color.css })) : [],
    })).sort((a, b) => {
        if(a.favorite && !b.favorite) return -1;
        else if(!a.favorite && b.favorite) return 1;
        else if(a.favorite && b.favorite) return a.name.localeCompare(b.name);

        return a.position - b.position;
    }) : [];

    const uiTop = html.closest('#ui-left');
    uiTop.insertAdjacentHTML('beforeend', '<div id="ui-left-column-3" style="display: flex; align-items: center; gap: 8px;"></div>');
    const uiColumn = uiTop.querySelector('#ui-left-column-3');
    
    const verticalLayout = game.settings.get(MODULE_ID, 'menuVertical');
    const canvasLayerTemplate = Handlebars.partials[`modules/${MODULE_ID}/templates/canvas-layer-header.hbs`]({ layerData: layersData, isGM: game.user.isGM, verticalLayout }, {allowProtoMethodsByDefault: true, allowProtoPropertiesByDefault: true});
    uiColumn.insertAdjacentHTML('beforeend', canvasLayerTemplate);
    

    const canvasLayerContainer = uiColumn.querySelector('.canvas-layers-container');
    canvasLayerContainer.querySelectorAll('.canvas-layer-container').forEach(event => {
        event.addEventListener('click', async (event) => {
            const layerId = event.currentTarget.dataset.layer;
            await setUserSceneFlags(layerId, (layer) => ({
                active: layer ? !layer.active : true,
            }));

            refreshPlaceables(game.canvas.scene, layerId);

            foundry.applications.instances.get('canvas-layers-layer-menu')?.render(true);
            foundry.ui.nav.render(true);
        });

        event.addEventListener('contextmenu', async (event) => {
            const currentScene = game.canvas.scene;
            const canvasLayers = currentScene.getFlag(MODULE_ID, ModuleFlags.Scene.CanvasLayers) ?? {};
            const layerId = event.currentTarget.dataset.layer;
            const layer = canvasLayers[layerId];
            const controlledPlayers = layer.controlledPlayers;
            if(!layer || layer.type !== layerTypes.controlled.value) return;

            new Promise((resolve, reject) => {
                new PlayerSelectDialog(resolve, reject, currentScene, controlledPlayers ?? []).render(true);
            }).then(async ({selectedPlayers, changedPlayers}) => {
                await currentScene.setFlag(MODULE_ID, ModuleFlags.User.CanvasLayers, {
                    ...canvasLayers,
                    [layerId]: {
                        ...canvasLayers[layerId],
                        controlledPlayers: selectedPlayers,
                    }
                });

                game.socket.emit(SOCKET_ID, {
                    action: socketEvent.updateView,
                    data: { scene: currentScene.id, layer: layerId, changedPlayers: changedPlayers },
                });

                foundry.applications.instances.get('canvas-layers-layer-menu')?.render(true);
                foundry.ui.nav.render(true);
            });
        });
    });
    if(game.user.isGM){
        canvasLayerContainer.querySelector('.canvas-layer-settings').addEventListener('click', event => {
           const layerMenu = new LayerMenu(game.canvas.scene);
           layerMenu.render(true);
        });
    }
});

Hooks.on(socketEvent.updateView, async ({ scene, layer, changedPlayers }) => {
    if(changedPlayers.includes(game.user.id)) {
        refreshPlaceables(game.scenes.get(scene), layer);
    }
});

Hooks.on(socketEvent.closeLayer, async ({ scene, layer }) => {
    if(!game.user.isGM) {
        await setUserSceneFlags(layer, () => ({
            active: false,
        }), scene);

        refreshPlaceables(game.scenes.get(scene), layer);
    }
});

Hooks.on(socketEvent.updatePlaceableCollection, async ({ sceneId, types, placeableIds }) => {
    const scene = game.scenes.get(sceneId);
    
    const placeables = types.flatMap(type => type === 'drawings' ? scene.drawings.filter(x => placeableIds.includes(x.id)) : scene.tiles.filter(x => placeableIds.includes(x.id)));
    for(var placeable of placeables) {
        placeable._object._refreshState();
    }
});