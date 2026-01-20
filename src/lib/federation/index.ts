/**
 * Federation Module
 * 
 * Exports for federation functionality including license validation,
 * feature gating, and API client.
 */

// Types
export type {
  LicenseTier,
  LicenseStatus,
  LicenseInfo,
  LicenseFeatures,
  LicenseLimits,
  LicenseWarning,
  FederationState,
  FederationConfig,
  ValidateLicenseResponse,
  HeartbeatResponse,
  RegisterEventResponse,
  UnregisterEventResponse,
  WebhookEventType,
  WebhookPayload,
  SubmissionWebhookData,
  StatusUpdateWebhookData,
  MessageWebhookData,
} from './types';

// License Client
export {
  validateLicense,
  sendHeartbeat,
  registerEvent,
  unregisterEvent,
  checkApiHealth,
  getAppVersion,
  FederationApiError,
} from './license-client';

// Federation Service
export {
  getFederationState,
  setFederationEnabled,
  hasFeature,
  isFederationActive,
  getEnabledFeatures,
  performHeartbeat,
  clearCache,
  getCachedLicense,
  getCachedWarnings,
} from './federation-service';
