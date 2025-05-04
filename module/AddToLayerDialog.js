import Tagify from "@yaireo/tagify";
import { MODULE_ID, ModuleFlags } from "../canvas-layers";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class AddToLayerDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(sceneLayers, placeables) {
        super({});

        this.placeables = placeables;
        this.sceneLayers = sceneLayers;
        this.layers = [];
        this.overwrite = false;
    }

    get title() {
        return game.i18n.localize('CanvasLayers.AddToLayersMenu.Title');
    }

    static DEFAULT_OPTIONS = {
        tag: "form",
        id: "canvas-layers-add-to-layer-dialog",
        classes: ["canvas-layers", "add-to-layer-dialog"],
        position: { width: 400, height: "auto" },
        actions: {
            setLayers: this.setLayers,
        },
        form: { handler: this.updateData, submitOnChange: true },
    };

    static PARTS = {
        main: {
            id: "main",
            template: "modules/canvas-layers/templates/add-to-layer-dialog.hbs",
        },
    }

    _attachPartListeners(partId, htmlElement, options) {
        super._attachPartListeners(partId, htmlElement, options);

        const tagFunc = (tagData) => {
            return `
                <tag
                    contenteditable='false'
                    spellcheck='false'
                    tabIndex="-1"
                    class="tagify__tag tagify--noAnim tagify-hover-parent"
                >
                    <x title='' class='tagify__tag__removeBtn' role='button' aria-label='remove tag'></x>
                    <div>
                        <span class="tagify__tag-text">${tagData.name}</span>
                    </div>
                </tag>
            `;
            }

        const tagifyInput = htmlElement.querySelector('.add-to-layer-tagify');
        const test = new Tagify(tagifyInput, {
            tagTextProp: "name",
            enforceWhitelist: true,
            whitelist: this.sceneLayers.map(x => ({ value: x.id, name: x.name })),
            dropdown: {
                mapValueTo: "name",
                searchKeys: ["name"],
                enabled: 0,
                maxItems: 20,
                closeOnSelect: true,
                highlightFirst: false,
            },
            templates: {
                tag: tagFunc
            }
        });

        tagifyInput.addEventListener('change', (event) => {
            event.stopPropagation();
            this.layers = event.currentTarget.value ? JSON.parse(event.currentTarget.value).map(x => ({ id: x.value, name: x.name })) : [];
            this.render();
        });
    }

    async _prepareContext(_options) {
        const context = await super._prepareContext(_options);
        context.layers = this.layers.map(x => x.name);
        context.overwrite = this.overwrite;

        return context;
    }

    static async updateData(event, element, formData) {
        const data = foundry.utils.expandObject(formData.object);
        this.overwrite = data.overwrite;
        this.render();
    }

    static async setLayers() {
        for(var placeableObject of this.placeables) { // Doesn't follow ModuleFlags convention. Will it need to be changed?
            const placeable = placeableObject[1];
            if(this.overwrite) {
                await placeable.document.unsetFlag(MODULE_ID, ModuleFlags.Drawing.CanvasLayers);
                await placeable.document.setFlag(MODULE_ID, ModuleFlags.Drawing.CanvasLayers, this.layers.map(x => x.id));
            }
            else {
                await placeable.document.setFlag(MODULE_ID, ModuleFlags.Drawing.CanvasLayers, [
                    ...(placeable.document.getFlag(MODULE_ID, ModuleFlags.Drawing.CanvasLayers) ?? []),
                    ...this.layers.map(x => x.id),
                ])
            }

            placeable._refreshState();
        }

        this.close();
    }
}