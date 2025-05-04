import { libWrapper } from "./libwrapperShim.js";
import LayerMenu from "./module/LayerMenu.js";
import { setup } from "./setup.js";
import * as macros from "./scripts/macros.js";
import { registerLibwrapperDrawing } from "./scripts/drawing.js";
import { registerLibwrapperTile } from "./scripts/tile.js";

export const MODULE_ID = 'canvas-layers';
export const ModuleFlags = {
    Scene: {
        CanvasLayers: 'canvas-layers',
    },
    Drawing: {
        CanvasLayers: 'canvas-layers',
    },
    Tile: {
        CanvasLayers: 'canvas-layers',
    },
    User: {
        CanvasLayers: 'canvas-layers',
    },
};

Hooks.once("init", () => {
    setup();
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

Hooks.on("renderSceneNavigation", async (config, html, _, options) => {  
    if (options.parts && !options.parts.includes("scenes")) return;

    const layersFlag = game.canvas.scene?.getFlag(MODULE_ID, ModuleFlags.Scene.CanvasLayers);
    const userFlag = game.user.getFlag(MODULE_ID, ModuleFlags.User.CanvasLayers);
    const layersData = layersFlag ? Object.values(layersFlag).map(x => ({
        ...x,
        active: userFlag?.[x.id] ? userFlag[x.id].active : false,
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
            const canvasLayers = game.user.getFlag(MODULE_ID, ModuleFlags.Scene.CanvasLayers) ?? {};
            const layerId = event.currentTarget.dataset.layer;
            await game.user.setFlag(MODULE_ID, ModuleFlags.User.CanvasLayers, {
                ...canvasLayers,
                [layerId]: {
                    id: layerId,
                    active: canvasLayers[layerId] ? !canvasLayers[layerId].active : true,
                }
            });

            for(var drawing of game.canvas.drawings.children.flatMap(x => x.children)) {
                if(!drawing) continue;

                const drawingFlags = drawing.document.getFlag(MODULE_ID, ModuleFlags.Drawing.CanvasLayers);
                if(drawingFlags?.includes(layerId)){
                    drawing._refreshState();
                }
            }

            for(var tile of game.canvas.tiles.children.flatMap(x => x.children)) {
                if(!tile) continue;

                const tileFlags = tile.document.getFlag(MODULE_ID, ModuleFlags.Tile.CanvasLayers);
                if(tileFlags?.includes(layerId)){
                    tile._refreshState();
                }
            }

            foundry.applications.instances.get('canvas-layers-layer-menu')?.render(true);
            foundry.ui.nav.render(true);
        });
    });
    if(game.user.isGM){
        canvasLayerContainer.querySelector('.canvas-layer-settings').addEventListener('click', event => {
           const layerMenu = new LayerMenu(game.canvas.scene);
           layerMenu.render(true);
        });
    }
});