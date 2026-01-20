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
  console.log(`  ✓ Created ${getTopicCount()} topics in ${categories.length} categories`);
  console.log(`    Categories: ${categories.join(', ')}`);

  // ==========================================================================
  // Site Settings
  // ==========================================================================
  console.log('📝 Creating site settings...');
  
  await prisma.siteSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: '🎤 Your Conference Name Here',
      description: 'Replace this with your conference tagline or description',
      websiteUrl: 'http://localhost:3000',
      contactEmail: 'your-email@example.com',
      federationEnabled: false,
      landingPageContent: `<h1>👋 Welcome! This is Your Landing Page</h1>

<p><strong>This is sample content to help you get started.</strong> You're seeing this because you ran the demo seed. Everything here is customizable!</p>

<h2>🚀 Quick Setup (5 minutes)</h2>
<ol>
  <li><strong>Change the site name:</strong> Go to Settings → General → Update "Your Conference Name Here"</li>
  <li><strong>Edit this content:</strong> Go to Settings → Landing Page → Use the rich text editor</li>
  <li><strong>Customize sections:</strong> Settings → Landing Page → Layout tab to show/hide/reorder sections</li>
  <li><strong>Delete sample data:</strong> Remove the demo events, users, and submissions when you're ready</li>
</ol>

<h2>✨ What You Can Put Here</h2>
<ul>
  <li>Your organization or conference description</li>
  <li>Why speakers should submit to your event</li>
  <li>Speaker benefits and perks</li>
  <li>Important dates and deadlines</li>
  <li>Links to your main website, code of conduct, etc.</li>
</ul>

<h2>📝 Example Content (replace with yours)</h2>
<p>Join us at <strong>[Your Conference Name]</strong> - the premier event for [your industry/topic]. We're looking for speakers who are passionate about sharing their knowledge with our community of [number] attendees.</p>

<p><em>💡 Tip: This rich text editor supports headings, lists, links, images, and more. Make it your own!</em></p>`,
    },
  });
  
  // For minimal seed, stop here
  if (isMinimalSeed) {
    console.log('\n' + '='.repeat(60));
    console.log('✅ Minimal seeding complete!\n');
    console.log('📊 Database Contents:');
    console.log(`  - ${getTopicCount()} Topics (${getCategories().length} categories)`);
    console.log('  - Site settings configured');
    console.log('\n💡 Next Steps:');
    console.log('  1. Start the application: npm run dev');
    console.log('  2. Register the first user at /auth/signup (becomes Admin)');
    console.log('  3. Configure your instance in Settings');
    console.log('='.repeat(60));
    return;
  }

  // ==========================================================================
  // Users
  // ==========================================================================
  console.log('👤 Creating users...');
  
  const passwordHash = await hash('password123', 10);

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Sarah Admin',
      passwordHash,
      role: UserRole.ADMIN,
      emailVerified: new Date(),
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SarahAdmin&backgroundColor=ffdfbf',
    },
  });
  console.log(`  ✓ Admin: ${admin.email}`);

  // Organizer user
  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@example.com' },
    update: {},
    create: {
      email: 'organizer@example.com',
      name: 'Michael Organizer',
      passwordHash,
      role: UserRole.ORGANIZER,
      emailVerified: new Date(),
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MichaelOrganizer&backgroundColor=c1e7c1',
    },
  });
  console.log(`  ✓ Organizer: ${organizer.email}`);

  // Reviewer users
  const reviewer1 = await prisma.user.upsert({
    where: { email: 'reviewer1@example.com' },
    update: {},
    create: {
      email: 'reviewer1@example.com',
      name: 'Alice Chen',
      passwordHash,
      role: UserRole.REVIEWER,
      emailVerified: new Date(),
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AliceChen&backgroundColor=b6e3f4',
    },
  });
  console.log(`  ✓ Reviewer: ${reviewer1.email}`);

  const reviewer2 = await prisma.user.upsert({
    where: { email: 'reviewer2@example.com' },
    update: {},
    create: {
      email: 'reviewer2@example.com',
      name: 'Bob Martinez',
      passwordHash,
      role: UserRole.REVIEWER,
      emailVerified: new Date(),
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BobMartinez&backgroundColor=c0aede',
    },
  });
  console.log(`  ✓ Reviewer: ${reviewer2.email}`);

  // Speaker users
  const speaker1 = await prisma.user.upsert({
    where: { email: 'speaker1@example.com' },
    update: {},
    create: {
      email: 'speaker1@example.com',
      name: 'Jane Wilson',
      passwordHash,
      role: UserRole.USER,
      emailVerified: new Date(),
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JaneWilson&backgroundColor=ffd5dc',
    },
  });
  console.log(`  ✓ Speaker: ${speaker1.email}`);

  const speaker2 = await prisma.user.upsert({
    where: { email: 'speaker2@example.com' },
    update: {},
    create: {
      email: 'speaker2@example.com',
      name: 'John Davis',
      passwordHash,
      role: UserRole.USER,
      emailVerified: new Date(),
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JohnDavis&backgroundColor=d1f4d1',
    },
  });
  console.log(`  ✓ Speaker: ${speaker2.email}`);

  // ==========================================================================
  // Reviewer Profiles (for public team page)
  // ==========================================================================
  console.log('\n👤 Creating reviewer profiles...');

  // Using DiceBear API for unique, royalty-free SVG avatars
  // Format: https://api.dicebear.com/7.x/avataaars/svg?seed=NAME
  
  await prisma.reviewerProfile.upsert({
    where: { userId: reviewer1.id },
    update: {},
    create: {
      userId: reviewer1.id,
      fullName: 'Alice Chen',
      bio: `With over a decade of experience in cloud architecture and distributed systems, I've had the privilege of building and scaling systems that serve millions of users. Currently leading infrastructure at Tech Innovations Inc., where we're pushing the boundaries of what's possible with modern cloud-native technologies.

I'm passionate about the conference speaking community and believe that diverse voices make our industry stronger. As a reviewer, I focus on technical depth while ensuring talks remain accessible to their target audience. I particularly enjoy mentoring first-time speakers and helping them craft compelling narratives around their technical work.

When I'm not reviewing proposals or writing code, you'll find me contributing to open-source projects and organizing local meetups. I believe knowledge sharing is the cornerstone of our industry's growth.`,
      company: 'Tech Innovations Inc.',
      designation: 'Principal Engineer',
      photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AliceChen&backgroundColor=b6e3f4',
      expertiseAreas: ['Cloud Architecture', 'Distributed Systems', 'DevOps', 'Kubernetes', 'AWS', 'System Design'],
      yearsOfExperience: 12,
      hasReviewedBefore: true,
      conferencesReviewed: 'KubeCon, AWS re:Invent, QCon, DevOpsDays, Cloud Native Summit',
      reviewCriteria: ['Technical accuracy', 'Presentation clarity', 'Audience relevance', 'Novelty of content'],
      hoursPerWeek: '5-10',
      preferredEventSize: 'any',
      additionalNotes: 'Particularly interested in talks about scaling challenges, infrastructure as code, and cloud cost optimization.',
      linkedinUrl: 'https://linkedin.com/in/alicechen-example',
      twitterHandle: 'alicechen_tech',
      githubUsername: 'alicechen',
      websiteUrl: 'https://alicechen.dev',
      onboardingCompleted: true,
      showOnTeamPage: true,
    },
  });

  await prisma.reviewerProfile.upsert({
    where: { userId: reviewer2.id },
    update: {},
    create: {
      userId: reviewer2.id,
      fullName: 'Bob Martinez',
      bio: `Security researcher by day, conference enthusiast by night. I've spent the last 8 years uncovering vulnerabilities in web applications, APIs, and cloud infrastructure. My work has been recognized at major security conferences including DEF CON, Black Hat, and BSides.

What drives me as a reviewer is the opportunity to help security professionals share their research with the broader community. I believe that responsible disclosure and knowledge sharing are essential to improving our collective security posture. I evaluate proposals not just for technical merit, but for their potential impact on the security community.

I've been on both sides of the CFP process—as a speaker and reviewer—and understand the challenges of distilling complex research into an engaging talk. I'm committed to providing constructive feedback that helps speakers improve, regardless of whether their talk is accepted.`,
      company: 'SecureTech Labs',
      designation: 'Senior Security Researcher',
      photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BobMartinez&backgroundColor=c0aede',
      expertiseAreas: ['Application Security', 'Penetration Testing', 'Threat Modeling', 'Bug Bounty', 'Web Security', 'API Security'],
      yearsOfExperience: 8,
      hasReviewedBefore: true,
      conferencesReviewed: 'DEF CON, Black Hat, BSides, OWASP AppSec, Security BSides',
      reviewCriteria: ['Research novelty', 'Practical applicability', 'Responsible disclosure', 'Demo quality'],
      hoursPerWeek: '2-5',
      preferredEventSize: 'medium',
      additionalNotes: 'Interested in novel attack techniques, defense strategies, and security tool development.',
      linkedinUrl: 'https://linkedin.com/in/bobmartinez-security',
      twitterHandle: 'bob_secresearch',
      githubUsername: 'bobmartinez',
      onboardingCompleted: true,
      showOnTeamPage: true,
    },
  });
  console.log('  ✓ Created reviewer profiles (visible on landing page)');

  // ==========================================================================
  // Speaker Profiles
  // ==========================================================================
  console.log('\n👤 Creating speaker profiles...');

  await prisma.speakerProfile.upsert({
    where: { userId: speaker1.id },
    update: {},
    create: {
      userId: speaker1.id,
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
      expertiseTags: ['AWS Security', 'Cloud Security', 'IAM', 'Infrastructure as Code', 'DevSecOps', 'Compliance'],
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

  await prisma.speakerProfile.upsert({
    where: { userId: speaker2.id },
    update: {},
    create: {
      userId: speaker2.id,
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
      expertiseTags: ['DevOps', 'CI/CD', 'Kubernetes', 'Observability', 'Incident Response', 'Platform Engineering'],
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
  console.log('  ✓ Created speaker profiles');

  // ==========================================================================
  // Events (with enhanced fields)
  // ==========================================================================
  console.log('\n📅 Creating sample events...');

  // Future event with open CFP - Main Demo Event
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 6);
  const cfpCloseDate = new Date();
  cfpCloseDate.setMonth(cfpCloseDate.getMonth() + 2);

  const event1 = await prisma.event.upsert({
    where: { slug: 'sample-conference-2026' },
    update: {},
    create: {
      name: '📋 Sample Conference 2026',
      slug: 'sample-conference-2026',
      description: '<p><strong>🎯 This is a sample event with an open CFP!</strong></p><p>This demonstrates how events look when they\'re accepting submissions. You can:</p><ul><li>Edit this event to see how event management works</li><li>Submit a test talk to see the speaker experience</li><li>Review submissions from the reviewer dashboard</li><li>Delete this when you\'re ready to create your real events</li></ul><p>Go to <strong>Admin → Events</strong> to manage this event or create your own.</p>',
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
      cfpGuidelines: '<p><strong>📝 Sample CFP Guidelines</strong></p><p>This shows how your submission guidelines will appear to speakers. Edit this in Event Settings!</p><ul><li>What topics are you looking for?</li><li>What format should abstracts follow?</li><li>Any specific requirements or preferences?</li></ul><p><em>Tip: Clear guidelines help speakers submit better proposals!</em></p>',
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
  console.log(`  ✓ ${event1.name} (Open CFP - try submitting a talk!)`);

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
      name: '📅 Sample Past Event 2025',
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
  console.log(`  ✓ Event: ${event2.name} (Past event)`);

  // Virtual event - shows virtual event capabilities
  const virtualDate = new Date();
  virtualDate.setMonth(virtualDate.getMonth() + 4);

  const event3 = await prisma.event.upsert({
    where: { slug: 'sample-virtual-event-2026' },
    update: {},
    create: {
      name: '💻 Sample Virtual Event 2026',
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
  console.log(`  ✓ Event: ${event3.name} (Virtual event)`);

  // Draft event - shows unpublished event
  const draftDate = new Date();
  draftDate.setMonth(draftDate.getMonth() + 8);

  const event4 = await prisma.event.upsert({
    where: { slug: 'sample-draft-event' },
    update: {},
    create: {
      name: '📝 Sample Draft Event (Not Public)',
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
  console.log(`  ✓ Event: ${event4.name} (Draft - not public)`);

  // ==========================================================================
  // Event Tracks (Security focused)
  // ==========================================================================
  console.log('\n🎯 Creating event tracks...');

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
  console.log(`  ✓ Created ${4} tracks for ${event1.name}`);

  // ==========================================================================
  // Event Formats (Legacy - kept for compatibility)
  // ==========================================================================
  console.log('\n⏱️ Creating session formats (legacy)...');

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
  console.log(`  ✓ Created ${3} formats for ${event1.name}`);

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
  console.log(`  ✓ Added review team for ${event1.name}`);

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
  console.log('  ✓ Created 5 sample submissions');

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
  console.log(`  ✓ Added co-speaker Sarah Kim to Kubernetes workshop`);

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
  console.log('  ✓ Created 4 detailed reviews');

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
  console.log('  ✓ Created 5 sample messages (showing organizer-speaker communication)');

  // ==========================================================================
  // Summary
  // ==========================================================================
  console.log('\n' + '='.repeat(70));
  console.log('✅ Demo seeding complete!\n');
  console.log('📊 Sample Data Created:');
  console.log(`  - ${getTopicCount()} Topics (${getCategories().length} categories)`);
  console.log('  - 6 Users with profile photos (DiceBear avatars)');
  console.log('  - 4 Events (3 published, 1 draft)');
  console.log('  - 4 Event Tracks + 5 Talk Formats + 5 Review Criteria');
  console.log('  - 5 Detailed Submissions with full abstracts/outlines');
  console.log('  - 4 Detailed Reviews with meaningful feedback');
  console.log('  - 5 Message threads showing organizer-speaker communication');
  console.log('  - 2 Reviewer profiles (visible on landing page team section)');
  console.log('  - 2 Speaker profiles with complete bios & social links');
  console.log('  - 1 Co-speaker with full profile\n');
  
  console.log('🔑 Test Accounts (password: password123):');
  console.log('  ┌──────────────────────────────┬────────────────┬───────────────────┐');
  console.log('  │ Email                        │ Role           │ Name              │');
  console.log('  ├──────────────────────────────┼────────────────┼───────────────────┤');
  console.log('  │ admin@example.com            │ Admin          │ Sarah Admin       │');
  console.log('  │ organizer@example.com        │ Organizer      │ Michael Organizer │');
  console.log('  │ reviewer1@example.com        │ Reviewer       │ Alice Chen        │');
  console.log('  │ reviewer2@example.com        │ Reviewer       │ Bob Martinez      │');
  console.log('  │ speaker1@example.com         │ Speaker        │ Jane Wilson       │');
  console.log('  │ speaker2@example.com         │ Speaker        │ John Davis        │');
  console.log('  └──────────────────────────────┴────────────────┴───────────────────┘\n');
  
  console.log('🎨 Profile Features:');
  console.log('  - All users have unique DiceBear SVG avatars');
  console.log('  - Reviewers have full bios, expertise areas, and social links');
  console.log('  - Speakers have speaking experience, travel preferences, etc.');
  console.log('  - Submissions have detailed abstracts, outlines, and speaker notes\n');
  
  console.log('🚀 Get Started in 2 Minutes:');
  console.log('  1. npm run dev');
  console.log('  2. Open http://localhost:3000');
  console.log('  3. Log in: admin@example.com / password123');
  console.log('  4. Go to Settings → General to change "Your Conference Name Here"');
  console.log('  5. Go to Settings → Landing Page to customize your content\n');
  
  console.log('🎯 What the Sample Data Shows:');
  console.log('  - Sample Conference 2026: Open CFP (try submitting a talk!)');
  console.log('  - Sample Past Event: How completed events appear');
  console.log('  - Sample Virtual Event: Online event configuration');
  console.log('  - Sample Draft Event: Unpublished event (admin only)');
  console.log('  - Reviewer team: Shows on landing page with photos/bios');
  console.log('  - Sample submissions: Full review workflow demo');
  console.log('  - Message threads: Organizer-speaker communication\n');
  
  console.log('🗑️  When Ready for Production:');
  console.log('  - Delete sample events in Admin → Events');
  console.log('  - Delete sample users in Admin → Users');
  console.log('  - Or re-run seed with: npx prisma db seed -- --minimal');
  console.log('='.repeat(70));
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
