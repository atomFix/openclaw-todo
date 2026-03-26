import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  getServerPort: () => Promise<number>
}

contextBridge.exposeInMainWorld('api', {
  getServerPort: () => ipcRenderer.invoke('get-server-port'),
})
