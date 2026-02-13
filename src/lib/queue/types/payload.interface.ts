export interface ProductIndexJobPayload {
  data: Record<string, unknown>[];
  /** If true, replace entire catalog (index). If false/undefined, add to existing (addMany). */
  replace?: boolean;
}
