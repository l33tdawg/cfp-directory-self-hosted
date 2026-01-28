/**
 * AI Paper Reviewer - Prompt Builder Tests
 */

import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  getStrictnessInstructions,
  buildResponseSchema,
} from '../../../plugins/ai-paper-reviewer/lib/prompts';

describe('Prompt Builder', () => {
  describe('getStrictnessInstructions', () => {
    it('should return lenient instructions', () => {
      const instructions = getStrictnessInstructions('lenient');
      expect(instructions).toContain('encouraging');
      expect(instructions).toContain('potential');
    });

    it('should return moderate instructions', () => {
      const instructions = getStrictnessInstructions('moderate');
      expect(instructions).toContain('balanced');
    });

    it('should return strict instructions', () => {
      const instructions = getStrictnessInstructions('strict');
      expect(instructions).toContain('high standards');
      expect(instructions).toContain('excellence');
    });

    it('should default to moderate for unknown level', () => {
      const instructions = getStrictnessInstructions('unknown');
      expect(instructions).toContain('balanced');
    });
  });

  describe('buildResponseSchema', () => {
    it('should include provided criteria names', () => {
      const schema = buildResponseSchema(['Originality', 'Technical Depth']);
      expect(schema).toContain('"Originality"');
      expect(schema).toContain('"Technical Depth"');
    });

    it('should use default criteria when none provided', () => {
      const schema = buildResponseSchema([]);
      expect(schema).toContain('"Content Quality"');
      expect(schema).toContain('"Presentation Clarity"');
      expect(schema).toContain('"Relevance"');
      expect(schema).toContain('"Originality"');
    });

    it('should include confidence field', () => {
      const schema = buildResponseSchema(['Test']);
      expect(schema).toContain('"confidence"');
    });
  });

  describe('buildSystemPrompt', () => {
    it('should build a default prompt without event context', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('experienced conference paper reviewer');
      expect(prompt).toContain('STRICTNESS LEVEL: moderate');
      expect(prompt).toContain('confidence');
    });

    it('should include event context when provided', () => {
      const prompt = buildSystemPrompt({
        event: {
          name: 'TestConf 2025',
          description: 'A testing conference',
          eventType: 'conference',
        },
      });

      expect(prompt).toContain('TestConf 2025');
      expect(prompt).toContain('A testing conference');
      expect(prompt).toContain('EVENT CONTEXT');
    });

    it('should include review criteria with weights', () => {
      const prompt = buildSystemPrompt({
        criteria: [
          { name: 'Originality', weight: 5, description: 'How original is this' },
          { name: 'Clarity', weight: 3, description: null },
        ],
      });

      expect(prompt).toContain('REVIEW CRITERIA');
      expect(prompt).toContain('Originality (weight: 5/5)');
      expect(prompt).toContain('How original is this');
      expect(prompt).toContain('Clarity (weight: 3/5)');
    });

    it('should apply strictness level', () => {
      const lenient = buildSystemPrompt({ strictnessLevel: 'lenient' });
      expect(lenient).toContain('STRICTNESS LEVEL: lenient');
      expect(lenient).toContain('encouraging');

      const strict = buildSystemPrompt({ strictnessLevel: 'strict' });
      expect(strict).toContain('STRICTNESS LEVEL: strict');
      expect(strict).toContain('high standards');
    });

    it('should include similar submissions context', () => {
      const prompt = buildSystemPrompt({
        similarSubmissions: [
          { title: 'Docker Intro', similarity: 0.82 },
          { title: 'K8s Basics', similarity: 0.71 },
        ],
      });

      expect(prompt).toContain('SIMILAR SUBMISSIONS DETECTED');
      expect(prompt).toContain('"Docker Intro" (82% similar)');
      expect(prompt).toContain('"K8s Basics" (71% similar)');
      expect(prompt).toContain('unique perspective');
    });

    it('should append custom persona', () => {
      const prompt = buildSystemPrompt({
        customPersona: 'Focus on security implications.',
      });

      expect(prompt).toContain('ADDITIONAL INSTRUCTIONS');
      expect(prompt).toContain('Focus on security implications.');
    });

    it('should include review focus when provided', () => {
      const prompt = buildSystemPrompt({
        reviewFocus: ['constructive', 'detailed'],
      });

      expect(prompt).toContain('REVIEW FOCUS: constructive, detailed');
    });

    it('should not include optional sections when not provided', () => {
      const prompt = buildSystemPrompt();

      expect(prompt).not.toContain('EVENT CONTEXT');
      expect(prompt).not.toContain('REVIEW CRITERIA');
      expect(prompt).not.toContain('SIMILAR SUBMISSIONS');
      expect(prompt).not.toContain('ADDITIONAL INSTRUCTIONS');
      expect(prompt).not.toContain('REVIEW FOCUS');
    });
  });
});
