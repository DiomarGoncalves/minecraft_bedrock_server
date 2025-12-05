
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
  name: string; // Folder name
  isActive: boolean;
  sizeBytes: number;
  lastModified: string;
  description?: string;
  experiments?: WorldExperiments;
}

export interface WorldBackup {
  filename: string;
  date: string;
  sizeBytes: number;
}

// Representa o status de um addon DENTRO de um mundo específico
export interface WorldAddonStatus extends AddonFile {
  enabled: boolean; // Se está presente no world_behavior_packs.json
}

export interface WorldExperiments {
  gametest?: boolean;
  experiments?: boolean; // General toggle
  // Bedrock specific keys usually found in level.dat, but we store in meta for now
  [key: string]: boolean | undefined;
}

export interface Gamerule {
  key: string;
  label: string;
  desc: string;
  value: boolean | number;
  type: 'boolean' | 'number';
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
