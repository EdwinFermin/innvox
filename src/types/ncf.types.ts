export interface NCFConfig {
  rangeStart: string;
  rangeEnd: string;
  lastAssigned?: string | null;
  releasedNumbers?: string[];
}

export interface CFConfig {
  rangeStart: string;
  rangeEnd: string;
  lastAssigned?: string | null;
}
