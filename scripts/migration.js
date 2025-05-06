import { MODULE_ID, ModuleFlags } from "../data/Constants";
import { currentVersion } from "../setup";

export const handleMigration = async () => {
    if (!game.user.isGM) return;

    var version = game.settings.get(MODULE_ID, "version");
    if (!version) {
        version = currentVersion;

        for(var user of game.users) {
            await user.unsetFlag(MODULE_ID, ModuleFlags.User.CanvasLayers);
        }

        await game.settings.set(MODULE_ID, "version", version);
    }
};