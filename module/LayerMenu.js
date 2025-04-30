import { MODULE_ID, ModuleFlags } from "../canvas-layers.js";
import { ExpandedDragDrop } from "../scripts/expandedDragDrop.js";
import RemoveLayerDialog from "./RemoveLayerDialog.js";
import StringDialog from "./StringDialog.js";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class LayerMenu extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(scene) {
        super({});

        this.scene = scene;
        this.#dragDrop = this.#createDragDropHandlers();
    }

    get title() {
        return game.i18n.format('CanvasLayers.LayerMenu.Title', { scene: this.scene.name });
    }

    static DEFAULT_OPTIONS = {
        tag: "form",
        id: "canvas-layers-layer-menu",
        classes: ["canvas-layers", "layer-menu"],
        position: { width: 600, height: "auto" },
        actions: {
            addNewLayer: this.addNewLayer,
            toggleActive: this.toggleActive,
            editName: this.editName,
            toggleFavorite: this.toggleFavorite,
            removeLayer: this.removeLayer,
        },
        form: { handler: this.updateData, submitOnChange: true },
        dragDrop: [
            { dragSelector: "[data-drag]", dropSelector: ".layer-container" },
        ],
    };

    static PARTS = {
        main: {
            id: "main",
            template: "modules/canvas-layers/templates/layer-menu.hbs",
        },
    }

    #createDragDropHandlers() {
        return this.options.dragDrop.map((d) => {
            d.permissions = {
                dragstart: () => game.user.isGM,
                drop: () => game.user.isGM,
            };
            
            d.callbacks = {
                dragstart: this._onDragStart.bind(this),
                dragover: this._onDragOver.bind(this),
                drop: this._onDrop.bind(this),
            };

            return new foundry.applications.ux.DragDrop.implementation(d);
        });
    }
    
    #dragDrop;
    #currentLayerDropTarget;

    get dragDrop() {
        return this.#dragDrop;
    }

    _onRender(context, options) {
        this.#dragDrop.forEach((d) => d.bind(this.element));
      }

    async _prepareContext(_options) {
        const context = await super._prepareContext(_options);
        context.layers = this.scene.flags?.[MODULE_ID]?.[ModuleFlags.Scene.CanvasLayers] ? Object.values(this.scene.flags[MODULE_ID][ModuleFlags.Scene.CanvasLayers]).sort((a, b) => a.position - b.position).map(sceneLayer => {
            const userFlag = game.user.getFlag(MODULE_ID, ModuleFlags.User.CanvasLayers);
            return {
                ...sceneLayer,
                active: userFlag?.[sceneLayer.id]?.active ?? false,
            };
        }) : [];
        context.isGM = game.user.isGM;

        return context;
    }

    static async updateData(event, element, formData) {
        const data = foundry.utils.expandObject(formData.object);
        this.render();
    }

    _createDragDropHandlers() {
        return this.options.dragDrop.map((d) => {
          d.permissions = {
            dragstart: () => game.user.isGM,
            drop: () => game.user.isGM,
          };
          d.callbacks = {
            dragstart: this._onDragStart.bind(this),
            dragover: this._onDragOver.bind(this),
            dragleave: this._onDragLeave.bind(this),
            drop: this._onDrop.bind(this),
          };
          return new ExpandedDragDrop(d);
        });
      }

    async _onDragStart(event) {
        const target = event.currentTarget;
        if (!target.dataset.layer) return;
    
        event.dataTransfer.setData("text/plain", JSON.stringify(target.dataset));
        event.dataTransfer.setDragImage(target.parentElement, 60, 0);
      }
    
      async _onDragOver(event) {
        const self = event.target;
        this.#currentLayerDropTarget = self;
        // if (!this.dragData.bookmarkActive) return;
    
        // let self = event.target;
        // let dropTarget = self.matches(".bookmark-container.draggable")
        //   ? self.querySelector(".bookmark")
        //   : self.closest(".bookmark");
    
        // if (!dropTarget || dropTarget.classList.contains("drop-hover")) {
        //   return;
        // }
    
        // dropTarget.classList.add("drop-hover");
        // return false;
      }
    
    //   async _onDragLeave(event) {
    //     if (!this.dragData.bookmarkActive) return;
    
    //     let self = event.target.matches(".bookmark-container.draggable")
    //       ? event.target
    //       : event.target.parentElement;
    //     let dropTarget = self.querySelector(".bookmark");
    
    //     dropTarget?.classList?.remove("drop-hover");
    //   }

    async _onDrop(event) {
        if (!game.user.isGM) return;
    
        const data = TextEditor.getDragEventData(event);
        const dropTarget = this.#currentLayerDropTarget?.dataset?.layer;
        if(!dropTarget) return;
        
        const layers = this.scene.flags[MODULE_ID][ModuleFlags.Scene.CanvasLayers];
        const layer = layers[data.layer];
        const dropLayer = layers[dropTarget];
        if(layer.position === dropLayer.position) return;

        const positionIncreased = dropLayer.position > layer.position;
        await this.scene.setFlag(MODULE_ID, ModuleFlags.Scene.CanvasLayers, Object.values(layers).reduce((acc, currentLayer) => {
            if (currentLayer.id === layer.id) {
                acc[currentLayer.id] = {
                    ...currentLayer,
                    position: dropLayer.position,
                }
            }
            else if(positionIncreased){
                acc[currentLayer.id] = {
                    ...currentLayer,
                    position: currentLayer.position <= dropLayer.position && currentLayer.position > layer.position ? currentLayer.position - 1 : currentLayer.position,
                }
            }
            else {
                acc[currentLayer.id] = {
                    ...currentLayer,
                    position: currentLayer.position >= dropLayer.position && currentLayer.position < layer.position ? currentLayer.position + 1 : currentLayer.position, 
                };
            }

            return acc;
        }, {}));
        this.render();
    }

    static async addNewLayer() {
        new Promise((resolve, reject) => {
            new StringDialog(resolve, reject, '', game.i18n.format('CanvasLayers.UI.AddCanvasLayerTitle', { scene: game.canvas.scene.name })).render(true)
        }).then(async name => {
            const currentCanvasLayers = canvas.scene.getFlag(MODULE_ID, ModuleFlags.Scene.CanvasLayers) ?? {};
            const layerId = foundry.utils.randomID();
            await canvas.scene.setFlag(MODULE_ID, ModuleFlags.Scene.CanvasLayers, {
                ...currentCanvasLayers,
                [layerId]: {
                    id: layerId,
                    name: name,
                    position: Object.keys(currentCanvasLayers).length+1,
                },
            });
            this.render();
        });
    }

    static async toggleActive(_, button) {
        const userLayers = game.user.getFlag(MODULE_ID, ModuleFlags.User.CanvasLayers) ?? {};
        await game.user.setFlag(MODULE_ID, ModuleFlags.User.CanvasLayers, {
            ...userLayers,
            [button.dataset.layer]: {
                ...userLayers[button.dataset.layer],
                active: !userLayers[button.dataset.layer].active,
            }
        });
        foundry.ui.nav.render(true);
        this.render();
    }

    static async editName(_, button) {
        const canvasLayers = this.scene.getFlag(MODULE_ID, ModuleFlags.Scene.CanvasLayers);
        new Promise((resolve, reject) => {
            new StringDialog(resolve, reject, canvasLayers[button.dataset.layer].name, game.i18n.localize('CanvasLayers.LayerMenu.LayersSection.EditName')).render(true);
        }).then(async name => {
            await this.scene.setFlag(MODULE_ID, ModuleFlags.Scene.CanvasLayers, {
                ...canvasLayers,
                [button.dataset.layer]: {
                    ...canvasLayers[button.dataset.layer],
                    name: name,
                },
            });
            this.render();
        });
    }

    static async toggleFavorite(_, button) {
        const canvasLayers = this.scene.getFlag(MODULE_ID, ModuleFlags.Scene.CanvasLayers);
        await this.scene.setFlag(MODULE_ID, ModuleFlags.Scene.CanvasLayers, {
            ...canvasLayers,
            [button.dataset.layer]: {
                ...canvasLayers[button.dataset.layer],
                favorite: !canvasLayers[button.dataset.layer].favorite,
            }
        });
        this.render();
    }

    static async removeLayer(_, button) {
        const layer = this.scene.flags[MODULE_ID][ModuleFlags.Scene.CanvasLayers][button.dataset.layer];
        new Promise((resolve, reject) => {
            new RemoveLayerDialog(resolve, reject, this.scene.name, layer.name).render(true);
        }).then(async choices => {
            const connectedDrawings = this.scene.drawings.filter(x => {
                const canvasLayers = x.flags[MODULE_ID][ModuleFlags.Drawing.CanvasLayers];
                return canvasLayers.includes(button.dataset.layer);
            });

            for(var drawing of connectedDrawings) {
                const drawingLayers = drawing.getFlag(MODULE_ID, ModuleFlags.Drawing.CanvasLayers);
                if(choices.drawings && drawingLayers.length === 1)
                {
                    await drawing.delete();
                }
                else {
                    await drawing.unsetFlag(MODULE_ID, ModuleFlags.Drawing.CanvasLayers);
                    await drawing.setFlag(MODULE_ID, ModuleFlags.Drawing.CanvasLayers, drawingLayers.filter(x => x !== button.dataset.layer));
                    drawing._object._refreshState();
                }
            }

            let position = 1;
            const newLayers = Object.values(this.scene.flags[MODULE_ID][ModuleFlags.Scene.CanvasLayers]).sort((a, b) => a.position - b.position).reduce((acc, layer) => {
                if(layer.id !== button.dataset.layer) {
                    acc[layer.id] = {
                        ...layer,
                        position,
                    }
                    position++;
                }

                return acc;
            }, {});

            for(var user of game.users) {
                await user.update({ [`flags.${MODULE_ID}.${ModuleFlags.User.CanvasLayers}.-=${button.dataset.layer}`]: null });
            }

            await this.scene.update({ [`flags.${MODULE_ID}.${ModuleFlags.Scene.CanvasLayers}.-=${button.dataset.layer}`]: null });
            await this.scene.update({ [`flags.${MODULE_ID}.${ModuleFlags.Scene.CanvasLayers}`]: newLayers });
            

            this.render();
        });
    }
}