import { MODULE_ID } from "./data/Constants";

export const currentVersion = '1.0.0';

export const setup = () => {
    game.settings.register(MODULE_ID, "version", {
        name: "",
        hint: "",
        scope: "world",
        config: false,
        type: String,
        default: "",
      });
};