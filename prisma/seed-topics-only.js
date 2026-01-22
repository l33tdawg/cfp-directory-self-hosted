/**
 * Essential Data Seed Script (Production Safe)
 * 
 * This script seeds essential topics, site settings, and email templates.
 * It has no external dependencies beyond @prisma/client.
 * Used by Docker entrypoint for fresh installs.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Security-focused topic categories
const SECURITY_TOPICS = [
  // Application Security
  { name: 'Web Application Security', category: 'Application Security', description: 'Security of web applications and APIs' },
  { name: 'Mobile Application Security', category: 'Application Security', description: 'iOS, Android, and cross-platform mobile security' },
  { name: 'API Security', category: 'Application Security', description: 'REST, GraphQL, and API gateway security' },
  { name: 'Secure Development Lifecycle', category: 'Application Security', description: 'Integrating security into SDLC' },
  { name: 'Code Review & Static Analysis', category: 'Application Security', description: 'SAST, code auditing, and review techniques' },
  { name: 'OWASP Top 10', category: 'Application Security', description: 'Common web vulnerabilities and mitigations' },
  
  // Network Security
  { name: 'Network Architecture Security', category: 'Network Security', description: 'Secure network design and segmentation' },
  { name: 'Firewall & IDS/IPS', category: 'Network Security', description: 'Network defense technologies' },
  { name: 'Zero Trust Architecture', category: 'Network Security', description: 'Zero trust network design principles' },
  { name: 'VPN & Remote Access', category: 'Network Security', description: 'Secure remote connectivity' },
  { name: 'DNS Security', category: 'Network Security', description: 'DNS security and DNSSEC' },
  
  // Cloud Security
  { name: 'AWS Security', category: 'Cloud Security', description: 'Amazon Web Services security' },
  { name: 'Azure Security', category: 'Cloud Security', description: 'Microsoft Azure security' },
  { name: 'GCP Security', category: 'Cloud Security', description: 'Google Cloud Platform security' },
  { name: 'Multi-Cloud Security', category: 'Cloud Security', description: 'Security across cloud providers' },
  { name: 'Container Security', category: 'Cloud Security', description: 'Docker, Kubernetes, and container runtime security' },
  { name: 'Serverless Security', category: 'Cloud Security', description: 'FaaS and serverless architecture security' },
  { name: 'Cloud Compliance', category: 'Cloud Security', description: 'Cloud compliance and governance' },
  
  // Identity & Access Management
  { name: 'Identity Management', category: 'Identity & Access Management', description: 'Identity lifecycle and governance' },
  { name: 'Access Control', category: 'Identity & Access Management', description: 'RBAC, ABAC, and authorization' },
  { name: 'Single Sign-On (SSO)', category: 'Identity & Access Management', description: 'SSO and federation' },
  { name: 'Multi-Factor Authentication', category: 'Identity & Access Management', description: 'MFA implementation and bypass techniques' },
  { name: 'Privileged Access Management', category: 'Identity & Access Management', description: 'PAM and admin access security' },
  { name: 'OAuth & OIDC', category: 'Identity & Access Management', description: 'OAuth 2.0 and OpenID Connect' },
  
  // Offensive Security
  { name: 'Penetration Testing', category: 'Offensive Security', description: 'Manual and automated penetration testing' },
  { name: 'Red Team Operations', category: 'Offensive Security', description: 'Adversary simulation and red teaming' },
  { name: 'Bug Bounty', category: 'Offensive Security', description: 'Bug bounty programs and responsible disclosure' },
  { name: 'Exploit Development', category: 'Offensive Security', description: 'Vulnerability exploitation techniques' },
  { name: 'Social Engineering', category: 'Offensive Security', description: 'Phishing, pretexting, and human manipulation' },
  { name: 'Physical Security Testing', category: 'Offensive Security', description: 'Physical penetration and access testing' },
  
  // Defensive Security
  { name: 'Security Operations Center (SOC)', category: 'Defensive Security', description: 'SOC operations and management' },
  { name: 'Incident Response', category: 'Defensive Security', description: 'IR planning, execution, and post-mortems' },
  { name: 'Threat Hunting', category: 'Defensive Security', description: 'Proactive threat detection' },
  { name: 'SIEM & Log Management', category: 'Defensive Security', description: 'Security event management and analysis' },
  { name: 'Endpoint Detection & Response', category: 'Defensive Security', description: 'EDR and endpoint security' },
  { name: 'Digital Forensics', category: 'Defensive Security', description: 'Forensic analysis and evidence handling' },
  
  // Cryptography
  { name: 'Applied Cryptography', category: 'Cryptography', description: 'Practical cryptographic implementations' },
  { name: 'PKI & Certificate Management', category: 'Cryptography', description: 'Public key infrastructure' },
  { name: 'Key Management', category: 'Cryptography', description: 'Cryptographic key lifecycle' },
  { name: 'Post-Quantum Cryptography', category: 'Cryptography', description: 'Quantum-resistant algorithms' },
  { name: 'Hardware Security Modules', category: 'Cryptography', description: 'HSM and secure key storage' },
  
  // Compliance & Governance
  { name: 'Risk Management', category: 'Compliance & Governance', description: 'Security risk assessment and management' },
  { name: 'Security Frameworks', category: 'Compliance & Governance', description: 'NIST, ISO 27001, CIS Controls' },
  { name: 'Privacy & GDPR', category: 'Compliance & Governance', description: 'Data privacy regulations' },
  { name: 'PCI DSS', category: 'Compliance & Governance', description: 'Payment card industry compliance' },
  { name: 'HIPAA', category: 'Compliance & Governance', description: 'Healthcare information security' },
  { name: 'SOC 2', category: 'Compliance & Governance', description: 'Service organization controls' },
  
  // Emerging Technologies
  { name: 'AI/ML Security', category: 'Emerging Technologies', description: 'Security of AI/ML systems and adversarial ML' },
  { name: 'Blockchain Security', category: 'Emerging Technologies', description: 'Blockchain and smart contract security' },
  { name: 'IoT Security', category: 'Emerging Technologies', description: 'Internet of Things security' },
  { name: 'Automotive Security', category: 'Emerging Technologies', description: 'Vehicle and transportation security' },
  { name: '5G Security', category: 'Emerging Technologies', description: 'Next-gen wireless security' },
  
  // DevSecOps
  { name: 'CI/CD Security', category: 'DevSecOps', description: 'Securing build and deployment pipelines' },
  { name: 'Infrastructure as Code Security', category: 'DevSecOps', description: 'Terraform, CloudFormation security' },
  { name: 'Supply Chain Security', category: 'DevSecOps', description: 'Software supply chain and dependencies' },
  { name: 'Secrets Management', category: 'DevSecOps', description: 'Secure secrets and credential storage' },
  { name: 'Security Automation', category: 'DevSecOps', description: 'Automating security processes' },
  
  // Career & Community
  { name: 'Career Development', category: 'Career & Community', description: 'Building a security career' },
  { name: 'Security Leadership', category: 'Career & Community', description: 'CISO and security management' },
  { name: 'Security Culture', category: 'Career & Community', description: 'Building security awareness' },
  { name: 'Diversity in Security', category: 'Career & Community', description: 'Inclusion and diversity initiatives' },
  { name: 'Open Source Security', category: 'Career & Community', description: 'Contributing to security OSS' },
];

async function seedTopics() {
  console.log('🏷️  Seeding topics...');
  
  const existingCount = await prisma.topic.count();
  if (existingCount > 0) {
    console.log(`   Topics already exist (${existingCount}), skipping...`);
    return;
  }
  
  const topicsData = SECURITY_TOPICS.map((topic, index) => ({
    name: topic.name,
    category: topic.category,
    description: topic.description || null,
    isActive: true,
    sortOrder: index,
    usageCount: 0,
  }));
  
  await prisma.topic.createMany({
    data: topicsData,
    skipDuplicates: true,
  });
  
  const categories = [...new Set(SECURITY_TOPICS.map(t => t.category))];
  console.log(`   ✓ Created ${SECURITY_TOPICS.length} topics in ${categories.length} categories`);
}

async function seedSiteSettings() {
  console.log('⚙️  Checking site settings...');
  
  const existing = await prisma.siteSettings.findFirst();
  if (existing) {
    console.log('   Site settings already exist, skipping...');
    return;
  }
  
  await prisma.siteSettings.create({
    data: {
      id: 'default',
      name: process.env.APP_NAME || 'CFP Directory Self-Hosted',
      description: 'Call for Papers management platform',
      federationEnabled: false,
    },
  });
  
  console.log('   ✓ Created default site settings');
}

// Email templates for all system emails
const EMAIL_TEMPLATES = [
  // Authentication
  {
    type: 'welcome',
    name: 'Welcome Email',
    category: 'authentication',
    description: 'Sent to new users when they register',
    subject: 'Welcome to {siteName}!',
    content: '<h1>Welcome to {siteName}!</h1><p>Hi {userName},</p><p>Thank you for registering. Your account has been created successfully.</p><p style="text-align: center;"><a href="{dashboardUrl}" class="button">Go to Dashboard</a></p><p>Best regards,<br>The {siteName} Team</p>',
    variables: { userName: "User's display name", userEmail: "User's email address", siteName: 'Platform name', siteUrl: 'Platform URL', dashboardUrl: 'Link to user dashboard' },
  },
  {
    type: 'password_reset',
    name: 'Password Reset',
    category: 'authentication',
    description: 'Sent when a user requests to reset their password',
    subject: 'Reset Your Password',
    content: '<h1>Reset Your Password</h1><p>Hi {userName},</p><p>We received a request to reset your password. Click the button below to choose a new password:</p><p style="text-align: center;"><a href="{resetUrl}" class="button">Reset Password</a></p><p>This link will expire in {expiresIn}.</p><p>If you didn\'t request a password reset, you can safely ignore this email.</p>',
    variables: { userName: "User's display name", resetUrl: 'Password reset link', expiresIn: 'Time until link expires', siteName: 'Platform name' },
  },
  {
    type: 'user_invitation',
    name: 'Platform Invitation',
    category: 'authentication',
    description: 'Sent when an admin invites a new user',
    subject: "You've been invited to join {siteName}",
    content: '<h1>You\'re Invited!</h1><p>Hi there,</p><p><strong>{inviterName}</strong> has invited you to join <strong>{siteName}</strong> as a {roleName}.</p><p style="text-align: center;"><a href="{inviteUrl}" class="button">Accept Invitation</a></p><p>This invitation will expire in {expiresIn}.</p>',
    variables: { inviterName: 'Inviter name', siteName: 'Platform name', roleName: 'Role being assigned', inviteUrl: 'Invitation link', expiresIn: 'Time until invitation expires' },
  },
  {
    type: 'email_verification',
    name: 'Email Verification',
    category: 'authentication',
    description: "Sent to verify a user's email address",
    subject: 'Verify your email address',
    content: '<h1>Verify Your Email</h1><p>Hi {userName},</p><p>Please verify your email address by clicking the button below:</p><p style="text-align: center;"><a href="{verifyUrl}" class="button">Verify Email</a></p><p>This link will expire in {expiresIn}.</p>',
    variables: { userName: "User's display name", verifyUrl: 'Email verification link', expiresIn: 'Time until link expires', siteName: 'Platform name' },
  },
  // Submissions
  {
    type: 'submission_confirmation',
    name: 'Submission Confirmation',
    category: 'submissions',
    description: 'Sent when a speaker submits a talk',
    subject: 'Submission Received: {submissionTitle}',
    content: '<h1>Submission Received!</h1><p>Hi {userName},</p><p>Your submission has been received for <strong>{eventName}</strong>.</p><div class="info-box"><p><strong>Talk:</strong> {submissionTitle}</p><p><strong>Status:</strong> Pending Review</p></div><p style="text-align: center;"><a href="{submissionUrl}" class="button">View Submission</a></p>',
    variables: { userName: "Speaker's name", eventName: 'Event name', submissionTitle: 'Talk title', submissionUrl: 'Link to submission', siteName: 'Platform name' },
  },
  {
    type: 'submission_accepted',
    name: 'Submission Accepted',
    category: 'submissions',
    description: 'Sent when a submission is accepted',
    subject: 'Congratulations! Your submission "{submissionTitle}" has been accepted',
    content: '<h1>Great News!</h1><p>Hi {userName},</p><p>We\'re thrilled to inform you that your submission has been <strong>accepted</strong> for <strong>{eventName}</strong>!</p><div class="info-box"><p><strong>Talk:</strong> {submissionTitle}</p></div>{feedbackSection}<p style="text-align: center;"><a href="{submissionUrl}" class="button">View Details</a></p>',
    variables: { userName: "Speaker's name", eventName: 'Event name', submissionTitle: 'Talk title', submissionUrl: 'Link to submission', feedbackSection: 'Optional feedback', siteName: 'Platform name' },
  },
  {
    type: 'submission_rejected',
    name: 'Submission Not Selected',
    category: 'submissions',
    description: 'Sent when a submission is not selected',
    subject: 'Update on your submission: {submissionTitle}',
    content: '<h1>Submission Update</h1><p>Hi {userName},</p><p>Thank you for submitting to <strong>{eventName}</strong>. After careful consideration, we regret to inform you that your submission was not selected for this event.</p><div class="info-box"><p><strong>Talk:</strong> {submissionTitle}</p></div>{feedbackSection}<p>We encourage you to submit to future events.</p>',
    variables: { userName: "Speaker's name", eventName: 'Event name', submissionTitle: 'Talk title', submissionUrl: 'Link to submission', feedbackSection: 'Optional feedback', siteName: 'Platform name' },
  },
  {
    type: 'submission_waitlisted',
    name: 'Submission Waitlisted',
    category: 'submissions',
    description: 'Sent when a submission is placed on the waitlist',
    subject: 'Your submission "{submissionTitle}" has been waitlisted',
    content: '<h1>Submission Update</h1><p>Hi {userName},</p><p>Your submission to <strong>{eventName}</strong> has been placed on our <strong>waitlist</strong>.</p><div class="info-box"><p><strong>Talk:</strong> {submissionTitle}</p></div><p>If a spot opens up, we will notify you immediately.</p>{feedbackSection}',
    variables: { userName: "Speaker's name", eventName: 'Event name', submissionTitle: 'Talk title', submissionUrl: 'Link to submission', feedbackSection: 'Optional feedback', siteName: 'Platform name' },
  },
  {
    type: 'submission_under_review',
    name: 'Submission Under Review',
    category: 'submissions',
    description: 'Sent when a submission moves to the review stage',
    subject: 'Your submission is now under review',
    content: '<h1>Review Started</h1><p>Hi {userName},</p><p>Your submission to <strong>{eventName}</strong> is now being reviewed by our team.</p><div class="info-box"><p><strong>Talk:</strong> {submissionTitle}</p></div><p>We\'ll notify you once a decision has been made.</p>',
    variables: { userName: "Speaker's name", eventName: 'Event name', submissionTitle: 'Talk title', submissionUrl: 'Link to submission', siteName: 'Platform name' },
  },
  // Communication
  {
    type: 'new_message',
    name: 'New Message',
    category: 'communication',
    description: 'Sent when someone receives a new message',
    subject: 'New message about: {submissionTitle}',
    content: '<h1>New Message</h1><p>Hi {userName},</p><p>You have a new message from <strong>{senderName}</strong>.</p><div class="info-box"><p><strong>Event:</strong> {eventName}</p><p><strong>Submission:</strong> {submissionTitle}</p></div><p style="text-align: center;"><a href="{messageUrl}" class="button">View & Reply</a></p>',
    variables: { userName: "Recipient's name", senderName: "Sender's name", eventName: 'Event name', submissionTitle: 'Talk title', messagePreview: 'Message preview', messageUrl: 'Link to message', siteName: 'Platform name' },
  },
  {
    type: 'review_invitation',
    name: 'Review Team Invitation',
    category: 'communication',
    description: "Sent when someone is added to an event's review team",
    subject: "You've been added to the review team for {eventName}",
    content: '<h1>Welcome to the Review Team!</h1><p>Hi {userName},</p><p><strong>{organizerName}</strong> has added you to the review team for <strong>{eventName}</strong>.</p><div class="info-box"><p><strong>Your Role:</strong> {roleName}</p></div><p style="text-align: center;"><a href="{eventUrl}" class="button">Start Reviewing</a></p>',
    variables: { userName: "Reviewer's name", organizerName: 'Organizer name', eventName: 'Event name', roleName: 'Role', eventUrl: 'Link to event', siteName: 'Platform name' },
  },
  {
    type: 'review_assignment',
    name: 'New Review Assignment',
    category: 'communication',
    description: 'Sent when a submission is assigned to a reviewer',
    subject: 'New submission assigned for review: {submissionTitle}',
    content: '<h1>New Review Assignment</h1><p>Hi {userName},</p><p>A new submission has been assigned to you for review.</p><div class="info-box"><p><strong>Event:</strong> {eventName}</p><p><strong>Submission:</strong> {submissionTitle}</p></div><p style="text-align: center;"><a href="{reviewUrl}" class="button">Review Now</a></p>',
    variables: { userName: "Reviewer's name", eventName: 'Event name', submissionTitle: 'Talk title', speakerName: "Speaker's name", reviewUrl: 'Link to review', deadline: 'Review deadline', siteName: 'Platform name' },
  },
  // Announcements
  {
    type: 'event_published',
    name: 'Event Published',
    category: 'announcements',
    description: 'Sent to organizers when their event is published',
    subject: '{eventName} is Now Live!',
    content: '<h1>Event Published!</h1><p>Hi {userName},</p><p>Your event <strong>{eventName}</strong> is now live and visible to the public.</p><div class="info-box"><p><strong>CFP Opens:</strong> {cfpOpensAt}</p><p><strong>CFP Closes:</strong> {cfpClosesAt}</p></div><p style="text-align: center;"><a href="{eventUrl}" class="button">View Event</a></p>',
    variables: { userName: "Organizer's name", eventName: 'Event name', cfpOpensAt: 'CFP opening date', cfpClosesAt: 'CFP closing date', eventUrl: 'Link to event', publicUrl: 'Public event URL', siteName: 'Platform name' },
  },
  {
    type: 'cfp_opening',
    name: 'CFP Opening Announcement',
    category: 'announcements',
    description: 'Announcement that CFP is now open',
    subject: 'Call for Papers Now Open: {eventName}',
    content: '<h1>Call for Papers is Open!</h1><p>Hi {userName},</p><p>The Call for Papers for <strong>{eventName}</strong> is now open!</p><div class="info-box"><p><strong>Submission Deadline:</strong> {cfpClosesAt}</p></div><p style="text-align: center;"><a href="{submitUrl}" class="button">Submit Your Talk</a></p>',
    variables: { userName: "Recipient's name", eventName: 'Event name', eventDate: 'Event date', eventLocation: 'Event location', cfpClosesAt: 'CFP closing date', submitUrl: 'Link to submit', siteName: 'Platform name' },
  },
  {
    type: 'cfp_closing_reminder',
    name: 'CFP Closing Reminder',
    category: 'announcements',
    description: 'Reminder that CFP is closing soon',
    subject: 'Reminder: CFP for {eventName} closes in {daysRemaining}',
    content: '<h1>CFP Closing Soon!</h1><p>Hi {userName},</p><p>This is a friendly reminder that the Call for Papers for <strong>{eventName}</strong> closes in <strong>{daysRemaining}</strong>.</p><div class="info-box"><p><strong>Deadline:</strong> {cfpClosesAt}</p></div><p style="text-align: center;"><a href="{submitUrl}" class="button">Submit Now</a></p>',
    variables: { userName: "Recipient's name", eventName: 'Event name', cfpClosesAt: 'CFP closing date', daysRemaining: 'Days remaining', submitUrl: 'Link to submit', siteName: 'Platform name' },
  },
  {
    type: 'event_reminder',
    name: 'Event Reminder',
    category: 'announcements',
    description: 'Reminder about upcoming event',
    subject: 'Reminder: {eventName} is coming up!',
    content: '<h1>Event Reminder</h1><p>Hi {userName},</p><p><strong>{eventName}</strong> is coming up soon!</p><div class="info-box"><p><strong>Date:</strong> {eventDate}</p><p><strong>Location:</strong> {eventLocation}</p></div><p style="text-align: center;"><a href="{eventUrl}" class="button">View Event Details</a></p>',
    variables: { userName: "Recipient's name", eventName: 'Event name', eventDate: 'Event date', eventTime: 'Event time', eventLocation: 'Event location', eventUrl: 'Link to event', siteName: 'Platform name' },
  },
];

async function seedEmailTemplates() {
  console.log('📧 Seeding email templates...');
  
  const existingCount = await prisma.emailTemplate.count();
  if (existingCount > 0) {
    console.log(`   Email templates already exist (${existingCount}), skipping...`);
    return;
  }
  
  const templatesData = EMAIL_TEMPLATES.map(template => ({
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
    data: templatesData,
    skipDuplicates: true,
  });
  
  const categories = [...new Set(EMAIL_TEMPLATES.map(t => t.category))];
  console.log(`   ✓ Created ${EMAIL_TEMPLATES.length} email templates in ${categories.length} categories`);
}

async function main() {
  console.log('🌱 Seeding essential data...\n');
  
  await seedTopics();
  await seedSiteSettings();
  await seedEmailTemplates();
  
  console.log('\n✅ Essential data seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
