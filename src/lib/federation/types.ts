/**
 * Federation Types
 * 
 * Types for communication with cfp.directory's federation API.
 */

// =============================================================================
// License Types
// =============================================================================

export type LicenseTier = 'starter' | 'professional' | 'enterprise';
export type LicenseStatus = 'active' | 'expired' | 'suspended' | 'invalid';

export interface LicenseInfo {
  id: string;
  tier: LicenseTier;
  status: LicenseStatus;
  organizationName: string;
  features: LicenseFeatures;
  limits: LicenseLimits;
  expiresAt: string | null;
  issuedAt: string;
}

export interface LicenseFeatures {
  federatedEvents: boolean;
  speakerProfiles: boolean;
  bidirectionalMessaging: boolean;
  materialsSync: boolean;
  webhooks: boolean;
  prioritySupport: boolean;
  customBranding: boolean;
  analyticsExport: boolean;
}

export interface LicenseLimits {
  maxFederatedEvents: number | null; // null = unlimited
  maxSubmissionsPerMonth: number | null;
  maxActiveEvents: number | null;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ValidateLicenseRequest {
  licenseKey: string;
  instanceUrl: string;
  version: string;
}

export interface ValidateLicenseResponse {
  valid: boolean;
  license?: LicenseInfo;
  publicKey?: string;
  warnings?: LicenseWarning[];
  error?: string;
}

export interface LicenseWarning {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

// =============================================================================
// Heartbeat Types
// =============================================================================

export interface HeartbeatRequest {
  licenseKey: string;
  instanceUrl: string;
  version: string;
  stats: InstanceStats;
}

export interface InstanceStats {
  totalEvents: number;
  federatedEvents: number;
  totalSubmissions: number;
  federatedSubmissions: number;
  activeUsers: number;
}

export interface HeartbeatResponse {
  success: boolean;
  warnings?: LicenseWarning[];
  latestVersion?: string;
  updateAvailable?: boolean;
  maintenanceWindow?: {
    start: string;
    end: string;
    message: string;
  };
}

// =============================================================================
// Event Registration Types
// =============================================================================

export interface RegisterEventRequest {
  licenseKey: string;
  event: {
    name: string;
    slug: string;
    description?: string;
    websiteUrl?: string;
    location?: string;
    isVirtual: boolean;
    startDate?: string;
    endDate?: string;
    cfpOpensAt?: string;
    cfpClosesAt?: string;
    tracks?: Array<{ name: string; description?: string }>;
    formats?: Array<{ name: string; durationMin: number }>;
  };
  callbackUrl: string; // Webhook URL for receiving submissions
}

export interface RegisterEventResponse {
  success: boolean;
  federatedEventId?: string;
  webhookSecret?: string;
  error?: string;
}

export interface UnregisterEventRequest {
  licenseKey: string;
  federatedEventId: string;
}

export interface UnregisterEventResponse {
  success: boolean;
  error?: string;
}

// =============================================================================
// Webhook Types
// =============================================================================

export type WebhookEventType =
  | 'submission.created'
  | 'submission.updated'
  | 'submission.status_updated'
  | 'message.sent'
  | 'message.read'
  | 'speaker.profile_updated'
  | 'speaker.consent_revoked';

export interface WebhookPayload<T = unknown> {
  id: string;
  type: WebhookEventType;
  timestamp: string;
  federatedEventId: string;
  data: T;
}

export interface SubmissionWebhookData {
  submissionId: string;
  speakerId: string;
  title: string;
  abstract: string;
  trackName?: string;
  formatName?: string;
  materials?: Array<{
    type: string;
    title: string;
    url: string;
  }>;
  coSpeakers?: Array<{
    name: string;
    email?: string;
    bio?: string;
  }>;
}

export interface StatusUpdateWebhookData {
  submissionId: string;
  status: string;
  feedback?: string;
}

export interface MessageWebhookData {
  messageId: string;
  submissionId: string;
  subject?: string;
  body: string;
  senderType: 'organizer' | 'speaker';
}

// =============================================================================
// Federation State
// =============================================================================

export interface FederationState {
  isEnabled: boolean;
  isConfigured: boolean;
  isValid: boolean;
  license: LicenseInfo | null;
  warnings: LicenseWarning[];
  lastValidated: Date | null;
  lastHeartbeat: Date | null;
}

export interface FederationConfig {
  licenseKey: string | undefined;
  apiUrl: string;
  instanceUrl: string;
  version: string;
}
