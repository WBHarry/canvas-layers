import { TypedObjectField } from "./modelHelpers.js";

/* !!V13!! Use TypedObjectField */ 
export class CanvasLayerData extends foundry.abstract.DataModel {
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