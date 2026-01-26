/**
 * Example Logger Plugin
 * 
 * Demonstrates how to create a plugin that hooks into submission
 * and review events to log activity.
 */

import type { Plugin, PluginContext } from '@/lib/plugins';

interface ExampleLoggerConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  includeMetadata: boolean;
}

const plugin: Plugin = {
  manifest: require('./manifest.json'),
  
  async onEnable(ctx: PluginContext) {
    ctx.logger.info('Example Logger plugin enabled', {
      config: ctx.config,
    });
  },
  
  async onDisable(ctx: PluginContext) {
    ctx.logger.info('Example Logger plugin disabled');
  },
  
  hooks: {
    'submission.created': async (ctx, payload) => {
      const config = ctx.config as ExampleLoggerConfig;
      
      ctx.logger.info('New submission received', {
        submissionId: payload.submission.id,
        title: payload.submission.title,
        speakerEmail: payload.speaker.email,
        eventName: payload.event.name,
        ...(config.includeMetadata && {
          createdAt: payload.submission.createdAt,
          status: payload.submission.status,
        }),
      });
    },
    
    'submission.statusChanged': async (ctx, payload) => {
      const config = ctx.config as ExampleLoggerConfig;
      
      ctx.logger.info('Submission status changed', {
        submissionId: payload.submission.id,
        title: payload.submission.title,
        oldStatus: payload.oldStatus,
        newStatus: payload.newStatus,
        changedBy: payload.changedBy.id,
        ...(config.includeMetadata && {
          changedByRole: payload.changedBy.role,
        }),
      });
    },
    
    'review.submitted': async (ctx, payload) => {
      const config = ctx.config as ExampleLoggerConfig;
      
      ctx.logger.info('Review submitted', {
        reviewId: payload.review.id,
        submissionId: payload.submission.id,
        submissionTitle: payload.submission.title,
        reviewerName: payload.reviewer.name,
        isUpdate: payload.isUpdate,
        ...(config.includeMetadata && {
          overallScore: payload.review.overallScore,
          recommendation: payload.review.recommendation,
        }),
      });
    },
  },
};

export default plugin;
