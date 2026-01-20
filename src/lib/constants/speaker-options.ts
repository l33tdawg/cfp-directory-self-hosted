/**
 * Speaker Profile Constants
 * 
 * These constants are used for speaker onboarding and profile management.
 * They match the cfp.directory constants for federation compatibility.
 */

// =============================================================================
// EXPERTISE TAGS
// =============================================================================
// Categories of technical and professional topics speakers can select

export const EXPERTISE_TAGS = [
  // Programming Languages & Frameworks
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', '.NET',
  'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala', 'Elixir', 'Haskell', 'R',
  
  // Frontend & Web
  'React', 'Vue.js', 'Angular', 'Next.js', 'Svelte', 'HTML/CSS', 'Web Components',
  'WebAssembly', 'Progressive Web Apps', 'Accessibility', 'Web Performance',
  'Responsive Design', 'CSS Architecture', 'Animation', 'WebGL', 'Three.js',
  
  // Backend & APIs
  'Node.js', 'Django', 'FastAPI', 'Spring Boot', 'Express.js', 'GraphQL', 'REST APIs',
  'gRPC', 'Microservices', 'Serverless', 'API Design', 'WebSockets',
  
  // Cloud & Infrastructure
  'AWS', 'Azure', 'Google Cloud', 'Kubernetes', 'Docker', 'Terraform', 'CI/CD',
  'Infrastructure as Code', 'Platform Engineering', 'Site Reliability', 'Observability',
  
  // Data & AI
  'Machine Learning', 'Deep Learning', 'Natural Language Processing', 'Computer Vision',
  'Data Science', 'Data Engineering', 'Big Data', 'Analytics', 'Business Intelligence',
  'LLMs', 'AI/ML Operations', 'Generative AI', 'Prompt Engineering',
  
  // Databases
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB',
  'Database Design', 'Data Modeling', 'SQL', 'NoSQL', 'Time Series Databases',
  
  // Security
  'Application Security', 'Cloud Security', 'DevSecOps', 'Penetration Testing',
  'Security Architecture', 'Authentication', 'Authorization', 'Cryptography',
  
  // Mobile
  'iOS Development', 'Android Development', 'React Native', 'Flutter',
  'Mobile Architecture', 'Cross-Platform Development',
  
  // Architecture & Design
  'System Design', 'Software Architecture', 'Domain-Driven Design', 'Event-Driven Architecture',
  'Clean Architecture', 'Design Patterns', 'Technical Leadership',
  
  // DevOps & Practices
  'DevOps', 'Agile', 'Scrum', 'Kanban', 'Test-Driven Development', 'Continuous Integration',
  'Continuous Deployment', 'Monitoring', 'Logging', 'Incident Management',
  
  // Soft Skills & Leadership
  'Technical Writing', 'Public Speaking', 'Team Leadership', 'Mentoring',
  'Career Development', 'Developer Experience', 'Community Building',
  'Diversity & Inclusion', 'Remote Work', 'Productivity',
  
  // Emerging Tech
  'Blockchain', 'Web3', 'IoT', 'Edge Computing', 'AR/VR', 'Quantum Computing',
] as const;

export type ExpertiseTag = typeof EXPERTISE_TAGS[number];

// =============================================================================
// LANGUAGES
// =============================================================================
// Languages speakers can present in

export const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Portuguese',
  'Italian',
  'Dutch',
  'Russian',
  'Chinese (Mandarin)',
  'Chinese (Cantonese)',
  'Japanese',
  'Korean',
  'Arabic',
  'Hindi',
  'Polish',
  'Swedish',
  'Norwegian',
  'Danish',
  'Finnish',
  'Czech',
  'Turkish',
  'Greek',
  'Hebrew',
  'Thai',
  'Vietnamese',
  'Indonesian',
  'Malay',
  'Tagalog',
] as const;

export type Language = typeof LANGUAGES[number];

// =============================================================================
// EXPERIENCE LEVELS
// =============================================================================
// Speaker experience levels for filtering and matching

export const EXPERIENCE_LEVELS = [
  { value: 'NEW', label: 'New Speaker', description: 'First-time or new to public speaking' },
  { value: 'EXPERIENCED', label: 'Experienced', description: 'Several talks at meetups or small conferences' },
  { value: 'PROFESSIONAL', label: 'Professional', description: 'Regular speaker at conferences' },
  { value: 'KEYNOTE', label: 'Keynote Speaker', description: 'Keynote speaker at major conferences' },
] as const;

export type ExperienceLevelValue = typeof EXPERIENCE_LEVELS[number]['value'];

// =============================================================================
// SESSION FORMATS / PRESENTATION TYPES
// =============================================================================
// Types of presentations speakers can deliver

export const SESSION_FORMATS = [
  { value: 'TALK', label: 'Talk', description: 'Standard presentation (30-45 min)' },
  { value: 'LIGHTNING', label: 'Lightning Talk', description: 'Short presentation (5-15 min)' },
  { value: 'WORKSHOP', label: 'Workshop', description: 'Hands-on session (1-4 hours)' },
  { value: 'PANEL', label: 'Panel Discussion', description: 'Group discussion with moderator' },
  { value: 'KEYNOTE', label: 'Keynote', description: 'Opening or closing keynote' },
  { value: 'BOF', label: 'Birds of a Feather', description: 'Informal discussion group' },
  { value: 'TUTORIAL', label: 'Tutorial', description: 'Step-by-step learning session' },
  { value: 'FIRESIDE', label: 'Fireside Chat', description: 'Interview-style conversation' },
] as const;

export type SessionFormatValue = typeof SESSION_FORMATS[number]['value'];

// =============================================================================
// AUDIENCE TYPES
// =============================================================================
// Target audiences for talks

export const AUDIENCE_TYPES = [
  { value: 'BEGINNERS', label: 'Beginners', description: 'New to the topic' },
  { value: 'INTERMEDIATE', label: 'Intermediate', description: 'Some experience with the topic' },
  { value: 'ADVANCED', label: 'Advanced', description: 'Deep expertise expected' },
  { value: 'ALL_LEVELS', label: 'All Levels', description: 'Suitable for any experience level' },
  { value: 'DEVELOPERS', label: 'Developers', description: 'Software developers' },
  { value: 'ARCHITECTS', label: 'Architects', description: 'System/software architects' },
  { value: 'DEVOPS', label: 'DevOps/SRE', description: 'Operations and reliability engineers' },
  { value: 'DATA', label: 'Data Professionals', description: 'Data scientists and engineers' },
  { value: 'LEADERS', label: 'Tech Leaders', description: 'CTOs, VPs, Engineering Managers' },
  { value: 'PRODUCT', label: 'Product', description: 'Product managers and owners' },
] as const;

export type AudienceTypeValue = typeof AUDIENCE_TYPES[number]['value'];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get label for an experience level value
 */
export function getExperienceLevelLabel(value: string): string {
  const level = EXPERIENCE_LEVELS.find(l => l.value === value);
  return level?.label ?? value;
}

/**
 * Get label for a session format value
 */
export function getSessionFormatLabel(value: string): string {
  const format = SESSION_FORMATS.find(f => f.value === value);
  return format?.label ?? value;
}

/**
 * Get label for an audience type value
 */
export function getAudienceTypeLabel(value: string): string {
  const audience = AUDIENCE_TYPES.find(a => a.value === value);
  return audience?.label ?? value;
}

/**
 * Validate expertise tags (max 25, must be from predefined list)
 */
export function validateExpertiseTags(tags: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (tags.length > 25) {
    errors.push('Maximum 25 expertise tags allowed');
  }
  
  const invalidTags = tags.filter(tag => !EXPERTISE_TAGS.includes(tag as ExpertiseTag));
  if (invalidTags.length > 0) {
    errors.push(`Invalid tags: ${invalidTags.join(', ')}`);
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate languages (max 5, must be from predefined list)
 */
export function validateLanguages(languages: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (languages.length > 5) {
    errors.push('Maximum 5 languages allowed');
  }
  
  const invalidLanguages = languages.filter(lang => !LANGUAGES.includes(lang as Language));
  if (invalidLanguages.length > 0) {
    errors.push(`Invalid languages: ${invalidLanguages.join(', ')}`);
  }
  
  return { valid: errors.length === 0, errors };
}
