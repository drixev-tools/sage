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
    - Return ONLY the commit message line. No explanations, no quotes, no markdown.
    - The message MUST be written in '${sanitizeLanguage(language)}'
    - Format: type(scope): short description (max 73 chars total)
    - Valid types: feat, fix, chore, docs, refactor, test, style, perf, ci, build
    - Use imperative mood ("add" not "added", "fix" not "fixed")
    - The scope is optional — only include it if clearly identifiable from the diff
    - For breaking changes, append '!' after the type: feat!: ...

    Git diff:
    <diff>
    ${sanitizeDiff(diff)}
    </diff>
  `;
};

export const getCommitMessageFromContext = (
  stat: string,
  topDiff: string,
  language: string,
) => {
  return `
    You are a Git expert specializing in writing clean, conventional commit messages.
    The staged changes are too large to show in full. You have a complete file-change summary
    and the full diff for the most-changed files to inform your message.

    Rules:
    - Return ONLY the commit message line. No explanations, no quotes, no markdown, no json. Only string message.
    - The message MUST be written in '${sanitizeLanguage(language)}'
    - Format: type(scope): short description (max 73 chars total)
    - Valid types: feat, fix, chore, docs, refactor, test, style, perf, ci, build
    - Use imperative mood ("add" not "added", "fix" not "fixed")
    - The scope is optional — only include it if clearly identifiable from the changes
    - For breaking changes, append '!' after the type: feat!: ...


    Change summary (all staged files):
    <stat>
    ${sanitizeDiff(stat)}
    </stat>

    Full diff (most-changed files, may be partial):
    <diff>
    ${sanitizeDiff(topDiff)}
    </diff>
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

export const getFileRisk = (content: string, filename: string, language: string) => {
  return `
    You are a senior software engineer and security reviewer.
    Analyze the following source file for risks, vulnerabilities, and code quality issues.

    Rules:
    - The response MUST be written in '${sanitizeLanguage(language)}'
    - Be specific and grounded in the actual code — do not speculate beyond what is shown
    - Identify security vulnerabilities, logic errors, poor practices, and operational risks
    - For each risk, suggest a concrete actionable recommendation
    - If no meaningful risks are found, return severity "low" with an empty risks array
    - Return ONLY a valid JSON object. No markdown, no code blocks, no extra text.

    File: ${filename}
    <content>
    ${sanitizeDiff(content)}
    </content>

    Return this exact JSON structure:
    {
      "summary": "Brief overall assessment of the file and its risk profile",
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
    You are a senior software engineer performing a code quality review.
    Review the following git diff and give actionable feedback to help the author write better code.

    Rules:
    - The review MUST be written in '${sanitizeLanguage(language)}'
    - Be specific: reference the actual code or file where the issue appears
    - Only flag real concerns — do not invent issues
    - Use Markdown formatting

    Focus on:
    - Readability: unclear naming, confusing logic, missing or misleading comments
    - Complexity: functions doing too much, deep nesting, hard-to-follow control flow
    - Duplication: repeated logic that should be extracted or reused
    - Maintainability: brittle patterns, magic numbers/strings, tight coupling
    - Correctness: edge cases not handled, wrong assumptions, off-by-one errors
    - Test coverage: untested logic, missing assertions, hard-to-test structure
    - Best practices: idiomatic usage for the language/framework in use

    Format your response as a bullet list grouped by file, one item per concern.
    If the code looks good, respond with: "No quality issues found."

    Diff:
    <diff>
    ${sanitizeDiff(diff)}
    </diff>
  `;
};
