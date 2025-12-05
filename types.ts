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
  id: string;
  name: string;
  description?: string;
  type: 'behavior' | 'resource';
  path: string;
}

export interface Manifest {
  header: {
    name: string;
    description: string;
    uuid: string;
    version: number[];
  };
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
}

export interface TunnelStatus {
  running: boolean;
  publicAddress: string | null;
  logs: string[];
}

export interface CommonProps {
  showToast: (type: ToastType, message: string) => void;
}