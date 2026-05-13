export const getCommitMessage = (diff: string, language: string) => {
  return `
    You are a Git expert. Given the following git diff, suggest ONE commit message following conventional Commits format (feat/fix/chore/docs/refactor/test).
    Rules:
    - Message MUST be generated using in '${language}' language
    - First line: type(scope): short description (max 73 chars)
    - Be specific and descriptive
    - Use imperative mood ("add" not "added")
    - Only return a explain message about the changes nothing else.
    
    Git diff:
      ${diff}
    `;
};

export const getSummaryOf = <T>(observations: T[], language: string) => {
  return `
    You are a senior developer. Given the following per-file risk analyses, generate a consolidated risk report in Markdown README format.

    Rules:
      - Report MUST be written in '${language}' language
      - Be specific and descriptive
      - Aggregate risks across all files, avoid repetition

    Analyses:
      ${JSON.stringify(observations, null, 2)}

    Return only valid Markdown with these sections:
      # Risk Report
      ## Summary
      ## Risk Details
      (table or bullet list per risk: file, title, severity, description)
      ## Recommendations
  `;
};

export const getRiskSummary = (diff: string, language: string) => {
  return `
    You are a senior developer. Giving the following git diff, analize the risk in the changes. 

    Rules:
      - Message MUST be generated using in '${language}' language
      - Be specific and descriptive
      - Identifify the risk and vulnerabilities in the changes
      - Suggest a recomendation to solve the risk

    Git diff:
      ${diff}

    Return only a valid JSON structure with this fields:
      {
        "summary": "...",
        "risks": [{
          "id": identifier,
          "title": "...",
          "description": "..."
        }],
        "severity": "low|medium|high",
        "recommendations": []
      }
  `;
};

export const getSummaryMessage = (commits: string[], language: string) => {
  return `
            You are a senior developer. Write a clear Pull Request description based on theses commits: 
            ${commits.map((c, i) => `${i + 1}. ${c}`).join("\n")}
            Rules:
            - Message MUST be generated in '${language}' language
            
            Include: 
            - ## Summary (2-3 sentences)
            - ## Changes (bullet points)
            - ## Testing notes the change is not clear
            Keep it concise and professional
        `;
};

export const getReviewMessage = (diff: string, language: string) => {
  return `
            Review this git diff and flag potential risks.
            
            Rules:
            - Message MUST USE the language '${language}'
            
            Focus on:
            - Security issues (secrets, auth, premissions)
            - Breaking changes
            - Missing error handling
            - Database migrations
            - Enviroment variable changes
            Format as a short bullet list. If nothing is risky, say "No critical issues found"
            Diff:
                ${diff}
            `;
};
