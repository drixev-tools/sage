import chalk, { type ChalkInstance } from "chalk";
import { RiskDetail } from "../types/risk.types";

const SEVERITY_COLOR: Record<string, ChalkInstance> = {
  low: chalk.green,
  medium: chalk.yellow,
  high: chalk.red,
};

export function printRiskTable(details: RiskDetail[]): void {
  const FILE_W = Math.min(40, Math.max(4, ...details.map((d) => d.file.length)));
  const SEV_W = 8;
  const SUM_W = 36;
  const REC_W = 36;

  const D = chalk.dim("│");

  const hLine = (l: string, m: string, r: string) =>
    chalk.dim(
      l +
        "─".repeat(FILE_W + 2) +
        m +
        "─".repeat(SEV_W + 2) +
        m +
        "─".repeat(SUM_W + 2) +
        m +
        "─".repeat(REC_W + 2) +
        r,
    );

  const cell = (str: string, w: number) =>
    " " + (str.length > w ? str.slice(0, w - 1) + "…" : str.padEnd(w)) + " ";

  const header =
    D +
    chalk.bold(cell("File", FILE_W)) +
    D +
    chalk.bold(cell("Severity", SEV_W)) +
    D +
    chalk.bold(cell("Summary", SUM_W)) +
    D +
    chalk.bold(cell("Top Recommendation", REC_W)) +
    D;

  console.log(hLine("┌", "┬", "┐"));
  console.log(header);

  for (const detail of details) {
    console.log(hLine("├", "┼", "┤"));
    const color = SEVERITY_COLOR[detail.message.severity] ?? chalk.white;
    const topRec = detail.message.recommendations[0] ?? "—";
    const row =
      D +
      cell(detail.file, FILE_W) +
      D +
      color(cell(detail.message.severity.toUpperCase(), SEV_W)) +
      D +
      cell(detail.message.summary, SUM_W) +
      D +
      cell(topRec, REC_W) +
      D;
    console.log(row);
  }

  console.log(hLine("└", "┴", "┘"));
}

export function printFileRisk(detail: RiskDetail): void {
  const color = SEVERITY_COLOR[detail.message.severity] ?? chalk.white;
  const label = color(`[${detail.message.severity.toUpperCase()}]`);

  console.log(chalk.bold(`  ${detail.file}  ${label}`));
  console.log(chalk.dim(`  ${detail.message.summary}\n`));

  if (detail.message.risks.length > 0) {
    console.log(chalk.bold("  Risks:"));
    for (const risk of detail.message.risks) {
      console.log(color(`    [${risk.id}] ${risk.title}`));
      console.log(chalk.dim(`        ${risk.description}`));
    }
    console.log();
  }

  if (detail.message.recommendations.length > 0) {
    console.log(chalk.bold("  Recommendations:"));
    for (const rec of detail.message.recommendations) {
      console.log(chalk.cyan(`    • ${rec}`));
    }
    console.log();
  }

  console.log(chalk.dim("  " + "─".repeat(60) + "\n"));
}

export function buildFullReport(
  details: RiskDetail[],
  overallSummary: string,
): string {
  const lines: string[] = ["# Risk Analysis Report\n", "## Per-file Risks\n"];

  for (const detail of details) {
    lines.push(
      `### \`${detail.file}\` — ${detail.message.severity.toUpperCase()}\n`,
    );
    lines.push(`${detail.message.summary}\n`);

    if (detail.message.risks.length > 0) {
      lines.push("**Risks:**\n");
      for (const risk of detail.message.risks) {
        lines.push(`- **[${risk.id}] ${risk.title}:** ${risk.description}`);
      }
      lines.push("");
    }

    if (detail.message.recommendations.length > 0) {
      lines.push("**Recommendations:**\n");
      for (const rec of detail.message.recommendations) {
        lines.push(`- ${rec}`);
      }
      lines.push("");
    }
  }

  lines.push("## Overall Summary\n", overallSummary);
  return lines.join("\n");
}
