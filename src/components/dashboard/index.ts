/**
 * Dashboard Components Index
 * 
 * Re-exports all dashboard components for easy importing.
 */

export { 
  StatsCard, 
  StatsCardGrid,
  type StatsCardProps, 
  type StatsCardVariant 
} from './stats-card';

export { 
  SubmissionChart, 
  StatusDistributionChart 
} from './submission-chart';

export { 
  QuickActions, 
  QuickActionButtons,
  type QuickAction 
} from './quick-actions';

export { 
  ActivityFeed, 
  ActivityList,
  type ActivityItem 
} from './activity-feed';

export {
  DashboardSectionWrapper,
  DashboardSettingsPopover,
  useDashboardSections,
  loadSavedSections,
  DEFAULT_ADMIN_SECTIONS,
  type DashboardSection,
} from './dashboard-section-manager';
