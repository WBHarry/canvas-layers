export const MODULE_ID = 'canvas-layers';
export const SOCKET_ID = `module.${MODULE_ID}`;

export const ModuleFlags = {
    Scene: {
        CanvasLayers: 'canvas-layers',
    },
    Drawing: {
        CanvasLayers: 'canvas-layers',
    },
    Tile: {
        CanvasLayers: 'canvas-layers',
    },
    User: {
        CanvasLayers: 'canvas-layers',
    },
};

export const layerTypes = {
    open: { value: 1, name: "CanvasLayers.Constants.LayerType.Open" },
    controlled: { value: 2, name: "CanvasLayers.Constants.LayerType.Controlled" },
};