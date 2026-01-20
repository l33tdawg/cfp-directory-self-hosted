/**
 * Reviewer Options Constants
 * 
 * Predefined options for reviewer profiles and onboarding.
 */

// Expertise areas reviewers can select
export const REVIEWER_EXPERTISE_AREAS = [
  'Frontend Development',
  'Backend Development',
  'Full Stack Development',
  'Mobile Development',
  'DevOps & Infrastructure',
  'Cloud Computing',
  'Data Science & ML',
  'Artificial Intelligence',
  'Cybersecurity',
  'Database & Storage',
  'API Design',
  'Microservices',
  'System Architecture',
  'Performance Optimization',
  'Testing & QA',
  'Agile & Project Management',
  'Developer Experience',
  'Open Source',
  'Blockchain & Web3',
  'IoT & Embedded',
  'Game Development',
  'AR/VR Development',
  'Accessibility',
  'Design Systems',
  'Technical Writing',
] as const;

// What reviewers focus on when evaluating submissions
export const REVIEW_CRITERIA_OPTIONS = [
  { value: 'technical_depth', label: 'Technical Depth', description: 'Deep technical content and accuracy' },
  { value: 'practical_value', label: 'Practical Value', description: 'Real-world applicability and usefulness' },
  { value: 'innovation', label: 'Innovation', description: 'Novel ideas and approaches' },
  { value: 'clarity', label: 'Clarity', description: 'Clear communication and structure' },
  { value: 'audience_fit', label: 'Audience Fit', description: 'Appropriate for target audience' },
  { value: 'speaker_experience', label: 'Speaker Experience', description: 'Speaker\'s background and credibility' },
  { value: 'diversity', label: 'Topic Diversity', description: 'Unique perspectives and underrepresented topics' },
  { value: 'engagement', label: 'Engagement Potential', description: 'Likely to engage and inspire attendees' },
] as const;

// Hours per week reviewer can commit
export const HOURS_PER_WEEK_OPTIONS = [
  { value: '1-2', label: '1-2 hours' },
  { value: '2-5', label: '2-5 hours' },
  { value: '5-10', label: '5-10 hours' },
  { value: '10+', label: '10+ hours' },
] as const;

// Preferred event sizes
export const EVENT_SIZE_OPTIONS = [
  { value: 'small', label: 'Small (< 100 attendees)' },
  { value: 'medium', label: 'Medium (100-500 attendees)' },
  { value: 'large', label: 'Large (500+ attendees)' },
  { value: 'any', label: 'Any size' },
] as const;

// Helper functions
export function getExpertiseLabel(value: string): string {
  return value;
}

export function getCriteriaLabel(value: string): string {
  const criteria = REVIEW_CRITERIA_OPTIONS.find(c => c.value === value);
  return criteria?.label ?? value;
}

export function getHoursLabel(value: string): string {
  const hours = HOURS_PER_WEEK_OPTIONS.find(h => h.value === value);
  return hours?.label ?? value;
}

export function getEventSizeLabel(value: string): string {
  const size = EVENT_SIZE_OPTIONS.find(s => s.value === value);
  return size?.label ?? value;
}
