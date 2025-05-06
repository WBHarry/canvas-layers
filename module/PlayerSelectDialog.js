const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class PlayerSelectDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(resolve, reject, scene, initialPlayers) {
        super({});

        this.resolve = resolve;
        this.reject = reject;
        this.scene = scene;
        this.initialPlayers = initialPlayers;
        this.players = game.users.reduce((acc, user) => {
            if(!user.isGM){
                acc[user.id] = { id: user.id, name: user.name, color: user.color.css, active: initialPlayers.includes(user.id) };
            }

            return acc;
        }, {});
    }

    get title() {
        return game.i18n.format('CanvasLayers.PlayerSelectDialog.Title', { layer: this.scene.name });
    }

    static DEFAULT_OPTIONS = {
        tag: "form",
        id: "canvas-layers-text-dialog",
        classes: ["canvas-layers", "player-select-dialog"],
        position: { width: 400, height: "auto" },
        actions: {
            toggleAllPlayers: this.toggleAllPlayers,
            togglePlayer: this.togglePlayer,
            save: this.save,
        },
        form: { handler: this.updateData, submitOnChange: true },
    };

    static PARTS = {
        main: {
            id: "main",
            template: "modules/canvas-layers/templates/player-select-dialog.hbs",
        },
    }

    async _prepareContext(_options) {
        const context = await super._prepareContext(_options);
        context.players = this.players;

        return context;
    }

    static async updateData(event, element, formData) {
        const data = foundry.utils.expandObject(formData.object);
        this.players = foundry.utils.mergeObject(this.players, data.players);
        this.render();
    }

    static toggleAllPlayers() {
        const playerValues = Object.values(playerValues);
        const allSelected = playerValues.every(x => x.active);
        this.players = playerValues.reduce((acc, player) => {
            acc[player.id] = { ...player, active: allSelected ? false : true };

            return acc;
        }, {});
        this.render();
    }

    static togglePlayer(_, button) {
        this.players = Object.values(playerValues).reduce((acc, player) => {
            acc[player.id] = { ...player, active: player.id === button.dataset.player ? !player.active : player.active };

            return acc;
        }, {});
        this.render();
    }

    static async save() {
        const selectedPlayers = Object.values(this.players).filter(x => x.active).map(x => x.id);
        let unique1 = this.initialPlayers.filter(x => selectedPlayers.indexOf(x) === -1);
        let unique2 = selectedPlayers.filter(x => this.initialPlayers.indexOf(x) === -1);
        const changedPlayers = unique1.concat(unique2);

        this.resolve({selectedPlayers, changedPlayers});
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