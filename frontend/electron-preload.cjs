/**
 * Electron preload — exposes a safe API to the renderer via contextBridge.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("meridian", {
  getBackendUrl: () => ipcRenderer.invoke("get-backend-url"),
  platform: process.platform,
});
