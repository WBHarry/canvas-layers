const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class GuideDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor() {
        super({});
    }

    get title() {
        return game.i18n.localize('CanvasLayers.GuideDialog.Title');
    }

    static DEFAULT_OPTIONS = {
        tag: "form",
        id: "canvas-layers-guide-dialog",
        classes: ["canvas-layers", "guide-dialog"],
        position: { width: 800, height: "auto" },
        actions: {},
        form: { handler: this.updateData },
    };

    static PARTS = {
        main: {
            id: "main",
            template: "modules/canvas-layers/templates/guide-dialog.hbs",
        },
    }

    tabGroups = {
        section: 'overview',
        open: 'example1',
        controlled: 'example1',
        macros: 'addToLayers',
    };

    changeTab(tab, group, options) {
        switch(group){
            case 'section':
                super.changeTab('example1', 'open', options);
                super.changeTab('example1', 'controlled', options);
                super.changeTab('addToLayers', 'macros', options);
                break;
        }

        super.changeTab(tab, group, options);
    }
  

    getSectionTabs() {
        const tabs = {
            overview: {
                active: true,
                cssClass: '',
                group: 'section',
                id: 'overview',
                icon: '',
                label: game.i18n.localize('CanvasLayers.GuideDialog.Overview.Title'),
            },
            open: {
                active: false,
                cssClass: '',
                group: 'section',
                id: 'open',
                icon: '',
                label: game.i18n.localize('CanvasLayers.GuideDialog.Open.Title'),
            },
            controlled: {
                active: false,
                cssClass: '',
                group: 'section',
                id: 'controlled',
                icon: '',
                label: game.i18n.localize('CanvasLayers.GuideDialog.Controlled.Title'),
            },
            macros: {
                active: false,
                cssClass: '',
                group: 'section',
                id: 'macros',
                icon: '',
                label: game.i18n.localize('CanvasLayers.GuideDialog.Macros.Title'),
            },
        };
    
        for (const v of Object.values(tabs)) {
          v.active = this.tabGroups[v.group]
            ? this.tabGroups[v.group] === v.id
            : v.active;
          v.cssClass = v.active ? `${v.cssClass} active` : "";
        }
    
        return tabs;
    }

    getOpenTabs() {
        const tabs = {
          example1: {
            active: true,
            cssClass: '',
            group: 'open',
            id: 'example1',
            icon: '',
            label: game.i18n.localize('CanvasLayers.GuideDialog.Open.Example1.Title'),
          },
          example2: {
            active: false,
            cssClass: '',
            group: 'open',
            id: 'example2',
            icon: '',
            label: game.i18n.localize('CanvasLayers.GuideDialog.Open.Example2.Title'),
          },
          example3: {
            active: false,
            cssClass: '',
            group: 'open',
            id: 'example3',
            icon: '',
            label: game.i18n.localize('CanvasLayers.GuideDialog.Open.Example3.Title'),
          },
        };
    
        for (const v of Object.values(tabs)) {
          v.active = this.tabGroups[v.group]
            ? this.tabGroups[v.group] === v.id
            : v.active;
          v.cssClass = v.active ? `${v.cssClass} active` : "";
        }
    
        return tabs;
    }

    getControlledTabs() {
        const tabs = {
          example1: {
            active: true,
            cssClass: '',
            group: 'controlled',
            id: 'example1',
            icon: '',
            label: game.i18n.localize('CanvasLayers.GuideDialog.Controlled.Example1.Title'),
          },
          example2: {
            active: false,
            cssClass: '',
            group: 'controlled',
            id: 'example2',
            icon: '',
            label: game.i18n.localize('CanvasLayers.GuideDialog.Controlled.Example2.Title'),
          },
          example3: {
            active: false,
            cssClass: '',
            group: 'controlled',
            id: 'example3',
            icon: '',
            label: game.i18n.localize('CanvasLayers.GuideDialog.Controlled.Example3.Title'),
          },
          example4: {
            active: false,
            cssClass: '',
            group: 'controlled',
            id: 'example4',
            icon: '',
            label: game.i18n.localize('CanvasLayers.GuideDialog.Controlled.Example4.Title'),
          },
        };
    
        for (const v of Object.values(tabs)) {
          v.active = this.tabGroups[v.group]
            ? this.tabGroups[v.group] === v.id
            : v.active;
          v.cssClass = v.active ? `${v.cssClass} active` : "";
        }
    
        return tabs;
    }

    getMacrosTabs() {
        const tabs = {
          addToLayers: {
            active: true,
            cssClass: '',
            group: 'macros',
            id: 'addToLayers',
            icon: '',
            label: game.i18n.localize('CanvasLayers.GuideDialog.Macros.AddToLayers.Title'),
          },
        };
    
        for (const v of Object.values(tabs)) {
          v.active = this.tabGroups[v.group]
            ? this.tabGroups[v.group] === v.id
            : v.active;
          v.cssClass = v.active ? `${v.cssClass} active` : "";
        }
    
        return tabs;
    }

    async _prepareContext(_options) {
        const context = await super._prepareContext(_options);
        context.sectionTabs = this.getSectionTabs();
        context.openTabs = this.getOpenTabs();
        context.controlledTabs = this.getControlledTabs();
        context.macrosTabs = this.getMacrosTabs();

        return context;
    }

    static async updateData() {}
}