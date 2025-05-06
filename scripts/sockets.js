export function handleSocketEvent({ action = null, data = {} } = {}) {
    switch (action) {
      case socketEvent.updateView:
        Hooks.callAll(socketEvent.updateView, data);
        break;
      case socketEvent.updatePlaceableCollection:
        Hooks.callAll(socketEvent.updatePlaceableCollection, data);
        break;
      case socketEvent.closeLayer:
        Hooks.callAll(socketEvent.closeLayer, data);
        break;
    }
  }
  
  export const socketEvent = {
    updateView: "CanvasLayersUpdateView",
    closeLayer: "CanvasLayersCloseLayer",
    updatePlaceableCollection: "CanvasLayersUpdatePlaceableCollection",
  };
  