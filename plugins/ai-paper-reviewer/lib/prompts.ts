/**
 * AI Paper Reviewer - Prompt Templates
 *
 * Dynamic prompt construction based on event context, criteria, and configuration.
 */

export interface EventContext {
  name: string;
  description?: string | null;
  eventType?: string;
  topics?: string[];
  audienceLevel?: string[];
}

export interface ReviewCriterion {
  name: string;
  description?: string | null;
  weight: number;
}

export interface SimilarSubmissionInfo {
  title: string;
  similarity: number;
}

export interface BuildPromptOptions {
  event?: EventContext | null;
  criteria?: ReviewCriterion[];
  strictnessLevel?: 'lenient' | 'moderate' | 'strict';
  customPersona?: string;
  similarSubmissions?: SimilarSubmissionInfo[];
  reviewFocus?: string[];
}

/**
 * Get strictness-specific instructions.
 */
export function getStrictnessInstructions(level: string): string {
  switch (level) {
    case 'lenient':
      return `Be encouraging and supportive. Focus on the submission's potential rather than its flaws. Give the benefit of the doubt when information is incomplete. Recommend acceptance for submissions that show promise, even if they need polish.`;
    case 'strict':
      return `Apply high standards expected of top-tier conferences. Submissions must demonstrate clear value, technical accuracy, and excellent presentation. Be thorough in identifying issues. Only recommend acceptance for submissions that meet excellence criteria.`;
    case 'moderate':
    default:
      return `Provide a balanced assessment. Acknowledge both strengths and weaknesses fairly. Base your recommendation on the overall quality relative to typical conference standards. Neither overly harsh nor overly generous.`;
  }
}

/**
 * Build the JSON response schema instructions based on criteria names.
 */
export function buildResponseSchema(criteriaNames: string[]): string {
  const criteriaScoresExample = criteriaNames.length > 0
    ? criteriaNames.map((n) => `    "${n}": <1-5>`).join(',\n')
    : `    "Content Quality": <1-5>,\n    "Presentation Clarity": <1-5>,\n    "Relevance": <1-5>,\n    "Originality": <1-5>`;

  return `Provide your response in the following JSON format:
{
  "criteriaScores": {
${criteriaScoresExample}
  },
  "overallScore": <1-5>,
  "summary": "<2-3 sentence summary of your assessment>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "suggestions": ["<suggestion 1>", "<suggestion 2>"],
  "recommendation": "<STRONG_ACCEPT|ACCEPT|NEUTRAL|REJECT|STRONG_REJECT>",
  "confidence": <0.0-1.0>
}

Respond ONLY with the JSON object, no additional text.`;
}

/**
 * Build the full system prompt for the AI reviewer.
 */
export function buildSystemPrompt(options: BuildPromptOptions = {}): string {
  const {
    event,
    criteria = [],
    strictnessLevel = 'moderate',
    customPersona,
    similarSubmissions = [],
    reviewFocus = [],
  } = options;

  const parts: string[] = [];

  // Base persona
  if (event) {
    parts.push(
      `You are an experienced conference paper reviewer serving on the program committee for "${event.name}". Your role is to provide fair, constructive, and thorough evaluations of talk submissions.`
    );
  } else {
    parts.push(
      `You are an experienced conference paper reviewer. Your role is to provide fair, constructive, and thorough evaluations of talk submissions.`
    );
  }

  // Event context
  if (event) {
    const eventLines = [`\nEVENT CONTEXT:`, `- Event: ${event.name}`];
    if (event.description) eventLines.push(`- Description: ${event.description}`);
    if (event.eventType) eventLines.push(`- Event Type: ${event.eventType}`);
    if (event.topics && event.topics.length > 0) {
      eventLines.push(`- Topics: ${event.topics.join(', ')}`);
    }
    if (event.audienceLevel && event.audienceLevel.length > 0) {
      eventLines.push(`- Target Audience: ${event.audienceLevel.join(', ')}`);
    }
    parts.push(eventLines.join('\n'));
  }

  // Review criteria from event configuration
  if (criteria.length > 0) {
    const criteriaLines = [`\nREVIEW CRITERIA (from event configuration):`];
    for (const c of criteria) {
      const desc = c.description ? `: ${c.description}` : '';
      criteriaLines.push(`- ${c.name} (weight: ${c.weight}/5)${desc}`);
    }
    parts.push(criteriaLines.join('\n'));
  }

  // Strictness
  parts.push(`\nSTRICTNESS LEVEL: ${strictnessLevel}`);
  parts.push(getStrictnessInstructions(strictnessLevel));

  // Similar submissions
  if (similarSubmissions.length > 0) {
    const simLines = [`\nSIMILAR SUBMISSIONS DETECTED:`];
    for (const s of similarSubmissions) {
      simLines.push(`- "${s.title}" (${Math.round(s.similarity * 100)}% similar)`);
    }
    simLines.push(`Consider whether this submission offers a unique perspective.`);
    parts.push(simLines.join('\n'));
  }

  // Review focus
  if (reviewFocus.length > 0) {
    parts.push(`\nREVIEW FOCUS: ${reviewFocus.join(', ')}`);
  }

  // Task instructions
  const criteriaNames = criteria.map((c) => c.name);
  parts.push(`\nYOUR TASK:
1. Analyze the submission against each review criterion
2. Provide scores (1-5) for each criterion based on event weights
3. Calculate an overall recommendation
4. List specific strengths and weaknesses
5. Provide actionable suggestions for improvement
6. Set your confidence level (0.0-1.0) based on information quality

IMPORTANT GUIDELINES:
- Be objective and fair to all submissions
- Consider the specific event audience
- Acknowledge limitations in your assessment
- Set confidence LOW if:
  - The abstract is vague or lacks detail
  - You're unsure about technical claims
  - The topic is outside typical conference scope
  - Speaker information is insufficient`);

  // Response schema
  parts.push('\n' + buildResponseSchema(criteriaNames));

  // Custom persona
  if (customPersona) {
    parts.push(`\nADDITIONAL INSTRUCTIONS:\n${customPersona}`);
  }

  return parts.join('\n');
}
