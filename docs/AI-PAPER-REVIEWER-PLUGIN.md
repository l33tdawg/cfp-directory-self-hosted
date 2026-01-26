# AI Paper Reviewer Plugin

> **Current App Version:** 1.0.0  
> **Plugin Target Version:** 1.5.0  
> **Requires:** Plugin System v1.4.0+  
> **Status:** Planning

This document describes the AI Paper Reviewer plugin, which automatically analyzes CFP submissions using AI to provide preliminary review scores and feedback.

## Version Roadmap

| App Version | Plugin Version | Milestone |
|-------------|----------------|-----------|
| 1.0.0 | - | Current app (no plugin system) |
| 1.4.0 | - | Plugin system with UI slots ready |
| **1.5.0** | **1.0.0** | Initial AI Reviewer release |
| 1.5.1 | 1.1.0 | Additional AI providers, improved prompts |
| 1.6.0 | 1.2.0 | Batch analysis, comparison views |

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [AI Analysis Flow](#ai-analysis-flow)
- [Human-in-the-Loop Safeguards](#human-in-the-loop-safeguards)
- [LLM Response Handling](#llm-response-handling)
- [UI Components](#ui-components)
- [Implementation Plan](#implementation-plan)

---

## Overview

The AI Paper Reviewer plugin automatically analyzes new submissions using AI providers (OpenAI, Anthropic) to provide:

- Overall quality score (1-10)
- Per-criteria scores
- Strengths and concerns
- Accept/reject recommendation
- Confidence level

### Why a Plugin?

Rather than building AI review into core:

| Concern | Plugin Approach |
|---------|-----------------|
| **Cost** | Only organizations that want AI review pay for API calls |
| **Privacy** | Some orgs may not want submissions sent to external AI |
| **Provider Choice** | Users can pick OpenAI, Anthropic, or future providers |
| **Modularity** | Can be disabled/removed without affecting core |

---

## Features

### v1.0.0 (Initial Release)

- Auto-analyze submissions on creation
- OpenAI and Anthropic provider support
- Configurable review criteria
- AI review panel on submission review page
- Confidence threshold for hiding low-quality results
- Admin override for hidden recommendations
- JSON schema validation with retry
- Raw response storage for audit

### v1.1.0 (Planned)

- Manual trigger button for re-analysis
- Google Gemini provider support
- Custom prompt templates
- Cost tracking per submission

### v1.2.0 (Planned)

- Batch analysis for existing submissions
- Side-by-side human vs AI comparison
- AI agreement scoring (how often AI matches human reviewers)
- Export AI analysis data

---

## Configuration

### manifest.json

```json
{
  "name": "ai-paper-reviewer",
  "displayName": "AI Paper Reviewer",
  "version": "1.0.0",
  "apiVersion": "1.0",
  "description": "Automatically analyze submissions using AI to provide preliminary review scores and feedback",
  "author": "CFP Directory",
  "homepage": "https://docs.cfp-directory.com/plugins/ai-reviewer",
  "permissions": [
    "submissions:read",
    "reviews:write"
  ],
  "configSchema": {
    "type": "object",
    "properties": {
      "provider": {
        "type": "string",
        "enum": ["openai", "anthropic"],
        "title": "AI Provider",
        "default": "openai"
      },
      "apiKey": {
        "type": "string",
        "title": "API Key",
        "description": "API key for your chosen AI provider",
        "format": "password"
      },
      "model": {
        "type": "string",
        "title": "Model",
        "description": "Model to use for analysis",
        "default": "gpt-4"
      },
      "autoAnalyze": {
        "type": "boolean",
        "title": "Auto-analyze new submissions",
        "default": true
      },
      "reviewCriteria": {
        "type": "array",
        "title": "Review Criteria",
        "description": "Criteria the AI should evaluate",
        "items": { "type": "string" },
        "default": [
          "Technical accuracy",
          "Relevance to audience",
          "Clarity of abstract",
          "Speaker qualifications"
        ]
      },
      "confidenceThreshold": {
        "type": "number",
        "title": "Confidence Threshold",
        "description": "Hide AI recommendation if confidence is below this value (0-1)",
        "default": 0.6,
        "minimum": 0,
        "maximum": 1
      },
      "hideRecommendationBelowThreshold": {
        "type": "boolean",
        "title": "Hide low-confidence recommendations",
        "description": "If true, recommendations below confidence threshold are hidden",
        "default": true
      },
      "requireAdminOverride": {
        "type": "boolean",
        "title": "Require admin override for low confidence",
        "description": "If true, admins must approve showing low-confidence recommendations",
        "default": false
      }
    },
    "required": ["provider", "apiKey"]
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `provider` | string | `"openai"` | AI provider (`openai` or `anthropic`) |
| `apiKey` | string | - | API key for the provider |
| `model` | string | `"gpt-4"` | Model to use |
| `autoAnalyze` | boolean | `true` | Auto-analyze new submissions |
| `reviewCriteria` | string[] | (see above) | Criteria for evaluation |
| `confidenceThreshold` | number | `0.6` | Hide results below this confidence |
| `hideRecommendationBelowThreshold` | boolean | `true` | Enable confidence hiding |
| `requireAdminOverride` | boolean | `false` | Require admin to show hidden results |

---

## Architecture

### Directory Structure

```
plugins/
└── ai-paper-reviewer/
    ├── manifest.json
    ├── index.ts
    ├── lib/
    │   ├── analyzer.ts        # Main analysis logic
    │   ├── schema.ts          # JSON schema validation
    │   ├── prompts.ts         # Prompt templates
    │   └── providers/
    │       ├── index.ts       # Provider factory
    │       ├── openai.ts      # OpenAI integration
    │       └── anthropic.ts   # Anthropic integration
    └── components/
        ├── ai-review-panel.tsx    # Review page panel
        └── ai-stats-widget.tsx    # Dashboard widget
```

### Data Flow

```
┌─────────────────┐
│ New Submission  │
└────────┬────────┘
         │ submission.created hook
         ▼
┌─────────────────┐
│  Queue Job      │ (if autoAnalyze enabled)
└────────┬────────┘
         │ background worker
         ▼
┌─────────────────┐
│ Call AI API     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validate JSON   │──── Invalid ────▶ Retry with repair prompt
└────────┬────────┘
         │ Valid
         ▼
┌─────────────────┐
│ Store Result    │ (with raw response for audit)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ UI Displays     │ (with confidence check)
└─────────────────┘
```

---

## AI Analysis Flow

### 1. Triggering Analysis

```typescript
// index.ts
hooks: {
  'submission.created': async (ctx, { submission }) => {
    if (!ctx.config.autoAnalyze) {
      ctx.logger.info('Auto-analyze disabled, skipping');
      return;
    }
    
    await ctx.jobs.enqueue({
      type: 'ai-analyze-submission',
      payload: {
        submissionId: submission.id,
        title: submission.title,
        abstract: submission.abstract,
        outline: submission.outline
      }
    });
    
    ctx.logger.info('Queued AI analysis', { submissionId: submission.id });
  }
}
```

### 2. Job Processing

```typescript
hooks: {
  'job.ai-analyze-submission': async (ctx, job) => {
    const { submissionId, title, abstract, outline } = job.payload;
    
    const analysis = await analyzeSubmission({
      provider: ctx.config.provider,
      apiKey: ctx.config.apiKey,
      model: ctx.config.model,
      criteria: ctx.config.reviewCriteria,
      submission: { title, abstract, outline }
    });
    
    // Store result with audit trail
    await storeAnalysis(ctx, submissionId, analysis);
    
    return { success: true, score: analysis.overallScore };
  }
}
```

### 3. Analysis Result Structure

```typescript
interface AnalysisResult {
  // Scores
  overallScore: number;           // 1-10
  criteriaScores: Record<string, number>;
  
  // Feedback
  summary: string;                // 2-3 sentences
  strengths: string[];
  concerns: string[];
  
  // Recommendation
  recommendation: 'strong_accept' | 'accept' | 'neutral' | 'reject' | 'strong_reject';
  confidence: number;             // 0-1
  
  // Audit fields
  analyzedAt: string;
  rawResponse: string;            // Original LLM response
  parseAttempts: number;
  repairApplied: boolean;
}
```

---

## Human-in-the-Loop Safeguards

AI analysis should assist reviewers, not replace them. These safeguards prevent over-reliance on potentially unreliable AI assessments.

### Confidence Threshold

When AI confidence is below the configured threshold:

1. **Hide Recommendation** - The accept/reject recommendation is hidden
2. **Show Warning** - Reviewers see "Low confidence" indicator
3. **Scores Visible** - Criteria scores still shown for reference
4. **Admin Override** - Admins can choose to show hidden results

### Why This Matters

| Scenario | Without Safeguards | With Safeguards |
|----------|-------------------|-----------------|
| AI unsure about topic | May give wrong recommendation | Recommendation hidden |
| Ambiguous abstract | May misinterpret intent | Reviewer decides without bias |
| Edge case submission | Random-seeming score | Low confidence flagged |

### Configuration Options

```typescript
// Hide all recommendations below 60% confidence
confidenceThreshold: 0.6

// Enable hiding (default: true)
hideRecommendationBelowThreshold: true

// Require admin to approve showing hidden results
requireAdminOverride: true
```

### UI Behavior

**Above threshold:** Full panel with scores, feedback, recommendation

**Below threshold (hidden):**
```
┌─────────────────────────────────────────────┐
│ 🧠 AI Analysis          [Low Confidence]    │
├─────────────────────────────────────────────┤
│ ⚠️ AI recommendation hidden due to low      │
│    confidence (45% < 60% threshold).        │
│                                             │
│    This helps prevent potentially           │
│    unreliable AI assessments from           │
│    influencing review decisions.            │
│                                             │
│    [🛡️ Admin: Show Anyway]                  │
└─────────────────────────────────────────────┘
```

**Below threshold (shown via override):**
```
┌─────────────────────────────────────────────┐
│ 🧠 AI Analysis     7/10    [accept]         │
├─────────────────────────────────────────────┤
│ Summary: ...                                │
│ Strengths: ...                              │
│ Concerns: ...                               │
│                                             │
│ ⚠️ Low confidence (45%). Use this analysis  │
│    as supplementary input only.             │
└─────────────────────────────────────────────┘
```

---

## LLM Response Handling

LLMs can return malformed JSON or unexpected structures. We implement robust parsing with retry.

### JSON Schema Validation

```typescript
const analysisResultSchema = {
  type: 'object',
  required: ['overallScore', 'summary', 'strengths', 'concerns', 
             'criteriaScores', 'recommendation', 'confidence'],
  properties: {
    overallScore: { type: 'number', minimum: 1, maximum: 10 },
    summary: { type: 'string', minLength: 10 },
    strengths: { type: 'array', items: { type: 'string' } },
    concerns: { type: 'array', items: { type: 'string' } },
    criteriaScores: { 
      type: 'object', 
      additionalProperties: { type: 'number', minimum: 1, maximum: 10 } 
    },
    recommendation: { 
      type: 'string', 
      enum: ['strong_accept', 'accept', 'neutral', 'reject', 'strong_reject'] 
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 }
  }
};
```

### Retry with Repair Prompt

If initial parsing/validation fails:

```typescript
async function analyzeSubmission(input: AnalysisInput): Promise<AnalysisResult> {
  let rawResult = await callProvider(input);
  let parseAttempts = 1;
  let repairApplied = false;
  
  let parsed = tryParseJson(rawResult);
  
  if (!parsed || !validate(parsed)) {
    // Retry with repair prompt
    const errors = getValidationErrors(parsed);
    rawResult = await callProvider({
      ...input,
      prompt: buildRepairPrompt(rawResult, errors)
    });
    parseAttempts++;
    repairApplied = true;
    
    parsed = tryParseJson(rawResult);
    if (!parsed || !validate(parsed)) {
      throw new AnalysisValidationError('Failed after repair', rawResult);
    }
  }
  
  return {
    ...parsed,
    rawResponse: rawResult,
    parseAttempts,
    repairApplied,
    analyzedAt: new Date().toISOString()
  };
}
```

### Repair Prompt Template

```
Your previous response was not valid JSON or had validation errors.

Previous response:
${previousResponse}

Errors:
${errors}

Please provide a corrected response with ONLY valid JSON matching:
- overallScore: number 1-10
- summary: string (at least 10 characters)
- strengths: array of strings
- concerns: array of strings
- criteriaScores: object with criterion names as keys, scores 1-10 as values
- recommendation: one of "strong_accept", "accept", "neutral", "reject", "strong_reject"
- confidence: number 0-1

Respond with ONLY the JSON, no markdown or explanation.
```

### Audit Trail

Every analysis stores:

| Field | Purpose |
|-------|---------|
| `rawResponse` | Original LLM response for debugging |
| `parseAttempts` | How many tries to get valid JSON |
| `repairApplied` | Whether repair prompt was used |
| `analyzedAt` | Timestamp for versioning |

---

## UI Components

### AI Review Panel

Displayed on the submission review page via `submission.review.panel` slot.

```tsx
// components/ai-review-panel.tsx

export function AIReviewPanel({ context, pluginConfig }: PluginComponentProps) {
  const { submissionId, isAdmin } = context;
  const { data, loading, error } = useAnalysis(submissionId);
  
  const confidenceThreshold = pluginConfig.confidenceThreshold ?? 0.6;
  const isLowConfidence = data?.confidence < confidenceThreshold;
  const shouldHide = isLowConfidence && pluginConfig.hideRecommendationBelowThreshold;
  
  if (loading) return <LoadingCard />;
  if (error) return <ErrorCard error={error} />;
  if (!data) return <PendingCard />;
  
  if (shouldHide && !showOverridden) {
    return <LowConfidenceCard 
      confidence={data.confidence}
      threshold={confidenceThreshold}
      canOverride={isAdmin}
      onOverride={() => setShowOverridden(true)}
    />;
  }
  
  return (
    <Card>
      <CardHeader>
        <h3>AI Analysis</h3>
        <Badge>{data.recommendation}</Badge>
        <span>{data.overallScore}/10</span>
      </CardHeader>
      <CardContent>
        <Summary text={data.summary} />
        <CriteriaScores scores={data.criteriaScores} />
        <StrengthsList items={data.strengths} />
        <ConcernsList items={data.concerns} />
        {isLowConfidence && <LowConfidenceWarning confidence={data.confidence} />}
        <Footer confidence={data.confidence} analyzedAt={data.analyzedAt} />
      </CardContent>
    </Card>
  );
}
```

### AI Stats Widget

Displayed on dashboard via `dashboard.widgets` slot.

```tsx
// components/ai-stats-widget.tsx

export function AIStatsWidget({ pluginConfig }: PluginComponentProps) {
  const { stats } = useAIStats();
  
  return (
    <Card>
      <CardHeader>
        <h3>AI Review Stats</h3>
      </CardHeader>
      <CardContent>
        <Stat label="Submissions Analyzed" value={stats.totalAnalyzed} />
        <Stat label="Avg Score" value={stats.avgScore.toFixed(1)} />
        <Stat label="Avg Confidence" value={`${(stats.avgConfidence * 100).toFixed(0)}%`} />
        <Stat label="Low Confidence Rate" value={`${(stats.lowConfidenceRate * 100).toFixed(0)}%`} />
      </CardContent>
    </Card>
  );
}
```

---

## Implementation Plan

### Phase 1: Core Analysis (v1.5.0)

**Files to create:**
- `plugins/ai-paper-reviewer/manifest.json`
- `plugins/ai-paper-reviewer/index.ts`
- `plugins/ai-paper-reviewer/lib/analyzer.ts`
- `plugins/ai-paper-reviewer/lib/schema.ts`
- `plugins/ai-paper-reviewer/lib/prompts.ts`
- `plugins/ai-paper-reviewer/lib/providers/openai.ts`
- `plugins/ai-paper-reviewer/lib/providers/anthropic.ts`

**Tasks:**
1. Create plugin manifest and structure
2. Implement OpenAI provider integration
3. Implement Anthropic provider integration
4. Build JSON schema validation
5. Add retry with repair prompt
6. Implement analysis storage

### Phase 2: UI Components (v1.5.0)

**Files to create:**
- `plugins/ai-paper-reviewer/components/ai-review-panel.tsx`
- `plugins/ai-paper-reviewer/components/ai-stats-widget.tsx`
- `plugins/ai-paper-reviewer/components/low-confidence-card.tsx`

**Tasks:**
1. Build AI review panel component
2. Implement confidence threshold hiding
3. Add admin override functionality
4. Create dashboard stats widget
5. Add error boundary handling

### Phase 3: Testing & Polish (v1.5.0)

**Tasks:**
1. Write unit tests for analyzer
2. Write integration tests for providers
3. Test confidence threshold behavior
4. Test error recovery flows
5. Performance optimization

### Future Enhancements (v1.5.1+)

- Manual re-analysis trigger
- Google Gemini support
- Custom prompt templates
- Batch analysis
- Cost tracking
- AI vs human comparison metrics

---

## API Endpoints

The plugin adds these API routes:

```
GET  /api/plugins/ai-paper-reviewer/analysis/:submissionId
     Returns analysis for a submission

POST /api/plugins/ai-paper-reviewer/analyze/:submissionId
     Manually trigger analysis (future: v1.5.1)

GET  /api/plugins/ai-paper-reviewer/stats
     Returns aggregate statistics
```

---

## Troubleshooting

### Analysis not running

1. Check plugin is enabled in admin settings
2. Verify API key is configured
3. Check `autoAnalyze` is true
4. Look at plugin logs for errors

### Invalid JSON errors

1. Check plugin logs for raw responses
2. May indicate prompt issues with specific model
3. Try different model (e.g., gpt-4 vs gpt-3.5-turbo)

### Low confidence on all submissions

1. Review criteria may be too vague
2. Abstract quality may be low across submissions
3. Consider lowering confidence threshold
4. Check if model is appropriate for domain

### API rate limits

1. Check provider dashboard for usage
2. Consider using slower model
3. Disable auto-analyze, use manual trigger
