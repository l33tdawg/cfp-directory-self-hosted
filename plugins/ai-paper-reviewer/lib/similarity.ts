/**
 * AI Paper Reviewer - Duplicate Detection Module
 *
 * Simple Jaccard similarity on tokenized words for detecting
 * similar submissions without external dependencies.
 */

export interface SimilarSubmission {
  id: string;
  title: string;
  similarity: number;
}

/**
 * Tokenize text into lowercase words, removing punctuation.
 */
function tokenize(text: string): Set<string> {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2) // Skip very short words
  );
}

/**
 * Compute Jaccard similarity between two sets of tokens.
 * Returns a value between 0.0 and 1.0.
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }

  const union = a.size + b.size - intersection;
  if (union === 0) return 0;

  return intersection / union;
}

/**
 * Find submissions similar to the target, using Jaccard similarity
 * on combined title + abstract text.
 *
 * @param targetTitle - The title of the submission being analyzed
 * @param targetAbstract - The abstract of the submission being analyzed
 * @param otherSubmissions - Other submissions to compare against
 * @param threshold - Minimum similarity to include (0.0-1.0, default 0.7)
 * @returns Similar submissions sorted by similarity descending
 */
export function findSimilarSubmissions(
  targetTitle: string,
  targetAbstract: string | null,
  otherSubmissions: Array<{ id: string; title: string; abstract: string | null }>,
  threshold: number = 0.7
): SimilarSubmission[] {
  const targetText = `${targetTitle} ${targetAbstract || ''}`;
  const targetTokens = tokenize(targetText);

  if (targetTokens.size === 0) return [];

  const results: SimilarSubmission[] = [];

  for (const sub of otherSubmissions) {
    const subText = `${sub.title} ${sub.abstract || ''}`;
    const subTokens = tokenize(subText);

    const similarity = jaccardSimilarity(targetTokens, subTokens);

    if (similarity >= threshold) {
      results.push({
        id: sub.id,
        title: sub.title,
        similarity,
      });
    }
  }

  // Sort by similarity descending
  results.sort((a, b) => b.similarity - a.similarity);

  return results;
}
