type Severity = "low" | "medium" | "high";

export interface RiskDetail {
  file: string;
  message: {
    summary: string;
    risks: { id: number; title: string; description: string }[];
    severity: Severity;
    recommendations: string[];
  };
}
