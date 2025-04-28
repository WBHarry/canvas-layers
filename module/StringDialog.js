const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class StringDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(resolve, reject, initialString, label) {
        super({});

        this.resolve = resolve;
        this.reject = reject;
        this.text = initialString;
        this.label = label;
    }

    get title() {
        return this.label;
    }

    static DEFAULT_OPTIONS = {
        tag: "form",
        id: "canvas-layers-text-dialog",
        classes: ["canvas-layers", "string-dialog"],
        position: { width: 400, height: "auto" },
        actions: {
            save: this.save,
        },
        form: { handler: this.updateData, submitOnChange: true },
    };

    static PARTS = {
        main: {
            id: "main",
            template: "modules/canvas-layers/templates/string-dialog.hbs",
        },
    }

    async _prepareContext(_options) {
        const context = await super._prepareContext(_options);
        context.text = this.text;

        return context;
    }

    static async updateData(event, element, formData) {
        const data = foundry.utils.expandObject(formData.object);
        this.text = data.text;
        this.render();
    }

    static async save() {
        this.resolve(this.text);
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