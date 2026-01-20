/**
 * Security Topics Seed Data
 * 
 * ~300 security-focused topics organized by category.
 * Used for: Speaker expertise, Talk tags, Reviewer expertise, Event topics
 */

export interface TopicSeed {
  name: string;
  category: string;
  description?: string;
}

export const SECURITY_TOPICS: TopicSeed[] = [
  // ==========================================================================
  // CORE SECURITY (~40 topics)
  // ==========================================================================
  { name: 'Application Security', category: 'Core Security', description: 'Securing applications throughout the SDLC' },
  { name: 'Network Security', category: 'Core Security', description: 'Protecting network infrastructure and communications' },
  { name: 'Cloud Security', category: 'Core Security', description: 'Security in cloud computing environments' },
  { name: 'Web Security', category: 'Core Security', description: 'Securing web applications and services' },
  { name: 'Mobile Security', category: 'Core Security', description: 'Security for mobile applications and devices' },
  { name: 'API Security', category: 'Core Security', description: 'Securing APIs and microservices' },
  { name: 'Database Security', category: 'Core Security', description: 'Protecting databases and data stores' },
  { name: 'Endpoint Security', category: 'Core Security', description: 'Securing endpoints and workstations' },
  { name: 'Identity Security', category: 'Core Security', description: 'Identity and access management security' },
  { name: 'Access Control', category: 'Core Security', description: 'Authorization and access control mechanisms' },
  { name: 'Zero Trust Security', category: 'Core Security', description: 'Zero trust architecture and implementation' },
  { name: 'Defense in Depth', category: 'Core Security', description: 'Layered security approach' },
  { name: 'Security Architecture', category: 'Core Security', description: 'Designing secure systems and architectures' },
  { name: 'Security Engineering', category: 'Core Security', description: 'Building security into systems' },
  { name: 'Security Operations', category: 'Core Security', description: 'Day-to-day security operations (SecOps)' },
  { name: 'Security Monitoring', category: 'Core Security', description: 'Continuous security monitoring and alerting' },
  { name: 'Incident Response', category: 'Core Security', description: 'Responding to security incidents' },
  { name: 'Digital Forensics', category: 'Core Security', description: 'Investigating security incidents' },
  { name: 'Vulnerability Assessment', category: 'Core Security', description: 'Identifying security vulnerabilities' },
  { name: 'Security Testing', category: 'Core Security', description: 'Testing security controls and defenses' },
  { name: 'Security Auditing', category: 'Core Security', description: 'Auditing security posture and compliance' },
  { name: 'Risk Assessment', category: 'Core Security', description: 'Assessing and quantifying security risks' },
  { name: 'Data Security', category: 'Core Security', description: 'Protecting data at rest and in transit' },
  { name: 'Data Protection', category: 'Core Security', description: 'Safeguarding sensitive information' },
  { name: 'Data Loss Prevention', category: 'Core Security', description: 'Preventing data exfiltration (DLP)' },
  { name: 'Information Security', category: 'Core Security', description: 'Protecting information assets' },
  { name: 'Email Security', category: 'Core Security', description: 'Securing email communications' },
  { name: 'Browser Security', category: 'Core Security', description: 'Web browser security and hardening' },
  { name: 'DNS Security', category: 'Core Security', description: 'Securing DNS infrastructure' },
  { name: 'TLS/SSL Security', category: 'Core Security', description: 'Transport layer security' },
  { name: 'Authentication', category: 'Core Security', description: 'Verifying user and system identity' },
  { name: 'Authorization', category: 'Core Security', description: 'Managing permissions and access rights' },
  { name: 'Single Sign-On (SSO)', category: 'Core Security', description: 'SSO implementation and security' },
  { name: 'Multi-Factor Authentication', category: 'Core Security', description: 'MFA implementation and bypass techniques' },
  { name: 'Secrets Management', category: 'Core Security', description: 'Managing credentials and secrets' },
  { name: 'Key Management', category: 'Core Security', description: 'Cryptographic key lifecycle management' },
  { name: 'Certificate Management', category: 'Core Security', description: 'Managing digital certificates' },
  { name: 'PKI', category: 'Core Security', description: 'Public Key Infrastructure' },
  { name: 'Security Automation', category: 'Core Security', description: 'Automating security processes' },
  { name: 'Security Orchestration', category: 'Core Security', description: 'Orchestrating security tools and workflows' },
  { name: 'SOAR', category: 'Core Security', description: 'Security Orchestration, Automation and Response' },

  // ==========================================================================
  // OFFENSIVE SECURITY (~35 topics)
  // ==========================================================================
  { name: 'Penetration Testing', category: 'Offensive Security', description: 'Authorized security testing' },
  { name: 'Red Teaming', category: 'Offensive Security', description: 'Adversarial attack simulation' },
  { name: 'Purple Teaming', category: 'Offensive Security', description: 'Collaborative red/blue team exercises' },
  { name: 'Adversary Simulation', category: 'Offensive Security', description: 'Simulating real-world threat actors' },
  { name: 'Ethical Hacking', category: 'Offensive Security', description: 'Authorized hacking for security improvement' },
  { name: 'Bug Bounty', category: 'Offensive Security', description: 'Bug bounty programs and hunting' },
  { name: 'Vulnerability Research', category: 'Offensive Security', description: 'Discovering new vulnerabilities' },
  { name: 'Exploit Development', category: 'Offensive Security', description: 'Creating exploits for vulnerabilities' },
  { name: 'Social Engineering', category: 'Offensive Security', description: 'Human-focused attack techniques' },
  { name: 'Phishing', category: 'Offensive Security', description: 'Phishing attacks and simulations' },
  { name: 'Vishing', category: 'Offensive Security', description: 'Voice-based social engineering' },
  { name: 'Physical Security Testing', category: 'Offensive Security', description: 'Testing physical security controls' },
  { name: 'Web Application Hacking', category: 'Offensive Security', description: 'Attacking web applications' },
  { name: 'API Hacking', category: 'Offensive Security', description: 'Attacking APIs and web services' },
  { name: 'Mobile App Hacking', category: 'Offensive Security', description: 'Attacking mobile applications' },
  { name: 'IoT Hacking', category: 'Offensive Security', description: 'Attacking IoT devices and systems' },
  { name: 'Network Penetration Testing', category: 'Offensive Security', description: 'Network-level security testing' },
  { name: 'Wireless Hacking', category: 'Offensive Security', description: 'Attacking wireless networks' },
  { name: 'Bluetooth Hacking', category: 'Offensive Security', description: 'Bluetooth security testing' },
  { name: 'Active Directory Attacks', category: 'Offensive Security', description: 'Attacking AD environments' },
  { name: 'Kerberos Attacks', category: 'Offensive Security', description: 'Kerberos protocol attacks' },
  { name: 'LDAP Attacks', category: 'Offensive Security', description: 'LDAP injection and attacks' },
  { name: 'Cloud Penetration Testing', category: 'Offensive Security', description: 'Testing cloud environments' },
  { name: 'AWS Security Testing', category: 'Offensive Security', description: 'AWS-specific security testing' },
  { name: 'Azure Security Testing', category: 'Offensive Security', description: 'Azure-specific security testing' },
  { name: 'Container Escape', category: 'Offensive Security', description: 'Escaping container isolation' },
  { name: 'Kubernetes Attacks', category: 'Offensive Security', description: 'Attacking Kubernetes clusters' },
  { name: 'Serverless Attacks', category: 'Offensive Security', description: 'Attacking serverless functions' },
  { name: 'Binary Exploitation', category: 'Offensive Security', description: 'Exploiting binary vulnerabilities' },
  { name: 'Buffer Overflow', category: 'Offensive Security', description: 'Buffer overflow exploitation' },
  { name: 'Return-Oriented Programming', category: 'Offensive Security', description: 'ROP chain development' },
  { name: 'Malware Development', category: 'Offensive Security', description: 'Creating malware for research' },
  { name: 'Payload Development', category: 'Offensive Security', description: 'Developing attack payloads' },
  { name: 'Evasion Techniques', category: 'Offensive Security', description: 'Bypassing security controls' },
  { name: 'OSINT', category: 'Offensive Security', description: 'Open Source Intelligence gathering' },
  { name: 'Reconnaissance', category: 'Offensive Security', description: 'Information gathering techniques' },
  { name: 'Footprinting', category: 'Offensive Security', description: 'Target enumeration and mapping' },

  // ==========================================================================
  // DEFENSIVE SECURITY (~35 topics)
  // ==========================================================================
  { name: 'Blue Team', category: 'Defensive Security', description: 'Defensive security operations' },
  { name: 'Security Operations Center', category: 'Defensive Security', description: 'SOC operations and management' },
  { name: 'SIEM', category: 'Defensive Security', description: 'Security Information and Event Management' },
  { name: 'Log Management', category: 'Defensive Security', description: 'Centralized logging and analysis' },
  { name: 'Detection Engineering', category: 'Defensive Security', description: 'Building detection capabilities' },
  { name: 'Threat Detection', category: 'Defensive Security', description: 'Identifying threats and attacks' },
  { name: 'Anomaly Detection', category: 'Defensive Security', description: 'Detecting unusual behavior' },
  { name: 'Threat Hunting', category: 'Defensive Security', description: 'Proactive threat discovery' },
  { name: 'Proactive Defense', category: 'Defensive Security', description: 'Proactive security measures' },
  { name: 'Cyber Threat Intelligence', category: 'Defensive Security', description: 'CTI collection and analysis' },
  { name: 'Memory Forensics', category: 'Defensive Security', description: 'Analyzing volatile memory' },
  { name: 'Disk Forensics', category: 'Defensive Security', description: 'Analyzing storage media' },
  { name: 'Network Forensics', category: 'Defensive Security', description: 'Analyzing network traffic' },
  { name: 'Malware Analysis', category: 'Defensive Security', description: 'Analyzing malicious software' },
  { name: 'Reverse Engineering', category: 'Defensive Security', description: 'Analyzing compiled code' },
  { name: 'Static Analysis', category: 'Defensive Security', description: 'Analyzing code without execution' },
  { name: 'Dynamic Analysis', category: 'Defensive Security', description: 'Analyzing code during execution' },
  { name: 'EDR', category: 'Defensive Security', description: 'Endpoint Detection and Response' },
  { name: 'NDR', category: 'Defensive Security', description: 'Network Detection and Response' },
  { name: 'XDR', category: 'Defensive Security', description: 'Extended Detection and Response' },
  { name: 'Intrusion Detection', category: 'Defensive Security', description: 'IDS implementation and tuning' },
  { name: 'Intrusion Prevention', category: 'Defensive Security', description: 'IPS implementation and tuning' },
  { name: 'Firewall Management', category: 'Defensive Security', description: 'Firewall configuration and management' },
  { name: 'WAF', category: 'Defensive Security', description: 'Web Application Firewall' },
  { name: 'DDoS Mitigation', category: 'Defensive Security', description: 'Defending against DDoS attacks' },
  { name: 'Log Analysis', category: 'Defensive Security', description: 'Analyzing security logs' },
  { name: 'Alert Triage', category: 'Defensive Security', description: 'Prioritizing and investigating alerts' },
  { name: 'Vulnerability Management', category: 'Defensive Security', description: 'Managing vulnerabilities at scale' },
  { name: 'Patch Management', category: 'Defensive Security', description: 'Managing security patches' },
  { name: 'Asset Management', category: 'Defensive Security', description: 'Tracking and securing assets' },
  { name: 'Threat Modeling', category: 'Defensive Security', description: 'Identifying and analyzing threats' },
  { name: 'Attack Surface Management', category: 'Defensive Security', description: 'Managing attack surface' },
  { name: 'Risk Mitigation', category: 'Defensive Security', description: 'Reducing security risks' },
  { name: 'Security Hardening', category: 'Defensive Security', description: 'System and application hardening' },
  { name: 'Deception Technology', category: 'Defensive Security', description: 'Honeypots and deception' },

  // ==========================================================================
  // CRYPTOGRAPHY & PRIVACY (~20 topics)
  // ==========================================================================
  { name: 'Cryptography', category: 'Cryptography & Privacy', description: 'Cryptographic principles and applications' },
  { name: 'Cryptanalysis', category: 'Cryptography & Privacy', description: 'Breaking cryptographic systems' },
  { name: 'Applied Cryptography', category: 'Cryptography & Privacy', description: 'Practical cryptography implementation' },
  { name: 'Encryption', category: 'Cryptography & Privacy', description: 'Data encryption techniques' },
  { name: 'Symmetric Encryption', category: 'Cryptography & Privacy', description: 'Symmetric key algorithms' },
  { name: 'Asymmetric Encryption', category: 'Cryptography & Privacy', description: 'Public key cryptography' },
  { name: 'Hashing', category: 'Cryptography & Privacy', description: 'Cryptographic hash functions' },
  { name: 'Digital Signatures', category: 'Cryptography & Privacy', description: 'Digital signature schemes' },
  { name: 'Message Authentication', category: 'Cryptography & Privacy', description: 'MACs and integrity verification' },
  { name: 'Certificate Authority', category: 'Cryptography & Privacy', description: 'CA operations and security' },
  { name: 'X.509', category: 'Cryptography & Privacy', description: 'X.509 certificates and PKI' },
  { name: 'Privacy Engineering', category: 'Cryptography & Privacy', description: 'Building privacy into systems' },
  { name: 'Privacy by Design', category: 'Cryptography & Privacy', description: 'Privacy-first architecture' },
  { name: 'Data Anonymization', category: 'Cryptography & Privacy', description: 'Anonymizing personal data' },
  { name: 'Differential Privacy', category: 'Cryptography & Privacy', description: 'Mathematical privacy guarantees' },
  { name: 'Homomorphic Encryption', category: 'Cryptography & Privacy', description: 'Computing on encrypted data' },
  { name: 'Secure Multi-Party Computation', category: 'Cryptography & Privacy', description: 'Distributed computation privacy' },
  { name: 'Blockchain Security', category: 'Cryptography & Privacy', description: 'Blockchain protocol security' },
  { name: 'Smart Contract Security', category: 'Cryptography & Privacy', description: 'Securing smart contracts' },
  { name: 'DeFi Security', category: 'Cryptography & Privacy', description: 'Decentralized finance security' },
  { name: 'Post-Quantum Cryptography', category: 'Cryptography & Privacy', description: 'Quantum-resistant algorithms' },
  { name: 'Quantum-Safe Algorithms', category: 'Cryptography & Privacy', description: 'Preparing for quantum threats' },

  // ==========================================================================
  // INFRASTRUCTURE SECURITY (~30 topics)
  // ==========================================================================
  { name: 'Container Security', category: 'Infrastructure Security', description: 'Securing containers and images' },
  { name: 'Docker Security', category: 'Infrastructure Security', description: 'Docker-specific security' },
  { name: 'Kubernetes Security', category: 'Infrastructure Security', description: 'K8s security best practices' },
  { name: 'K8s Security', category: 'Infrastructure Security', description: 'Kubernetes hardening and monitoring' },
  { name: 'Cloud Native Security', category: 'Infrastructure Security', description: 'Cloud-native security patterns' },
  { name: 'Serverless Security', category: 'Infrastructure Security', description: 'Securing serverless workloads' },
  { name: 'Microservices Security', category: 'Infrastructure Security', description: 'Securing microservices architectures' },
  { name: 'Infrastructure as Code Security', category: 'Infrastructure Security', description: 'Securing IaC templates' },
  { name: 'Terraform Security', category: 'Infrastructure Security', description: 'Terraform security scanning' },
  { name: 'CloudFormation Security', category: 'Infrastructure Security', description: 'AWS CloudFormation security' },
  { name: 'CI/CD Security', category: 'Infrastructure Security', description: 'Securing CI/CD pipelines' },
  { name: 'Pipeline Security', category: 'Infrastructure Security', description: 'Build pipeline hardening' },
  { name: 'Build Security', category: 'Infrastructure Security', description: 'Securing build systems' },
  { name: 'Artifact Security', category: 'Infrastructure Security', description: 'Securing build artifacts' },
  { name: 'AWS Security', category: 'Infrastructure Security', description: 'Amazon Web Services security' },
  { name: 'Azure Security', category: 'Infrastructure Security', description: 'Microsoft Azure security' },
  { name: 'GCP Security', category: 'Infrastructure Security', description: 'Google Cloud Platform security' },
  { name: 'Multi-Cloud Security', category: 'Infrastructure Security', description: 'Securing multi-cloud environments' },
  { name: 'Virtual Machine Security', category: 'Infrastructure Security', description: 'VM security and isolation' },
  { name: 'Hypervisor Security', category: 'Infrastructure Security', description: 'Hypervisor hardening' },
  { name: 'VMware Security', category: 'Infrastructure Security', description: 'VMware environment security' },
  { name: 'Network Segmentation', category: 'Infrastructure Security', description: 'Network isolation strategies' },
  { name: 'Micro-Segmentation', category: 'Infrastructure Security', description: 'Fine-grained network segmentation' },
  { name: 'SDN Security', category: 'Infrastructure Security', description: 'Software-defined networking security' },
  { name: 'BGP Security', category: 'Infrastructure Security', description: 'Border Gateway Protocol security' },
  { name: 'Hardware Security Module', category: 'Infrastructure Security', description: 'HSM implementation and management' },
  { name: 'TPM', category: 'Infrastructure Security', description: 'Trusted Platform Module security' },
  { name: 'Firmware Security', category: 'Infrastructure Security', description: 'Firmware analysis and security' },
  { name: 'BIOS/UEFI Security', category: 'Infrastructure Security', description: 'Boot-level security' },
  { name: 'Secure Boot', category: 'Infrastructure Security', description: 'Secure boot implementation' },

  // ==========================================================================
  // IoT & OT SECURITY (~25 topics)
  // ==========================================================================
  { name: 'IoT Security', category: 'IoT & OT Security', description: 'Internet of Things security' },
  { name: 'Embedded Systems Security', category: 'IoT & OT Security', description: 'Securing embedded devices' },
  { name: 'Industrial IoT Security', category: 'IoT & OT Security', description: 'IIoT security challenges' },
  { name: 'OT Security', category: 'IoT & OT Security', description: 'Operational Technology security' },
  { name: 'ICS Security', category: 'IoT & OT Security', description: 'Industrial Control Systems security' },
  { name: 'SCADA Security', category: 'IoT & OT Security', description: 'SCADA system security' },
  { name: 'PLC Security', category: 'IoT & OT Security', description: 'Programmable Logic Controller security' },
  { name: 'Smart Grid Security', category: 'IoT & OT Security', description: 'Power grid cybersecurity' },
  { name: 'Building Automation Security', category: 'IoT & OT Security', description: 'BAS/BMS security' },
  { name: 'Medical Device Security', category: 'IoT & OT Security', description: 'Healthcare device security' },
  { name: 'Automotive Security', category: 'IoT & OT Security', description: 'Vehicle cybersecurity' },
  { name: 'Connected Car Security', category: 'IoT & OT Security', description: 'Connected vehicle security' },
  { name: 'V2X Security', category: 'IoT & OT Security', description: 'Vehicle-to-everything communication security' },
  { name: 'Drone Security', category: 'IoT & OT Security', description: 'UAV and drone security' },
  { name: 'Robotics Security', category: 'IoT & OT Security', description: 'Industrial robot security' },
  { name: 'Sensor Security', category: 'IoT & OT Security', description: 'Sensor network security' },
  { name: 'Protocol Analysis', category: 'IoT & OT Security', description: 'Industrial protocol analysis' },
  { name: 'Modbus Security', category: 'IoT & OT Security', description: 'Modbus protocol security' },
  { name: 'OPC UA Security', category: 'IoT & OT Security', description: 'OPC Unified Architecture security' },
  { name: 'MQTT Security', category: 'IoT & OT Security', description: 'MQTT protocol security' },
  { name: 'CoAP Security', category: 'IoT & OT Security', description: 'Constrained Application Protocol security' },
  { name: 'Zigbee Security', category: 'IoT & OT Security', description: 'Zigbee protocol security' },
  { name: 'LoRaWAN Security', category: 'IoT & OT Security', description: 'LoRaWAN network security' },
  { name: 'Hardware Hacking', category: 'IoT & OT Security', description: 'Physical device security testing' },
  { name: 'Side-Channel Attacks', category: 'IoT & OT Security', description: 'Power and timing attacks' },

  // ==========================================================================
  // DEVELOPMENT & DEVSECOPS (~25 topics)
  // ==========================================================================
  { name: 'Secure Coding', category: 'Development & DevSecOps', description: 'Writing secure code' },
  { name: 'Secure Development Lifecycle', category: 'Development & DevSecOps', description: 'Security throughout SDLC' },
  { name: 'Security by Design', category: 'Development & DevSecOps', description: 'Building security from the start' },
  { name: 'DevSecOps', category: 'Development & DevSecOps', description: 'Integrating security into DevOps' },
  { name: 'Shift Left Security', category: 'Development & DevSecOps', description: 'Early security testing' },
  { name: 'Security Champions', category: 'Development & DevSecOps', description: 'Developer security advocates' },
  { name: 'SAST', category: 'Development & DevSecOps', description: 'Static Application Security Testing' },
  { name: 'DAST', category: 'Development & DevSecOps', description: 'Dynamic Application Security Testing' },
  { name: 'IAST', category: 'Development & DevSecOps', description: 'Interactive Application Security Testing' },
  { name: 'RASP', category: 'Development & DevSecOps', description: 'Runtime Application Self-Protection' },
  { name: 'Software Composition Analysis', category: 'Development & DevSecOps', description: 'SCA and dependency scanning' },
  { name: 'Dependency Security', category: 'Development & DevSecOps', description: 'Managing vulnerable dependencies' },
  { name: 'SBOM', category: 'Development & DevSecOps', description: 'Software Bill of Materials' },
  { name: 'Code Review', category: 'Development & DevSecOps', description: 'Security code review practices' },
  { name: 'Secure Code Review', category: 'Development & DevSecOps', description: 'Manual security code analysis' },
  { name: 'Automated Security Testing', category: 'Development & DevSecOps', description: 'CI/CD security automation' },
  { name: 'API Security Testing', category: 'Development & DevSecOps', description: 'Testing API security' },
  { name: 'GraphQL Security', category: 'Development & DevSecOps', description: 'GraphQL-specific security' },
  { name: 'REST API Security', category: 'Development & DevSecOps', description: 'RESTful API security' },
  { name: 'OWASP Top 10', category: 'Development & DevSecOps', description: 'OWASP web vulnerabilities' },
  { name: 'OWASP API Top 10', category: 'Development & DevSecOps', description: 'OWASP API vulnerabilities' },
  { name: 'JavaScript Security', category: 'Development & DevSecOps', description: 'JavaScript/Node.js security' },
  { name: 'Python Security', category: 'Development & DevSecOps', description: 'Python application security' },
  { name: 'Go Security', category: 'Development & DevSecOps', description: 'Go/Golang security' },
  { name: 'Rust Security', category: 'Development & DevSecOps', description: 'Rust memory safety and security' },
  { name: 'Java Security', category: 'Development & DevSecOps', description: 'Java application security' },

  // ==========================================================================
  // COMPLIANCE & GOVERNANCE (~25 topics)
  // ==========================================================================
  { name: 'Compliance', category: 'Compliance & Governance', description: 'Security compliance management' },
  { name: 'Regulatory Compliance', category: 'Compliance & Governance', description: 'Meeting regulatory requirements' },
  { name: 'Audit Readiness', category: 'Compliance & Governance', description: 'Preparing for security audits' },
  { name: 'ISO 27001', category: 'Compliance & Governance', description: 'ISO 27001 implementation' },
  { name: 'ISO 27002', category: 'Compliance & Governance', description: 'ISO 27002 controls' },
  { name: 'SOC 2', category: 'Compliance & Governance', description: 'SOC 2 compliance' },
  { name: 'SOC 1', category: 'Compliance & Governance', description: 'SOC 1 compliance' },
  { name: 'GDPR', category: 'Compliance & Governance', description: 'EU General Data Protection Regulation' },
  { name: 'CCPA', category: 'Compliance & Governance', description: 'California Consumer Privacy Act' },
  { name: 'Privacy Regulations', category: 'Compliance & Governance', description: 'Global privacy laws' },
  { name: 'PCI DSS', category: 'Compliance & Governance', description: 'Payment Card Industry compliance' },
  { name: 'Payment Security', category: 'Compliance & Governance', description: 'Securing payment systems' },
  { name: 'HIPAA', category: 'Compliance & Governance', description: 'Healthcare data protection' },
  { name: 'Healthcare Security', category: 'Compliance & Governance', description: 'Healthcare industry security' },
  { name: 'NIST Cybersecurity Framework', category: 'Compliance & Governance', description: 'NIST CSF implementation' },
  { name: 'NIST 800-53', category: 'Compliance & Governance', description: 'NIST security controls' },
  { name: 'NIST 800-171', category: 'Compliance & Governance', description: 'CUI protection requirements' },
  { name: 'CIS Controls', category: 'Compliance & Governance', description: 'CIS Critical Security Controls' },
  { name: 'CIS Benchmarks', category: 'Compliance & Governance', description: 'CIS configuration benchmarks' },
  { name: 'FedRAMP', category: 'Compliance & Governance', description: 'Federal cloud authorization' },
  { name: 'Government Security', category: 'Compliance & Governance', description: 'Public sector security' },
  { name: 'Risk Management', category: 'Compliance & Governance', description: 'Enterprise risk management' },
  { name: 'Risk Quantification', category: 'Compliance & Governance', description: 'Measuring cyber risk' },
  { name: 'Security Governance', category: 'Compliance & Governance', description: 'Security program governance' },
  { name: 'Security Policy', category: 'Compliance & Governance', description: 'Developing security policies' },
  { name: 'Third-Party Risk', category: 'Compliance & Governance', description: 'Vendor risk management' },
  { name: 'Supply Chain Risk', category: 'Compliance & Governance', description: 'Supply chain security' },

  // ==========================================================================
  // EMERGING TECHNOLOGIES (~25 topics)
  // ==========================================================================
  { name: 'AI Security', category: 'Emerging Technologies', description: 'Securing AI systems' },
  { name: 'Machine Learning Security', category: 'Emerging Technologies', description: 'ML model security' },
  { name: 'LLM Security', category: 'Emerging Technologies', description: 'Large Language Model security' },
  { name: 'AI for Security', category: 'Emerging Technologies', description: 'Using AI for security' },
  { name: 'ML for Threat Detection', category: 'Emerging Technologies', description: 'ML-based threat detection' },
  { name: 'Adversarial Machine Learning', category: 'Emerging Technologies', description: 'Attacking ML models' },
  { name: 'Model Security', category: 'Emerging Technologies', description: 'Protecting ML models' },
  { name: 'Data Poisoning', category: 'Emerging Technologies', description: 'Training data attacks' },
  { name: 'Prompt Injection', category: 'Emerging Technologies', description: 'LLM prompt attacks' },
  { name: 'Quantum Computing Security', category: 'Emerging Technologies', description: 'Quantum threats and defense' },
  { name: 'Quantum Key Distribution', category: 'Emerging Technologies', description: 'QKD implementation' },
  { name: '5G Security', category: 'Emerging Technologies', description: '5G network security' },
  { name: 'Telecommunications Security', category: 'Emerging Technologies', description: 'Telecom infrastructure security' },
  { name: 'Mobile Network Security', category: 'Emerging Technologies', description: 'Cellular network security' },
  { name: 'Space Security', category: 'Emerging Technologies', description: 'Satellite and space systems' },
  { name: 'Satellite Security', category: 'Emerging Technologies', description: 'Satellite communication security' },
  { name: 'Extended Reality Security', category: 'Emerging Technologies', description: 'XR/VR/AR security' },
  { name: 'Metaverse Security', category: 'Emerging Technologies', description: 'Virtual world security' },
  { name: 'Web3 Security', category: 'Emerging Technologies', description: 'Web3 and decentralized app security' },
  { name: 'Cryptocurrency Security', category: 'Emerging Technologies', description: 'Crypto wallet and exchange security' },
  { name: 'NFT Security', category: 'Emerging Technologies', description: 'Non-fungible token security' },
  { name: 'Edge Computing Security', category: 'Emerging Technologies', description: 'Edge infrastructure security' },
  { name: 'Confidential Computing', category: 'Emerging Technologies', description: 'TEE and secure enclaves' },
  { name: 'Zero Knowledge Proofs', category: 'Emerging Technologies', description: 'ZK proof applications' },

  // ==========================================================================
  // INDUSTRY SPECIFIC (~30 topics)
  // ==========================================================================
  { name: 'Financial Services Security', category: 'Industry Specific', description: 'Banking and finance security' },
  { name: 'Banking Security', category: 'Industry Specific', description: 'Bank cybersecurity' },
  { name: 'FinTech Security', category: 'Industry Specific', description: 'Financial technology security' },
  { name: 'Insurance Security', category: 'Industry Specific', description: 'Insurance industry security' },
  { name: 'Retail Security', category: 'Industry Specific', description: 'Retail industry security' },
  { name: 'E-commerce Security', category: 'Industry Specific', description: 'Online store security' },
  { name: 'Point of Sale Security', category: 'Industry Specific', description: 'POS system security' },
  { name: 'Manufacturing Security', category: 'Industry Specific', description: 'Manufacturing cybersecurity' },
  { name: 'Energy Sector Security', category: 'Industry Specific', description: 'Energy industry security' },
  { name: 'Power Grid Security', category: 'Industry Specific', description: 'Electrical grid protection' },
  { name: 'Oil and Gas Security', category: 'Industry Specific', description: 'Oil & gas industry security' },
  { name: 'Transportation Security', category: 'Industry Specific', description: 'Transportation sector security' },
  { name: 'Aviation Security', category: 'Industry Specific', description: 'Aviation cybersecurity' },
  { name: 'Maritime Security', category: 'Industry Specific', description: 'Maritime cybersecurity' },
  { name: 'Railway Security', category: 'Industry Specific', description: 'Rail system security' },
  { name: 'Defense Security', category: 'Industry Specific', description: 'Defense industry security' },
  { name: 'Public Sector Security', category: 'Industry Specific', description: 'Government cybersecurity' },
  { name: 'Education Security', category: 'Industry Specific', description: 'Educational institution security' },
  { name: 'EdTech Security', category: 'Industry Specific', description: 'Education technology security' },
  { name: 'Legal Industry Security', category: 'Industry Specific', description: 'Law firm security' },
  { name: 'Media Security', category: 'Industry Specific', description: 'Media industry security' },
  { name: 'Entertainment Security', category: 'Industry Specific', description: 'Entertainment sector security' },
  { name: 'Hospitality Security', category: 'Industry Specific', description: 'Hotel and hospitality security' },
  { name: 'Real Estate Security', category: 'Industry Specific', description: 'Real estate industry security' },
  { name: 'Nonprofit Security', category: 'Industry Specific', description: 'Nonprofit organization security' },
  { name: 'Small Business Security', category: 'Industry Specific', description: 'SMB cybersecurity' },
  { name: 'Startup Security', category: 'Industry Specific', description: 'Startup security programs' },
  { name: 'Enterprise Security', category: 'Industry Specific', description: 'Large enterprise security' },

  // ==========================================================================
  // RESEARCH & ACADEMIA (~20 topics)
  // ==========================================================================
  { name: 'Security Research', category: 'Research & Academia', description: 'Academic and industry research' },
  { name: 'Zero-Day Research', category: 'Research & Academia', description: 'Discovering zero-day vulnerabilities' },
  { name: 'Academic Security Research', category: 'Research & Academia', description: 'University research programs' },
  { name: 'Security Conferences', category: 'Research & Academia', description: 'Research conference community' },
  { name: 'Research Publications', category: 'Research & Academia', description: 'Publishing security research' },
  { name: 'Responsible Disclosure', category: 'Research & Academia', description: 'Ethical vulnerability disclosure' },
  { name: 'Coordinated Disclosure', category: 'Research & Academia', description: 'Working with vendors' },
  { name: 'Proof of Concept', category: 'Research & Academia', description: 'PoC development' },
  { name: 'Exploit Research', category: 'Research & Academia', description: 'Exploit technique research' },
  { name: 'Binary Analysis', category: 'Research & Academia', description: 'Analyzing compiled binaries' },
  { name: 'Source Code Analysis', category: 'Research & Academia', description: 'Analyzing source code' },
  { name: 'Fuzz Testing', category: 'Research & Academia', description: 'Fuzzing techniques' },
  { name: 'Coverage-Guided Fuzzing', category: 'Research & Academia', description: 'Advanced fuzzing methods' },
  { name: 'Symbolic Execution', category: 'Research & Academia', description: 'Symbolic analysis techniques' },
  { name: 'Timing Attacks', category: 'Research & Academia', description: 'Timing side channels' },
  { name: 'Power Analysis', category: 'Research & Academia', description: 'Power side channel attacks' },
  { name: 'Security Economics', category: 'Research & Academia', description: 'Economics of cybersecurity' },
  { name: 'Cybercrime Research', category: 'Research & Academia', description: 'Studying cybercriminal activities' },
  { name: 'Underground Markets', category: 'Research & Academia', description: 'Dark web research' },
  { name: 'Attribution', category: 'Research & Academia', description: 'Threat actor attribution' },

  // ==========================================================================
  // LEADERSHIP & STRATEGY (~15 topics)
  // ==========================================================================
  { name: 'Security Leadership', category: 'Leadership & Strategy', description: 'Leading security teams' },
  { name: 'CISO Leadership', category: 'Leadership & Strategy', description: 'Chief Information Security Officer' },
  { name: 'Security Management', category: 'Leadership & Strategy', description: 'Managing security programs' },
  { name: 'Security Strategy', category: 'Leadership & Strategy', description: 'Strategic security planning' },
  { name: 'Security Roadmap', category: 'Leadership & Strategy', description: 'Building security roadmaps' },
  { name: 'Security Program', category: 'Leadership & Strategy', description: 'Building security programs' },
  { name: 'Security Maturity', category: 'Leadership & Strategy', description: 'Maturing security capabilities' },
  { name: 'Security Metrics', category: 'Leadership & Strategy', description: 'Measuring security effectiveness' },
  { name: 'Security Culture', category: 'Leadership & Strategy', description: 'Building security awareness' },
  { name: 'Security Awareness', category: 'Leadership & Strategy', description: 'User security training' },
  { name: 'Security Training', category: 'Leadership & Strategy', description: 'Security education programs' },
  { name: 'Security Budget', category: 'Leadership & Strategy', description: 'Security investment planning' },
  { name: 'Board Communication', category: 'Leadership & Strategy', description: 'Reporting to executives' },
  { name: 'Security Hiring', category: 'Leadership & Strategy', description: 'Building security teams' },
  { name: 'Security Career', category: 'Leadership & Strategy', description: 'Career development in security' },
];

/**
 * Get topics organized by category
 */
export function getTopicsByCategory(): Record<string, TopicSeed[]> {
  return SECURITY_TOPICS.reduce((acc, topic) => {
    if (!acc[topic.category]) {
      acc[topic.category] = [];
    }
    acc[topic.category].push(topic);
    return acc;
  }, {} as Record<string, TopicSeed[]>);
}

/**
 * Get all unique categories
 */
export function getCategories(): string[] {
  return [...new Set(SECURITY_TOPICS.map(t => t.category))];
}

/**
 * Get topic count
 */
export function getTopicCount(): number {
  return SECURITY_TOPICS.length;
}
