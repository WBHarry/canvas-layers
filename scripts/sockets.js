export function handleSocketEvent({ action = null, data = {} } = {}) {
    switch (action) {
      case socketEvent.updateView:
        Hooks.callAll(socketEvent.updateView, data);
        break;
    }
  }
  
  export const socketEvent = {
    updateView: "CanvasLayersUpdateView"
  };
  