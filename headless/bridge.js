// Browser-side replacement for electron/preload.cjs's window.ghost bridge.
// Talks to headless/server.mjs's HTTP + Server-Sent-Events API instead of
// Electron's contextBridge/ipcRenderer. Loaded as a plain (non-module)
// script, so it runs before the deferred module bundle that reads
// window.ghost.
(() => {
  const invoke = async (method, payload) => {
    const response = await fetch(`/api/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'The operation failed.');
    return result.data;
  };

  window.ghost = Object.freeze({
    getState: () => invoke('getState'),
    switchToWifi: id => invoke('switchToWifi', id),
    setConnection: value => invoke('setConnection', value),
    connectWifi: value => invoke('connectWifi', value),
    scanDevices: () => invoke('scanDevices'),
    prepareDevice: id => invoke('prepareDevice', id),
    applyLocation: point => invoke('applyLocation', point),
    stopLocation: () => invoke('stopLocation'),
    getRoute: () => invoke('getRoute'),
    planRoute: stops => invoke('planRoute', stops),
    startRoute: value => invoke('startRoute', value),
    pauseRoute: () => invoke('pauseRoute'),
    resumeRoute: () => invoke('resumeRoute'),
    searchPlaces: query => invoke('searchPlaces', query),
    savePlace: place => invoke('savePlace', place),
    deletePlace: id => invoke('deletePlace', id),
    updatePreferences: value => invoke('updatePreferences', value),
    installRuntime: () => Promise.reject(new Error('Device tools are installed at image build time on this board.')),
    onState: callback => {
      if (typeof callback !== 'function') throw new Error('A callback is required.');
      let source = null, closed = false;
      const connect = () => {
        if (closed) return;
        source = new EventSource('/api/events');
        source.onmessage = event => { try { callback(JSON.parse(event.data)); } catch {} };
        // The board's own AP can briefly drop a client's link; reconnect rather
        // than leaving the UI permanently stuck on stale state.
        source.onerror = () => { source.close(); if (!closed) setTimeout(connect, 1000); };
      };
      connect();
      return () => { closed = true; source?.close(); };
    },
  });
})();
