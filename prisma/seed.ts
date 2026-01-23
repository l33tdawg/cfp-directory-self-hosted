/**
 * Database Seed Script
 * 
 * Creates sample data for development and testing.
 * 
 * Usage:
 *   npx prisma db seed              # Full demo seed with sample data
 *   npx prisma db seed -- --minimal # Minimal seed (topics + settings only)
 * 
 * Or add to package.json:
 *   "prisma": {
 *     "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
 *   }
 * 
 * Sample Accounts (password: password123):
 *   - admin@example.com (Admin)
 *   - organizer@example.com (Organizer) 
 *   - reviewer1@example.com (Reviewer)
 *   - speaker1@example.com (Speaker)
 */

import { PrismaClient, UserRole, SubmissionStatus, ReviewerRole, ReviewRecommendation, SenderType, EventStatus } from '@prisma/client';
import { hash } from 'bcryptjs';
import { SECURITY_TOPICS, getTopicCount, getCategories } from './seed-topics';
import { EMAIL_TEMPLATES, getEmailTemplateCount, getEmailCategories } from './seed-email-templates';
import { 
  encryptPiiFields, 
  USER_PII_FIELDS, 
  SPEAKER_PROFILE_PII_FIELDS, 
  REVIEWER_PROFILE_PII_FIELDS 
} from '../src/lib/security/encryption';

const prisma = new PrismaClient();

// Check for --minimal flag
const isMinimalSeed = process.argv.includes('--minimal');

async function main() {
  console.log('🌱 Seeding database...\n');
  
  if (isMinimalSeed) {
    console.log('📦 Running MINIMAL seed (topics + settings only)\n');
  } else {
    console.log('🎭 Running FULL DEMO seed with sample data\n');
    console.log('   This includes sample events, users, submissions, and reviews');
    console.log('   to help you explore the platform features.\n');
  }

  // ==========================================================================
  // Topics (Security-focused defaults)
  // ==========================================================================
  console.log('🏷️  Creating topics...');
  
  // Use createMany for bulk insert, skip duplicates
  const topicsData = SECURITY_TOPICS.map((topic, index) => ({
    name: topic.name,
    category: topic.category,
    description: topic.description || null,
    isActive: true,
    sortOrder: index,
    usageCount: 0,
  }));

  // Delete existing topics first (for clean reseed)
  await prisma.topic.deleteMany({});
  
  await prisma.topic.createMany({
    data: topicsData,
    skipDuplicates: true,
  });
  
  const categories = getCategories();
  console.log(`  + Created ${getTopicCount()} topics in ${categories.length} categories`);
  console.log(`    Categories: ${categories.join(', ')}`);

  // ==========================================================================
  // Email Templates (seeded in both minimal and full modes)
  // ==========================================================================
  console.log('\n📧 Creating email templates...');
  
  // Delete existing templates for clean reseed
  await prisma.emailTemplate.deleteMany({});
  
  // Create email templates
  const emailTemplatesData = EMAIL_TEMPLATES.map(template => ({
    type: template.type,
    name: template.name,
    subject: template.subject,
    content: template.content,
    variables: template.variables,
    description: template.description,
    category: template.category,
    enabled: true,
  }));

  await prisma.emailTemplate.createMany({
    data: emailTemplatesData,
    skipDuplicates: true,
  });
  
  const emailCategories = getEmailCategories();
  console.log(`  + Created ${getEmailTemplateCount()} email templates in ${emailCategories.length} categories`);
  console.log(`    Categories: ${emailCategories.join(', ')}`);

  // ==========================================================================
  // Site Settings
  // ==========================================================================
  console.log('\n[Settings] Creating site configuration...');
  
  // Sample landing page content demonstrating the rich text editor capabilities
  // This is hero-style content: big headline, subtitle, then supporting info
  const sampleLandingPageContent = `
<h1>TechConf 2026</h1>
<p>Call for Papers Now Open</p>
<p>Join industry leaders and share your expertise at the premier technology conference. We welcome speakers of all backgrounds to inspire our global community.</p>

<hr />

<h2>Topics We're Seeking</h2>
<ul>
  <li><strong>Technical Deep-Dives</strong> — Cutting-edge technologies and architectures</li>
  <li><strong>Case Studies</strong> — Real-world implementation stories</li>
  <li><strong>Best Practices</strong> — Proven methodologies and standards</li>
  <li><strong>Emerging Trends</strong> — What's next in technology</li>
</ul>

<blockquote>
  <p>"The best conferences are built by the community, for the community."</p>
</blockquote>

<p><em>Submissions close March 15, 2026</em></p>
`.trim();

  // Default legal pages content for demo
  const defaultPrivacyPolicy = `<h2>Introduction</h2>
<p>Welcome to our platform. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Call for Papers (CFP) management platform.</p>

<h2>Information We Collect</h2>
<p>We collect information you provide directly to us, including account information (email, name), speaker profile details, and submission content.</p>

<h2>How We Use Your Information</h2>
<ul>
  <li><strong>Platform Services:</strong> To provide, operate, and maintain the CFP platform</li>
  <li><strong>Communication:</strong> To send you important updates about your submissions</li>
  <li><strong>Security:</strong> To detect and prevent fraud and security incidents</li>
</ul>

<h2>Your Rights</h2>
<p>Under applicable data protection laws (including GDPR), you have rights including access, rectification, erasure, and data portability.</p>

<h2>Contact Us</h2>
<p>If you have questions about this Privacy Policy, please contact the platform administrator.</p>`;

  const defaultTermsOfService = `<h2>1. Acceptance of Terms</h2>
<p>By creating an account or using this platform, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.</p>

<h2>2. Description of Service</h2>
<p>This is a Call for Papers management platform that enables speakers to submit talk proposals, organizers to manage events, and reviewers to evaluate submissions.</p>

<h2>3. User Accounts</h2>
<p>You must provide accurate information when creating an account and are responsible for maintaining the security of your credentials.</p>

<h2>4. User Conduct</h2>
<p>You agree not to submit false information, impersonate others, harass users, or violate applicable laws.</p>

<h2>5. Content Ownership</h2>
<p>You retain ownership of all content you submit. By submitting content, you grant us a license to store and display it as necessary for our services.</p>

<h2>6. Contact</h2>
<p>If you have questions about these Terms of Service, please contact the platform administrator.</p>`;

  await prisma.siteSettings.upsert({
    where: { id: 'default' },
    update: {
      // Update existing records with sample content
      name: 'TechConf 2026',
      description: 'The premier technology conference for developers and tech leaders',
      landingPageContent: sampleLandingPageContent,
      privacyPolicyContent: defaultPrivacyPolicy,
      termsOfServiceContent: defaultTermsOfService,
    },
    create: {
      id: 'default',
      name: 'TechConf 2026',
      description: 'The premier technology conference for developers and tech leaders',
      websiteUrl: 'http://localhost:3000',
      contactEmail: 'cfp@example.com',
      federationEnabled: false,
      // Rich content demonstrating WYSIWYG editor capabilities
      // Users can edit this in Settings > Landing Page
      landingPageContent: sampleLandingPageContent,
      privacyPolicyContent: defaultPrivacyPolicy,
      termsOfServiceContent: defaultTermsOfService,
    },
  });
  
  // For minimal seed, stop here
  if (isMinimalSeed) {
    console.log('\n' + '='.repeat(60));
    console.log('Minimal seeding complete.\n');
    console.log('Database Contents:');
    console.log(`  - ${getTopicCount()} Topics (${getCategories().length} categories)`);
    console.log(`  - ${getEmailTemplateCount()} Email Templates (${getEmailCategories().length} categories)`);
    console.log('  - Site settings configured');
    console.log('\nNext Steps:');
    console.log('  1. Start the application: npm run dev');
    console.log('  2. Register the first user at /auth/signup (becomes Admin)');
    console.log('  3. Configure SMTP in Settings > Email');
    console.log('  4. Customize email templates in Admin > Email Templates');
    console.log('='.repeat(60));
    return;
  }

  // ==========================================================================
  // Users
  // ==========================================================================
  console.log('[Users] Creating sample accounts...');
  
  const passwordHash = await hash('password123', 10);

  // Admin user
  const adminData = encryptPiiFields({ name: 'Sarah Admin' }, USER_PII_FIELDS);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: adminData.name as string,
      passwordHash,
      role: UserRole.ADMIN,
      emailVerified: new Date(),
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SarahAdmin&backgroundColor=ffdfbf',
    },
  });
  console.log(`  + Admin: ${admin.email}`);

  // Organizer user
  const organizerData = encryptPiiFields({ name: 'Michael Organizer' }, USER_PII_FIELDS);
  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@example.com' },
    update: {},
    create: {
      email: 'organizer@example.com',
      name: organizerData.name as string,
      passwordHash,
      role: UserRole.ORGANIZER,
      emailVerified: new Date(),
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MichaelOrganizer&backgroundColor=c1e7c1',
    },
  });
  console.log(`  + Organizer: ${organizer.email}`);

  // Reviewer users
  const reviewer1Data = encryptPiiFields({ name: 'Alice Chen' }, USER_PII_FIELDS);
  const reviewer1 = await prisma.user.upsert({
    where: { email: 'reviewer1@example.com' },
    update: {},
    create: {
      email: 'reviewer1@example.com',
      name: reviewer1Data.name as string,
      passwordHash,
      role: UserRole.REVIEWER,
      emailVerified: new Date(),
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AliceChen&backgroundColor=b6e3f4',
    },
  });
  console.log(`  + Reviewer: ${reviewer1.email}`);

  const reviewer2Data = encryptPiiFields({ name: 'Bob Martinez' }, USER_PII_FIELDS);
  const reviewer2 = await prisma.user.upsert({
    where: { email: 'reviewer2@example.com' },
    update: {},
    create: {
      email: 'reviewer2@example.com',
      name: reviewer2Data.name as string,
      passwordHash,
      role: UserRole.REVIEWER,
      emailVerified: new Date(),
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BobMartinez&backgroundColor=c0aede',
    },
  });
  console.log(`  + Reviewer: ${reviewer2.email}`);

  const reviewer3Data = encryptPiiFields({ name: 'Diana Rodriguez' }, USER_PII_FIELDS);
  const reviewer3 = await prisma.user.upsert({
    where: { email: 'reviewer3@example.com' },
    update: {},
    create: {
      email: 'reviewer3@example.com',
      name: reviewer3Data.name as string,
      passwordHash,
      role: UserRole.REVIEWER,
      emailVerified: new Date(),
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DianaRodriguez&backgroundColor=ffeaa7',
    },
  });
  console.log(`  + Reviewer: ${reviewer3.email}`);

  const reviewer4Data = encryptPiiFields({ name: 'Marcus Thompson' }, USER_PII_FIELDS);
  const reviewer4 = await prisma.user.upsert({
    where: { email: 'reviewer4@example.com' },
    update: {},
    create: {
      email: 'reviewer4@example.com',
      name: reviewer4Data.name as string,
      passwordHash,
      role: UserRole.REVIEWER,
      emailVerified: new Date(),
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MarcusThompson&backgroundColor=dfe6e9',
    },
  });
  console.log(`  + Reviewer: ${reviewer4.email}`);

  // Speaker users
  const speaker1Data = encryptPiiFields({ name: 'Jane Wilson' }, USER_PII_FIELDS);
  const speaker1 = await prisma.user.upsert({
    where: { email: 'speaker1@example.com' },
    update: {},
    create: {
      email: 'speaker1@example.com',
      name: speaker1Data.name as string,
      passwordHash,
      role: UserRole.USER,
      emailVerified: new Date(),
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JaneWilson&backgroundColor=ffd5dc',
    },
  });
  console.log(`  + Speaker: ${speaker1.email}`);

  const speaker2Data = encryptPiiFields({ name: 'John Davis' }, USER_PII_FIELDS);
  const speaker2 = await prisma.user.upsert({
    where: { email: 'speaker2@example.com' },
    update: {},
    create: {
      email: 'speaker2@example.com',
      name: speaker2Data.name as string,
      passwordHash,
      role: UserRole.USER,
      emailVerified: new Date(),
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JohnDavis&backgroundColor=d1f4d1',
    },
  });
  console.log(`  + Speaker: ${speaker2.email}`);

  // ==========================================================================
  // Reviewer Profiles (for public team page)
  // ==========================================================================
  console.log('\n[Profiles] Creating reviewer profiles...');

  // Using DiceBear API for unique, royalty-free SVG avatars
  // Format: https://api.dicebear.com/7.x/avataaars/svg?seed=NAME
  
  // Encrypt PII for reviewer 1
  const reviewer1Profile = encryptPiiFields({
    fullName: 'Alice Chen',
    bio: `With over a decade of experience in cloud architecture and distributed systems, I've had the privilege of building and scaling systems that serve millions of users. Currently leading infrastructure at Tech Innovations Inc., where we're pushing the boundaries of what's possible with modern cloud-native technologies.

I'm passionate about the conference speaking community and believe that diverse voices make our industry stronger. As a reviewer, I focus on technical depth while ensuring talks remain accessible to their target audience. I particularly enjoy mentoring first-time speakers and helping them craft compelling narratives around their technical work.

When I'm not reviewing proposals or writing code, you'll find me contributing to open-source projects and organizing local meetups. I believe knowledge sharing is the cornerstone of our industry's growth.`,
    company: 'Tech Innovations Inc.',
    designation: 'Principal Engineer',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AliceChen&backgroundColor=b6e3f4',
    conferencesReviewed: 'KubeCon, AWS re:Invent, QCon, DevOpsDays, Cloud Native Summit',
    linkedinUrl: 'https://linkedin.com/in/alicechen-example',
    twitterHandle: 'alicechen_tech',
    githubUsername: 'alicechen',
    websiteUrl: 'https://alicechen.dev',
  }, REVIEWER_PROFILE_PII_FIELDS);

  await prisma.reviewerProfile.upsert({
    where: { userId: reviewer1.id },
    update: {},
    create: {
      userId: reviewer1.id,
      fullName: reviewer1Profile.fullName as string,
      bio: reviewer1Profile.bio as string,
      company: reviewer1Profile.company as string,
      designation: reviewer1Profile.designation as string,
      photoUrl: reviewer1Profile.photoUrl as string,
      expertiseAreas: ['Cloud Architecture', 'Distributed Systems', 'DevOps', 'Kubernetes', 'AWS', 'System Design'],
      yearsOfExperience: 12,
      hasReviewedBefore: true,
      conferencesReviewed: reviewer1Profile.conferencesReviewed as string,
      reviewCriteria: ['Technical accuracy', 'Presentation clarity', 'Audience relevance', 'Novelty of content'],
      hoursPerWeek: '5-10',
      preferredEventSize: 'any',
      additionalNotes: 'Particularly interested in talks about scaling challenges, infrastructure as code, and cloud cost optimization.',
      linkedinUrl: reviewer1Profile.linkedinUrl as string,
      twitterHandle: reviewer1Profile.twitterHandle as string,
      githubUsername: reviewer1Profile.githubUsername as string,
      websiteUrl: reviewer1Profile.websiteUrl as string,
      onboardingCompleted: true,
      showOnTeamPage: true,
    },
  });

  // Encrypt PII for reviewer 2
  const reviewer2Profile = encryptPiiFields({
    fullName: 'Bob Martinez',
    bio: `Security researcher by day, conference enthusiast by night. I've spent the last 8 years uncovering vulnerabilities in web applications, APIs, and cloud infrastructure. My work has been recognized at major security conferences including DEF CON, Black Hat, and BSides.

What drives me as a reviewer is the opportunity to help security professionals share their research with the broader community. I believe that responsible disclosure and knowledge sharing are essential to improving our collective security posture. I evaluate proposals not just for technical merit, but for their potential impact on the security community.

I've been on both sides of the CFP process—as a speaker and reviewer—and understand the challenges of distilling complex research into an engaging talk. I'm committed to providing constructive feedback that helps speakers improve, regardless of whether their talk is accepted.`,
    company: 'SecureTech Labs',
    designation: 'Senior Security Researcher',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BobMartinez&backgroundColor=c0aede',
    conferencesReviewed: 'DEF CON, Black Hat, BSides, OWASP AppSec, Security BSides',
    linkedinUrl: 'https://linkedin.com/in/bobmartinez-security',
    twitterHandle: 'bob_secresearch',
    githubUsername: 'bobmartinez',
  }, REVIEWER_PROFILE_PII_FIELDS);

  await prisma.reviewerProfile.upsert({
    where: { userId: reviewer2.id },
    update: {},
    create: {
      userId: reviewer2.id,
      fullName: reviewer2Profile.fullName as string,
      bio: reviewer2Profile.bio as string,
      company: reviewer2Profile.company as string,
      designation: reviewer2Profile.designation as string,
      photoUrl: reviewer2Profile.photoUrl as string,
      expertiseAreas: ['Application Security', 'Penetration Testing', 'Threat Modeling', 'Bug Bounty', 'Web Security', 'API Security'],
      yearsOfExperience: 8,
      hasReviewedBefore: true,
      conferencesReviewed: reviewer2Profile.conferencesReviewed as string,
      reviewCriteria: ['Research novelty', 'Practical applicability', 'Responsible disclosure', 'Demo quality'],
      hoursPerWeek: '2-5',
      preferredEventSize: 'medium',
      additionalNotes: 'Interested in novel attack techniques, defense strategies, and security tool development.',
      linkedinUrl: reviewer2Profile.linkedinUrl as string,
      twitterHandle: reviewer2Profile.twitterHandle as string,
      githubUsername: reviewer2Profile.githubUsername as string,
      onboardingCompleted: true,
      showOnTeamPage: true,
    },
  });

  // Encrypt PII for reviewer 3
  const reviewer3Profile = encryptPiiFields({
    fullName: 'Diana Rodriguez',
    bio: `As a Developer Advocate with roots in frontend engineering, I've spent the past 7 years helping developers build better, more accessible web applications. I specialize in JavaScript frameworks, web performance, and developer tooling.

My journey into tech speaking started at local meetups, and I've since spoken at over 30 conferences worldwide. This experience gives me unique insight into what makes a talk successful—from crafting compelling abstracts to delivering engaging presentations.

As a reviewer, I prioritize diversity of perspectives and practical, actionable content. I believe conferences should be welcoming to speakers of all experience levels, and I'm especially passionate about helping first-time speakers find their voice. My feedback always focuses on strengthening proposals rather than just identifying weaknesses.`,
    company: 'DevTools Inc.',
    designation: 'Developer Advocate',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DianaRodriguez&backgroundColor=ffeaa7',
    conferencesReviewed: 'JSConf, React Summit, SmashingConf, CSSConf, NodeConf',
    linkedinUrl: 'https://linkedin.com/in/dianarodriguez-dev',
    twitterHandle: 'diana_devrel',
    githubUsername: 'dianarodriguez',
    websiteUrl: 'https://dianarodriguez.dev',
  }, REVIEWER_PROFILE_PII_FIELDS);

  await prisma.reviewerProfile.upsert({
    where: { userId: reviewer3.id },
    update: {},
    create: {
      userId: reviewer3.id,
      fullName: reviewer3Profile.fullName as string,
      bio: reviewer3Profile.bio as string,
      company: reviewer3Profile.company as string,
      designation: reviewer3Profile.designation as string,
      photoUrl: reviewer3Profile.photoUrl as string,
      expertiseAreas: ['JavaScript', 'React', 'Web Performance', 'Accessibility', 'Developer Experience', 'Technical Writing'],
      yearsOfExperience: 7,
      hasReviewedBefore: true,
      conferencesReviewed: reviewer3Profile.conferencesReviewed as string,
      reviewCriteria: ['Audience engagement', 'Practical takeaways', 'Speaker preparation', 'Topic relevance'],
      hoursPerWeek: '5-10',
      preferredEventSize: 'any',
      additionalNotes: 'Particularly interested in talks about developer tools, web standards, and making technology more inclusive.',
      linkedinUrl: reviewer3Profile.linkedinUrl as string,
      twitterHandle: reviewer3Profile.twitterHandle as string,
      githubUsername: reviewer3Profile.githubUsername as string,
      websiteUrl: reviewer3Profile.websiteUrl as string,
      onboardingCompleted: true,
      showOnTeamPage: true,
    },
  });

  // Encrypt PII for reviewer 4
  const reviewer4Profile = encryptPiiFields({
    fullName: 'Marcus Thompson',
    bio: `I'm a data engineering leader with 15 years of experience building large-scale data platforms. Currently VP of Engineering at DataFlow Systems, where we process billions of events daily for Fortune 100 companies.

My passion for reviewing conference talks comes from years of attending and speaking at data conferences. I've seen firsthand how transformative a great conference talk can be—the right insight at the right time can change someone's entire approach to solving problems.

When reviewing proposals, I look for talks that bridge the gap between theory and practice. The best submissions tell a story: here's the problem we faced, here's how we solved it, and here's what you can learn from our experience. I also value intellectual honesty—talks that acknowledge tradeoffs and failures are often more valuable than those that only highlight successes.`,
    company: 'DataFlow Systems',
    designation: 'VP of Engineering',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MarcusThompson&backgroundColor=dfe6e9',
    conferencesReviewed: 'Strata Data, Data Council, Spark Summit, DataEngConf, QCon',
    linkedinUrl: 'https://linkedin.com/in/marcusthompson-data',
    twitterHandle: 'marcus_data',
    githubUsername: 'marcusthompson',
  }, REVIEWER_PROFILE_PII_FIELDS);

  await prisma.reviewerProfile.upsert({
    where: { userId: reviewer4.id },
    update: {},
    create: {
      userId: reviewer4.id,
      fullName: reviewer4Profile.fullName as string,
      bio: reviewer4Profile.bio as string,
      company: reviewer4Profile.company as string,
      designation: reviewer4Profile.designation as string,
      photoUrl: reviewer4Profile.photoUrl as string,
      expertiseAreas: ['Data Engineering', 'Apache Spark', 'Data Architecture', 'Machine Learning', 'Leadership', 'Streaming Systems'],
      yearsOfExperience: 15,
      hasReviewedBefore: true,
      conferencesReviewed: reviewer4Profile.conferencesReviewed as string,
      reviewCriteria: ['Technical depth', 'Real-world applicability', 'Storytelling quality', 'Learning outcomes'],
      hoursPerWeek: '2-5',
      preferredEventSize: 'large',
      additionalNotes: 'Focused on data infrastructure, streaming architectures, and engineering leadership topics.',
      linkedinUrl: reviewer4Profile.linkedinUrl as string,
      twitterHandle: reviewer4Profile.twitterHandle as string,
      githubUsername: reviewer4Profile.githubUsername as string,
      onboardingCompleted: true,
      showOnTeamPage: true,
    },
  });
  console.log('  + Created 4 reviewer profiles (visible on landing page)');

  // ==========================================================================
  // Speaker Profiles
  // ==========================================================================
  console.log('\n[Profiles] Creating speaker profiles...');

  // Encrypt PII for speaker 1
  const speaker1Profile = encryptPiiFields({
    fullName: 'Jane Wilson',
    bio: `I'm a cloud security engineer with a passion for making complex security topics accessible to developers of all skill levels. Over the past 6 years, I've helped organizations secure their cloud infrastructure across AWS, Azure, and GCP.

My speaking journey began when I realized that many security breaches stem from misconfigured cloud services—not sophisticated attacks. I started speaking at local meetups to help developers understand cloud security fundamentals, and that grew into presenting at major conferences.

I believe the best security talks are those that attendees can immediately apply to their work. My presentations always include practical examples, real-world case studies (anonymized, of course), and actionable takeaways. When I'm not presenting or working, I maintain an open-source cloud security scanner that's used by thousands of organizations worldwide.`,
    company: 'CloudSec Corp',
    position: 'Senior Security Engineer',
    location: 'Seattle, WA, USA',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JaneWilson&backgroundColor=ffd5dc',
    websiteUrl: 'https://janewilson.security',
    linkedinUrl: 'https://linkedin.com/in/janewilson-cloudsec',
    twitterHandle: 'jane_cloudsec',
    githubUsername: 'janewilson',
    speakingExperience: `<p><strong>Conference Talks:</strong></p>
<ul>
<li>AWS re:Inforce 2024 - "Zero to Secure: Building a Cloud Security Program from Scratch"</li>
<li>DevSecCon 2023 - "IAM Policies That Don't Make You Cry"</li>
<li>Cloud Native Security Con 2023 - "Container Security Best Practices"</li>
</ul>
<p><strong>Meetups & Workshops:</strong></p>
<ul>
<li>Regular speaker at Seattle AWS User Group</li>
<li>Workshop instructor for OWASP Seattle chapter</li>
</ul>`,
  }, SPEAKER_PROFILE_PII_FIELDS);

  await prisma.speakerProfile.upsert({
    where: { userId: speaker1.id },
    update: {},
    create: {
      userId: speaker1.id,
      fullName: speaker1Profile.fullName as string,
      bio: speaker1Profile.bio as string,
      company: speaker1Profile.company as string,
      position: speaker1Profile.position as string,
      location: speaker1Profile.location as string,
      photoUrl: speaker1Profile.photoUrl as string,
      websiteUrl: speaker1Profile.websiteUrl as string,
      linkedinUrl: speaker1Profile.linkedinUrl as string,
      twitterHandle: speaker1Profile.twitterHandle as string,
      githubUsername: speaker1Profile.githubUsername as string,
      expertiseTags: ['AWS Security', 'Cloud Security', 'IAM', 'Infrastructure as Code', 'DevSecOps', 'Compliance'],
      speakingExperience: speaker1Profile.speakingExperience as string,
      experienceLevel: 'EXPERIENCED',
      languages: ['English', 'Spanish'],
      presentationTypes: ['Talk', 'Workshop', 'Panel'],
      audienceTypes: ['Developers', 'DevOps Engineers', 'Security Professionals'],
      willingToTravel: true,
      travelRequirements: 'Available for domestic and international travel. Prefer direct flights when possible.',
      virtualEventExperience: true,
      techRequirements: 'Laptop with HDMI/USB-C output, reliable internet for demos. Can provide own clicker.',
      onboardingCompleted: true,
    },
  });

  // Encrypt PII for speaker 2
  const speaker2Profile = encryptPiiFields({
    fullName: 'John Davis',
    bio: `Former full-stack developer turned DevOps engineer, currently leading platform engineering at a fast-growing startup. I've experienced firsthand the joys and pains of scaling systems from hundreds to millions of users.

My talks focus on the lessons learned from real production incidents—the kind of war stories that only come from being paged at 3 AM. I believe in sharing both successes and failures because that's how we all get better. Every outage is a learning opportunity, and I'm passionate about helping others avoid the mistakes I've made.

I'm also deeply invested in improving developer experience. Happy developers build better software, and I spend a lot of time thinking about how we can make deployment pipelines faster, more reliable, and less frustrating. My open-source contributions focus on CI/CD tooling and observability.`,
    company: 'StartupXYZ',
    position: 'DevOps Lead / Platform Engineer',
    location: 'Austin, TX, USA',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JohnDavis&backgroundColor=d1f4d1',
    websiteUrl: 'https://johndavis.dev',
    linkedinUrl: 'https://linkedin.com/in/johndavis-devops',
    twitterHandle: 'johnd_devops',
    githubUsername: 'johndavis',
    speakingExperience: `<p><strong>Conference Talks:</strong></p>
<ul>
<li>DevOpsDays Austin 2024 - "The Incident That Changed Everything"</li>
<li>KubeCon 2023 - "Building Developer Platforms That Developers Actually Want to Use"</li>
<li>SREcon 2023 - "On-Call Doesn't Have to Suck"</li>
</ul>
<p><strong>Podcasts & Other:</strong></p>
<ul>
<li>Guest on "Ship It!" podcast</li>
<li>Technical blogger at dev.to with 10k+ followers</li>
</ul>`,
  }, SPEAKER_PROFILE_PII_FIELDS);

  await prisma.speakerProfile.upsert({
    where: { userId: speaker2.id },
    update: {},
    create: {
      userId: speaker2.id,
      fullName: speaker2Profile.fullName as string,
      bio: speaker2Profile.bio as string,
      company: speaker2Profile.company as string,
      position: speaker2Profile.position as string,
      location: speaker2Profile.location as string,
      photoUrl: speaker2Profile.photoUrl as string,
      websiteUrl: speaker2Profile.websiteUrl as string,
      linkedinUrl: speaker2Profile.linkedinUrl as string,
      twitterHandle: speaker2Profile.twitterHandle as string,
      githubUsername: speaker2Profile.githubUsername as string,
      expertiseTags: ['DevOps', 'CI/CD', 'Kubernetes', 'Observability', 'Incident Response', 'Platform Engineering'],
      speakingExperience: speaker2Profile.speakingExperience as string,
      experienceLevel: 'EXPERIENCED',
      languages: ['English'],
      presentationTypes: ['Talk', 'Lightning Talk'],
      audienceTypes: ['DevOps Engineers', 'SREs', 'Platform Engineers', 'Engineering Managers'],
      willingToTravel: true,
      travelRequirements: 'Prefer conferences in North America but open to international events for the right opportunity.',
      virtualEventExperience: true,
      techRequirements: 'Standard presentation setup. May need terminal access for live demos.',
      onboardingCompleted: true,
    },
  });
  console.log('  + Created speaker profiles (encrypted)');

  // ==========================================================================
  // Events (with enhanced fields)
  // ==========================================================================
  console.log('\n[Events] Creating sample events...');

  // Future event with open CFP - Main Demo Event
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 6);
  const cfpCloseDate = new Date();
  cfpCloseDate.setMonth(cfpCloseDate.getMonth() + 2);

  const event1 = await prisma.event.upsert({
    where: { slug: 'sample-conference-2026' },
    update: {},
    create: {
      name: 'TechConf 2026',
      slug: 'sample-conference-2026',
      description: '<p>This is a sample event demonstrating the CFP management system. It shows how events appear when accepting submissions.</p><p>Features demonstrated:</p><ul><li>Event management and configuration</li><li>Speaker submission workflow</li><li>Review team collaboration</li><li>Submission tracking and status updates</li></ul><p>You can edit or delete this sample event from Admin → Events.</p>',
      websiteUrl: 'https://example.com',
      // Enhanced location fields
      venueName: 'Convention Center',
      venueAddress: '123 Main Street',
      venueCity: 'San Francisco',
      country: 'US',
      location: 'San Francisco, CA', // Legacy field
      isVirtual: false,
      // Enhanced event configuration
      eventType: 'conference',
      startDate: futureDate,
      endDate: new Date(futureDate.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days
      startTime: '09:00',
      endTime: '18:00',
      timezone: 'America/Los_Angeles',
      // Topics and audience
      topics: ['Technology', 'Innovation', 'Best Practices', 'Case Studies', 'Hands-on Workshops'],
      audienceLevel: ['beginner', 'intermediate', 'advanced'],
      // Enhanced CFP settings
      cfpOpensAt: new Date(),
      cfpClosesAt: cfpCloseDate,
      cfpStartTime: '00:00',
      cfpEndTime: '23:59',
      cfpDescription: 'We welcome submissions on all aspects of technology, innovation, and industry best practices.',
      cfpGuidelines: '<p><strong>Submission Guidelines</strong></p><p>We welcome proposals on the following topics:</p><ul><li>Technical deep dives and case studies</li><li>Best practices and lessons learned</li><li>Emerging technologies and trends</li><li>Security research and methodologies</li></ul><p><strong>Abstract Requirements:</strong></p><ul><li>250-500 words describing your talk</li><li>Clear learning objectives</li><li>Target audience and experience level</li></ul>',
      speakerBenefits: '<p><strong>🎁 Sample Speaker Benefits</strong></p><p>List what speakers receive here. Examples:</p><ul><li>Conference pass</li><li>Travel/accommodation support</li><li>Speaker dinner</li><li>Recording of their talk</li></ul><p><em>Edit this in Event Settings → Speaker Benefits</em></p>',
      // Review settings
      reviewType: 'scoring',
      minReviewsPerTalk: 2,
      enableSpeakerFeedback: true,
      // Notifications
      notifyOnNewSubmission: true,
      notifyOnNewReview: true,
      // Status
      status: EventStatus.PUBLISHED,
      isPublished: true,
    },
  });
  console.log(`  + ${event1.name} (Open CFP - try submitting a talk!)`);

  // Clean up existing data for event1 to avoid constraint violations on re-seed
  // Order matters due to foreign key constraints
  await prisma.message.deleteMany({ where: { submission: { eventId: event1.id } } });
  await prisma.coSpeaker.deleteMany({ where: { submission: { eventId: event1.id } } });
  await prisma.review.deleteMany({ where: { submission: { eventId: event1.id } } });
  await prisma.submission.deleteMany({ where: { eventId: event1.id } });
  await prisma.reviewTeamMember.deleteMany({ where: { eventId: event1.id } });
  await prisma.eventTalkFormat.deleteMany({ where: { eventId: event1.id } });
  await prisma.eventReviewCriteria.deleteMany({ where: { eventId: event1.id } });

  // Create talk formats for event1
  await prisma.eventTalkFormat.createMany({
    data: [
      { eventId: event1.id, name: 'Keynote', description: 'Opening and closing keynotes', durationMin: 45, sortOrder: 0 },
      { eventId: event1.id, name: 'Technical Talk', description: 'In-depth technical presentations', durationMin: 45, sortOrder: 1 },
      { eventId: event1.id, name: 'Workshop', description: 'Hands-on training sessions', durationMin: 180, sortOrder: 2 },
      { eventId: event1.id, name: 'Lightning Talk', description: 'Quick presentations on focused topics', durationMin: 15, sortOrder: 3 },
      { eventId: event1.id, name: 'Tool Demo', description: 'Live tool demonstrations', durationMin: 30, sortOrder: 4 },
    ],
  });

  // Create review criteria for event1
  await prisma.eventReviewCriteria.createMany({
    data: [
      { eventId: event1.id, name: 'Technical Depth', description: 'Quality and depth of technical content', weight: 5, sortOrder: 0 },
      { eventId: event1.id, name: 'Originality', description: 'Novel research or unique perspective', weight: 5, sortOrder: 1 },
      { eventId: event1.id, name: 'Relevance', description: 'Relevance to security community', weight: 4, sortOrder: 2 },
      { eventId: event1.id, name: 'Practicality', description: 'Practical applicability of content', weight: 4, sortOrder: 3 },
      { eventId: event1.id, name: 'Speaker Experience', description: 'Speaker background and presentation ability', weight: 3, sortOrder: 4 },
    ],
  });

  // Past event - shows how completed events look
  const pastDate = new Date();
  pastDate.setMonth(pastDate.getMonth() - 3);

  const event2 = await prisma.event.upsert({
    where: { slug: 'sample-past-event-2025' },
    update: {},
    create: {
      name: 'DevSummit 2025',
      slug: 'sample-past-event-2025',
      description: '<p><strong>This is a sample PAST event.</strong></p><p>It shows how events appear after they\'ve concluded. Past events are displayed separately on the landing page. The CFP is closed and no new submissions are accepted.</p><p><em>Delete this sample when ready!</em></p>',
      websiteUrl: 'https://example.com',
      venueName: 'Tech Hub',
      venueCity: 'Austin',
      country: 'US',
      location: 'Austin, TX',
      isVirtual: false,
      eventType: 'conference',
      startDate: pastDate,
      endDate: new Date(pastDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      startTime: '10:00',
      endTime: '18:00',
      timezone: 'America/Chicago',
      topics: ['Technology', 'Innovation', 'Leadership', 'Career Growth'],
      audienceLevel: ['beginner', 'intermediate', 'advanced'],
      cfpOpensAt: new Date(pastDate.getTime() - 90 * 24 * 60 * 60 * 1000),
      cfpClosesAt: new Date(pastDate.getTime() - 30 * 24 * 60 * 60 * 1000),
      cfpGuidelines: '<p>Share your expertise with our community!</p>',
      reviewType: 'scoring',
      minReviewsPerTalk: 2,
      status: EventStatus.PUBLISHED,
      isPublished: true,
    },
  });
  console.log(`  + Event: ${event2.name} (Past event)`);

  // Virtual event - shows virtual event capabilities
  const virtualDate = new Date();
  virtualDate.setMonth(virtualDate.getMonth() + 4);

  const event3 = await prisma.event.upsert({
    where: { slug: 'sample-virtual-event-2026' },
    update: {},
    create: {
      name: 'CloudConnect Online 2026',
      slug: 'sample-virtual-event-2026',
      description: '<p><strong>This is a sample VIRTUAL event.</strong></p><p>It demonstrates how online/virtual events are configured differently from in-person events. Notice the virtual event URL field instead of venue details.</p><p><em>Delete this sample when ready!</em></p>',
      isVirtual: true,
      virtualUrl: 'https://example.com/virtual',
      eventType: 'webinar',
      startDate: virtualDate,
      endDate: new Date(virtualDate.getTime() + 1 * 24 * 60 * 60 * 1000),
      startTime: '09:00',
      endTime: '17:00',
      timezone: 'UTC',
      topics: ['Remote Work', 'Collaboration', 'Productivity', 'Tools'],
      audienceLevel: ['beginner', 'intermediate'],
      cfpOpensAt: new Date(),
      cfpClosesAt: new Date(virtualDate.getTime() - 60 * 24 * 60 * 60 * 1000),
      cfpGuidelines: '<p>Share your remote work tips and favorite tools!</p>',
      speakerBenefits: '<p>Virtual speakers receive promotional exposure and access to all recordings.</p>',
      reviewType: 'scoring',
      minReviewsPerTalk: 2,
      status: EventStatus.PUBLISHED,
      isPublished: true,
    },
  });
  console.log(`  + Event: ${event3.name} (Virtual event)`);

  // Draft event - shows unpublished event
  const draftDate = new Date();
  draftDate.setMonth(draftDate.getMonth() + 8);

  const event4 = await prisma.event.upsert({
    where: { slug: 'sample-draft-event' },
    update: {},
    create: {
      name: 'SecurityCon 2026 (Draft)',
      slug: 'sample-draft-event',
      description: '<p><strong>This is a DRAFT event - only visible to admins!</strong></p><p>Draft events let you prepare everything before going public. When ready, change the status to "Published" to make it visible on the landing page.</p><p><em>Use this as a template or delete it!</em></p>',
      venueName: 'TBD',
      venueCity: 'New York',
      country: 'US',
      isVirtual: false,
      eventType: 'conference',
      startDate: draftDate,
      endDate: new Date(draftDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      timezone: 'America/New_York',
      topics: ['To Be Determined'],
      audienceLevel: ['all'],
      status: EventStatus.DRAFT,
      isPublished: false,
    },
  });
  console.log(`  + Event: ${event4.name} (Draft - not public)`);

  // ==========================================================================
  // Event Tracks (Security focused)
  // ==========================================================================
  console.log('\n[Tracks] Creating event tracks...');

  // Clean up existing tracks for this event to avoid unique constraint violations
  await prisma.eventTrack.deleteMany({
    where: { eventId: event1.id },
  });

  const track1 = await prisma.eventTrack.create({
    data: {
      eventId: event1.id,
      name: 'Offensive Security',
      description: 'Red teaming, penetration testing, and attack techniques',
      color: '#ef4444',
    },
  });

  const track2 = await prisma.eventTrack.create({
    data: {
      eventId: event1.id,
      name: 'Defensive Security',
      description: 'Blue team, detection, and incident response',
      color: '#3b82f6',
    },
  });

  const track3 = await prisma.eventTrack.create({
    data: {
      eventId: event1.id,
      name: 'Cloud & Infrastructure',
      description: 'Cloud security, containers, and infrastructure protection',
      color: '#10b981',
    },
  });

  const track4 = await prisma.eventTrack.create({
    data: {
      eventId: event1.id,
      name: 'AppSec & DevSecOps',
      description: 'Application security and secure development',
      color: '#8b5cf6',
    },
  });
  console.log(`  + Created ${4} tracks for ${event1.name}`);

  // ==========================================================================
  // Event Formats (Legacy - kept for compatibility)
  // ==========================================================================
  console.log('\n⏱️ Creating session formats (legacy)...');

  // Clean up existing formats for this event
  await prisma.eventFormat.deleteMany({
    where: { eventId: event1.id },
  });

  const format1 = await prisma.eventFormat.create({
    data: {
      eventId: event1.id,
      name: 'Talk',
      durationMin: 45,
    },
  });

  const format2 = await prisma.eventFormat.create({
    data: {
      eventId: event1.id,
      name: 'Workshop',
      durationMin: 180,
    },
  });

  const format3 = await prisma.eventFormat.create({
    data: {
      eventId: event1.id,
      name: 'Lightning Talk',
      durationMin: 15,
    },
  });
  console.log(`  + Created ${3} formats for ${event1.name}`);

  // ==========================================================================
  // Review Team
  // ==========================================================================
  console.log('\n👥 Setting up review team...');

  await prisma.reviewTeamMember.createMany({
    data: [
      { eventId: event1.id, userId: reviewer1.id, role: ReviewerRole.LEAD },
      { eventId: event1.id, userId: reviewer2.id, role: ReviewerRole.REVIEWER },
      { eventId: event1.id, userId: organizer.id, role: ReviewerRole.REVIEWER },
    ],
    skipDuplicates: true,
  });
  console.log(`  + Added review team for ${event1.name}`);

  // ==========================================================================
  // Submissions (realistic sample talks)
  // ==========================================================================
  console.log('\n📄 Creating sample submissions...');

  const submission1 = await prisma.submission.create({
    data: {
      eventId: event1.id,
      speakerId: speaker1.id,
      trackId: track1.id,
      formatId: format1.id,
      title: 'Cloud Security Fundamentals: Protecting Your AWS Infrastructure',
      abstract: `In this practical session, we'll explore the essential security controls every organization needs when running workloads in AWS. Drawing from real-world experience securing cloud environments for Fortune 500 companies and startups alike, I'll walk you through the most common misconfigurations I encounter during security assessments and how to prevent them.

We'll cover IAM best practices, network security using VPCs and security groups, encryption strategies for data at rest and in transit, and logging/monitoring essentials with CloudTrail and GuardDuty. Each topic will include live demos showing both vulnerable configurations and their secure alternatives.

Attendees will leave with a practical checklist they can immediately apply to their own AWS environments, plus access to an open-source tool I've developed for automated security assessment.`,
      outline: `1. Introduction & The Shared Responsibility Model (5 min)
   - What AWS secures vs. what you secure
   - Common misconceptions

2. Identity & Access Management Deep Dive (15 min)
   - Principle of least privilege in practice
   - Service roles vs. user roles
   - Live demo: Identifying overly permissive policies

3. Network Security Architecture (10 min)
   - VPC design patterns for security
   - Security groups vs. NACLs
   - Private vs. public subnets

4. Data Protection Strategies (10 min)
   - Encryption options (SSE-S3, SSE-KMS, client-side)
   - Key management best practices
   - Secrets management with Secrets Manager

5. Monitoring & Detection (10 min)
   - CloudTrail configuration essentials
   - GuardDuty findings walkthrough
   - Building actionable alerts

6. Q&A and Takeaways (5 min)
   - Security checklist handout
   - Tool demo and GitHub link`,
      targetAudience: 'Cloud engineers, DevOps practitioners, and security professionals new to AWS security',
      prerequisites: 'Basic familiarity with AWS console and core services (EC2, S3, IAM). No security background required. Speaker notes: I can adjust the depth of any section based on audience feedback. Happy to do a longer workshop version if there is interest.',
      status: SubmissionStatus.PENDING,
    },
  });

  const submission2 = await prisma.submission.create({
    data: {
      eventId: event1.id,
      speakerId: speaker1.id,
      trackId: track3.id,
      formatId: format2.id,
      title: 'Kubernetes Security Workshop: Hands-On Defense Strategies',
      abstract: `This hands-on workshop takes you from Kubernetes security basics to advanced defense techniques. We'll work through real scenarios in a provided lab environment, giving you practical experience you can apply immediately.

Starting with the Kubernetes threat landscape, we'll explore how attackers target clusters and what defenses are most effective. You'll configure RBAC policies, implement Pod Security Standards, deploy network policies, and set up runtime security monitoring—all while breaking things intentionally to understand why these controls matter.

By the end of this 3-hour workshop, you'll have hands-on experience with production-ready security configurations and a GitHub repository of templates you can use in your own clusters.`,
      outline: `Part 1: Foundations (45 min)
- Kubernetes security architecture overview
- Common attack vectors and real breach case studies
- Lab setup and environment walkthrough

Part 2: Access Control (45 min)
- RBAC deep dive with hands-on exercises
- Service account security
- Exercise: Identify and fix overly permissive RBAC

Part 3: Workload Security (45 min)
- Pod Security Standards (Restricted, Baseline, Privileged)
- Security contexts and capabilities
- Exercise: Harden a vulnerable deployment

Part 4: Network & Runtime Security (45 min)
- Network policies for microsegmentation
- Runtime security with Falco
- Exercise: Detect and respond to a simulated attack

Wrap-up: Take-home resources and Q&A`,
      targetAudience: 'DevOps engineers, platform engineers, and security professionals working with Kubernetes',
      prerequisites: 'Basic Kubernetes knowledge (pods, deployments, services). Laptop with kubectl installed. We provide the cluster. Speaker notes: Workshop requires 3 hours. I provide all lab materials and a take-home environment that runs on kind/minikube.',
      status: SubmissionStatus.UNDER_REVIEW,
    },
  });

  const submission3 = await prisma.submission.create({
    data: {
      eventId: event1.id,
      speakerId: speaker2.id,
      trackId: track2.id,
      formatId: format3.id,
      title: 'Surviving Your First Production Incident: A Field Guide',
      abstract: `Production incidents are inevitable, but panic is optional. In this lightning talk, I'll share the hard-won lessons from managing hundreds of incidents at a rapidly scaling startup—from the 3 AM pages to the post-mortem meetings.

You'll learn the three questions to ask in the first five minutes of any incident, how to communicate effectively with stakeholders while firefighting, and why most incident playbooks fail (and what to do instead). Whether you're an engineer who's never been on-call or a seasoned SRE looking to improve your team's incident response, you'll leave with practical tips you can use tonight.

Speaker note: Can expand this to a full 45-minute talk with more detailed case studies if preferred.`,
      targetAudience: 'Software engineers, SREs, and engineering managers',
      status: SubmissionStatus.ACCEPTED,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _submission4 = await prisma.submission.create({
    data: {
      eventId: event1.id,
      speakerId: speaker2.id,
      trackId: track4.id,
      formatId: format1.id,
      title: 'Building Developer Platforms That Developers Actually Want to Use',
      abstract: `We spent 18 months building an internal developer platform that nobody wanted to use. Then we threw it away and started over. This talk is about what we learned.

The second time around, we approached platform engineering differently. Instead of building what we thought developers needed, we started by understanding their actual pain points. We focused on reducing cognitive load, not adding features. We made the platform feel invisible—the best infrastructure is the kind you don't have to think about.

I'll share the specific practices that made our platform successful: embedded feedback loops, golden paths vs. guardrails, self-service without chaos, and measuring developer productivity without surveillance. You'll learn from our failures and successes so you can build platforms your developers will actually adopt.`,
      outline: `1. The Platform Nobody Wanted (5 min)
   - What we built and why it failed
   - The adoption metrics that told the real story

2. Starting Over: Developer-First Design (10 min)
   - Embedded discovery and continuous feedback
   - Understanding developer cognitive load
   - The "paved road" philosophy

3. Architecture for Adoption (15 min)
   - Self-service patterns that scale
   - Golden paths: making the right thing the easy thing
   - Guardrails vs. gates: security without friction

4. Measuring Success (10 min)
   - Developer productivity metrics that matter
   - Avoiding surveillance culture
   - Leading indicators vs. lagging indicators

5. Lessons Learned & Q&A (5 min)`,
      targetAudience: 'Platform engineers, engineering managers, and anyone building internal developer tools',
      prerequisites: 'Experience with CI/CD and infrastructure. No specific technology expertise required.',
      status: SubmissionStatus.PENDING,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _submission5 = await prisma.submission.create({
    data: {
      eventId: event1.id,
      speakerId: speaker1.id,
      trackId: track1.id,
      formatId: format1.id,
      title: 'Zero Trust Architecture: Beyond the Buzzword',
      abstract: `"Zero Trust" has become the most overused term in security, slapped on every product and strategy deck. But beneath the marketing hype lies a genuinely useful security model that can transform how organizations protect their assets.

In this talk, I'll cut through the buzzwords and explain what Zero Trust actually means in practice. We'll explore the core principles—verify explicitly, use least privilege access, assume breach—and examine how real organizations have implemented them. Through case studies from my consulting work, you'll see both successful implementations and cautionary tales of Zero Trust projects gone wrong.

You'll leave with a practical framework for evaluating your organization's Zero Trust maturity and concrete next steps for your journey, regardless of where you're starting from.`,
      outline: `1. Zero Trust: Origins and Principles (10 min)
   - From perimeter security to Zero Trust
   - The three core principles explained
   - What Zero Trust is NOT

2. The Zero Trust Technology Landscape (10 min)
   - Identity and access management
   - Microsegmentation and network controls
   - Device trust and posture assessment
   - Continuous verification and monitoring

3. Implementation Case Studies (15 min)
   - Case 1: A successful gradual migration
   - Case 2: The "big bang" approach that backfired
   - Case 3: Zero Trust for cloud-native organizations

4. Your Zero Trust Roadmap (10 min)
   - Maturity assessment framework
   - Quick wins vs. long-term investments
   - Avoiding common pitfalls

5. Q&A`,
      targetAudience: 'Security architects, IT leaders, and security engineers evaluating or implementing Zero Trust',
      prerequisites: 'General understanding of network security concepts. No specific vendor knowledge required.',
      status: SubmissionStatus.UNDER_REVIEW,
    },
  });
  console.log('  + Created 5 sample submissions');

  // ==========================================================================
  // Co-speakers
  // ==========================================================================
  console.log('\n🤝 Adding co-speakers...');

  await prisma.coSpeaker.create({
    data: {
      submissionId: submission2.id,
      name: 'Sarah Kim',
      email: 'sarah.kim@example.com',
      bio: `Sarah Kim | Senior Platform Engineer at ContainerCorp

Sarah is a Certified Kubernetes Security Specialist (CKS) with 8 years of experience in Kubernetes and cloud-native infrastructure. She's helped over 50 organizations secure their container environments.

Previously, Sarah led security initiatives at a major fintech company where she implemented zero-trust networking across 200+ microservices. She's passionate about making security accessible to all engineers, not just security specialists.

When not hardening clusters, Sarah contributes to open-source security tools and mentors at local coding bootcamps.

Connect: linkedin.com/in/sarahkim-example | @sarahkim_k8s`,
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SarahKim&backgroundColor=ffeaa7',
    },
  });
  console.log(`  + Added co-speaker Sarah Kim to Kubernetes workshop`);

  // ==========================================================================
  // Reviews
  // ==========================================================================
  console.log('\n⭐ Creating sample reviews...');

  await prisma.review.create({
    data: {
      submissionId: submission2.id,
      reviewerId: reviewer1.id,
      contentScore: 5,
      presentationScore: 4,
      relevanceScore: 5,
      overallScore: 5,
      privateNotes: `This is exactly the kind of hands-on workshop our audience needs. The speaker has clearly done this before—the outline shows a logical progression from concepts to practical exercises. I particularly appreciate the take-home lab environment, which gives attendees something concrete to continue learning with.

The only concern is the ambitious scope for 3 hours. I'd suggest either extending to 4 hours or trimming some content. Specifically, the RBAC section might be shortened since most attendees will have some familiarity.

Strong accept. This will be one of our most popular workshops.`,
      publicNotes: `Outstanding proposal! The hands-on approach and progressive complexity make this ideal for our audience. The take-home lab environment is a fantastic addition that will extend the learning beyond the conference.

One suggestion: consider providing a pre-workshop primer document so attendees can maximize their time in the hands-on portions. Looking forward to this session!`,
      recommendation: ReviewRecommendation.STRONG_ACCEPT,
    },
  });

  await prisma.review.create({
    data: {
      submissionId: submission2.id,
      reviewerId: reviewer2.id,
      contentScore: 4,
      presentationScore: 4,
      relevanceScore: 5,
      overallScore: 4,
      privateNotes: `Solid workshop proposal with good structure. The speaker's background in cloud security is evident. My main feedback is that I'd like to see more emphasis on threat detection and response scenarios—the current outline is heavy on prevention/configuration.

Also wondering if the 45-minute sections will feel rushed, especially the hands-on exercises. Might want to recommend having TAs available.

Accept—this fills an important gap in our program. Could be even better with the refinements mentioned.`,
      publicNotes: `Well-structured workshop covering essential Kubernetes security topics. The progression from foundations through hands-on defense is logical and practical.

Suggestion: Consider adding a brief "attack simulation" component where attendees detect and respond to a mock breach. This would reinforce the defensive concepts with realistic context.`,
      recommendation: ReviewRecommendation.ACCEPT,
    },
  });

  await prisma.review.create({
    data: {
      submissionId: submission3.id,
      reviewerId: reviewer1.id,
      contentScore: 5,
      presentationScore: 5,
      relevanceScore: 5,
      overallScore: 5,
      privateNotes: `Perfect lightning talk. The speaker takes complex incident response wisdom and distills it into actionable advice. The "three questions in five minutes" framework is exactly the kind of takeaway that sticks with people.

John has clearly been through the fire and emerged with genuine insights. This will resonate with anyone who's ever been paged at 3 AM.

Strong accept—this might be the most quotable talk of the conference.`,
      publicNotes: `This is exactly what our attendees need—practical wisdom from real production experience, delivered in a focused lightning talk format. The "field guide" framing is perfect.

Your experience shines through in the proposal. Can't wait to hear the war stories behind these lessons. Strongly recommended!`,
      recommendation: ReviewRecommendation.STRONG_ACCEPT,
    },
  });

  // Add a review with more critical feedback to show the range
  await prisma.review.create({
    data: {
      submissionId: submission1.id,
      reviewerId: reviewer2.id,
      contentScore: 3,
      presentationScore: 4,
      relevanceScore: 4,
      overallScore: 4,
      privateNotes: `Good fundamentals talk but there are already several similar sessions covering AWS security basics. The speaker's perspective from Fortune 500 and startup experience could differentiate this more.

I'd accept with revisions—specifically, I'd like to see more unique insights from the speaker's assessment work rather than a general best practices overview. The open-source tool mention is intriguing and could be a bigger focus.`,
      publicNotes: `Solid proposal covering important AWS security fundamentals. To make this stand out, consider leading with specific stories from your security assessments—the real-world examples will differentiate this from other "AWS security 101" talks.

The open-source tool you mentioned could be a great hook. Consider structuring the talk around discoveries made with that tool, using it to illustrate each security concept.`,
      recommendation: ReviewRecommendation.ACCEPT,
    },
  });
  console.log('  + Created 4 detailed reviews');

  // ==========================================================================
  // Messages
  // ==========================================================================
  console.log('\n💬 Creating sample messages...');

  await prisma.message.create({
    data: {
      submissionId: submission1.id,
      senderId: organizer.id,
      senderType: SenderType.ORGANIZER,
      subject: 'Question about your AWS Security talk',
      body: `Hi Jane,

Thank you so much for submitting "Cloud Security Fundamentals: Protecting Your AWS Infrastructure" to Awesome Conf 2026! We've been reviewing submissions and your proposal stands out.

Our reviewers loved your practical approach and the fact that you're offering a take-home security assessment tool. We had a couple of questions:

1. Would you be open to extending this to a 90-minute deep-dive session instead of 45 minutes? We think the content deserves more time, especially for the live demos.

2. Could you tell us more about the open-source tool you mentioned? We might want to feature it in our conference materials.

3. Do you have any audio/video requirements beyond standard presentation setup?

Looking forward to hearing from you!

Best regards,
Michael
Awesome Conf Program Committee`,
    },
  });

  await prisma.message.create({
    data: {
      submissionId: submission1.id,
      senderId: speaker1.id,
      senderType: SenderType.SPEAKER,
      body: `Hi Michael,

Thank you for the kind words and for considering my talk! I'm thrilled to hear the reviewers found it valuable.

To answer your questions:

1. I'd love to do a 90-minute version! That extra time would let me include a hands-on segment where attendees can run the security scanner against a demo account. I think that would make it much more impactful.

2. The tool is called CloudSecScanner—it's an open-source Python tool that checks for the 50 most common AWS misconfigurations. Here's the GitHub link: [link]. It's been downloaded over 10,000 times and I actively maintain it. Happy to do a dedicated demo or mention it in conference materials!

3. For A/V, standard setup works great. I'll bring my own laptop with backup slides on USB. The only request is a reliable internet connection for the live AWS console demos—if that's not possible, I have pre-recorded backups.

Let me know if you need anything else. I can send an updated outline for the 90-minute format if you'd like.

Thanks again for this opportunity!

Best,
Jane`,
    },
  });

  await prisma.message.create({
    data: {
      submissionId: submission1.id,
      senderId: organizer.id,
      senderType: SenderType.ORGANIZER,
      subject: 'Re: Question about your AWS Security talk',
      body: `Hi Jane,

This is fantastic! Yes, please send over the updated 90-minute outline when you have a chance. The hands-on scanner component sounds like a great addition.

We'll make sure you have reliable WiFi for your demos. We've set up a dedicated presenter network specifically for live demo situations.

One more thing—would you be interested in being featured in our pre-conference blog series? We do speaker spotlights and I think your story about building an open-source security tool while consulting would be great content.

Talk soon!

Michael`,
    },
  });

  // Message thread for the accepted talk
  await prisma.message.create({
    data: {
      submissionId: submission3.id,
      senderId: organizer.id,
      senderType: SenderType.ORGANIZER,
      subject: '🎉 Congratulations - Your talk has been accepted!',
      body: `Hi John,

I'm thrilled to let you know that your lightning talk "Surviving Your First Production Incident: A Field Guide" has been accepted for Awesome Conf 2026!

The reviewers loved your proposal—here's a highlight from the feedback:
> "This will resonate with anyone who's ever been paged at 3 AM... might be the most quotable talk of the conference."

Next steps:
1. Please confirm your participation by replying to this message
2. We'll send speaker logistics details next week
3. Mark your calendar for our speaker prep call on [date]

We're also considering your offer to expand this to a full 45-minute talk—would you be interested in that option?

Congratulations again, and welcome to the Awesome Conf speaker family!

Best regards,
Michael
Program Chair`,
    },
  });

  await prisma.message.create({
    data: {
      submissionId: submission3.id,
      senderId: speaker2.id,
      senderType: SenderType.SPEAKER,
      body: `Hi Michael,

WOW! Thank you so much—I'm absolutely thrilled and honored to be speaking at Awesome Conf!

Please consider this my official confirmation. I've already blocked off the conference dates on my calendar.

Regarding the 45-minute option: I'd love to do that! I have plenty of additional war stories and could add a section on building incident-resilient team culture. Let me know what works best for the program.

Looking forward to the prep call and meeting the team!

Best,
John`,
    },
  });
  console.log('  + Created 5 sample messages (showing organizer-speaker communication)');

  // ==========================================================================
  // Activity Logs (for Recent Activity feed)
  // ==========================================================================
  console.log('\n📊 Creating sample activity logs...');

  // Clean up existing activity logs for fresh seed data
  await prisma.activityLog.deleteMany({});

  // Create activity logs that simulate past user actions
  const activityLogs = [
    {
      userId: admin.id,
      action: 'EVENT_CREATED',
      entityType: 'Event',
      entityId: event1.id,
      metadata: { eventName: event1.name },
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    },
    {
      userId: admin.id,
      action: 'EVENT_PUBLISHED',
      entityType: 'Event',
      entityId: event1.id,
      metadata: { eventName: event1.name },
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
    },
    {
      userId: speaker1.id,
      action: 'SUBMISSION_CREATED',
      entityType: 'Submission',
      entityId: submission1.id,
      metadata: { title: submission1.title, eventName: event1.name },
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
    {
      userId: speaker1.id,
      action: 'SUBMISSION_CREATED',
      entityType: 'Submission',
      entityId: submission2.id,
      metadata: { title: submission2.title, eventName: event1.name },
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 3600000), // 5 days ago + 1 hour
    },
    {
      userId: speaker2.id,
      action: 'SUBMISSION_CREATED',
      entityType: 'Submission',
      entityId: submission3.id,
      metadata: { title: submission3.title, eventName: event1.name },
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    },
    {
      userId: reviewer1.id,
      action: 'REVIEW_SUBMITTED',
      entityType: 'Review',
      entityId: submission2.id,
      metadata: { submissionTitle: submission2.title, score: 5 },
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
    {
      userId: reviewer2.id,
      action: 'REVIEW_SUBMITTED',
      entityType: 'Review',
      entityId: submission2.id,
      metadata: { submissionTitle: submission2.title, score: 4 },
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 7200000), // 3 days ago + 2 hours
    },
    {
      userId: reviewer1.id,
      action: 'REVIEW_SUBMITTED',
      entityType: 'Review',
      entityId: submission3.id,
      metadata: { submissionTitle: submission3.title, score: 5 },
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      userId: organizer.id,
      action: 'SUBMISSION_ACCEPTED',
      entityType: 'Submission',
      entityId: submission3.id,
      metadata: { title: submission3.title, previousStatus: 'UNDER_REVIEW' },
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      userId: admin.id,
      action: 'USER_INVITED',
      entityType: 'User',
      entityId: reviewer3.id,
      metadata: { invitedEmail: 'reviewer3@example.com', role: 'REVIEWER' },
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    },
    {
      userId: admin.id,
      action: 'SETTINGS_UPDATED',
      entityType: 'Settings',
      entityId: 'default',
      metadata: { updatedFields: ['name', 'description'] },
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    },
    {
      userId: speaker1.id,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: speaker1.id,
      metadata: {},
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
  ];

  await prisma.activityLog.createMany({
    data: activityLogs,
  });
  console.log(`  + Created ${activityLogs.length} activity log entries`);

  // ==========================================================================
  // Summary
  // ==========================================================================
  console.log('\n' + '='.repeat(70));
  console.log('Demo seeding complete.\n');
  console.log('Sample Data Created:');
  console.log(`  - ${getTopicCount()} Topics (${getCategories().length} categories)`);
  console.log(`  - ${getEmailTemplateCount()} Email Templates (${getEmailCategories().length} categories)`);
  console.log('  - 8 Users with profile photos');
  console.log('  - 4 Events (3 published, 1 draft)');
  console.log('  - 4 Event Tracks + 5 Talk Formats + 5 Review Criteria');
  console.log('  - 5 Detailed Submissions');
  console.log('  - 4 Reviews with feedback');
  console.log('  - 5 Message threads');
  console.log('  - 4 Reviewer profiles');
  console.log('  - 2 Speaker profiles');
  console.log('  - 1 Co-speaker');
  console.log('  - 12 Activity log entries (for Recent Activity feed)\n');
  
  console.log('Test Accounts (password: password123):');
  console.log('  ┌──────────────────────────────┬────────────────┬───────────────────┐');
  console.log('  │ Email                        │ Role           │ Name              │');
  console.log('  ├──────────────────────────────┼────────────────┼───────────────────┤');
  console.log('  │ admin@example.com            │ Admin          │ Sarah Admin       │');
  console.log('  │ organizer@example.com        │ Organizer      │ Michael Organizer │');
  console.log('  │ reviewer1@example.com        │ Reviewer       │ Alice Chen        │');
  console.log('  │ reviewer2@example.com        │ Reviewer       │ Bob Martinez      │');
  console.log('  │ reviewer3@example.com        │ Reviewer       │ Diana Rodriguez   │');
  console.log('  │ reviewer4@example.com        │ Reviewer       │ Marcus Thompson   │');
  console.log('  │ speaker1@example.com         │ Speaker        │ Jane Wilson       │');
  console.log('  │ speaker2@example.com         │ Speaker        │ John Davis        │');
  console.log('  └──────────────────────────────┴────────────────┴───────────────────┘\n');
  
  console.log('🎨 Profile Features:');
  console.log('  - All users have unique DiceBear SVG avatars');
  console.log('  - Reviewers have full bios, expertise areas, and social links');
  console.log('  - Speakers have speaking experience, travel preferences, etc.');
  console.log('  - Submissions have detailed abstracts, outlines, and speaker notes\n');
  
  console.log('Getting Started:');
  console.log('  1. npm run dev');
  console.log('  2. Open http://localhost:3000');
  console.log('  3. Log in: admin@example.com / password123');
  console.log('  4. Configure SMTP in Settings > Email');
  console.log('  5. Customize templates in Admin > Email Templates\n');
  
  console.log('Sample Events:');
  console.log('  - TechConf 2026: Open CFP');
  console.log('  - DevSummit 2025: Past event');
  console.log('  - CloudConnect Online 2026: Virtual event');
  console.log('  - SecurityCon 2026: Draft (admin only)\n');
  
  console.log('When Ready for Production:');
  console.log('  - Delete sample events in Admin > Events');
  console.log('  - Delete sample users in Admin > Users');
  console.log('  - Or re-run seed with: npx prisma db seed -- --minimal');
  console.log('='.repeat(70));
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
