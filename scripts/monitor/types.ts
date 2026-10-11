export type ChangeSeverity = 'info' | 'notice' | 'warning' | 'critical';

export type ChangeCategory =
  | 'NEW_MODEL'
  | 'PRICE_DROP'
  | 'PRICE_HIKE'
  | 'HOST_OFFER_UPDATE'
  | 'CONTEXT_UPDATE'
  | 'STATUS_CHANGE';

export interface DiffEntry {
  modelId: string;
  modelName: string;
  creator: string;
  category: ChangeCategory;
  field: string;
  oldValue: any;
  newValue: any;
  percentageChange?: number;
  severity: ChangeSeverity;
  reason?: string;
}

export interface MonitoringReport {
  timestamp: string;
  date: string;
  upstreamsChecked: {
    name: string;
    url: string;
    status: 'success' | 'failed';
    modelsFound: number;
  }[];
  summary: {
    totalProductionModels: number;
    totalStagingModels: number;
    newModelsDetected: number;
    priceDrops: number;
    priceHikes: number;
    hostOfferUpdates: number;
    criticalAnomalies: number;
  };
  anomalies: DiffEntry[];
  diffs: DiffEntry[];
  stagingPath: string;
  reportPath: string;
  canSafelyPromote: boolean;
}
