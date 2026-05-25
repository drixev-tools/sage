/**
 * Controls which files are included or excluded during analysis commands.
 * Persisted at `~/.config/sage/rules.json` alongside the rest of sage's global config.
 */
export interface RulesConfig {
  /**
   * File extensions that are treated as source code.
   * Must include the leading dot, e.g. ".ts", ".py".
   */
  sourceExtensions: string[];

  /**
   * Regular-expression strings (no delimiters, flags are applied automatically).
   * Files whose path matches any of these patterns are excluded from analysis
   * even when their extension is in `sourceExtensions`.
   * Example: "pnpm-lock\\.yaml$"
   */
  noisePatterns: string[];
}
