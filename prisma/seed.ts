/**
 * Database Seed Script
 * 
 * Creates sample data for development and testing.
 * 
 * Usage:
 *   npx prisma db seed
 * 
 * Or add to package.json:
 *   "prisma": {
 *     "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
 *   }
 */

import { PrismaClient, UserRole, SubmissionStatus, ReviewerRole, ReviewRecommendation, SenderType, EventStatus } from '@prisma/client';
import { hash } from 'bcryptjs';
import { SECURITY_TOPICS, getTopicCount, getCategories } from './seed-topics';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

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
      name: 'Demo CFP Platform',
      description: 'A self-hosted Call for Papers platform for conferences and events.',
      websiteUrl: 'http://localhost:3000',
      contactEmail: 'admin@example.com',
      federationEnabled: false,
    },
  });

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
      name: 'Admin User',
      passwordHash,
      role: UserRole.ADMIN,
      emailVerified: new Date(),
    },
  });
  console.log(`  ✓ Admin: ${admin.email}`);

  // Organizer user
  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@example.com' },
    update: {},
    create: {
      email: 'organizer@example.com',
      name: 'Event Organizer',
      passwordHash,
      role: UserRole.ORGANIZER,
      emailVerified: new Date(),
    },
  });
  console.log(`  ✓ Organizer: ${organizer.email}`);

  // Reviewer users
  const reviewer1 = await prisma.user.upsert({
    where: { email: 'reviewer1@example.com' },
    update: {},
    create: {
      email: 'reviewer1@example.com',
      name: 'Alice Reviewer',
      passwordHash,
      role: UserRole.REVIEWER,
      emailVerified: new Date(),
    },
  });
  console.log(`  ✓ Reviewer: ${reviewer1.email}`);

  const reviewer2 = await prisma.user.upsert({
    where: { email: 'reviewer2@example.com' },
    update: {},
    create: {
      email: 'reviewer2@example.com',
      name: 'Bob Reviewer',
      passwordHash,
      role: UserRole.REVIEWER,
      emailVerified: new Date(),
    },
  });
  console.log(`  ✓ Reviewer: ${reviewer2.email}`);

  // Speaker users
  const speaker1 = await prisma.user.upsert({
    where: { email: 'speaker1@example.com' },
    update: {},
    create: {
      email: 'speaker1@example.com',
      name: 'Jane Speaker',
      passwordHash,
      role: UserRole.USER,
      emailVerified: new Date(),
    },
  });
  console.log(`  ✓ Speaker: ${speaker1.email}`);

  const speaker2 = await prisma.user.upsert({
    where: { email: 'speaker2@example.com' },
    update: {},
    create: {
      email: 'speaker2@example.com',
      name: 'John Speaker',
      passwordHash,
      role: UserRole.USER,
      emailVerified: new Date(),
    },
  });
  console.log(`  ✓ Speaker: ${speaker2.email}`);

  // ==========================================================================
  // Events (with enhanced fields)
  // ==========================================================================
  console.log('\n📅 Creating events...');

  // Future event with open CFP - Security Conference
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 6);
  const cfpCloseDate = new Date();
  cfpCloseDate.setMonth(cfpCloseDate.getMonth() + 2);

  const event1 = await prisma.event.upsert({
    where: { slug: 'securitycon-2026' },
    update: {},
    create: {
      name: 'SecurityCon 2026',
      slug: 'securitycon-2026',
      description: '<p>A premier security conference focusing on offensive and defensive security, cloud security, and emerging threats.</p><p>Join industry experts and researchers for three days of cutting-edge content.</p>',
      websiteUrl: 'https://securitycon.example.com',
      // Enhanced location fields
      venueName: 'Moscone Center',
      venueAddress: '747 Howard St',
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
      topics: ['Penetration Testing', 'Red Teaming', 'Cloud Security', 'AI Security', 'Threat Hunting', 'DevSecOps'],
      audienceLevel: ['intermediate', 'advanced'],
      // Enhanced CFP settings
      cfpOpensAt: new Date(),
      cfpClosesAt: cfpCloseDate,
      cfpStartTime: '00:00',
      cfpEndTime: '23:59',
      cfpDescription: 'We are looking for talks on offensive security, defensive techniques, cloud security, and emerging threats.',
      cfpGuidelines: '<p><strong>What we are looking for:</strong></p><ul><li>Original research and new vulnerability discoveries</li><li>Practical techniques and tools</li><li>Case studies and lessons learned</li><li>Emerging threats and defense strategies</li></ul><p><strong>Submission requirements:</strong></p><ul><li>Abstract: 200-500 words</li><li>Outline: Include key points and takeaways</li><li>Previous speaking experience (optional but helpful)</li></ul>',
      speakerBenefits: '<p><strong>What speakers receive:</strong></p><ul><li>Full conference pass (3 days)</li><li>Speaker dinner and networking events</li><li>Travel stipend (up to $1,500 domestic, $3,000 international)</li><li>Hotel accommodation (3 nights)</li><li>Professional video recording of your talk</li></ul>',
      // Review settings
      reviewType: 'scoring',
      minReviewsPerTalk: 3,
      enableSpeakerFeedback: true,
      // Notifications
      notifyOnNewSubmission: true,
      notifyOnNewReview: true,
      // Status
      status: EventStatus.PUBLISHED,
      isPublished: true,
    },
  });
  console.log(`  ✓ Event: ${event1.name}`);

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

  // Past event
  const pastDate = new Date();
  pastDate.setMonth(pastDate.getMonth() - 3);

  const event2 = await prisma.event.upsert({
    where: { slug: 'hackcon-2025' },
    update: {},
    create: {
      name: 'HackCon 2025',
      slug: 'hackcon-2025',
      description: '<p>The hacker community comes together for two days of talks, workshops, and CTF competitions.</p>',
      websiteUrl: 'https://hackcon.example.com',
      venueName: 'Austin Convention Center',
      venueCity: 'Austin',
      country: 'US',
      location: 'Austin, TX',
      isVirtual: false,
      eventType: 'conference',
      startDate: pastDate,
      endDate: new Date(pastDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      startTime: '10:00',
      endTime: '20:00',
      timezone: 'America/Chicago',
      topics: ['Ethical Hacking', 'Bug Bounty', 'Reverse Engineering', 'Malware Analysis', 'Web Application Hacking'],
      audienceLevel: ['beginner', 'intermediate', 'advanced'],
      cfpOpensAt: new Date(pastDate.getTime() - 90 * 24 * 60 * 60 * 1000),
      cfpClosesAt: new Date(pastDate.getTime() - 30 * 24 * 60 * 60 * 1000),
      cfpGuidelines: '<p>Share your hacking expertise with the community!</p>',
      reviewType: 'scoring',
      minReviewsPerTalk: 2,
      status: EventStatus.PUBLISHED,
      isPublished: true,
    },
  });
  console.log(`  ✓ Event: ${event2.name}`);

  // Virtual event - Cloud Security Summit
  const virtualDate = new Date();
  virtualDate.setMonth(virtualDate.getMonth() + 4);

  const event3 = await prisma.event.upsert({
    where: { slug: 'cloud-security-summit-2026' },
    update: {},
    create: {
      name: 'Cloud Security Summit 2026',
      slug: 'cloud-security-summit-2026',
      description: '<p>A virtual summit covering AWS, Azure, GCP security, container security, and cloud-native defense strategies.</p>',
      isVirtual: true,
      virtualUrl: 'https://cloudsecuritysummit.example.com/virtual',
      eventType: 'webinar',
      startDate: virtualDate,
      endDate: new Date(virtualDate.getTime() + 1 * 24 * 60 * 60 * 1000),
      startTime: '09:00',
      endTime: '17:00',
      timezone: 'UTC',
      topics: ['AWS Security', 'Azure Security', 'GCP Security', 'Container Security', 'Kubernetes Security', 'Cloud Native Security'],
      audienceLevel: ['intermediate', 'advanced'],
      cfpOpensAt: new Date(),
      cfpClosesAt: new Date(virtualDate.getTime() - 60 * 24 * 60 * 60 * 1000),
      cfpGuidelines: '<p>Looking for cloud security experts to share their knowledge!</p>',
      speakerBenefits: '<p>Virtual speaker benefits include promotional exposure and access to all recordings.</p>',
      reviewType: 'scoring',
      minReviewsPerTalk: 2,
      status: EventStatus.PUBLISHED,
      isPublished: true,
    },
  });
  console.log(`  ✓ Event: ${event3.name}`);

  // Draft event (not published)
  const draftDate = new Date();
  draftDate.setMonth(draftDate.getMonth() + 8);

  const event4 = await prisma.event.upsert({
    where: { slug: 'appsec-world-2026' },
    update: {},
    create: {
      name: 'AppSec World 2026',
      slug: 'appsec-world-2026',
      description: '<p>Application security conference - draft event for planning.</p>',
      venueName: 'TBD',
      venueCity: 'London',
      country: 'GB',
      isVirtual: false,
      eventType: 'conference',
      startDate: draftDate,
      endDate: new Date(draftDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      timezone: 'Europe/London',
      topics: ['Application Security', 'SAST', 'DAST', 'DevSecOps', 'Secure Coding'],
      audienceLevel: ['all'],
      status: EventStatus.DRAFT,
      isPublished: false,
    },
  });
  console.log(`  ✓ Event: ${event4.name} (draft)`);

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
  // Submissions (Security focused)
  // ==========================================================================
  console.log('\n📄 Creating submissions...');

  const submission1 = await prisma.submission.create({
    data: {
      eventId: event1.id,
      speakerId: speaker1.id,
      trackId: track1.id,
      formatId: format1.id,
      title: 'Breaking into the Cloud: AWS Attack Techniques',
      abstract: 'Learn about the latest attack techniques targeting AWS environments, from initial access through privilege escalation to persistence. We will demonstrate real-world attack chains and discuss detection opportunities.',
      outline: '1. AWS security model overview\n2. Initial access techniques (SSRF, credential exposure)\n3. Privilege escalation via IAM misconfigurations\n4. Lateral movement in AWS\n5. Detection and hunting opportunities',
      targetAudience: 'Red teamers and security researchers',
      prerequisites: 'Basic AWS knowledge, familiarity with cloud concepts',
      status: SubmissionStatus.PENDING,
    },
  });

  const submission2 = await prisma.submission.create({
    data: {
      eventId: event1.id,
      speakerId: speaker1.id,
      trackId: track3.id,
      formatId: format2.id,
      title: 'Kubernetes Security Workshop: From Zero to Hero',
      abstract: 'A hands-on workshop covering Kubernetes security from the ground up. Learn how to secure your clusters, implement pod security policies, and detect malicious activity in K8s environments.',
      outline: '1. Kubernetes security architecture\n2. RBAC and authentication\n3. Pod security standards\n4. Network policies\n5. Runtime security and monitoring\n6. Hands-on exercises',
      targetAudience: 'DevOps engineers and security professionals',
      prerequisites: 'Basic Kubernetes knowledge, command line familiarity',
      status: SubmissionStatus.UNDER_REVIEW,
    },
  });

  const submission3 = await prisma.submission.create({
    data: {
      eventId: event1.id,
      speakerId: speaker2.id,
      trackId: track2.id,
      formatId: format3.id,
      title: 'Hunting LLM-Powered Attacks in the Wild',
      abstract: 'A lightning talk on detecting AI-generated phishing, automated vulnerability exploitation, and other emerging threats powered by large language models. We share detection strategies and hunting queries.',
      targetAudience: 'SOC analysts and threat hunters',
      status: SubmissionStatus.ACCEPTED,
    },
  });

  const submission4 = await prisma.submission.create({
    data: {
      eventId: event1.id,
      speakerId: speaker2.id,
      trackId: track4.id,
      formatId: format1.id,
      title: 'Securing the Software Supply Chain: Lessons from Real Breaches',
      abstract: 'Explore recent supply chain attacks and learn practical defenses. We will cover SBOM generation, dependency scanning, build pipeline security, and artifact signing.',
      targetAudience: 'DevSecOps engineers and security architects',
      status: SubmissionStatus.PENDING,
    },
  });

  const submission5 = await prisma.submission.create({
    data: {
      eventId: event1.id,
      speakerId: speaker1.id,
      trackId: track1.id,
      formatId: format1.id,
      title: 'Active Directory Attacks: A Purple Team Perspective',
      abstract: 'Deep dive into modern Active Directory attack techniques and their detection. We cover Kerberoasting, DCSync, Golden Tickets, and more - from both offensive and defensive viewpoints.',
      targetAudience: 'Penetration testers and blue team members',
      prerequisites: 'Basic Windows/AD knowledge',
      status: SubmissionStatus.UNDER_REVIEW,
    },
  });
  console.log(`  ✓ Created ${5} submissions`);

  // ==========================================================================
  // Co-speakers
  // ==========================================================================
  console.log('\n🤝 Adding co-speakers...');

  await prisma.coSpeaker.create({
    data: {
      submissionId: submission2.id,
      name: 'Sarah DevOps',
      email: 'sarah@example.com',
      bio: 'Senior DevOps Engineer with 10 years of experience',
    },
  });
  console.log(`  ✓ Added co-speaker to "${submission2.title}"`);

  // ==========================================================================
  // Reviews
  // ==========================================================================
  console.log('\n⭐ Creating reviews...');

  await prisma.review.create({
    data: {
      submissionId: submission2.id,
      reviewerId: reviewer1.id,
      contentScore: 5,
      presentationScore: 4,
      relevanceScore: 5,
      overallScore: 5,
      privateNotes: 'Excellent topic, very relevant to our audience.',
      publicNotes: 'Great proposal! Looking forward to this workshop.',
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
      privateNotes: 'Good but could use more advanced topics.',
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
      publicNotes: 'Exactly what our attendees want to hear about!',
      recommendation: ReviewRecommendation.STRONG_ACCEPT,
    },
  });
  console.log(`  ✓ Created ${3} reviews`);

  // ==========================================================================
  // Messages
  // ==========================================================================
  console.log('\n💬 Creating messages...');

  await prisma.message.create({
    data: {
      submissionId: submission1.id,
      senderId: organizer.id,
      senderType: SenderType.ORGANIZER,
      subject: 'Question about your talk',
      body: 'Hi Jane,\n\nThank you for your submission! We have a quick question - would you be open to extending this to a workshop format?\n\nBest,\nThe Organizers',
    },
  });

  await prisma.message.create({
    data: {
      submissionId: submission1.id,
      senderId: speaker1.id,
      senderType: SenderType.SPEAKER,
      body: 'Hi!\n\nAbsolutely, I would be happy to turn this into a workshop. Let me know if you need an updated outline.\n\nThanks,\nJane',
    },
  });
  console.log(`  ✓ Created ${2} messages`);

  // ==========================================================================
  // Summary
  // ==========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('✅ Seeding complete!\n');
  console.log('📊 Database Contents:');
  console.log(`  - ${getTopicCount()} Topics (${getCategories().length} categories)`);
  console.log('  - 4 Events (3 published, 1 draft)');
  console.log('  - 4 Event Tracks');
  console.log('  - 5 Talk Formats + 5 Review Criteria');
  console.log('  - 5 Submissions\n');
  console.log('🔑 Test Accounts (password: password123):');
  console.log('  - admin@example.com (Admin)');
  console.log('  - organizer@example.com (Organizer)');
  console.log('  - reviewer1@example.com (Reviewer)');
  console.log('  - reviewer2@example.com (Reviewer)');
  console.log('  - speaker1@example.com (Speaker)');
  console.log('  - speaker2@example.com (Speaker)');
  console.log('='.repeat(60));
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
