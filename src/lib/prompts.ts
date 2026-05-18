import { RiskDetail } from "../types/risk.types";
import { LANGUAGES_SUPPORTED } from "./constants";

const MAX_DIFF_CHARS = 50_000;
const MAX_TEXT_CHARS = 2_000;

function sanitizeDiff(input: string): string {
  return input.replace(/\0/g, "").slice(0, MAX_DIFF_CHARS);
}

function sanitizeText(input: string): string {
  return input.replace(/\0/g, "").slice(0, MAX_TEXT_CHARS);
}

// Validates against the same allowlist Commander enforces at CLI level
function sanitizeLanguage(input: string): string {
  return LANGUAGES_SUPPORTED.includes(input) ? input : "en";
}

export const getCommitMessage = (diff: string, language: string) => {
  return `
    You are a Git expert specializing in writing clean, conventional commit messages.
    Given the following git diff, generate exactly ONE commit message following the Conventional Commits specification.

    Rules:
    - The message MUST be written in '${sanitizeLanguage(language)}'
    - Format: type(scope): short description (max 73 chars total)
    - Valid types: feat, fix, chore, docs, refactor, test, style, perf, ci, build
    - Use imperative mood ("add" not "added", "fix" not "fixed")
    - The scope is optional — only include it if clearly identifiable from the diff
    - For breaking changes, append '!' after the type: feat!: ...
    - Be specific: describe WHAT changed and WHY if non-obvious
    - Return ONLY the commit message line. No explanations, no quotes, no markdown.

    Git diff:
    <diff>
    ${sanitizeDiff(diff)}
    </diff>
  `;
};

export const getSummaryMessageOfCommits = (
  messages: string[],
  language: string,
) => {
  const safe = messages.map(sanitizeText);
  return `
    You are a Git expert. Given the following list of commit messages, generate ONE consolidated commit message
    that best represents all the changes together.

    Rules:
    - The message MUST be written in '${sanitizeLanguage(language)}'
    - Format: type(scope): short description (max 73 chars total)
    - Choose the type that reflects the most impactful change (feat > fix > refactor > chore)
    - Use imperative mood ("add" not "added", "fix" not "fixed")
    - If the commits span multiple scopes, omit the scope or use a broad one
    - Return ONLY the commit message line. No explanations, no quotes, no markdown.

    Commits:
    <commits>
    ${JSON.stringify(safe, null, 2)}
    </commits>
  `;
};

export const getSummaryRisks = (diff: string, language: string) => {
  return `
    You are a senior software engineer and security reviewer.
    Given the following git diff, analyze the risks and potential vulnerabilities introduced by the changes.

    Rules:
    - The response MUST be written in '${sanitizeLanguage(language)}'
    - Be specific and grounded in the actual diff — do not speculate beyond what the code shows
    - Identify security vulnerabilities, logic errors, breaking changes, and operational risks
    - For each risk, suggest a concrete actionable recommendation to address it
    - If no meaningful risks are found, return severity "low" with an empty risks array
    - Return ONLY a valid JSON object. No markdown, no code blocks, no extra text.

    Git diff:
    <diff>
    ${sanitizeDiff(diff)}
    </diff>

    Return this exact JSON structure:
    {
      "summary": "Brief overall assessment of the changes and their risk profile",
      "severity": "low|medium|high",
      "risks": [
        {
          "id": 1,
          "title": "Short risk title",
          "description": "Detailed explanation of the risk and why it matters"
        }
      ],
      "recommendations": [
        "Actionable string recommendation addressing the risks above"
      ]
    }
  `;
};

export const getSummaryOfRisk = (
  observations: RiskDetail[],
  language: string,
) => {
  return `
    You are a senior software engineer. Given the following risk observations, generate a consolidated
    risk report in Markdown format suitable for a README or PR description.

    Rules:
    - The report MUST be written in '${sanitizeLanguage(language)}'
    - Use Markdown formatting: headers (##), bullet lists, bold for emphasis
    - Group related observations under shared topic headings derived from the observation titles
    - Be descriptive: explain each risk clearly so a non-author developer can understand it
    - End with a "## Recommendations" section summarizing the most important actions to take
    - Do not invent risks not present in the observations

    Observations:
    <observations>
    ${JSON.stringify(observations, null, 2)}
    </observations>
  `;
};

export const getSummaryPRMessage = (commits: string[], language: string) => {
  const safe = commits.map(sanitizeText);
  return `
    You are a senior developer writing a Pull Request description for a code review.
    Based on the following commits, write a clear and professional PR description.

    Commits:
    <commits>
    ${safe.map((c, i) => `${i + 1}. ${c}`).join("\n")}
    </commits>

    Rules:
    - The description MUST be written in '${sanitizeLanguage(language)}'
    - Use Markdown formatting
    - Keep it concise and professional

    Include these sections:
    - ## Summary — 2-3 sentences describing the purpose and scope of this PR
    - ## Changes — bullet list of the key changes made
    - ## Testing Notes — how to verify the changes; omit this section if the changes are trivial or self-evident
  `;
};

export const getReviewMessage = (diff: string, language: string) => {
  return `
    You are a senior software engineer performing a code review focused on risk and correctness.
    Review the following git diff and flag any potential issues.

    Rules:
    - The review MUST be written in '${sanitizeLanguage(language)}'
    - Be specific: reference the actual code or file where the issue appears
    - Only flag real concerns — do not invent issues
    - Use Markdown formatting

    Focus on:
    - Security issues (exposed secrets, insecure auth, missing input validation, unsafe permissions)
    - Breaking changes (API contracts, function signatures, database schema)
    - Missing or insufficient error handling
    - Database migrations (irreversible changes, missing rollback)
    - Environment variable additions or removals
    - Performance regressions

    Format your response as a short bullet list, one item per issue found.
    If no significant issues are found, respond with: "No critical issues found."

    Diff:
    <diff>
    ${sanitizeDiff(diff)}
    </diff>
  `;
};
