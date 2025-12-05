export enum ServerStatus {
  OFFLINE = 'OFFLINE',
  STARTING = 'STARTING',
  ONLINE = 'ONLINE',
  STOPPING = 'STOPPING'
}

export interface ConsoleMessage {
  type: 'stdout' | 'stderr' | 'system';
  message: string;
  timestamp: string;
}

export interface ServerConfigItem {
  key: string;
  value: string;
  description?: string;
}

export interface AddonFile {
  id: string; // folder name
  name: string; // from manifest
  description?: string;
  type: 'behavior' | 'resource';
  uuid: string;
  version: number[];
  path: string;
}

export interface World {
  id: string; // Folder name
  name: string; // Folder name (usually same as ID for simplicity)
  isActive: boolean;
  sizeBytes: number;
  lastModified: string;
}

export interface WorldBackup {
  filename: string;
  date: string;
  sizeBytes: number;
}

export interface WorldAddonStatus {
  uuid: string;
  name: string;
  version: number[];
  type: 'behavior' | 'resource';
  enabled: boolean;
  folderName: string; // To link back to installed addons
}

export interface WorldExperiments {
  [key: string]: boolean;
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

export interface TunnelStatus {
  running: boolean;
  publicAddress: string | null;
  logs: string[];
  isInstalled: boolean;
}

export interface CommonProps {
  showToast: (type: ToastType, title: string, message?: string) => void;
}
