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
});

Hooks.once("ready", async () => {
    handleMigration();
});

Hooks.on("renderSceneNavigation", async (config, html, _, options) => {  
    if (options.parts && !options.parts.includes("scenes")) return;

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

    /* 
        - Setup html nav as FlexRow
        - Move the originalChildren into underlying containers to have a flex order 
    */
    const originalChildrenIds =[];
    html.parentElement.style = "flex: 1;";
    html.childNodes.forEach(x => originalChildrenIds.push(x.id));
    html.classList = ['flexrow'];
    html.style = "align-items: start;";
    html.insertAdjacentHTML('afterbegin', '<div id="canvasLayerScenes" style="flex: none; display: flex; flex-direction: column; width: 200px; overflow: visible; max-height: 100%; gap: 0.5rem; position: relative;"></div>');

    const canvasLayersSceneContainer = html.querySelector('#canvasLayerScenes');
    for(var childIds of originalChildrenIds){
        const childNode = html.querySelector(`#${childIds}`);;
        if(childIds === 'scene-navigation-expand') {
            childNode.style = "position: initial;";
            html.append(childNode);
        }
        else {
            canvasLayersSceneContainer.append(childNode);
        }
    }

    /* Insert custom HTML template last in the new FlexRow container. */
    const canvasLayerTemplate = Handlebars.partials[`modules/${MODULE_ID}/templates/canvas-layer-header.hbs`]({ layerData: layersData, isGM: game.user.isGM }, {allowProtoMethodsByDefault: true, allowProtoPropertiesByDefault: true});
    html.insertAdjacentHTML('beforeend', canvasLayerTemplate);
    const canvasLayerContainer = html.querySelector('.canvas-layers-container');

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