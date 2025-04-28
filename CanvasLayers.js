import { libWrapper } from "./libwrapperShim.js";
import LayerMenu from "./module/LayerMenu.js";
import StringDialog from "./module/StringDialog.js";
import { setup } from "./setup.js";

export const MODULE_ID = 'canvas-layers';
export const ModuleFlags = {
    Scene: {
        CanvasLayers: 'canvas-layers',
    },
    Drawing: {
        CanvasLayers: 'canvas-layers',
    },
    User: {
        CanvasLayers: 'canvas-layers',
    },
};

Hooks.once("init", () => {
    CONFIG.debug.hooks = true;
    setup();
    loadTemplates([
        'modules/canvas-layers/templates/canvas-layer-header.hbs'
    ]);

    if (typeof libWrapper === "function") {
        libWrapper.register(
            MODULE_ID,
            "Drawing.prototype.isVisible",
            function (wrapped, ...args) {
                const canvasLayers = canvas.scene?.getFlag(MODULE_ID, ModuleFlags.Scene.CanvasLayers);
                if(!canvasLayers) return wrapped(args);
                
                const drawingUsedLayers = this.document.getFlag(MODULE_ID, ModuleFlags.Drawing.CanvasLayers);
                if(!drawingUsedLayers) return wrapped(args);

                const userLayers = game.user.getFlag(MODULE_ID, ModuleFlags.User.CanvasLayers);
                
                const canvasLayerValues = Object.values(canvasLayers);
                const matchingLayers = drawingUsedLayers.filter(x => canvasLayerValues.some(value => value.id === x));
                if(userLayers && matchingLayers.length > 0 && Object.values(userLayers).some(userLayer => userLayer.active && matchingLayers.some(x => userLayer.id === x))) {
                    return wrapped(args);
                }
                
                return false;
            }
        );
    }
});

Hooks.on("getSceneControlButtons", (controls) => {
    const drawingTools = Object.values(controls.drawings.tools);
    const buttonOrder = drawingTools.length + 1;
    controls.drawings.tools.canvasLayers = {
        button: true,
        icon: 'fa-solid fa-paint-roller',
        name: 'canvasLayers',
        onChange: async () => {
            new Promise((resolve, reject) => {
                new StringDialog(resolve, reject, '', game.i18n.format('CanvasLayers.UI.AddCanvasLayerTitle', { scene: game.canvas.scene.name })).render(true)
            }).then(async name => {
                const currentCanvasLayers = canvas.scene.getFlag(MODULE_ID, ModuleFlags.Scene.CanvasLayers);
                const layerId = foundry.utils.randomID();
                await canvas.scene.setFlag(MODULE_ID, ModuleFlags.Scene.CanvasLayers, {
                    ...currentCanvasLayers,
                    [layerId]: {
                        id: layerId,
                        name: name,
                        position: Object.keys(currentCanvasLayers).length+1,
                    },
                });
            });
        },
        order: buttonOrder,
        title:  game.i18n.localize('CanvasLayers.UI.AddCanvasLayer'),
        visible: true,
    };
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
    if(layersData.length === 0) return;

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

                const drawingFlags = drawing.document.getFlag(MODULE_ID, ModuleFlags.Scene.CanvasLayers);
                if(drawingFlags?.includes(layerId)){
                    drawing._refreshState();
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

Hooks.on('createDrawing', async (document) => {
    if(!game.user.isGM) return;
    const activeCanvasLayers = Object.values(game.user.getFlag(MODULE_ID, ModuleFlags.User.CanvasLayers)).filter(x => x.active);
    if(activeCanvasLayers.length === 0) return;

    await document.setFlag(MODULE_ID, ModuleFlags.Drawing.CanvasLayers, activeCanvasLayers.map(x => x.id));
});