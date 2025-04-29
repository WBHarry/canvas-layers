const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class RemoveLayerDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(resolve, reject, scene, layer) {
        super({});

        this.resolve = resolve;
        this.reject = reject;
        this.scene = scene;
        this.layer = layer;
        this.choices = {
            drawings: false, 
        };
    }

    get title() {
        return game.i18n.format("CanvasLayers.LayerMenu.LayersSection.RemoveMenu.Title", { scene: this.scene, layer: this.layer });
    }

    static DEFAULT_OPTIONS = {
        tag: "form",
        id: "canvas-layers-text-dialog",
        classes: ["canvas-layers", "remove-layer-dialog"],
        position: { width: 400, height: "auto" },
        actions: {
            confirm: this.confirm,
        },
        form: { handler: this.updateData, submitOnChange: true },
    };

    static PARTS = {
        main: {
            id: "main",
            template: "modules/canvas-layers/templates/remove-layer-dialog.hbs",
        },
    }

    async _prepareContext(_options) {
        const context = await super._prepareContext(_options);
        context.scene = this.scene;
        context.layer = this.layer;
        context.choices = this.choices;

        return context;
    }

    static async updateData(event, element, formData) {
        const data = foundry.utils.expandObject(formData.object);
        this.choices = data.choices;
        this.render();
    }

    static async confirm() {
        this.resolve(this.choices);
        this.close({ updateClose: true });
    }

    async close(options={}) {
        const { updateClose, ...baseOptions } = options;
        if(!updateClose){
            this.reject();
        }

        await super.close(baseOptions);
    }
}