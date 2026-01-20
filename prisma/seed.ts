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

import { PrismaClient, UserRole, SubmissionStatus, ReviewerRole, ReviewRecommendation, SenderType } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

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
  // Events
  // ==========================================================================
  console.log('\n📅 Creating events...');

  // Future event with open CFP
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 6);
  const cfpCloseDate = new Date();
  cfpCloseDate.setMonth(cfpCloseDate.getMonth() + 2);

  const event1 = await prisma.event.upsert({
    where: { slug: 'devconf-2026' },
    update: {},
    create: {
      name: 'DevConf 2026',
      slug: 'devconf-2026',
      description: 'A premier developer conference focusing on modern web technologies, cloud infrastructure, and DevOps practices.',
      websiteUrl: 'https://devconf.example.com',
      location: 'San Francisco, CA',
      isVirtual: false,
      startDate: futureDate,
      endDate: new Date(futureDate.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days
      timezone: 'America/Los_Angeles',
      cfpOpensAt: new Date(),
      cfpClosesAt: cfpCloseDate,
      cfpDescription: 'We are looking for talks on web development, cloud computing, DevOps, and emerging technologies. Both experienced and first-time speakers are welcome!',
      isPublished: true,
    },
  });
  console.log(`  ✓ Event: ${event1.name}`);

  // Past event
  const pastDate = new Date();
  pastDate.setMonth(pastDate.getMonth() - 3);

  const event2 = await prisma.event.upsert({
    where: { slug: 'jsconf-2025' },
    update: {},
    create: {
      name: 'JSConf 2025',
      slug: 'jsconf-2025',
      description: 'The JavaScript community comes together for two days of talks, workshops, and networking.',
      websiteUrl: 'https://jsconf.example.com',
      location: 'Austin, TX',
      isVirtual: false,
      startDate: pastDate,
      endDate: new Date(pastDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      timezone: 'America/Chicago',
      cfpOpensAt: new Date(pastDate.getTime() - 90 * 24 * 60 * 60 * 1000),
      cfpClosesAt: new Date(pastDate.getTime() - 30 * 24 * 60 * 60 * 1000),
      cfpDescription: 'Share your JavaScript expertise with the community!',
      isPublished: true,
    },
  });
  console.log(`  ✓ Event: ${event2.name}`);

  // Virtual event
  const virtualDate = new Date();
  virtualDate.setMonth(virtualDate.getMonth() + 4);

  const event3 = await prisma.event.upsert({
    where: { slug: 'cloud-summit-2026' },
    update: {},
    create: {
      name: 'Cloud Summit 2026',
      slug: 'cloud-summit-2026',
      description: 'A virtual summit covering AWS, Azure, GCP, and multi-cloud strategies.',
      isVirtual: true,
      startDate: virtualDate,
      endDate: new Date(virtualDate.getTime() + 1 * 24 * 60 * 60 * 1000),
      timezone: 'UTC',
      cfpOpensAt: new Date(),
      cfpClosesAt: new Date(virtualDate.getTime() - 60 * 24 * 60 * 60 * 1000),
      cfpDescription: 'Looking for cloud experts to share their knowledge!',
      isPublished: true,
    },
  });
  console.log(`  ✓ Event: ${event3.name}`);

  // ==========================================================================
  // Event Tracks
  // ==========================================================================
  console.log('\n🎯 Creating event tracks...');

  const track1 = await prisma.eventTrack.create({
    data: {
      eventId: event1.id,
      name: 'Web Development',
      description: 'Frontend and backend web technologies',
      color: '#3b82f6',
    },
  });

  const track2 = await prisma.eventTrack.create({
    data: {
      eventId: event1.id,
      name: 'Cloud & DevOps',
      description: 'Cloud infrastructure and DevOps practices',
      color: '#10b981',
    },
  });

  const track3 = await prisma.eventTrack.create({
    data: {
      eventId: event1.id,
      name: 'AI & ML',
      description: 'Artificial Intelligence and Machine Learning',
      color: '#8b5cf6',
    },
  });
  console.log(`  ✓ Created ${3} tracks for ${event1.name}`);

  // ==========================================================================
  // Event Formats
  // ==========================================================================
  console.log('\n⏱️ Creating session formats...');

  const format1 = await prisma.eventFormat.create({
    data: {
      eventId: event1.id,
      name: 'Talk',
      durationMin: 30,
    },
  });

  const format2 = await prisma.eventFormat.create({
    data: {
      eventId: event1.id,
      name: 'Workshop',
      durationMin: 90,
    },
  });

  const format3 = await prisma.eventFormat.create({
    data: {
      eventId: event1.id,
      name: 'Lightning Talk',
      durationMin: 10,
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
  // Submissions
  // ==========================================================================
  console.log('\n📄 Creating submissions...');

  const submission1 = await prisma.submission.create({
    data: {
      eventId: event1.id,
      speakerId: speaker1.id,
      trackId: track1.id,
      formatId: format1.id,
      title: 'Building Scalable React Applications',
      abstract: 'Learn how to architect large-scale React applications using modern patterns like Module Federation, state management with Zustand, and performance optimization techniques.',
      outline: '1. Introduction to scalability challenges\n2. Module Federation deep dive\n3. State management patterns\n4. Performance optimization\n5. Q&A',
      targetAudience: 'Intermediate to advanced React developers',
      prerequisites: 'Basic React knowledge, familiarity with state management concepts',
      status: SubmissionStatus.PENDING,
    },
  });

  const submission2 = await prisma.submission.create({
    data: {
      eventId: event1.id,
      speakerId: speaker1.id,
      trackId: track2.id,
      formatId: format2.id,
      title: 'Kubernetes for Developers',
      abstract: 'A hands-on workshop covering Kubernetes fundamentals from a developer perspective. Learn how to deploy, scale, and manage your applications on Kubernetes.',
      outline: '1. Kubernetes architecture\n2. Pods and deployments\n3. Services and networking\n4. ConfigMaps and Secrets\n5. Hands-on exercises',
      targetAudience: 'Developers looking to understand Kubernetes',
      prerequisites: 'Docker basics, command line familiarity',
      status: SubmissionStatus.UNDER_REVIEW,
    },
  });

  const submission3 = await prisma.submission.create({
    data: {
      eventId: event1.id,
      speakerId: speaker2.id,
      trackId: track3.id,
      formatId: format3.id,
      title: 'LLMs in Production: Lessons Learned',
      abstract: 'A lightning talk sharing practical lessons from deploying Large Language Models in production environments, covering prompt engineering, cost optimization, and monitoring.',
      targetAudience: 'Developers and architects interested in AI/ML',
      status: SubmissionStatus.ACCEPTED,
    },
  });

  const submission4 = await prisma.submission.create({
    data: {
      eventId: event1.id,
      speakerId: speaker2.id,
      trackId: track1.id,
      formatId: format1.id,
      title: 'Next.js 15: What You Need to Know',
      abstract: 'Explore the new features in Next.js 15, including improved server components, enhanced caching strategies, and the new partial prerendering feature.',
      targetAudience: 'JavaScript/TypeScript developers',
      status: SubmissionStatus.PENDING,
    },
  });
  console.log(`  ✓ Created ${4} submissions`);

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
  console.log('\n' + '='.repeat(50));
  console.log('✅ Seeding complete!\n');
  console.log('Test Accounts (password: password123):');
  console.log('  - admin@example.com (Admin)');
  console.log('  - organizer@example.com (Organizer)');
  console.log('  - reviewer1@example.com (Reviewer)');
  console.log('  - reviewer2@example.com (Reviewer)');
  console.log('  - speaker1@example.com (Speaker)');
  console.log('  - speaker2@example.com (Speaker)');
  console.log('='.repeat(50));
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
