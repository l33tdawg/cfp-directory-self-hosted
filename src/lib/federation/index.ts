/**
 * Federation Module
 * 
 * Exports for federation functionality including license validation,
 * feature gating, consent handling, and speaker sync.
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
  // Consent types
  ConsentScope,
  ValidateConsentTokenRequest,
  ValidateConsentTokenResponse,
  FederatedSpeakerProfile,
  FederatedMaterial,
  FederatedCoSpeaker,
  SyncSpeakerResult,
  ConsentLandingParams,
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

// Consent Client
export {
  validateConsentToken,
  fetchSpeakerProfile,
  downloadMaterial,
  isSignedUrl,
  type ValidateConsentResult,
  type FetchProfileResult,
  type DownloadMaterialResult,
} from './consent-client';

// Speaker Sync Service
export {
  syncFederatedSpeaker,
  getFederatedSpeaker,
  getFederatedSpeakersForEvent,
  updateConsentScopes,
  revokeConsent,
  type SyncSpeakerOptions,
} from './speaker-sync';

// Webhook Sender Service
export {
  sendWebhook,
  sendSubmissionCreatedWebhook,
  sendStatusUpdatedWebhook,
  sendMessageSentWebhook,
  sendMessageReadWebhook,
  signWebhookPayload,
  type WebhookResult,
} from './webhook-sender';
