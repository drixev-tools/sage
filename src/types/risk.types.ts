type Severety = "low|medium|high";

export interface RiskSummary {
  file: string;
  message: {
    summary: string;
    risks: string[];
    severity: Severety;
    recommendations: [];
  };
}
