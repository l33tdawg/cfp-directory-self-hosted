/**
 * Topics-Only Seed Script (Production Safe)
 * 
 * This script seeds only the essential topics/categories.
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

async function main() {
  console.log('🌱 Seeding essential data...\n');
  
  await seedTopics();
  await seedSiteSettings();
  
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
