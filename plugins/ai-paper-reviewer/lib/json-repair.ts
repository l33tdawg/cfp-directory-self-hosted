/**
 * AI Paper Reviewer - JSON Parse Retry / Repair Module
 *
 * Attempts to parse AI responses as JSON, with retry and repair capabilities.
 */

export interface ParseResult<T> {
  data: T;
  parseAttempts: number;
  repairApplied: boolean;
  rawResponse: string;
}

/**
 * Strip markdown code fences from a string.
 * Handles ```json ... ``` and ``` ... ``` patterns.
 */
function stripMarkdownFences(text: string): string {
  let cleaned = text.trim();
  // Remove ```json or ``` at the start
  if (cleaned.startsWith('```')) {
    const firstNewline = cleaned.indexOf('\n');
    if (firstNewline !== -1) {
      cleaned = cleaned.slice(firstNewline + 1);
    }
  }
  // Remove trailing ```
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3).trim();
  }
  return cleaned;
}

/**
 * Attempt to parse a raw AI response as JSON, with retry and repair.
 *
 * @param rawText - The raw text from the AI provider
 * @param repairFn - A function that takes broken JSON and returns fixed JSON string
 * @param maxRetries - Maximum repair attempts (default: 2)
 * @returns ParseResult with the parsed data and metadata
 */
export async function parseWithRetry<T>(
  rawText: string,
  repairFn: (broken: string) => Promise<string>,
  maxRetries: number = 2
): Promise<ParseResult<T>> {
  let attempts = 0;
  let currentText = rawText;
  let repairApplied = false;

  while (attempts <= maxRetries) {
    attempts++;

    try {
      // Try direct parse first
      const data = JSON.parse(currentText) as T;
      return { data, parseAttempts: attempts, repairApplied, rawResponse: rawText };
    } catch {
      // Try stripping markdown fences
      const stripped = stripMarkdownFences(currentText);
      if (stripped !== currentText) {
        try {
          const data = JSON.parse(stripped) as T;
          return { data, parseAttempts: attempts, repairApplied, rawResponse: rawText };
        } catch {
          // Continue to repair
        }
      }

      // If we still have retries, call the repair function
      if (attempts <= maxRetries) {
        try {
          currentText = await repairFn(currentText);
          repairApplied = true;
        } catch {
          // Repair function itself failed, continue to next attempt
        }
      }
    }
  }

  throw new Error(
    `Failed to parse JSON after ${attempts} attempts. Raw response: ${rawText.slice(0, 200)}`
  );
}
