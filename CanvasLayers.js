// SPDX-License-Identifier: MIT
// Copyright © 2021 fvtt-lib-wrapper Rui Pinheiro


// A shim for the libWrapper library
let libWrapper = undefined;
const TGT_SPLIT_RE = new RegExp(
  "([^.[]+|\\[('([^'\\\\]|\\\\.)+?'|\"([^\"\\\\]|\\\\.)+?\")\\])",
  "g",
);
const TGT_CLEANUP_RE = new RegExp("(^\\['|'\\]$|^\\[\"|\"\\]$)", "g");

// Main shim code
Hooks.once("init", () => {
  // Check if the real module is already loaded - if so, use it
  if (globalThis.libWrapper && !(globalThis.libWrapper.is_fallback ?? true)) {
    libWrapper = globalThis.libWrapper;
    return;
  }

  // Fallback implementation
  libWrapper = class {
    static get is_fallback() {
      return true;
    }

    static get WRAPPER() {
      return "WRAPPER";
    }
    static get MIXED() {
      return "MIXED";
    }
    static get OVERRIDE() {
      return "OVERRIDE";
    }
    static get LISTENER() {
      return "LISTENER";
    }

    static register(
      package_id,
      target,
      fn,
      type = "MIXED",
      { chain = undefined, bind = [] } = {},
    ) {
      const is_setter = target.endsWith("#set");
      target = !is_setter ? target : target.slice(0, -4);
      const split = target
        .match(TGT_SPLIT_RE)
        .map((x) => x.replace(/\\(.)/g, "$1").replace(TGT_CLEANUP_RE, ""));
      const root_nm = split.splice(0, 1)[0];

      let obj, fn_name;
      if (split.length == 0) {
        obj = globalThis;
        fn_name = root_nm;
      } else {
        const _eval = eval;
        fn_name = split.pop();
        obj = split.reduce(
          (x, y) => x[y],
          globalThis[root_nm] ?? _eval(root_nm),
        );
      }

      let iObj = obj;
      let descriptor = null;
      while (iObj) {
        descriptor = Object.getOwnPropertyDescriptor(iObj, fn_name);
        if (descriptor) break;
        iObj = Object.getPrototypeOf(iObj);
      }
      if (!descriptor || descriptor?.configurable === false)
        throw new Error(
          `libWrapper Shim: '${target}' does not exist, could not be found, or has a non-configurable descriptor.`,
        );

      let original = null;
      const is_override =
        type == 3 || type.toUpperCase?.() == "OVERRIDE" || type == 3;
      const is_listener =
        type == 4 || type.toUpperCase?.() == "LISTENER" || type == 4;
      const wrapper = is_listener
        ? function (...args) {
            fn.call(this, ...bind, ...args);
            return original.call(this, ...args);
          }
        : (chain ?? !is_override)
          ? function (...args) {
              return fn.call(this, original.bind(this), ...bind, ...args);
            }
          : function (...args) {
              return fn.call(this, ...bind, ...args);
            };

      if (!is_setter) {
        if (descriptor.value) {
          original = descriptor.value;
          descriptor.value = wrapper;
        } else {
          original = descriptor.get;
          descriptor.get = wrapper;
        }
      } else {
        if (!descriptor.set)
          throw new Error(
            `libWrapper Shim: '${target}' does not have a setter`,
          );
        original = descriptor.set;
        descriptor.set = wrapper;
      }

      descriptor.configurable = true;
      Object.defineProperty(obj, fn_name, descriptor);
    }
  };
});

class ExpandedDragDrop extends foundry.applications.ux.DragDrop
  .implementation {
  bind(html) {
    // Identify and activate draggable targets
    if (this.can("dragstart", this.dragSelector)) {
      const draggables = html.querySelectorAll(this.dragSelector);
      for (let el of draggables) {
        el.setAttribute("draggable", true);
        el.ondragstart = this._handleDragStart.bind(this);
      }
    }

    // Identify and activate drop targets
    if (this.can("drop", this.dropSelector)) {
      const droppables =
        !this.dropSelector || html.matches(this.dropSelector)
          ? [html]
          : html.querySelectorAll(this.dropSelector);
      for (let el of droppables) {
        el.ondragover = this._handleDragOver.bind(this);
        el.ondragleave = this._handleDragLeave.bind(this);
        el.ondrop = this._handleDrop.bind(this);
      }
    }
    return this;
  }

  _handleDragLeave(event) {
    event.preventDefault();
    this.callback(event, "dragleave");
    return false;
  }
}

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$2, ApplicationV2: ApplicationV2$2 } = foundry.applications.api;

class RemoveLayerDialog extends HandlebarsApplicationMixin$2(ApplicationV2$2) {
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

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$1, ApplicationV2: ApplicationV2$1 } = foundry.applications.api;

class StringDialog extends HandlebarsApplicationMixin$1(ApplicationV2$1) {
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

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

class LayerMenu extends HandlebarsApplicationMixin(ApplicationV2) {
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
        foundry.utils.expandObject(formData.object);
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
                };
            }
            else if(positionIncreased){
                acc[currentLayer.id] = {
                    ...currentLayer,
                    position: currentLayer.position <= dropLayer.position && currentLayer.position > layer.position ? currentLayer.position - 1 : currentLayer.position,
                };
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
            new StringDialog(resolve, reject, '', game.i18n.format('CanvasLayers.UI.AddCanvasLayerTitle', { scene: game.canvas.scene.name })).render(true);
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
                    };
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

/* !!V13!! Remove this backport when updating to V13 since it has it in Core */
function isDeletionKey(key) {
    if ( !(typeof key === "string") ) return false;
    return (key[1] === "=") && ((key[0] === "=") || (key[0] === "-"));
  }
  
  class TypedObjectField extends foundry.data.fields.ObjectField {
    constructor(element, options, context) {
      super(options, context);
      if ( !(element instanceof foundry.data.fields.DataField) ) throw new Error("The element must be a DataField");
      if ( element.parent !== undefined ) throw new Error("The element DataField already has a parent");
      element.parent = this;
      this.element = element;
    }
  
    /* -------------------------------------------- */
  
    element;
  
    /* -------------------------------------------- */
  
    /** @override */
    static recursive = true;
  
    /* -------------------------------------------- */
  
    /** @inheritDoc */
    static get _defaults() {
      return foundry.utils.mergeObject(super._defaults, {validateKey: undefined});
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    _cleanType(data, options) {
      options.source = options.source || data;
      for ( const key in data ) {
        const isDeletion = isDeletionKey(key);
        const k = isDeletion ? key.slice(2) : key;
        if ( this.validateKey?.(k) === false ) {
          delete data[key];
          continue;
        }
        if ( isDeletion && (key[0] === "-") ) continue;
        data[key] = this.element.clean(data[key], options);
      }
      return data;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    _validateType(data, options={}) {
      if ( foundry.utils.getType(data) !== "Object" ) throw new Error("must be an object");
      options.source = options.source || data;
      const mappingFailure = new foundry.data.validation.DataModelValidationFailure();
      for ( const key in data ) {
        if ( key.startsWith("-=") ) continue;
  
        // Validate the field's current value
        const value = data[key];
        const failure = this.element.validate(value, options);
  
        // Failure may be permitted if fallback replacement is allowed
        if ( failure ) {
          mappingFailure.fields[key] = failure;
  
          // If the field internally applied fallback logic
          if ( !failure.unresolved ) continue;
  
          // If fallback is allowed at the object level
          if ( options.fallback ) {
            const initial = this.element.getInitialValue(options.source);
            if ( this.element.validate(initial, {source: options.source}) === undefined ) {  // Ensure initial is valid
              data[key] = initial;
              failure.fallback = initial;
              failure.unresolved = false;
            }
            else failure.unresolved = mappingFailure.unresolved = true;
          }
  
          // Otherwise the field-level failure is unresolved
          else failure.unresolved = mappingFailure.unresolved = true;
        }
      }
      if ( !foundry.utils.isEmpty(mappingFailure.fields) ) return mappingFailure;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    _validateModel(changes, options={}) {
      options.source = options.source || changes;
      if ( !changes ) return;
      for ( const key in changes ) {
        const change = changes[key];  // May be nullish
        if ( change && this.element.constructor.recursive ) this.element._validateModel(change, options);
      }
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    initialize(value, model, options={}) {
      const object = {};
      for ( const key in value ) object[key] = this.element.initialize(value[key], model, options);
      return object;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    _updateDiff(source, key, value, difference, options) {
  
      // * -> undefined, or * -> null
      if ( (value === undefined) || (value === null) || (options.recursive === false) ) {
        super._updateDiff(source, key, value, difference, options);
        return;
      }
  
      // {} -> {}, undefined -> {}, or null -> {}
      source[key] ||= {};
      value ||= {};
      source = source[key];
      const schemaDiff = difference[key] = {};
      for ( const [k, v] of Object.entries(value) ) {
        let name = k;
        const specialKey = isDeletionKey(k);
        if ( specialKey ) name = k.slice(2);
  
        // Special operations for deletion or forced replacement
        if ( specialKey ) {
          if ( k[0] === "-" ) {
            if ( v !== null ) throw new Error("Removing a key using the -= deletion syntax requires the value of that"
              + " deletion key to be null, for example {-=key: null}");
            if ( name in source ) {
              schemaDiff[k] = v;
              delete source[name];
            }
          }
          else if ( k[0] === "=" ) schemaDiff[k] = source[name] = applySpecialKeys(v);
          continue;
        }
  
        // Perform type-specific update
        this.element._updateDiff(source, k, v, schemaDiff, options);
      }
  
      // No updates applied
      if ( isEmpty(schemaDiff) ) delete difference[key];
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    _updateCommit(source, key, value, diff, options) {
      const s = source[key];
  
      // Special Cases: * -> undefined, * -> null, undefined -> *, null -> *
      if ( !s || !value || Object.isSealed(s) ) {
        source[key] = value;
        return;
      }
  
      // Remove keys which no longer exist in the new value
      for ( const k of Object.keys(s) ) {
        if ( !(k in value) ) delete s[k];
      }
  
      // Update fields in source which changed in the diff
      for ( let [k, d] of Object.entries(diff) ) {
        if ( isDeletionKey(k) ) {
          if ( k[0] === "-" ) continue;
          k = k.slice(2);
        }
        this.element._updateCommit(s, k, value[k], d, options);
      }
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    toObject(value) {
      if ( (value === undefined) || (value === null) ) return value;
      const object = {};
      for ( const key in value ) object[key] = this.element.toObject(value[key]);
      return object;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    apply(fn, data={}, options={}) {
  
      // Apply to this TypedObjectField
      const thisFn = typeof fn === "string" ? this[fn] : fn;
      thisFn?.call(this, data, options);
  
      // Recursively apply to inner fields
      const results = {};
      for ( const key in data ) {
        const r = this.element.apply(fn, data[key], options);
        if ( !options.filter || !isEmpty(r) ) results[key] = r;
      }
      return results;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    _getField(path) {
      if ( path.length === 0 ) return this;
      else if ( path.length === 1 ) return this.element;
      path.shift();
      return this.element._getField(path);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Migrate this field's candidate source data.
     * @param {object} sourceData   Candidate source data of the root model
     * @param {any} fieldData       The value of this field within the source data
     */
    migrateSource(sourceData, fieldData) {
      if ( !(this.element.migrateSource instanceof Function) ) return;
      for ( const key in fieldData ) this.element.migrateSource(sourceData, fieldData[key]);
    }
  }

/* !!V13!! Use TypedObjectField */ 
class CanvasLayerData extends foundry.abstract.DataModel {
    static defineSchema() {
      const fields = foundry.data.fields;
      return {
        hidden: new fields.BooleanField({ required: true, initial: true }),
        layers: new TypedObjectField(new fields.SchemaField({
          id: new fields.StringField({ required: true }),
          name: new fields.StringField({ required: true }),
        })),
      }
    }
}

const ModuleSettings = {
    canvasLayerData: 'canvas-layer-data',
};

const setup = () => {
    game.settings.register(MODULE_ID, ModuleSettings.canvasLayerData, {
        name: '',
        hint: '',
        scope: "world",
        config: false,
        type: CanvasLayerData,
        default: {},
    });
};

/*
Tagify v4.35.0 - tags input component
By: Yair Even-Or <vsync.design@gmail.com>
https://github.com/yairEO/tagify

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

This Software may not be rebranded and sold as a library under any other name
other than "Tagify" (by owner) or as part of another library.
*/

var t="&#8203;";function e(t,e){(null==e||e>t.length)&&(e=t.length);for(var i=0,n=new Array(e);i<e;i++)n[i]=t[i];return n}function i(t){return function(t){if(Array.isArray(t))return e(t)}(t)||function(t){if("undefined"!=typeof Symbol&&null!=t[Symbol.iterator]||null!=t["@@iterator"])return Array.from(t)}(t)||function(t,i){if(!t)return;if("string"==typeof t)return e(t,i);var n=Object.prototype.toString.call(t).slice(8,-1);"Object"===n&&t.constructor&&(n=t.constructor.name);if("Map"===n||"Set"===n)return Array.from(n);if("Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return e(t,i)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}var n={isEnabled:function(){var t;return null===(t=window.TAGIFY_DEBUG)||void 0===t||t},log:function(){for(var t=arguments.length,e=new Array(t),n=0;n<t;n++)e[n]=arguments[n];var s;this.isEnabled()&&(s=console).log.apply(s,["[Tagify]:"].concat(i(e)));},warn:function(){for(var t=arguments.length,e=new Array(t),n=0;n<t;n++)e[n]=arguments[n];var s;this.isEnabled()&&(s=console).warn.apply(s,["[Tagify]:"].concat(i(e)));}},s=function(t,e,i,n){return t=""+t,e=""+e,n&&(t=t.trim(),e=e.trim()),i?t==e:t.toLowerCase()==e.toLowerCase()},a=function(t,e){return t&&Array.isArray(t)&&t.map((function(t){return o(t,e)}))};function o(t,e){var i,n={};for(i in t)e.indexOf(i)<0&&(n[i]=t[i]);return n}function r(t){return (new DOMParser).parseFromString(t.trim(),"text/html").body.firstElementChild}function l(t,e){for(e=e||"previous";t=t[e+"Sibling"];)if(3==t.nodeType)return t}function d(t){return "string"==typeof t?t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/`|'/g,"&#039;"):t}function c(t){var e=Object.prototype.toString.call(t).split(" ")[1].slice(0,-1);return t===Object(t)&&"Array"!=e&&"Function"!=e&&"RegExp"!=e&&"HTMLUnknownElement"!=e}function u(t,e,i){var n,s;function a(t,e){for(var i in e)if(e.hasOwnProperty(i)){if(c(e[i])){c(t[i])?a(t[i],e[i]):t[i]=Object.assign({},e[i]);continue}if(Array.isArray(e[i])){t[i]=Object.assign([],e[i]);continue}t[i]=e[i];}}return n=t,(null!=(s=Object)&&"undefined"!=typeof Symbol&&s[Symbol.hasInstance]?s[Symbol.hasInstance](n):n instanceof s)||(t={}),a(t,e),i&&a(t,i),t}function g(){var t=[],e={},i=true,n=false,s=void 0;try{for(var a,o=arguments[Symbol.iterator]();!(i=(a=o.next()).done);i=!0){var r=a.value,l=!0,d=!1,u=void 0;try{for(var g,h=r[Symbol.iterator]();!(l=(g=h.next()).done);l=!0){var p=g.value;c(p)?e[p.value]||(t.push(p),e[p.value]=1):t.includes(p)||t.push(p);}}catch(t){d=!0,u=t;}finally{try{l||null==h.return||h.return();}finally{if(d)throw u}}}}catch(t){n=true,s=t;}finally{try{i||null==o.return||o.return();}finally{if(n)throw s}}return t}function h(t){return String.prototype.normalize?"string"==typeof t?t.normalize("NFD").replace(/[\u0300-\u036f]/g,""):void 0:t}var p=function(){return /(?=.*chrome)(?=.*android)/i.test(navigator.userAgent)};function f(){return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,(function(t){return (t^crypto.getRandomValues(new Uint8Array(1))[0]&15>>t/4).toString(16)}))}function m(t){var e,i=b.call(this,t),n=null==t||null===(e=t.classList)||void 0===e?void 0:e.contains(this.settings.classNames.tag);return i&&n}function v(t){return b.call(this,t)&&(null==t?void 0:t.closest(this.settings.classNames.tagSelector))}function b(t){var e;return (null==t||null===(e=t.closest)||void 0===e?void 0:e.call(t,this.settings.classNames.namespaceSelector))===this.DOM.scope}function w(t,e){var i=window.getSelection();return e=e||i.getRangeAt(0),"string"==typeof t&&(t=document.createTextNode(t)),e&&(e.deleteContents(),e.insertNode(t)),t}function y(t,e,i){return t?(e&&(t.__tagifyTagData=i?e:u({},t.__tagifyTagData||{},e)),t.__tagifyTagData):(n.warn("tag element doesn't exist",{tagElm:t,data:e}),e)}function T(t){if(t&&t.parentNode){var e=t,i=window.getSelection(),n=i.getRangeAt(0);i.rangeCount&&(n.setStartAfter(e),n.collapse(true),i.removeAllRanges(),i.addRange(n));}}function O(t,e){t.forEach((function(t){if(y(t.previousSibling)||!t.previousSibling){var i=document.createTextNode("​");t.before(i),e&&T(i);}}));}var D={delimiters:",",pattern:null,tagTextProp:"value",maxTags:1/0,callbacks:{},addTagOnBlur:true,addTagOn:["blur","tab","enter"],onChangeAfterBlur:true,duplicates:false,whitelist:[],blacklist:[],enforceWhitelist:false,userInput:true,focusable:true,focusInputOnRemove:true,keepInvalidTags:false,createInvalidTags:true,mixTagsAllowedAfter:/,|\.|\:|\s/,mixTagsInterpolator:["[[","]]"],backspace:true,skipInvalid:false,pasteAsTags:true,editTags:{clicks:2,keepInvalid:true},transformTag:function(){},trim:true,a11y:{focusableTags:false},mixMode:{insertAfterTag:" "},autoComplete:{enabled:true,rightKey:false,tabKey:false},classNames:{namespace:"tagify",mixMode:"tagify--mix",selectMode:"tagify--select",input:"tagify__input",focus:"tagify--focus",tagNoAnimation:"tagify--noAnim",tagInvalid:"tagify--invalid",tagNotAllowed:"tagify--notAllowed",scopeLoading:"tagify--loading",hasMaxTags:"tagify--hasMaxTags",hasNoTags:"tagify--noTags",empty:"tagify--empty",inputInvalid:"tagify__input--invalid",dropdown:"tagify__dropdown",dropdownWrapper:"tagify__dropdown__wrapper",dropdownHeader:"tagify__dropdown__header",dropdownFooter:"tagify__dropdown__footer",dropdownItem:"tagify__dropdown__item",dropdownItemActive:"tagify__dropdown__item--active",dropdownItemHidden:"tagify__dropdown__item--hidden",dropdownItemSelected:"tagify__dropdown__item--selected",dropdownInital:"tagify__dropdown--initial",tag:"tagify__tag",tagText:"tagify__tag-text",tagX:"tagify__tag__removeBtn",tagLoading:"tagify__tag--loading",tagEditing:"tagify__tag--editable",tagFlash:"tagify__tag--flash",tagHide:"tagify__tag--hide"},dropdown:{classname:"",enabled:2,maxItems:10,searchKeys:["value","searchBy"],fuzzySearch:true,caseSensitive:false,accentedSearch:true,includeSelectedTags:false,escapeHTML:true,highlightFirst:true,closeOnSelect:true,clearOnSelect:true,position:"all",appendTarget:null},hooks:{beforeRemoveTag:function(){return Promise.resolve()},beforePaste:function(){return Promise.resolve()},suggestionClick:function(){return Promise.resolve()},beforeKeyDown:function(){return Promise.resolve()}}};function x(t,e,i){return e in t?Object.defineProperty(t,e,{value:i,enumerable:true,configurable:true,writable:true}):t[e]=i,t}function S(t){for(var e=1;e<arguments.length;e++){var i=null!=arguments[e]?arguments[e]:{},n=Object.keys(i);"function"==typeof Object.getOwnPropertySymbols&&(n=n.concat(Object.getOwnPropertySymbols(i).filter((function(t){return Object.getOwnPropertyDescriptor(i,t).enumerable})))),n.forEach((function(e){x(t,e,i[e]);}));}return t}function I(t,e){return e=null!=e?e:{},Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(e)):function(t,e){var i=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);i.push.apply(i,n);}return i}(Object(e)).forEach((function(i){Object.defineProperty(t,i,Object.getOwnPropertyDescriptor(e,i));})),t}function M(t,e){(null==e||e>t.length)&&(e=t.length);for(var i=0,n=new Array(e);i<e;i++)n[i]=t[i];return n}function E(t,e,i){return e in t?Object.defineProperty(t,e,{value:i,enumerable:true,configurable:true,writable:true}):t[e]=i,t}function N(t){return function(t){if(Array.isArray(t))return M(t)}(t)||function(t){if("undefined"!=typeof Symbol&&null!=t[Symbol.iterator]||null!=t["@@iterator"])return Array.from(t)}(t)||function(t,e){if(!t)return;if("string"==typeof t)return M(t,e);var i=Object.prototype.toString.call(t).slice(8,-1);"Object"===i&&t.constructor&&(i=t.constructor.name);if("Map"===i||"Set"===i)return Array.from(i);if("Arguments"===i||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i))return M(t,e)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function A(){for(var t in this.dropdown={},this._dropdown)this.dropdown[t]="function"==typeof this._dropdown[t]?this._dropdown[t].bind(this):this._dropdown[t];this.dropdown.refs(),this.DOM.dropdown.__tagify=this;}var _,C,k=(_=function(t){for(var e=1;e<arguments.length;e++){var i=null!=arguments[e]?arguments[e]:{},n=Object.keys(i);"function"==typeof Object.getOwnPropertySymbols&&(n=n.concat(Object.getOwnPropertySymbols(i).filter((function(t){return Object.getOwnPropertyDescriptor(i,t).enumerable})))),n.forEach((function(e){E(t,e,i[e]);}));}return t}({},{events:{binding:function(){var t=!(arguments.length>0&&void 0!==arguments[0])||arguments[0],e=this.dropdown.events.callbacks,i=this.listeners.dropdown=this.listeners.dropdown||{position:this.dropdown.position.bind(this,null),onKeyDown:e.onKeyDown.bind(this),onMouseOver:e.onMouseOver.bind(this),onMouseLeave:e.onMouseLeave.bind(this),onClick:e.onClick.bind(this),onScroll:e.onScroll.bind(this)},n=t?"addEventListener":"removeEventListener";"manual"!=this.settings.dropdown.position&&(document[n]("scroll",i.position,true),window[n]("resize",i.position),window[n]("keydown",i.onKeyDown)),this.DOM.dropdown[n]("mouseover",i.onMouseOver),this.DOM.dropdown[n]("mouseleave",i.onMouseLeave),this.DOM.dropdown[n]("mousedown",i.onClick),this.DOM.dropdown.content[n]("scroll",i.onScroll);},callbacks:{onKeyDown:function(t){var e=this;if(this.state.hasFocus&&!this.state.composing){var i=this.settings,s=i.dropdown.includeSelectedTags,a=this.DOM.dropdown.querySelector(i.classNames.dropdownItemActiveSelector),o=this.dropdown.getSuggestionDataByNode(a),r="mix"==i.mode,l="select"==i.mode;i.hooks.beforeKeyDown(t,{tagify:this}).then((function(d){switch(t.key){case "ArrowDown":case "ArrowUp":case "Down":case "Up":t.preventDefault();var c=e.dropdown.getAllSuggestionsRefs(),u="ArrowUp"==t.key||"Up"==t.key;a&&(a=e.dropdown.getNextOrPrevOption(a,!u)),a&&a.matches(i.classNames.dropdownItemSelector)||(a=c[u?c.length-1:0]),e.dropdown.highlightOption(a,true);break;case "PageUp":case "PageDown":var g;t.preventDefault();var h=e.dropdown.getAllSuggestionsRefs(),p=Math.floor(e.DOM.dropdown.content.clientHeight/(null===(g=h[0])||void 0===g?void 0:g.offsetHeight))||1,f="PageUp"===t.key;if(a){var m=h.indexOf(a),v=f?Math.max(0,m-p):Math.min(h.length-1,m+p);a=h[v];}else a=h[0];e.dropdown.highlightOption(a,true);break;case "Home":case "End":t.preventDefault();var b=e.dropdown.getAllSuggestionsRefs();a=b["Home"===t.key?0:b.length-1],e.dropdown.highlightOption(a,true);break;case "Escape":case "Esc":e.dropdown.hide();break;case "ArrowRight":if(e.state.actions.ArrowLeft||i.autoComplete.rightKey)return;case "Tab":var w=!i.autoComplete.rightKey||!i.autoComplete.tabKey;if(!r&&!l&&a&&w&&!e.state.editing&&o){t.preventDefault();var y=e.dropdown.getMappedValue(o);return e.state.autoCompleteData=o,e.input.autocomplete.set.call(e,y),false}return  true;case "Enter":t.preventDefault(),e.state.actions.selectOption=true,setTimeout((function(){return e.state.actions.selectOption=false}),100),i.hooks.suggestionClick(t,{tagify:e,tagData:o,suggestionElm:a}).then((function(){if(a){var i=s?a:e.dropdown.getNextOrPrevOption(a,!u);e.dropdown.selectOption(a,t,(function(){if(i){var t=i.getAttribute("value");i=e.dropdown.getSuggestionNodeByValue(t),e.dropdown.highlightOption(i);}}));}else e.dropdown.hide(),r||e.addTags(e.state.inputText.trim(),true);})).catch((function(t){return n.warn(t)}));break;case "Backspace":if(r||e.state.editing.scope)return;var T=e.input.raw.call(e);""!=T&&8203!=T.charCodeAt(0)||(true===i.backspace?e.removeTags():"edit"==i.backspace&&setTimeout(e.editTag.bind(e),0));}}));}},onMouseOver:function(t){var e=t.target.closest(this.settings.classNames.dropdownItemSelector);this.dropdown.highlightOption(e);},onMouseLeave:function(t){this.dropdown.highlightOption();},onClick:function(t){var e=this;if(0==t.button&&t.target!=this.DOM.dropdown&&t.target!=this.DOM.dropdown.content){var i=t.target.closest(this.settings.classNames.dropdownItemSelector),s=this.dropdown.getSuggestionDataByNode(i);this.state.actions.selectOption=true,setTimeout((function(){return e.state.actions.selectOption=false}),100),this.settings.hooks.suggestionClick(t,{tagify:this,tagData:s,suggestionElm:i}).then((function(){i?e.dropdown.selectOption(i,t):e.dropdown.hide();})).catch((function(t){return n.warn(t)}));}},onScroll:function(t){var e=t.target,i=e.scrollTop/(e.scrollHeight-e.parentNode.clientHeight)*100;this.trigger("dropdown:scroll",{percentage:Math.round(i)});}}},refilter:function(t){t=t||this.state.dropdown.query||"",this.suggestedListItems=this.dropdown.filterListItems(t),this.dropdown.fill(),this.suggestedListItems.length||this.dropdown.hide(),this.trigger("dropdown:updated",this.DOM.dropdown);},getSuggestionDataByNode:function(t){for(var e,i=t&&t.getAttribute("value"),n=this.suggestedListItems.length;n--;){if(c(e=this.suggestedListItems[n])&&e.value==i)return e;if(e==i)return {value:e}}},getSuggestionNodeByValue:function(t){return this.dropdown.getAllSuggestionsRefs().find((function(e){return e.getAttribute("value")===t}))},getNextOrPrevOption:function(t){var e=!(arguments.length>1&&void 0!==arguments[1])||arguments[1],i=this.dropdown.getAllSuggestionsRefs(),n=i.findIndex((function(e){return e===t}));return e?i[n+1]:i[n-1]},highlightOption:function(t,e){var i,n=this.settings.classNames.dropdownItemActive;if(this.state.ddItemElm&&(this.state.ddItemElm.classList.remove(n),this.state.ddItemElm.removeAttribute("aria-selected")),!t)return this.state.ddItemData=null,this.state.ddItemElm=null,void this.input.autocomplete.suggest.call(this);i=this.dropdown.getSuggestionDataByNode(t),this.state.ddItemData=i,this.state.ddItemElm=t,t.classList.add(n),t.setAttribute("aria-selected",true),e&&(t.parentNode.scrollTop=t.clientHeight+t.offsetTop-t.parentNode.clientHeight),this.settings.autoComplete&&(this.input.autocomplete.suggest.call(this,i),this.dropdown.position());},selectOption:function(t,e,i){var n=this,s=this.settings,a=s.dropdown.includeSelectedTags,o=s.dropdown,r=o.clearOnSelect,l=o.closeOnSelect;if(!t)return this.addTags(this.state.inputText,true),void(l&&this.dropdown.hide());e=e||{};var d=t.getAttribute("value"),c="noMatch"==d,g="mix"==s.mode,h=this.suggestedListItems.find((function(t){var e;return (null!==(e=t.value)&&void 0!==e?e:t)==d}));if(this.trigger("dropdown:select",{data:h,elm:t,event:e}),h||c){if(this.state.editing){var p=this.normalizeTags([h])[0];h=s.transformTag.call(this,p)||p,this.onEditTagDone(null,u({__isValid:true},h));}else this[g?"addMixTags":"addTags"]([h||this.input.raw.call(this)],r);(g||this.DOM.input.parentNode)&&(setTimeout((function(){n.DOM.input.focus(),n.toggleFocusClass(true);})),l&&setTimeout(this.dropdown.hide.bind(this)),a?i&&i():(t.addEventListener("transitionend",(function(){n.dropdown.fillHeaderFooter(),setTimeout((function(){t.remove(),n.dropdown.refilter(),i&&i();}),100);}),{once:true}),t.classList.add(this.settings.classNames.dropdownItemHidden)));}else l&&setTimeout(this.dropdown.hide.bind(this));},selectAll:function(t){this.suggestedListItems.length=0,this.dropdown.hide(),this.dropdown.filterListItems("");var e=this.dropdown.filterListItems("");return t||(e=this.state.dropdown.suggestions),this.addTags(e,true),this},filterListItems:function(t,e){var i,n,s,a,o,r,l=function(){var t,l,d=void 0,u=void 0;t=m[T],n=(null!=(l=Object)&&"undefined"!=typeof Symbol&&l[Symbol.hasInstance]?l[Symbol.hasInstance](t):t instanceof l)?m[T]:{value:m[T]};var v,b=!Object.keys(n).some((function(t){return y.includes(t)}))?["value"]:y;g.fuzzySearch&&!e.exact?(a=b.reduce((function(t,e){return t+" "+(n[e]||"")}),"").toLowerCase().trim(),g.accentedSearch&&(a=h(a),r=h(r)),d=0==a.indexOf(r),u=a===r,v=a,s=r.toLowerCase().split(" ").every((function(t){return v.includes(t.toLowerCase())}))):(d=true,s=b.some((function(t){var i=""+(n[t]||"");return g.accentedSearch&&(i=h(i),r=h(r)),g.caseSensitive||(i=i.toLowerCase()),u=i===r,e.exact?i===r:0==i.indexOf(r)}))),o=!g.includeSelectedTags&&i.isTagDuplicate(c(n)?n.value:n),s&&!o&&(u&&d?f.push(n):"startsWith"==g.sortby&&d?p.unshift(n):p.push(n));},d=this,u=this.settings,g=u.dropdown,p=(e=e||{},[]),f=[],m=u.whitelist,v=g.maxItems>=0?g.maxItems:1/0,b=g.includeSelectedTags,w="function"==typeof g.sortby,y=g.searchKeys,T=0;if(!(t="select"==u.mode&&this.value.length&&this.value[0][u.tagTextProp]==t?"":t)||!y.length){p=b?m:m.filter((function(t){return !d.isTagDuplicate(c(t)?t.value:t)}));var O=w?g.sortby(p,r):p.slice(0,v);return this.state.dropdown.suggestions=O,O}for(r=g.caseSensitive?""+t:(""+t).toLowerCase();T<m.length;T++)i=this,l();this.state.dropdown.suggestions=f.concat(p);O=w?g.sortby(f.concat(p),r):f.concat(p).slice(0,v);return this.state.dropdown.suggestions=O,O},getMappedValue:function(t){var e=this.settings.dropdown.mapValueTo;return e?"function"==typeof e?e(t):t[e]||t.value:t.value},createListHTML:function(t){var e=this;return u([],t).map((function(t,i){"string"!=typeof t&&"number"!=typeof t||(t={value:t});var n=e.dropdown.getMappedValue(t);return n="string"==typeof n&&e.settings.dropdown.escapeHTML?d(n):n,e.settings.templates.dropdownItem.apply(e,[I(S({},t),{mappedValue:n}),e])})).join("")}}),C=null!=(C={refs:function(){this.DOM.dropdown=this.parseTemplate("dropdown",[this.settings]),this.DOM.dropdown.content=this.DOM.dropdown.querySelector("[data-selector='tagify-suggestions-wrapper']");},getHeaderRef:function(){return this.DOM.dropdown.querySelector("[data-selector='tagify-suggestions-header']")},getFooterRef:function(){return this.DOM.dropdown.querySelector("[data-selector='tagify-suggestions-footer']")},getAllSuggestionsRefs:function(){return N(this.DOM.dropdown.content.querySelectorAll(this.settings.classNames.dropdownItemSelector))},show:function(t){var e,i,n,a=this,o=this.settings,r="mix"==o.mode&&!o.enforceWhitelist,l=!o.whitelist||!o.whitelist.length,d="manual"==o.dropdown.position;if(t=void 0===t?this.state.inputText:t,!(l&&!r&&!o.templates.dropdownItemNoMatch||false===o.dropdown.enabled||this.state.isLoading||this.settings.readonly)){if(clearTimeout(this.dropdownHide__bindEventsTimeout),this.suggestedListItems=this.dropdown.filterListItems(t),t&&!this.suggestedListItems.length&&(this.trigger("dropdown:noMatch",t),o.templates.dropdownItemNoMatch&&(n=o.templates.dropdownItemNoMatch.call(this,{value:t}))),!n){if(this.suggestedListItems.length)t&&r&&!this.state.editing.scope&&!s(this.suggestedListItems[0].value,t)&&this.suggestedListItems.unshift({value:t});else {if(!t||!r||this.state.editing.scope)return this.input.autocomplete.suggest.call(this),void this.dropdown.hide();this.suggestedListItems=[{value:t}];}i=""+(c(e=this.suggestedListItems[0])?e.value:e),o.autoComplete&&i&&0==i.indexOf(t)&&this.input.autocomplete.suggest.call(this,e);}this.dropdown.fill(n),o.dropdown.highlightFirst&&this.dropdown.highlightOption(this.DOM.dropdown.content.querySelector(o.classNames.dropdownItemSelector)),this.state.dropdown.visible||setTimeout(this.dropdown.events.binding.bind(this)),this.state.dropdown.visible=t||true,this.state.dropdown.query=t,this.setStateSelection(),d||setTimeout((function(){a.dropdown.position(),a.dropdown.render();})),setTimeout((function(){a.trigger("dropdown:show",a.DOM.dropdown);}));}},hide:function(t){var e=this,i=this.DOM,n=i.scope,s=i.dropdown,a="manual"==this.settings.dropdown.position&&!t;if(s&&document.body.contains(s)&&!a)return window.removeEventListener("resize",this.dropdown.position),this.dropdown.events.binding.call(this,false),n.setAttribute("aria-expanded",false),s.parentNode.removeChild(s),setTimeout((function(){e.state.dropdown.visible=false;}),100),this.state.dropdown.query=this.state.ddItemData=this.state.ddItemElm=this.state.selection=null,this.state.tag&&this.state.tag.value.length&&(this.state.flaggedTags[this.state.tag.baseOffset]=this.state.tag),this.trigger("dropdown:hide",s),this},toggle:function(t){this.dropdown[this.state.dropdown.visible&&!t?"hide":"show"]();},getAppendTarget:function(){var t=this.settings.dropdown;return "function"==typeof t.appendTarget?t.appendTarget():t.appendTarget},render:function(){var t,e,i,n=this,s=(t=this.DOM.dropdown,(i=t.cloneNode(true)).style.cssText="position:fixed; top:-9999px; opacity:0",document.body.appendChild(i),e=i.clientHeight,i.parentNode.removeChild(i),e),a=this.settings,o=this.dropdown.getAppendTarget();return  false===a.dropdown.enabled||(this.DOM.scope.setAttribute("aria-expanded",true),document.body.contains(this.DOM.dropdown)||(this.DOM.dropdown.classList.add(a.classNames.dropdownInital),this.dropdown.position(s),o.appendChild(this.DOM.dropdown),setTimeout((function(){return n.DOM.dropdown.classList.remove(a.classNames.dropdownInital)})))),this},fill:function(t){t="string"==typeof t?t:this.dropdown.createListHTML(t||this.suggestedListItems);var e,i=this.settings.templates.dropdownContent.call(this,t);this.DOM.dropdown.content.innerHTML=(e=i)?e.replace(/\>[\r\n ]+\</g,"><").split(/>\s+</).join("><").trim():"";},fillHeaderFooter:function(){var t=this.dropdown.filterListItems(this.state.dropdown.query),e=this.parseTemplate("dropdownHeader",[t]),i=this.parseTemplate("dropdownFooter",[t]),n=this.dropdown.getHeaderRef(),s=this.dropdown.getFooterRef();e&&(null==n||n.parentNode.replaceChild(e,n)),i&&(null==s||s.parentNode.replaceChild(i,s));},position:function(t){var e=this.settings.dropdown,i=this.dropdown.getAppendTarget();if("manual"!=e.position&&i){var n,s,a,o,r,l,d,c,u,g,h=this.DOM.dropdown,p=e.RTL,f=i===document.body,m=i===this.DOM.scope,v=f?window.pageYOffset:i.scrollTop,b=document.fullscreenElement||document.webkitFullscreenElement||document.documentElement,w=b.clientHeight,y=Math.max(b.clientWidth||0,window.innerWidth||0),T=y>480?e.position:"all",O=this.DOM["input"==T?"input":"scope"];if(t=t||h.clientHeight,this.state.dropdown.visible){if("text"==T?(a=(n=function(){var t=document.getSelection();if(t.rangeCount){var e,i,n=t.getRangeAt(0),s=n.startContainer,a=n.startOffset;if(a>0)return (i=document.createRange()).setStart(s,a-1),i.setEnd(s,a),{left:(e=i.getBoundingClientRect()).right,top:e.top,bottom:e.bottom};if(s.getBoundingClientRect)return s.getBoundingClientRect()}return {left:-9999,top:-9999}}()).bottom,s=n.top,o=n.left,r="auto"):(l=function(t){var e=0,i=0;for(t=t.parentNode;t&&t!=b;)e+=t.offsetTop||0,i+=t.offsetLeft||0,t=t.parentNode;return {top:e,left:i}}(i),n=O.getBoundingClientRect(),s=m?-1:n.top-l.top,a=(m?n.height:n.bottom-l.top)-1,o=m?-1:n.left-l.left,r=n.width+"px"),!f){var D=function(){for(var t=0,i=e.appendTarget.parentNode;i;)t+=i.scrollTop||0,i=i.parentNode;return t}();s+=D,a+=D;}var x;s=Math.floor(s),a=Math.ceil(a),c=y-o<120,u=((d=null!==(x=e.placeAbove)&&void 0!==x?x:w-n.bottom<t)?s:a)+v,g=o+(p&&n.width||0)+window.pageXOffset,g="text"==T&&c?"right: 0;":"left: ".concat(g,"px;"),h.style.cssText="".concat(g," top: ").concat(u,"px; min-width: ").concat(r,"; max-width: ").concat(r),h.setAttribute("placement",d?"top":"bottom"),h.setAttribute("position",T);}}}})?C:{},Object.getOwnPropertyDescriptors?Object.defineProperties(_,Object.getOwnPropertyDescriptors(C)):function(t,e){var i=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);i.push.apply(i,n);}return i}(Object(C)).forEach((function(t){Object.defineProperty(_,t,Object.getOwnPropertyDescriptor(C,t));})),_),L="@yaireo/tagify/",P={empty:"empty",exceed:"number of tags exceeded",pattern:"pattern mismatch",duplicate:"already exists",notAllowed:"not allowed"},j={wrapper:function(e,i){return '<tags class="'.concat(i.classNames.namespace," ").concat(i.mode?"".concat(i.classNames[i.mode+"Mode"]):""," ").concat(e.className,'"\n                    ').concat(i.readonly?"readonly":"","\n                    ").concat(i.disabled?"disabled":"","\n                    ").concat(i.required?"required":"","\n                    ").concat("select"===i.mode?"spellcheck='false'":"",'\n                    tabIndex="-1">\n                    ').concat(this.settings.templates.input.call(this),"\n                ").concat(t,"\n        </tags>")},input:function(){var e=this.settings,i=e.placeholder||t;return "<span ".concat(!e.readonly&&e.userInput?"contenteditable":"",' data-can-editable tabIndex="0" data-placeholder="').concat(i,'" aria-placeholder="').concat(e.placeholder||"",'"\n                    class="').concat(e.classNames.input,'"\n                    role="textbox"\n                    autocapitalize="false"\n                    autocorrect="off"\n                    aria-autocomplete="both"\n                    aria-multiline="').concat("mix"==e.mode,'"></span>')},tag:function(t,e){var i=e.settings;return '<tag title="'.concat(t.title||t.value,"\"\n                    contenteditable='false'\n                    tabIndex=\"").concat(i.a11y.focusableTags?0:-1,'"\n                    class="').concat(i.classNames.tag," ").concat(t.class||"",'"\n                    ').concat(this.getAttributes(t),">\n            <x title='' tabIndex=\"").concat(i.a11y.focusableTags?0:-1,'" class="').concat(i.classNames.tagX,"\" role='button' aria-label='remove tag'></x>\n            <div>\n                <span ").concat("select"===i.mode&&i.userInput?"contenteditable='true'":"",' autocapitalize="false" autocorrect="off" spellcheck=\'false\' class="').concat(i.classNames.tagText,'">').concat(t[i.tagTextProp]||t.value,"</span>\n            </div>\n        </tag>")},dropdown:function(t){var e=t.dropdown,i="manual"==e.position;return '<div class="'.concat(i?"":t.classNames.dropdown," ").concat(e.classname,'" role="listbox" aria-labelledby="dropdown" dir="').concat(e.RTL?"rtl":"","\">\n                    <div data-selector='tagify-suggestions-wrapper' class=\"").concat(t.classNames.dropdownWrapper,'"></div>\n                </div>')},dropdownContent:function(t){var e=this.settings.templates,i=this.state.dropdown.suggestions;return "\n            ".concat(e.dropdownHeader.call(this,i),"\n            ").concat(t,"\n            ").concat(e.dropdownFooter.call(this,i),"\n        ")},dropdownItem:function(t){return "<div ".concat(this.getAttributes(t),"\n                    class='").concat(this.settings.classNames.dropdownItem," ").concat(this.isTagDuplicate(t.value)?this.settings.classNames.dropdownItemSelected:""," ").concat(t.class||"",'\'\n                    tabindex="0"\n                    role="option">').concat(t.mappedValue||t.value,"</div>")},dropdownHeader:function(t){return "<header data-selector='tagify-suggestions-header' class=\"".concat(this.settings.classNames.dropdownHeader,'"></header>')},dropdownFooter:function(t){var e=t.length-this.settings.dropdown.maxItems;return e>0?"<footer data-selector='tagify-suggestions-footer' class=\"".concat(this.settings.classNames.dropdownFooter,'">\n                ').concat(e," more items. Refine your search.\n            </footer>"):""},dropdownItemNoMatch:null};function V(t,e){(null==e||e>t.length)&&(e=t.length);for(var i=0,n=new Array(e);i<e;i++)n[i]=t[i];return n}function R(t,e){return null!=e&&"undefined"!=typeof Symbol&&e[Symbol.hasInstance]?!!e[Symbol.hasInstance](t):t instanceof e}function F(t,e){return function(t){if(Array.isArray(t))return t}(t)||function(t,e){var i=null==t?null:"undefined"!=typeof Symbol&&t[Symbol.iterator]||t["@@iterator"];if(null!=i){var n,s,a=[],o=true,r=false;try{for(i=i.call(t);!(o=(n=i.next()).done)&&(a.push(n.value),!e||a.length!==e);o=!0);}catch(t){r=true,s=t;}finally{try{o||null==i.return||i.return();}finally{if(r)throw s}}return a}}(t,e)||function(t,e){if(!t)return;if("string"==typeof t)return V(t,e);var i=Object.prototype.toString.call(t).slice(8,-1);"Object"===i&&t.constructor&&(i=t.constructor.name);if("Map"===i||"Set"===i)return Array.from(i);if("Arguments"===i||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i))return V(t,e)}(t,e)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function H(t,e){(null==e||e>t.length)&&(e=t.length);for(var i=0,n=new Array(e);i<e;i++)n[i]=t[i];return n}function B(t,e,i){return e in t?Object.defineProperty(t,e,{value:i,enumerable:true,configurable:true,writable:true}):t[e]=i,t}function W(t,e){return null!=e&&"undefined"!=typeof Symbol&&e[Symbol.hasInstance]?!!e[Symbol.hasInstance](t):t instanceof e}function q(t,e){return e=null!=e?e:{},Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(e)):function(t,e){var i=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);i.push.apply(i,n);}return i}(Object(e)).forEach((function(i){Object.defineProperty(t,i,Object.getOwnPropertyDescriptor(e,i));})),t}function U(t){return function(t){if(Array.isArray(t))return H(t)}(t)||function(t){if("undefined"!=typeof Symbol&&null!=t[Symbol.iterator]||null!=t["@@iterator"])return Array.from(t)}(t)||function(t,e){if(!t)return;if("string"==typeof t)return H(t,e);var i=Object.prototype.toString.call(t).slice(8,-1);"Object"===i&&t.constructor&&(i=t.constructor.name);if("Map"===i||"Set"===i)return Array.from(i);if("Arguments"===i||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i))return H(t,e)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}var K={customBinding:function(){var t=this;this.customEventsList.forEach((function(e){t.on(e,t.settings.callbacks[e]);}));},binding:function(){var t,e=!(arguments.length>0&&void 0!==arguments[0])||arguments[0],i=this.settings,n=this.events.callbacks,s=e?"addEventListener":"removeEventListener";if(!(this.state.mainEvents&&e||i.disabled||i.readonly)){for(var a in this.state.mainEvents=e,e&&!this.listeners.main&&(this.events.bindGlobal.call(this),this.settings.isJQueryPlugin&&jQuery(this.DOM.originalInput).on("tagify.removeAllTags",this.removeAllTags.bind(this))),t=this.listeners.main=this.listeners.main||{keydown:["input",n.onKeydown.bind(this)],click:["scope",n.onClickScope.bind(this)],dblclick:"select"!=i.mode&&["scope",n.onDoubleClickScope.bind(this)],paste:["input",n.onPaste.bind(this)],drop:["input",n.onDrop.bind(this)],compositionstart:["input",n.onCompositionStart.bind(this)],compositionend:["input",n.onCompositionEnd.bind(this)]})t[a]&&this.DOM[t[a][0]][s](a,t[a][1]);var o=this.listeners.main.inputMutationObserver||new MutationObserver(n.onInputDOMChange.bind(this));o.disconnect(),"mix"==i.mode&&o.observe(this.DOM.input,{childList:true}),this.events.bindOriginaInputListener.call(this);}},bindOriginaInputListener:function(t){var e=(t||0)+500;this.listeners.main&&(clearInterval(this.listeners.main.originalInputValueObserverInterval),this.listeners.main.originalInputValueObserverInterval=setInterval(this.events.callbacks.observeOriginalInputValue.bind(this),e));},bindGlobal:function(t){var e,i=this.events.callbacks,n=t?"removeEventListener":"addEventListener";if(this.listeners&&(t||!this.listeners.global)){this.listeners.global=this.listeners.global||[{type:this.isIE?"keydown":"input",target:this.DOM.input,cb:i[this.isIE?"onInputIE":"onInput"].bind(this)},{type:"keydown",target:window,cb:i.onWindowKeyDown.bind(this)},{type:"focusin",target:this.DOM.scope,cb:i.onFocusBlur.bind(this)},{type:"focusout",target:this.DOM.scope,cb:i.onFocusBlur.bind(this)},{type:"click",target:document,cb:i.onClickAnywhere.bind(this),useCapture:true}];var s=true,a=false,o=void 0;try{for(var r,l=this.listeners.global[Symbol.iterator]();!(s=(r=l.next()).done);s=!0)(e=r.value).target[n](e.type,e.cb,!!e.useCapture);}catch(t){a=true,o=t;}finally{try{s||null==l.return||l.return();}finally{if(a)throw o}}}},unbindGlobal:function(){this.events.bindGlobal.call(this,true);},callbacks:{onFocusBlur:function(t){var e,i,n=this.settings,s=v.call(this,t.relatedTarget),a=m.call(this,t.target),o=t.target.classList.contains(n.classNames.tagX),r="focusin"==t.type,l="focusout"==t.type;o&&"mix"!=n.mode&&n.focusInputOnRemove&&this.DOM.input.focus(),s&&r&&!a&&!o&&this.toggleFocusClass(this.state.hasFocus=+new Date);var d=t.target?this.trim(this.DOM.input.textContent):"",c=null===(i=this.value)||void 0===i||null===(e=i[0])||void 0===e?void 0:e[n.tagTextProp],u=n.dropdown.enabled>=0,g={relatedTarget:t.relatedTarget},h=this.state.actions.selectOption&&(u||!n.dropdown.closeOnSelect),p=this.state.actions.addNew&&u;if(l){if(t.relatedTarget===this.DOM.scope)return this.dropdown.hide(),void this.DOM.input.focus();this.postUpdate(),n.onChangeAfterBlur&&this.triggerChangeEvent();}if(!(h||p||o))if(this.state.hasFocus=!(!r&&!s)&&+new Date,this.toggleFocusClass(this.state.hasFocus),"mix"!=n.mode){if(r){if(!n.focusable)return;var f=0===n.dropdown.enabled&&!this.state.dropdown.visible,b=this.DOM.scope.querySelector(this.settings.classNames.tagTextSelector);return this.trigger("focus",g),void(f&&!a&&(this.dropdown.show(this.value.length?"":void 0),"select"===n.mode&&this.setRangeAtStartEnd(false,b)))}if(l){if(this.trigger("blur",g),this.loading(false),"select"==n.mode){if(this.value.length){var w=this.getTagElms()[0];d=this.trim(w.textContent);}c===d&&(d="");}d&&!this.state.actions.selectOption&&n.addTagOnBlur&&n.addTagOn.includes("blur")&&this.addTags(d,true);}s||(this.DOM.input.removeAttribute("style"),this.dropdown.hide());}else r?this.trigger("focus",g):l&&(this.trigger("blur",g),this.loading(false),this.dropdown.hide(),this.state.dropdown.visible=void 0,this.setStateSelection());},onCompositionStart:function(t){this.state.composing=true;},onCompositionEnd:function(t){this.state.composing=false;},onWindowKeyDown:function(t){var e,i=this.settings,n=document.activeElement,s=v.call(this,n)&&this.DOM.scope.contains(n),a=n===this.DOM.input,o=s&&n.hasAttribute("readonly"),r=this.DOM.scope.querySelector(this.settings.classNames.tagTextSelector),l=this.state.dropdown.visible;if(("Tab"===t.key&&l||this.state.hasFocus||s&&!o)&&!a){e=n.nextElementSibling;var d=t.target.classList.contains(i.classNames.tagX);switch(t.key){case "Backspace":i.readonly||this.state.editing||(this.removeTags(n),(e||this.DOM.input).focus());break;case "Enter":if(d)return void this.removeTags(t.target.parentNode);i.a11y.focusableTags&&m.call(this,n)&&setTimeout(this.editTag.bind(this),0,n);break;case "ArrowDown":this.state.dropdown.visible||"mix"==i.mode||this.dropdown.show();break;case "Tab":null==r||r.focus();}}},onKeydown:function(t){var e=this,i=this.settings;if(!this.state.composing&&i.userInput){"select"==i.mode&&i.enforceWhitelist&&this.value.length&&"Tab"!=t.key&&t.preventDefault();var n=this.trim(t.target.textContent);this.trigger("keydown",{event:t}),i.hooks.beforeKeyDown(t,{tagify:this}).then((function(s){if("mix"==i.mode){switch(t.key){case "Left":case "ArrowLeft":e.state.actions.ArrowLeft=true;break;case "Delete":case "Backspace":if(e.state.editing)return;var a=document.getSelection(),o="Delete"==t.key&&a.anchorOffset==(a.anchorNode.length||0),r=a.anchorNode.previousSibling,d=1==a.anchorNode.nodeType||!a.anchorOffset&&r&&1==r.nodeType&&a.anchorNode.previousSibling;!function(t){var e=document.createElement("div");t.replace(/\&#?[0-9a-z]+;/gi,(function(t){return e.innerHTML=t,e.innerText}));}(e.DOM.input.innerHTML);var c,u,g,h=e.getTagElms(),f=1===a.anchorNode.length&&a.anchorNode.nodeValue==String.fromCharCode(8203);if("edit"==i.backspace&&d)return c=1==a.anchorNode.nodeType?null:a.anchorNode.previousElementSibling,setTimeout(e.editTag.bind(e),0,c),void t.preventDefault();if(p()&&W(d,Element))return g=l(d),d.hasAttribute("readonly")||d.remove(),e.DOM.input.focus(),void setTimeout((function(){T(g),e.DOM.input.click();}));if("BR"==a.anchorNode.nodeName)return;if((o||d)&&1==a.anchorNode.nodeType?u=0==a.anchorOffset?o?h[0]:null:h[Math.min(h.length,a.anchorOffset)-1]:o?u=a.anchorNode.nextElementSibling:W(d,Element)&&(u=d),3==a.anchorNode.nodeType&&!a.anchorNode.nodeValue&&a.anchorNode.previousElementSibling&&t.preventDefault(),(d||o)&&!i.backspace)return void t.preventDefault();if("Range"!=a.type&&!a.anchorOffset&&a.anchorNode==e.DOM.input&&"Delete"!=t.key)return void t.preventDefault();if("Range"!=a.type&&u&&u.hasAttribute("readonly"))return void T(l(u));"Delete"==t.key&&f&&y(a.anchorNode.nextSibling)&&e.removeTags(a.anchorNode.nextSibling);}return  true}var m="manual"==i.dropdown.position;switch(t.key){case "Backspace":"select"==i.mode&&i.enforceWhitelist&&e.value.length?e.removeTags():e.state.dropdown.visible&&"manual"!=i.dropdown.position||""!=t.target.textContent&&8203!=n.charCodeAt(0)||(true===i.backspace?e.removeTags():"edit"==i.backspace&&setTimeout(e.editTag.bind(e),0));break;case "Esc":case "Escape":if(e.state.dropdown.visible)return;t.target.blur();break;case "Down":case "ArrowDown":e.state.dropdown.visible||e.dropdown.show();break;case "ArrowRight":var v=e.state.inputSuggestion||e.state.ddItemData;if(v&&i.autoComplete.rightKey)return void e.addTags([v],true);break;case "Tab":return  true;case "Enter":if(e.state.dropdown.visible&&!m)return;t.preventDefault();var b=e.state.autoCompleteData||n;setTimeout((function(){e.state.dropdown.visible&&!m||e.state.actions.selectOption||!i.addTagOn.includes(t.key.toLowerCase())||(e.addTags([b],true),e.state.autoCompleteData=null);}));}})).catch((function(t){return t}));}},onInput:function(t){this.postUpdate();var e=this.settings;if("mix"==e.mode)return this.events.callbacks.onMixTagsInput.call(this,t);var i=this.input.normalize.call(this,void 0,{trim:false}),n=i.length>=e.dropdown.enabled,s={value:i,inputElm:this.DOM.input},a=this.validateTag({value:i});"select"==e.mode&&this.toggleScopeValidation(a),s.isValid=a,this.state.inputText!=i&&(this.input.set.call(this,i,false),-1!=i.search(e.delimiters)?this.addTags(i)&&this.input.set.call(this):e.dropdown.enabled>=0&&this.dropdown[n?"show":"hide"](i),this.trigger("input",s));},onMixTagsInput:function(t){var e,i,n,s,a,o,r,l,d=this,c=this.settings,g=this.value.length,h=this.getTagElms(),f=document.createDocumentFragment(),m=window.getSelection().getRangeAt(0),v=[].map.call(h,(function(t){return y(t).value}));if("deleteContentBackward"==t.inputType&&p()&&this.events.callbacks.onKeydown.call(this,{target:t.target,key:"Backspace"}),O(this.getTagElms()),this.value.slice().forEach((function(t){t.readonly&&!v.includes(t.value)&&f.appendChild(d.createTagElem(t));})),f.childNodes.length&&(m.insertNode(f),this.setRangeAtStartEnd(false,f.lastChild)),h.length!=g)return this.value=[].map.call(this.getTagElms(),(function(t){return y(t)})),void this.update({withoutChangeEvent:true});if(this.hasMaxTags())return  true;if(window.getSelection&&(o=window.getSelection()).rangeCount>0&&3==o.anchorNode.nodeType){if((m=o.getRangeAt(0).cloneRange()).collapse(true),m.setStart(o.focusNode,0),n=(e=m.toString().slice(0,m.endOffset)).split(c.pattern).length-1,(i=e.match(c.pattern))&&(s=e.slice(e.lastIndexOf(i[i.length-1]))),s){if(this.state.actions.ArrowLeft=false,this.state.tag={prefix:s.match(c.pattern)[0],value:s.replace(c.pattern,"")},this.state.tag.baseOffset=o.baseOffset-this.state.tag.value.length,l=this.state.tag.value.match(c.delimiters))return this.state.tag.value=this.state.tag.value.replace(c.delimiters,""),this.state.tag.delimiters=l[0],this.addTags(this.state.tag.value,c.dropdown.clearOnSelect),void this.dropdown.hide();a=this.state.tag.value.length>=c.dropdown.enabled;try{r=(r=this.state.flaggedTags[this.state.tag.baseOffset]).prefix==this.state.tag.prefix&&r.value[0]==this.state.tag.value[0],this.state.flaggedTags[this.state.tag.baseOffset]&&!this.state.tag.value&&delete this.state.flaggedTags[this.state.tag.baseOffset];}catch(t){}(r||n<this.state.mixMode.matchedPatternCount)&&(a=false);}else this.state.flaggedTags={};this.state.mixMode.matchedPatternCount=n;}setTimeout((function(){d.update({withoutChangeEvent:true}),d.trigger("input",u({},d.state.tag,{textContent:d.DOM.input.textContent})),d.state.tag&&d.dropdown[a?"show":"hide"](d.state.tag.value);}),10);},onInputIE:function(t){var e=this;setTimeout((function(){e.events.callbacks.onInput.call(e,t);}));},observeOriginalInputValue:function(){this.DOM.originalInput.parentNode||this.destroy(),this.DOM.originalInput.value!=this.DOM.originalInput.tagifyValue&&this.loadOriginalValues();},onClickAnywhere:function(t){if(t.target!=this.DOM.scope&&!this.DOM.scope.contains(t.target)){this.toggleFocusClass(false),this.state.hasFocus=false;var e=t.target.closest(this.settings.classNames.dropdownSelector);(null==e?void 0:e.__tagify)!=this&&this.dropdown.hide();}},onClickScope:function(t){var e=this.settings,i=t.target.closest("."+e.classNames.tag);t.target,this.DOM.scope;var n=+new Date-this.state.hasFocus;if(!t.target.classList.contains(e.classNames.tagX))return i&&!this.state.editing?(this.trigger("click",{tag:i,index:this.getNodeIndex(i),data:y(i),event:t}),void(1!==e.editTags&&1!==e.editTags.clicks&&"select"!=e.mode||this.events.callbacks.onDoubleClickScope.call(this,t))):void(t.target==this.DOM.input&&("mix"==e.mode&&this.fixFirefoxLastTagNoCaret(),n>500||!e.focusable)?this.state.dropdown.visible?this.dropdown.hide():0===e.dropdown.enabled&&"mix"!=e.mode&&this.dropdown.show(this.value.length?"":void 0):"select"!=e.mode||0!==e.dropdown.enabled||this.state.dropdown.visible||(this.events.callbacks.onDoubleClickScope.call(this,q(function(t){for(var e=1;e<arguments.length;e++){var i=null!=arguments[e]?arguments[e]:{},n=Object.keys(i);"function"==typeof Object.getOwnPropertySymbols&&(n=n.concat(Object.getOwnPropertySymbols(i).filter((function(t){return Object.getOwnPropertyDescriptor(i,t).enumerable})))),n.forEach((function(e){B(t,e,i[e]);}));}return t}({},t),{target:this.getTagElms()[0]})),!e.userInput&&this.dropdown.show()));this.removeTags(t.target.parentNode);},onPaste:function(t){var e=this;t.preventDefault();var i,n,s,a=this.settings;if(!a.userInput)return  false;a.readonly||(n=t.clipboardData||window.clipboardData,s=n.getData("Text"),a.hooks.beforePaste(t,{tagify:this,pastedText:s,clipboardData:n}).then((function(a){ void 0===a&&(a=s),a&&(e.injectAtCaret(a,window.getSelection().getRangeAt(0)),"mix"==e.settings.mode?e.events.callbacks.onMixTagsInput.call(e,t):e.settings.pasteAsTags?i=e.addTags(e.state.inputText+a,true):(e.state.inputText=a,e.dropdown.show(a))),e.trigger("paste",{event:t,pastedText:s,clipboardData:n,tagsElems:i});})).catch((function(t){return t})));},onDrop:function(t){t.preventDefault();},onEditTagInput:function(t,e){var i,n=t.closest("."+this.settings.classNames.tag),s=this.getNodeIndex(n),a=y(n),o=this.input.normalize.call(this,t),r=(B(i={},this.settings.tagTextProp,o),B(i,"__tagId",a.__tagId),i),l=this.validateTag(r);this.editTagChangeDetected(u(a,r))||true!==t.originalIsValid||(l=true),n.classList.toggle(this.settings.classNames.tagInvalid,true!==l),a.__isValid=l,n.title=true===l?a.title||a.value:l,o.length>=this.settings.dropdown.enabled&&(this.state.editing&&(this.state.editing.value=o),this.dropdown.show(o)),this.trigger("edit:input",{tag:n,index:s,data:u({},this.value[s],{newValue:o}),event:e});},onEditTagPaste:function(t,e){var i=(e.clipboardData||window.clipboardData).getData("Text");e.preventDefault();var n=w(i);this.setRangeAtStartEnd(false,n);},onEditTagClick:function(t,e){this.events.callbacks.onClickScope.call(this,e);},onEditTagFocus:function(t){this.state.editing={scope:t,input:t.querySelector("[contenteditable]")};},onEditTagBlur:function(t,e){var i=m.call(this,e.relatedTarget);if("select"==this.settings.mode&&i&&e.relatedTarget.contains(e.target))this.dropdown.hide();else if(this.state.editing&&(this.state.hasFocus||this.toggleFocusClass(),this.DOM.scope.contains(document.activeElement)||this.trigger("blur",{}),this.DOM.scope.contains(t))){var n,s,a,o=this.settings,r=t.closest("."+o.classNames.tag),l=y(r),d=this.input.normalize.call(this,t),c=(B(n={},o.tagTextProp,d),B(n,"__tagId",l.__tagId),n),g=l.__originalData,h=this.editTagChangeDetected(u(l,c)),p=this.validateTag(c);if(d)if(h){var f;if(s=this.hasMaxTags(),a=u({},g,(B(f={},o.tagTextProp,this.trim(d)),B(f,"__isValid",p),f)),o.transformTag.call(this,a,g),true!==(p=(!s||true===g.__isValid)&&this.validateTag(a))){if(this.trigger("invalid",{data:a,tag:r,message:p}),o.editTags.keepInvalid)return;o.keepInvalidTags?a.__isValid=p:a=g;}else o.keepInvalidTags&&(delete a.title,delete a["aria-invalid"],delete a.class);this.onEditTagDone(r,a);}else this.onEditTagDone(r,g);else this.onEditTagDone(r);}},onEditTagkeydown:function(t,e){if(!this.state.composing)switch(this.trigger("edit:keydown",{event:t}),t.key){case "Esc":case "Escape":this.state.editing=false,!!e.__tagifyTagData.__originalData.value?e.parentNode.replaceChild(e.__tagifyTagData.__originalHTML,e):e.remove();break;case "Enter":case "Tab":t.preventDefault();setTimeout((function(){return t.target.blur()}),0);}},onDoubleClickScope:function(t){var e=t.target.closest("."+this.settings.classNames.tag);if(e){var i,n,s=y(e),a=this.settings;false!==(null==s?void 0:s.editable)&&(i=e.classList.contains(this.settings.classNames.tagEditing),n=e.hasAttribute("readonly"),a.readonly||i||n||!this.settings.editTags||!a.userInput||(this.events.callbacks.onEditTagFocus.call(this,e),this.editTag(e)),this.toggleFocusClass(true),"select"!=a.mode&&this.trigger("dblclick",{tag:e,index:this.getNodeIndex(e),data:y(e)}));}},onInputDOMChange:function(t){var e=this;t.forEach((function(t){t.addedNodes.forEach((function(t){if("<div><br></div>"==t.outerHTML)t.replaceWith(document.createElement("br"));else if(1==t.nodeType&&t.querySelector(e.settings.classNames.tagSelector)){var i,n=document.createTextNode("");3==t.childNodes[0].nodeType&&"BR"!=t.previousSibling.nodeName&&(n=document.createTextNode("\n")),(i=t).replaceWith.apply(i,U([n].concat(U(U(t.childNodes).slice(0,-1))))),T(n);}else if(m.call(e,t)){var s;if(3!=(null===(s=t.previousSibling)||void 0===s?void 0:s.nodeType)||t.previousSibling.textContent||t.previousSibling.remove(),t.previousSibling&&"BR"==t.previousSibling.nodeName){t.previousSibling.replaceWith("\n​");for(var a=t.nextSibling,o="";a;)o+=a.textContent,a=a.nextSibling;o.trim()&&T(t.previousSibling);}else t.previousSibling&&!y(t.previousSibling)||t.before("​");}})),t.removedNodes.forEach((function(t){t&&"BR"==t.nodeName&&m.call(e,i)&&(e.removeTags(i),e.fixFirefoxLastTagNoCaret());}));}));var i=this.DOM.input.lastChild;i&&""==i.nodeValue&&i.remove(),i&&"BR"==i.nodeName||this.DOM.input.appendChild(document.createElement("br"));}}};function z(t,e){(null==e||e>t.length)&&(e=t.length);for(var i=0,n=new Array(e);i<e;i++)n[i]=t[i];return n}function X(t,e,i){return e in t?Object.defineProperty(t,e,{value:i,enumerable:true,configurable:true,writable:true}):t[e]=i,t}function J(t,e){return null!=e&&"undefined"!=typeof Symbol&&e[Symbol.hasInstance]?!!e[Symbol.hasInstance](t):t instanceof e}function G(t){for(var e=1;e<arguments.length;e++){var i=null!=arguments[e]?arguments[e]:{},n=Object.keys(i);"function"==typeof Object.getOwnPropertySymbols&&(n=n.concat(Object.getOwnPropertySymbols(i).filter((function(t){return Object.getOwnPropertyDescriptor(i,t).enumerable})))),n.forEach((function(e){X(t,e,i[e]);}));}return t}function $(t){return function(t){if(Array.isArray(t))return z(t)}(t)||function(t){if("undefined"!=typeof Symbol&&null!=t[Symbol.iterator]||null!=t["@@iterator"])return Array.from(t)}(t)||function(t,e){if(!t)return;if("string"==typeof t)return z(t,e);var i=Object.prototype.toString.call(t).slice(8,-1);"Object"===i&&t.constructor&&(i=t.constructor.name);if("Map"===i||"Set"===i)return Array.from(i);if("Arguments"===i||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i))return z(t,e)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function Q(t,e){if(!t){n.warn("input element not found",t);var i=new Proxy(this,{get:function(){return function(){return i}}});return i}if(t.__tagify)return n.warn("input element is already Tagified - Same instance is returned.",t),t.__tagify;var s;u(this,function(t){var e=document.createTextNode(""),i={};function s(t,i,n){n&&i.split(/\s+/g).forEach((function(i){return e[t+"EventListener"].call(e,i,n)}));}return {removeAllCustomListeners:function(){Object.entries(i).forEach((function(t){var e=F(t,2),i=e[0];e[1].forEach((function(t){return s("remove",i,t)}));})),i={};},off:function(t,e){return t&&(e?s("remove",t,e):t.split(/\s+/g).forEach((function(t){var e;null===(e=i[t])||void 0===e||e.forEach((function(e){return s("remove",t,e)})),delete i[t];}))),this},on:function(t,e){return e&&"function"==typeof e&&(t.split(/\s+/g).forEach((function(t){Array.isArray(i[t])?i[t].push(e):i[t]=[e];})),s("add",t,e)),this},trigger:function(i,s,a){var o;if(a=a||{cloneData:true},i)if(t.settings.isJQueryPlugin)"remove"==i&&(i="removeTag"),jQuery(t.DOM.originalInput).triggerHandler(i,[s]);else {try{var r="object"==typeof s?s:{value:s};if((r=a.cloneData?u({},r):r).tagify=this,s.event&&(r.event=this.cloneEvent(s.event)),R(s,Object))for(var l in s)R(s[l],HTMLElement)&&(r[l]=s[l]);o=new CustomEvent(i,{detail:r});}catch(t){n.warn(t);}e.dispatchEvent(o);}}}}(this)),this.isFirefox=/firefox|fxios/i.test(navigator.userAgent)&&!/seamonkey/i.test(navigator.userAgent),this.isIE=window.document.documentMode,e=e||{},this.getPersistedData=(s=e.id,function(t){var e;if(s){var i,n="/"+t;if(1===(null===(e=localStorage)||void 0===e?void 0:e.getItem(L+s+"/v")))try{i=JSON.parse(localStorage[L+s+n]);}catch(t){}return i}}),this.setPersistedData=function(t){var e;return t?(null===(e=localStorage)||void 0===e||e.setItem(L+t+"/v",1),function(e,i){var n,s="/"+i,a=JSON.stringify(e);e&&i&&(null===(n=localStorage)||void 0===n||n.setItem(L+t+s,a),dispatchEvent(new Event("storage")));}):function(){}}(e.id),this.clearPersistedData=function(t){return function(e){var i=L+"/"+t+"/";if(e)localStorage.removeItem(i+e);else for(var n in localStorage)n.includes(i)&&localStorage.removeItem(n);}}(e.id),this.applySettings(t,e),this.state={inputText:"",editing:false,composing:false,actions:{},mixMode:{},dropdown:{},flaggedTags:{}},this.value=[],this.listeners={},this.DOM={},this.build(t),A.call(this),this.getCSSVars(),this.loadOriginalValues(),this.events.customBinding.call(this),this.events.binding.call(this),t.autofocus&&this.DOM.input.focus(),t.__tagify=this;}Q.prototype={_dropdown:k,placeCaretAfterNode:T,getSetTagData:y,helpers:{sameStr:s,removeCollectionProp:a,omit:o,isObject:c,parseHTML:r,escapeHTML:d,extend:u,concatWithoutDups:g,getUID:f,isNodeTag:m},customEventsList:["change","add","remove","invalid","input","paste","click","keydown","focus","blur","edit:input","edit:beforeUpdate","edit:updated","edit:start","edit:keydown","dropdown:show","dropdown:hide","dropdown:select","dropdown:updated","dropdown:noMatch","dropdown:scroll"],dataProps:["__isValid","__removed","__originalData","__originalHTML","__tagId"],trim:function(t){return this.settings.trim&&t&&"string"==typeof t?t.trim():t},parseHTML:r,templates:j,parseTemplate:function(t,e){return r((t=this.settings.templates[t]||t).apply(this,e))},set whitelist(t){var e=t&&Array.isArray(t);this.settings.whitelist=e?t:[],this.setPersistedData(e?t:[],"whitelist");},get whitelist(){return this.settings.whitelist},set userInput(t){this.settings.userInput=!!t,this.setContentEditable(!!t);},get userInput(){return this.settings.userInput},generateClassSelectors:function(t){var e=function(e){var i=e;Object.defineProperty(t,i+"Selector",{get:function(){return "."+this[i].split(" ")[0]}});};for(var i in t)e(i);},applySettings:function(t,e){var i,n;D.templates=this.templates;var s=u({},D,"mix"==e.mode?{dropdown:{position:"text"}}:{}),a=this.settings=u({},s,e);if(a.disabled=t.hasAttribute("disabled"),a.readonly=a.readonly||t.hasAttribute("readonly"),a.placeholder=d(t.getAttribute("placeholder")||a.placeholder||""),a.required=t.hasAttribute("required"),this.generateClassSelectors(a.classNames),this.isIE&&(a.autoComplete=false),["whitelist","blacklist"].forEach((function(e){var i=t.getAttribute("data-"+e);i&&J(i=i.split(a.delimiters),Array)&&(a[e]=i);})),"autoComplete"in e&&!c(e.autoComplete)&&(a.autoComplete=D.autoComplete,a.autoComplete.enabled=e.autoComplete),"mix"==a.mode&&(a.pattern=a.pattern||/@/,a.autoComplete.rightKey=true,a.delimiters=e.delimiters||null,a.tagTextProp&&!a.dropdown.searchKeys.includes(a.tagTextProp)&&a.dropdown.searchKeys.push(a.tagTextProp)),t.pattern)try{a.pattern=new RegExp(t.pattern);}catch(t){}if(a.delimiters){a._delimiters=a.delimiters;try{a.delimiters=new RegExp(this.settings.delimiters,"g");}catch(t){}}(a.disabled||a.readonly)&&(a.userInput=false),this.TEXTS=G({},P,a.texts||{}),"select"==a.mode&&(a.dropdown.includeSelectedTags=true),("select"!=a.mode||(null===(i=e.dropdown)||void 0===i?void 0:i.enabled))&&a.userInput||(a.dropdown.enabled=0),a.disabled&&(a.dropdown.enabled=false),a.dropdown.appendTarget=(null===(n=e.dropdown)||void 0===n?void 0:n.appendTarget)||document.body,void 0===a.dropdown.includeSelectedTags&&(a.dropdown.includeSelectedTags=a.duplicates);var o=this.getPersistedData("whitelist");Array.isArray(o)&&(this.whitelist=Array.isArray(a.whitelist)?g(a.whitelist,o):o);},getAttributes:function(t){var e,i=this.getCustomAttributes(t),n="";for(e in i)n+=" "+e+(void 0!==t[e]?'="'.concat(i[e],'"'):"");return n},getCustomAttributes:function(t){if(!c(t))return "";var e,i={};for(e in t)"__"!=e.slice(0,2)&&"class"!=e&&t.hasOwnProperty(e)&&void 0!==t[e]&&(i[e]=d(t[e]));return i},setStateSelection:function(){var t=window.getSelection(),e={anchorOffset:t.anchorOffset,anchorNode:t.anchorNode,range:t.getRangeAt&&t.rangeCount&&t.getRangeAt(0)};return this.state.selection=e,e},getCSSVars:function(){var t,e,i,n=getComputedStyle(this.DOM.scope,null);this.CSSVars={tagHideTransition:(t=function(t){if(!t)return {};var e=(t=t.trim().split(" ")[0]).split(/\d+/g).filter((function(t){return t})).pop().trim();return {value:+t.split(e).filter((function(t){return t}))[0].trim(),unit:e}}((i="tag-hide-transition",n.getPropertyValue("--"+i))),e=t.value,"s"==t.unit?1e3*e:e)};},build:function(t){var e=this.DOM,i=t.closest("label");this.settings.mixMode.integrated?(e.originalInput=null,e.scope=t,e.input=t):(e.originalInput=t,e.originalInput_tabIndex=t.tabIndex,e.scope=this.parseTemplate("wrapper",[t,this.settings]),e.input=e.scope.querySelector(this.settings.classNames.inputSelector),t.parentNode.insertBefore(e.scope,t),t.tabIndex=-1),i&&i.setAttribute("for","");},destroy:function(){var t;this.events.unbindGlobal.call(this),null===(t=this.DOM.scope.parentNode)||void 0===t||t.removeChild(this.DOM.scope),this.DOM.originalInput.tabIndex=this.DOM.originalInput_tabIndex,delete this.DOM.originalInput.__tagify,this.dropdown.hide(true),this.removeAllCustomListeners(),clearTimeout(this.dropdownHide__bindEventsTimeout),clearInterval(this.listeners.main.originalInputValueObserverInterval);},loadOriginalValues:function(t){var e,i=this.settings;if(this.state.blockChangeEvent=true,void 0===t){var n=this.getPersistedData("value");t=n&&!this.DOM.originalInput.value?n:i.mixMode.integrated?this.DOM.input.textContent:this.DOM.originalInput.value;}if(this.removeAllTags(),t)if("mix"==i.mode)this.parseMixTags(t),(e=this.DOM.input.lastChild)&&"BR"==e.tagName||this.DOM.input.insertAdjacentHTML("beforeend","<br>");else {try{J(JSON.parse(t),Array)&&(t=JSON.parse(t));}catch(t){}this.addTags(t,true).forEach((function(t){return t&&t.classList.add(i.classNames.tagNoAnimation)}));}else this.postUpdate();this.state.lastOriginalValueReported=i.mixMode.integrated?"":this.DOM.originalInput.value;},cloneEvent:function(t){var e={};for(var i in t)"path"!=i&&(e[i]=t[i]);return e},loading:function(t){return this.state.isLoading=t,this.DOM.scope.classList[t?"add":"remove"](this.settings.classNames.scopeLoading),this},tagLoading:function(t,e){return t&&t.classList[e?"add":"remove"](this.settings.classNames.tagLoading),this},toggleClass:function(t,e){"string"==typeof t&&this.DOM.scope.classList.toggle(t,e);},toggleScopeValidation:function(t){var e=true===t||void 0===t;!this.settings.required&&t&&t===this.TEXTS.empty&&(e=true),this.toggleClass(this.settings.classNames.tagInvalid,!e),this.DOM.scope.title=e?"":t;},toggleFocusClass:function(t){this.toggleClass(this.settings.classNames.focus,!!t);},setPlaceholder:function(t){var e=this;["data","aria"].forEach((function(i){return e.DOM.input.setAttribute("".concat(i,"-placeholder"),t)}));},triggerChangeEvent:function(){if(!this.settings.mixMode.integrated){var t=this.DOM.originalInput,e=this.state.lastOriginalValueReported!==t.value,i=new CustomEvent("change",{bubbles:true});e&&(this.state.lastOriginalValueReported=t.value,i.simulated=true,t._valueTracker&&t._valueTracker.setValue(Math.random()),t.dispatchEvent(i),this.trigger("change",this.state.lastOriginalValueReported),t.value=this.state.lastOriginalValueReported);}},events:K,fixFirefoxLastTagNoCaret:function(){},setRangeAtStartEnd:function(t,e){if(e){t="number"==typeof t?t:!!t,e=e.lastChild||e;var i=document.getSelection();if(J(i.focusNode,Element)&&!this.DOM.input.contains(i.focusNode))return  true;try{i.rangeCount>=1&&["Start","End"].forEach((function(n){return i.getRangeAt(0)["set"+n](e,t||e.length)}));}catch(t){console.warn(t);}}},insertAfterTag:function(t,e){if(e=e||this.settings.mixMode.insertAfterTag,t&&t.parentNode&&e)return e="string"==typeof e?document.createTextNode(e):e,t.parentNode.insertBefore(e,t.nextSibling),e},editTagChangeDetected:function(t){var e=t.__originalData;for(var i in e)if(!this.dataProps.includes(i)&&t[i]!=e[i])return  true;return  false},getTagTextNode:function(t){return t.querySelector(this.settings.classNames.tagTextSelector)},setTagTextNode:function(t,e){this.getTagTextNode(t).innerHTML=d(e);},editTag:function(t,e){var i=this;t=t||this.getLastTag(),e=e||{};var s=this.settings,a=this.getTagTextNode(t),o=this.getNodeIndex(t),r=y(t),l=this.events.callbacks,d=true,c="select"==s.mode;if(!c&&this.dropdown.hide(),a){if(!J(r,Object)||!("editable"in r)||r.editable)return r=y(t,{__originalData:u({},r),__originalHTML:t.cloneNode(true)}),y(r.__originalHTML,r.__originalData),a.setAttribute("contenteditable",true),t.classList.add(s.classNames.tagEditing),this.events.callbacks.onEditTagFocus.call(this,t),a.addEventListener("click",l.onEditTagClick.bind(this,t)),a.addEventListener("blur",l.onEditTagBlur.bind(this,this.getTagTextNode(t))),a.addEventListener("input",l.onEditTagInput.bind(this,a)),a.addEventListener("paste",l.onEditTagPaste.bind(this,a)),a.addEventListener("keydown",(function(e){return l.onEditTagkeydown.call(i,e,t)})),a.addEventListener("compositionstart",l.onCompositionStart.bind(this)),a.addEventListener("compositionend",l.onCompositionEnd.bind(this)),e.skipValidation||(d=this.editTagToggleValidity(t)),a.originalIsValid=d,this.trigger("edit:start",{tag:t,index:o,data:r,isValid:d}),a.focus(),!c&&this.setRangeAtStartEnd(false,a),0===s.dropdown.enabled&&!c&&this.dropdown.show(),this.state.hasFocus=true,this}else n.warn("Cannot find element in Tag template: .",s.classNames.tagTextSelector);},editTagToggleValidity:function(t,e){var i;if(e=e||y(t))return (i=!("__isValid"in e)||true===e.__isValid)||this.removeTagsFromValue(t),this.update(),t.classList.toggle(this.settings.classNames.tagNotAllowed,!i),e.__isValid=i,e.__isValid;n.warn("tag has no data: ",t,e);},onEditTagDone:function(t,e){t=t||this.state.editing.scope,e=e||{};var i,n,s=this.settings,a={tag:t,index:this.getNodeIndex(t),previousData:y(t),data:e};this.trigger("edit:beforeUpdate",a,{cloneData:false}),this.state.editing=false,delete e.__originalData,delete e.__originalHTML,t&&t.parentNode&&((void 0!==(n=e[s.tagTextProp])?null===(i=(n+="").trim)||void 0===i?void 0:i.call(n):s.tagTextProp in e?void 0:e.value)?(t=this.replaceTag(t,e),this.editTagToggleValidity(t,e),s.a11y.focusableTags?t.focus():"select"!=s.mode&&T(t)):this.removeTags(t)),this.trigger("edit:updated",a),s.dropdown.closeOnSelect&&this.dropdown.hide(),this.settings.keepInvalidTags&&this.reCheckInvalidTags();},replaceTag:function(t,e){e&&""!==e.value&&void 0!==e.value||(e=t.__tagifyTagData),e.__isValid&&1!=e.__isValid&&u(e,this.getInvalidTagAttrs(e,e.__isValid));var i=this.createTagElem(e);return t.parentNode.replaceChild(i,t),this.updateValueByDOMTags(),i},updateValueByDOMTags:function(){var t=this;this.value.length=0;var e=this.settings.classNames,i=[e.tagNotAllowed.split(" ")[0],e.tagHide];[].forEach.call(this.getTagElms(),(function(e){$(e.classList).some((function(t){return i.includes(t)}))||t.value.push(y(e));})),this.update(),this.dropdown.refilter();},injectAtCaret:function(t,e){var i;if(e=e||(null===(i=this.state.selection)||void 0===i?void 0:i.range),"string"==typeof t&&(t=document.createTextNode(t)),!e&&t)return this.appendMixTags(t),this;var n=w(t,e);return this.setRangeAtStartEnd(false,n),this.updateValueByDOMTags(),this.update(),this},input:{set:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",e=!(arguments.length>1&&void 0!==arguments[1])||arguments[1],i=this.settings,n=i.dropdown.closeOnSelect;this.state.inputText=t,e&&(this.DOM.input.innerHTML=d(""+t),t&&this.toggleClass(i.classNames.empty,!this.DOM.input.innerHTML)),!t&&n&&this.dropdown.hide.bind(this),this.input.autocomplete.suggest.call(this),this.input.validate.call(this);},raw:function(){return this.DOM.input.textContent},validate:function(){var t=!this.state.inputText||true===this.validateTag({value:this.state.inputText});return this.DOM.input.classList.toggle(this.settings.classNames.inputInvalid,!t),t},normalize:function(t,e){var i=t||this.DOM.input,n=[];i.childNodes.forEach((function(t){return 3==t.nodeType&&n.push(t.nodeValue)})),n=n.join("\n");try{n=n.replace(/(?:\r\n|\r|\n)/g,this.settings.delimiters.source.charAt(0));}catch(t){}return n=n.replace(/\s/g," "),(null==e?void 0:e.trim)?this.trim(n):n},autocomplete:{suggest:function(t){if(this.settings.autoComplete.enabled){"object"!=typeof(t=t||{value:""})&&(t={value:t});var e=this.dropdown.getMappedValue(t);if("number"!=typeof e){var i=this.state.inputText.toLowerCase(),n=e.substr(0,this.state.inputText.length).toLowerCase(),s=e.substring(this.state.inputText.length);e&&this.state.inputText&&n==i?(this.DOM.input.setAttribute("data-suggest",s),this.state.inputSuggestion=t):(this.DOM.input.removeAttribute("data-suggest"),delete this.state.inputSuggestion);}}},set:function(t){var e=this.DOM.input.getAttribute("data-suggest"),i=t||(e?this.state.inputText+e:null);return !!i&&("mix"==this.settings.mode?this.replaceTextWithNode(document.createTextNode(this.state.tag.prefix+i)):(this.input.set.call(this,i),this.setRangeAtStartEnd(false,this.DOM.input)),this.input.autocomplete.suggest.call(this),this.dropdown.hide(),true)}}},getTagIdx:function(t){return this.value.findIndex((function(e){return e.__tagId==(t||{}).__tagId}))},getNodeIndex:function(t){var e=0;if(t)for(;t=t.previousElementSibling;)e++;return e},getTagElms:function(){for(var t=arguments.length,e=new Array(t),i=0;i<t;i++)e[i]=arguments[i];var n="."+$(this.settings.classNames.tag.split(" ")).concat($(e)).join(".");return [].slice.call(this.DOM.scope.querySelectorAll(n))},getLastTag:function(){var t=this.settings.classNames,e=this.DOM.scope.querySelectorAll("".concat(t.tagSelector,":not(.").concat(t.tagHide,"):not([readonly])"));return e[e.length-1]},isTagDuplicate:function(t,e,i){var n=0,a=true,o=false,r=void 0;try{for(var l,d=this.value[Symbol.iterator]();!(a=(l=d.next()).done);a=!0){var c=l.value;s(this.trim(""+t),c.value,e)&&i!=c.__tagId&&n++;}}catch(t){o=true,r=t;}finally{try{a||null==d.return||d.return();}finally{if(o)throw r}}return n},getTagIndexByValue:function(t){var e=this,i=[],n=this.settings.dropdown.caseSensitive;return this.getTagElms().forEach((function(a,o){a.__tagifyTagData&&s(e.trim(a.__tagifyTagData.value),t,n)&&i.push(o);})),i},getTagElmByValue:function(t){var e=this.getTagIndexByValue(t)[0];return this.getTagElms()[e]},flashTag:function(t){var e=this;t&&(t.classList.add(this.settings.classNames.tagFlash),setTimeout((function(){t.classList.remove(e.settings.classNames.tagFlash);}),100));},isTagBlacklisted:function(t){return t=this.trim(t.toLowerCase()),this.settings.blacklist.filter((function(e){return (""+e).toLowerCase()==t})).length},isTagWhitelisted:function(t){return !!this.getWhitelistItem(t)},getWhitelistItem:function(t,e,i){e=e||"value";var n,a=this.settings;return (i=i||a.whitelist).some((function(i){var o="object"==typeof i?i[e]||i.value:i;if(s(o,t,a.dropdown.caseSensitive,a.trim))return n="object"==typeof i?i:{value:i},true})),n||"value"!=e||"value"==a.tagTextProp||(n=this.getWhitelistItem(t,a.tagTextProp,i)),n},validateTag:function(t){var e=this.settings,i="value"in t?"value":e.tagTextProp,n=this.trim(t[i]+"");return (t[i]+"").trim()?"mix"!=e.mode&&e.pattern&&J(e.pattern,RegExp)&&!e.pattern.test(n)?this.TEXTS.pattern:!e.duplicates&&this.isTagDuplicate(n,e.dropdown.caseSensitive,t.__tagId)?this.TEXTS.duplicate:this.isTagBlacklisted(n)||e.enforceWhitelist&&!this.isTagWhitelisted(n)?this.TEXTS.notAllowed:!e.validate||e.validate(t):this.TEXTS.empty},getInvalidTagAttrs:function(t,e){return {"aria-invalid":true,class:"".concat(t.class||""," ").concat(this.settings.classNames.tagNotAllowed).trim(),title:e}},hasMaxTags:function(){return this.value.length>=this.settings.maxTags&&this.TEXTS.exceed},setReadonly:function(t,e){var i=this.settings;this.DOM.scope.contains(document.activeElement)&&document.activeElement.blur(),i[e||"readonly"]=t,this.DOM.scope[(t?"set":"remove")+"Attribute"](e||"readonly",true),this.settings.userInput=true,this.setContentEditable(!t);},setContentEditable:function(t){this.DOM.scope.querySelectorAll("[data-can-editable]").forEach((function(e){e.contentEditable=t,e.tabIndex=t?0:-1;}));},setDisabled:function(t){this.setReadonly(t,"disabled");},normalizeTags:function(t){var e=this,i=this.settings,n=i.whitelist,s=i.delimiters,a=i.mode,o=i.tagTextProp,r=[],l=!!n&&J(n[0],Object),d=Array.isArray(t),g=d&&t[0].value,h=function(t){return (t+"").split(s).reduce((function(t,i){var n,s=e.trim(i);return s&&t.push((X(n={},o,s),X(n,"value",s),n)),t}),[])};if("number"==typeof t&&(t=t.toString()),"string"==typeof t){if(!t.trim())return [];t=h(t);}else d&&(t=t.reduce((function(t,i){if(c(i)){var n=u({},i);o in n||(o="value"),n[o]=e.trim(n[o]),(n[o]||0===n[o])&&t.push(n);}else if(null!=i&&""!==i&&void 0!==i){var s;(s=t).push.apply(s,$(h(i)));}return t}),[]));return l&&!g&&(t.forEach((function(t){var i=r.map((function(t){return t.value})),n=e.dropdown.filterListItems.call(e,t[o],{exact:true});e.settings.duplicates||(n=n.filter((function(t){return !i.includes(t.value)})));var s=n.length>1?e.getWhitelistItem(t[o],o,n):n[0];s&&J(s,Object)?r.push(s):"mix"!=a&&(null==t.value&&(t.value=t[o]),r.push(t));})),r.length&&(t=r)),t},parseMixTags:function(t){var e=this,i=this.settings,n=i.mixTagsInterpolator,s=i.duplicates,a=i.transformTag,o=i.enforceWhitelist,r=i.maxTags,l=i.tagTextProp,d=[];t=t.split(n[0]).map((function(t,i){var c,u,g,h=t.split(n[1]),p=h[0],f=d.length==r;try{if(p==+p)throw Error;u=JSON.parse(p);}catch(t){u=e.normalizeTags(p)[0]||{value:p};}if(a.call(e,u),f||!(h.length>1)||o&&!e.isTagWhitelisted(u.value)||!s&&e.isTagDuplicate(u.value)){if(t)return i?n[0]+t:t}else u[c=u[l]?l:"value"]=e.trim(u[c]),g=e.createTagElem(u),d.push(u),g.classList.add(e.settings.classNames.tagNoAnimation),h[0]=g.outerHTML,e.value.push(u);return h.join("")})).join(""),this.DOM.input.innerHTML=t,this.DOM.input.appendChild(document.createTextNode("")),this.DOM.input.normalize();var c=this.getTagElms();return c.forEach((function(t,e){return y(t,d[e])})),this.update({withoutChangeEvent:true}),O(c,this.state.hasFocus),t},replaceTextWithNode:function(t,e){if(this.state.tag||e){e=e||this.state.tag.prefix+this.state.tag.value;var i,n,s=this.state.selection||window.getSelection(),a=s.anchorNode,o=this.state.tag.delimiters?this.state.tag.delimiters.length:0;return a.splitText(s.anchorOffset-o),-1==(i=a.nodeValue.lastIndexOf(e))?true:(n=a.splitText(i),t&&a.parentNode.replaceChild(t,n),true)}},prepareNewTagNode:function(t,e){e=e||{};var i=this.settings,n=[],s={},a=Object.assign({},t,{value:t.value+""});if(t=Object.assign({},a),i.transformTag.call(this,t),t.__isValid=this.hasMaxTags()||this.validateTag(t),true!==t.__isValid){if(e.skipInvalid)return;if(u(s,this.getInvalidTagAttrs(t,t.__isValid),{__preInvalidData:a}),t.__isValid==this.TEXTS.duplicate&&this.flashTag(this.getTagElmByValue(t.value)),!i.createInvalidTags)return void n.push(t.value)}return "readonly"in t&&(t.readonly?s["aria-readonly"]=true:delete t.readonly),{tagElm:this.createTagElem(t,s),tagData:t,aggregatedInvalidInput:n}},postProcessNewTagNode:function(t,e){var i=this,n=this.settings,s=e.__isValid;s&&true===s?this.value.push(e):(this.trigger("invalid",{data:e,index:this.value.length,tag:t,message:s}),n.keepInvalidTags||setTimeout((function(){return i.removeTags(t,true)}),1e3)),this.dropdown.position();},selectTag:function(t,e){var i=this;if(!this.settings.enforceWhitelist||this.isTagWhitelisted(e.value)){this.state.actions.selectOption&&setTimeout((function(){return i.setRangeAtStartEnd(false,i.DOM.input)}));var n=this.getLastTag();return n?this.replaceTag(n,e):this.appendTag(t),this.value[0]=e,this.update(),this.trigger("add",{tag:t,data:e}),[t]}},addEmptyTag:function(t){var e=u({value:""},t||{}),i=this.createTagElem(e);y(i,e),this.appendTag(i),this.editTag(i,{skipValidation:true}),this.toggleFocusClass(true);},addTags:function(t,e,i){var n=this,s=[],a=this.settings,o=[],r=document.createDocumentFragment(),l=[];if(!t||0==t.length)return s;switch(t=this.normalizeTags(t),a.mode){case "mix":return this.addMixTags(t);case "select":e=false,this.removeAllTags();}return this.DOM.input.removeAttribute("style"),t.forEach((function(t){var e=n.prepareNewTagNode(t,{skipInvalid:i||a.skipInvalid});if(e){var d=e.tagElm;if(t=e.tagData,o=e.aggregatedInvalidInput,s.push(d),"select"==a.mode)return n.selectTag(d,t);r.appendChild(d),n.postProcessNewTagNode(d,t),l.push({tagElm:d,tagData:t});}})),this.appendTag(r),l.forEach((function(t){var e=t.tagElm,i=t.tagData;return n.trigger("add",{tag:e,index:n.getTagIdx(i),data:i})})),this.update(),t.length&&e&&(this.input.set.call(this,a.createInvalidTags?"":o.join(a._delimiters)),this.setRangeAtStartEnd(false,this.DOM.input)),this.dropdown.refilter(),s},addMixTags:function(t){var e=this;if((t=this.normalizeTags(t))[0].prefix||this.state.tag)return this.prefixedTextToTag(t[0]);var i=document.createDocumentFragment();return t.forEach((function(t){var n=e.prepareNewTagNode(t);i.appendChild(n.tagElm),e.insertAfterTag(n.tagElm),e.postProcessNewTagNode(n.tagElm,n.tagData);})),this.appendMixTags(i),i.children},appendMixTags:function(t){var e=!!this.state.selection;e?this.injectAtCaret(t):(this.DOM.input.focus(),(e=this.setStateSelection()).range.setStart(this.DOM.input,e.range.endOffset),e.range.setEnd(this.DOM.input,e.range.endOffset),this.DOM.input.appendChild(t),this.updateValueByDOMTags(),this.update());},prefixedTextToTag:function(t){var e,i,n,s=this,a=this.settings,o=null===(e=this.state.tag)||void 0===e?void 0:e.delimiters;if(t.prefix=t.prefix||this.state.tag?this.state.tag.prefix:(a.pattern.source||a.pattern)[0],n=this.prepareNewTagNode(t),i=n.tagElm,this.replaceTextWithNode(i)||this.DOM.input.appendChild(i),setTimeout((function(){return i.classList.add(s.settings.classNames.tagNoAnimation)}),300),this.update(),!o){var r=this.insertAfterTag(i)||i;setTimeout(T,0,r);}return this.state.tag=null,this.postProcessNewTagNode(i,n.tagData),i},appendTag:function(t){var e=this.DOM,i=e.input;e.scope.insertBefore(t,i);},createTagElem:function(t,e){t.__tagId=f();var i,n=u({},t,G({value:d(t.value+"")},e));return function(t){for(var e,i=document.createNodeIterator(t,NodeFilter.SHOW_TEXT,null,false);e=i.nextNode();)e.textContent.trim()||e.parentNode.removeChild(e);}(i=this.parseTemplate("tag",[n,this])),y(i,t),i},reCheckInvalidTags:function(){var t=this,e=this.settings;this.getTagElms(e.classNames.tagNotAllowed).forEach((function(i,n){var s=y(i),a=t.hasMaxTags(),o=t.validateTag(s),r=true===o&&!a;if("select"==e.mode&&t.toggleScopeValidation(o),r)return s=s.__preInvalidData?s.__preInvalidData:{value:s.value},t.replaceTag(i,s);i.title=a||o;}));},removeTags:function(t,e,i){var n,s=this,a=this.settings;if(t=t&&J(t,HTMLElement)?[t]:J(t,Array)?t:t?[t]:[this.getLastTag()].filter((function(t){return t})),n=t.reduce((function(t,e){e&&"string"==typeof e&&(e=s.getTagElmByValue(e));var i=y(e);return e&&i&&!i.readonly&&t.push({node:e,idx:s.getTagIdx(i),data:y(e,{__removed:true})}),t}),[]),i="number"==typeof i?i:this.CSSVars.tagHideTransition,"select"==a.mode&&(i=0,this.input.set.call(this)),1==n.length&&"select"!=a.mode&&n[0].node.classList.contains(a.classNames.tagNotAllowed)&&(e=true),n.length)return a.hooks.beforeRemoveTag(n,{tagify:this}).then((function(){var t=function(t){t.node.parentNode&&(t.node.parentNode.removeChild(t.node),e?a.keepInvalidTags&&this.trigger("remove",{tag:t.node,index:t.idx}):(this.trigger("remove",{tag:t.node,index:t.idx,data:t.data}),this.dropdown.refilter(),this.dropdown.position(),this.DOM.input.normalize(),a.keepInvalidTags&&this.reCheckInvalidTags()));};i&&i>10&&1==n.length?function(e){e.node.style.width=parseFloat(window.getComputedStyle(e.node).width)+"px",document.body.clientTop,e.node.classList.add(a.classNames.tagHide),setTimeout(t.bind(this),i,e);}.call(s,n[0]):n.forEach(t.bind(s)),e||(s.removeTagsFromValue(n.map((function(t){return t.node}))),s.update(),"select"==a.mode&&a.userInput&&s.setContentEditable(true));})).catch((function(t){}))},removeTagsFromDOM:function(){this.getTagElms().forEach((function(t){return t.remove()}));},removeTagsFromValue:function(t){var e=this;(t=Array.isArray(t)?t:[t]).forEach((function(t){var i=y(t),n=e.getTagIdx(i);n>-1&&e.value.splice(n,1);}));},removeAllTags:function(t){var e=this;t=t||{},this.value=[],"mix"==this.settings.mode?this.DOM.input.innerHTML="":this.removeTagsFromDOM(),this.dropdown.refilter(),this.dropdown.position(),this.state.dropdown.visible&&setTimeout((function(){e.DOM.input.focus();})),"select"==this.settings.mode&&(this.input.set.call(this),this.settings.userInput&&this.setContentEditable(true)),this.update(t);},postUpdate:function(){this.state.blockChangeEvent=false;var t,e,i=this.settings,n=i.classNames,s="mix"==i.mode?i.mixMode.integrated?this.DOM.input.textContent:this.DOM.originalInput.value.trim():this.value.length+this.input.raw.call(this).length;(this.toggleClass(n.hasMaxTags,this.value.length>=i.maxTags),this.toggleClass(n.hasNoTags,!this.value.length),this.toggleClass(n.empty,!s),"select"==i.mode)&&this.toggleScopeValidation(null===(e=this.value)||void 0===e||null===(t=e[0])||void 0===t?void 0:t.__isValid);},setOriginalInputValue:function(t){var e=this.DOM.originalInput;this.settings.mixMode.integrated||(e.value=t,e.tagifyValue=e.value,this.setPersistedData(t,"value"));},update:function(t){clearTimeout(this.debouncedUpdateTimeout),this.debouncedUpdateTimeout=setTimeout(function(){var e=this.getInputValue();this.setOriginalInputValue(e),this.settings.onChangeAfterBlur&&(t||{}).withoutChangeEvent||this.state.blockChangeEvent||this.triggerChangeEvent();this.postUpdate();}.bind(this),100),this.events.bindOriginaInputListener.call(this,100);},getInputValue:function(){var t=this.getCleanValue();return "mix"==this.settings.mode?this.getMixedTagsAsString(t):t.length?this.settings.originalInputValueFormat?this.settings.originalInputValueFormat(t):JSON.stringify(t):""},getCleanValue:function(t){return a(t||this.value,this.dataProps)},getMixedTagsAsString:function(){var t="",e=this,i=this.settings,n=i.originalInputValueFormat||JSON.stringify,s=i.mixTagsInterpolator;return function i(a){a.childNodes.forEach((function(a){if(1==a.nodeType){var r=y(a);if("BR"==a.tagName&&(t+="\r\n"),r&&m.call(e,a)){if(r.__removed)return;t+=s[0]+n(o(r,e.dataProps))+s[1];}else a.getAttribute("style")||["B","I","U"].includes(a.tagName)?t+=a.textContent:"DIV"!=a.tagName&&"P"!=a.tagName||(t+="\r\n",i(a));}else t+=a.textContent;}));}(this.DOM.input),t}},Q.prototype.removeTag=Q.prototype.removeTags;

const MODULE_ID = 'canvas-layers';
const ModuleFlags = {
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
    foundry.applications.handlebars.loadTemplates([
        `modules/${MODULE_ID}/templates/canvas-layer-header.hbs`,
        `modules/${MODULE_ID}/templates/canvas-entity-layers.hbs`
    ]);

    if (typeof libWrapper === "function") {
        libWrapper.register(
            MODULE_ID,
            "foundry.canvas.placeables.Drawing.prototype.isVisible",
            function (wrapped, ...args) {
                const canvasLayers = canvas.scene?.getFlag(MODULE_ID, ModuleFlags.Scene.CanvasLayers);
                if(!canvasLayers || Object.keys(canvasLayers) === 0) return wrapped(args);
                
                const drawingUsedLayers = this.document.getFlag(MODULE_ID, ModuleFlags.Drawing.CanvasLayers);
                if(!drawingUsedLayers || drawingUsedLayers.length === 0) return wrapped(args);

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
        const childNode = html.querySelector(`#${childIds}`);        if(childIds === 'scene-navigation-expand') {
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
    const userLayers = game.user.getFlag(MODULE_ID, ModuleFlags.User.CanvasLayers) ?? {};
    const activeCanvasLayers = Object.values(userLayers).filter(x => x.active);
    if(activeCanvasLayers.length === 0) return;

    await document.setFlag(MODULE_ID, ModuleFlags.Drawing.CanvasLayers, activeCanvasLayers.map(x => x.id));
});

Hooks.on('renderDrawingConfig', async (config, html, _, options) => {
    if(!game.user.isGM || (options.parts && !options.parts.includes('tabs'))) return;

    const canvasLayers = game.canvas.scene.getFlag(MODULE_ID, ModuleFlags.Scene.CanvasLayers);
    if(!canvasLayers || Object.keys(canvasLayers).length === 0) return;

    const layersActive = config.tabGroups.sheet === 'layers';
    html.querySelector('.sheet-tabs').insertAdjacentHTML('beforeend', `
        <a data-action="tab" data-group="sheet" data-tab="layers"${layersActive ? ' class="active"': ''}>
            <i class="fa-solid fa-paint-roller" inert=""></i>
            <span>${game.i18n.localize('CanvasLayers.General.Layers')}</span>
        </a>    
    `);

    const drawingLayers = config.document.getFlag(MODULE_ID, ModuleFlags.Drawing.CanvasLayers) ?? [];
    const selectedLayers = Object.values(canvasLayers).filter(x => drawingLayers.includes(x.id)).map(x => x.name);

    const canvasEntityLayersTemplate = Handlebars.partials[`modules/${MODULE_ID}/templates/canvas-entity-layers.hbs`]({ active: layersActive, updatePath: `flags.${MODULE_ID}.${ModuleFlags.Drawing.CanvasLayers}`, selectedLayers: selectedLayers }, {allowProtoMethodsByDefault: true, allowProtoPropertiesByDefault: true});
    html.querySelector('.window-content .form-footer').insertAdjacentHTML('beforebegin', canvasEntityLayersTemplate);
    const canvasEntityLayersTab = html.querySelector('.window-content div[data-tab="layers"]');

    const layerOptions = Object.values(game.canvas.scene.getFlag(MODULE_ID, ModuleFlags.Scene.CanvasLayers)).map(x => ({ value: x.id, name: x.name }));
    const input = canvasEntityLayersTab.querySelector('.layer-tagify');
    if(input) {
        new Q(input, {
            tagTextProp: "name",
            enforceWhitelist: true,
            whitelist: layerOptions,
            dropdown: {
                mapValueTo: "name",
                searchKeys: ["name"],
                enabled: 0,
                maxItems: 20,
                closeOnSelect: true,
                highlightFirst: false,
            },
        });
    }  
});

Hooks.on('preUpdateDrawing', (document, update) => {
    const drawingLayers = update.flags?.[MODULE_ID]?.[ModuleFlags.Drawing.CanvasLayers];
    if(drawingLayers && typeof drawingLayers === 'string'){
        const newLayers = JSON.parse(drawingLayers).map(x => x.value);
        if(document.flags[MODULE_ID]?.[ModuleFlags.Drawing.CanvasLayers]){
            document.flags[MODULE_ID][ModuleFlags.Drawing.CanvasLayers] = newLayers;
        }
        else {
            document.flags[MODULE_ID] = {
                [ModuleFlags.Drawing.CanvasLayers]: newLayers,
            };
        }

        update.flags[MODULE_ID][ModuleFlags.Drawing.CanvasLayers] = newLayers;

        document._object._refreshState();
    }
});

export { MODULE_ID, ModuleFlags };
//# sourceMappingURL=CanvasLayers.js.map
