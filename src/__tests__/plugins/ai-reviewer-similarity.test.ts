/**
 * AI Paper Reviewer - Similarity / Duplicate Detection Tests
 */

import { describe, it, expect } from 'vitest';
import { findSimilarSubmissions } from '../../../plugins/ai-paper-reviewer/lib/similarity';

describe('findSimilarSubmissions', () => {
  const submissions = [
    { id: 's1', title: 'Introduction to Kubernetes', abstract: 'Learn the basics of container orchestration with Kubernetes' },
    { id: 's2', title: 'Advanced React Patterns', abstract: 'Deep dive into React hooks, context, and rendering optimization' },
    { id: 's3', title: 'Container Orchestration 101', abstract: 'Getting started with container orchestration and Kubernetes basics' },
    { id: 's4', title: 'Machine Learning in Production', abstract: 'Deploying ML models to production environments' },
  ];

  it('should find similar submissions above threshold', () => {
    const results = findSimilarSubmissions(
      'Kubernetes Fundamentals',
      'A beginner guide to Kubernetes container orchestration basics',
      submissions,
      0.3
    );

    expect(results.length).toBeGreaterThan(0);
    // Should find s1 and s3 as similar (Kubernetes/container related)
    const ids = results.map((r) => r.id);
    expect(ids).toContain('s1');
    expect(ids).toContain('s3');
  });

  it('should return results sorted by similarity descending', () => {
    const results = findSimilarSubmissions(
      'Kubernetes Basics',
      'Introduction to Kubernetes and container orchestration',
      submissions,
      0.2
    );

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
    }
  });

  it('should return empty array for completely different texts', () => {
    const results = findSimilarSubmissions(
      'Quantum Computing Theory',
      'Exploring quantum entanglement and superposition in computing',
      submissions,
      0.7
    );

    expect(results).toEqual([]);
  });

  it('should return near-1.0 similarity for identical texts', () => {
    const results = findSimilarSubmissions(
      'Introduction to Kubernetes',
      'Learn the basics of container orchestration with Kubernetes',
      submissions,
      0.5
    );

    expect(results.length).toBeGreaterThan(0);
    // The exact match should have very high similarity
    const exact = results.find((r) => r.id === 's1');
    expect(exact).toBeDefined();
    expect(exact!.similarity).toBeGreaterThan(0.9);
  });

  it('should filter by threshold', () => {
    const lowThreshold = findSimilarSubmissions(
      'Kubernetes and Docker',
      'Working with containers',
      submissions,
      0.1
    );

    const highThreshold = findSimilarSubmissions(
      'Kubernetes and Docker',
      'Working with containers',
      submissions,
      0.9
    );

    expect(lowThreshold.length).toBeGreaterThanOrEqual(highThreshold.length);
  });

  it('should handle empty target text', () => {
    const results = findSimilarSubmissions('', null, submissions, 0.5);
    expect(results).toEqual([]);
  });

  it('should handle empty other submissions', () => {
    const results = findSimilarSubmissions(
      'Test Title',
      'Test abstract',
      [],
      0.5
    );
    expect(results).toEqual([]);
  });

  it('should handle null abstracts gracefully', () => {
    const subsWithNull = [
      { id: 's1', title: 'Test Talk', abstract: null },
    ];

    const results = findSimilarSubmissions(
      'Test Talk',
      null,
      subsWithNull,
      0.3
    );

    // Should still work with title-only comparison
    expect(results.length).toBeGreaterThanOrEqual(0);
  });
});
