/**
 * Email Template Tests
 */

import { describe, it, expect } from 'vitest';
import {
  welcomeEmail,
  passwordResetEmail,
  submissionConfirmationEmail,
  submissionStatusEmail,
  newMessageEmail,
  reviewInvitationEmail,
  eventPublishedEmail,
} from '@/lib/email/templates';

describe('Email Templates', () => {
  describe('welcomeEmail', () => {
    it('should generate welcome email with name', () => {
      const result = welcomeEmail({
        name: 'John Doe',
        siteName: 'DevConf CFP',
        loginUrl: 'https://cfp.devconf.com/auth/signin',
      });

      expect(result.subject).toContain('Welcome');
      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('DevConf CFP');
      expect(result.html).toContain('https://cfp.devconf.com/auth/signin');
    });

    it('should use default fallback when no name provided', () => {
      const result = welcomeEmail({
        siteName: 'DevConf CFP',
        loginUrl: 'https://cfp.devconf.com/auth/signin',
      });

      expect(result.html).toContain('there');
    });
  });

  describe('passwordResetEmail', () => {
    it('should generate password reset email', () => {
      const result = passwordResetEmail({
        name: 'John Doe',
        resetUrl: 'https://cfp.devconf.com/auth/reset?token=abc123',
        expiresIn: '1 hour',
      });

      expect(result.subject).toContain('Password');
      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('https://cfp.devconf.com/auth/reset?token=abc123');
      expect(result.html).toContain('1 hour');
    });

    it('should include security notice', () => {
      const result = passwordResetEmail({
        name: 'John Doe',
        resetUrl: 'https://cfp.devconf.com/auth/reset?token=abc123',
        expiresIn: '1 hour',
      });

      expect(result.html).toContain('didn\'t request');
    });
  });

  describe('submissionConfirmationEmail', () => {
    it('should generate submission confirmation', () => {
      const result = submissionConfirmationEmail({
        speakerName: 'John Doe',
        talkTitle: 'Building Scalable APIs',
        eventName: 'DevConf 2025',
        submissionUrl: 'https://cfp.devconf.com/submissions/123',
      });

      expect(result.subject).toContain('Submission Received');
      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('Building Scalable APIs');
      expect(result.html).toContain('DevConf 2025');
    });

    it('should include event name in subject', () => {
      const result = submissionConfirmationEmail({
        speakerName: 'John Doe',
        talkTitle: 'Building Scalable APIs',
        eventName: 'DevConf 2025',
        submissionUrl: 'https://cfp.devconf.com/submissions/123',
      });

      expect(result.subject).toContain('DevConf 2025');
    });
  });

  describe('submissionStatusEmail', () => {
    it('should generate accepted status email', () => {
      const result = submissionStatusEmail({
        speakerName: 'John Doe',
        talkTitle: 'Building Scalable APIs',
        eventName: 'DevConf 2025',
        status: 'ACCEPTED',
        submissionUrl: 'https://cfp.devconf.com/submissions/123',
      });

      expect(result.subject).toContain('Accepted');
      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('Building Scalable APIs');
      expect(result.html).toContain('congratulations');
    });

    it('should generate rejected status email', () => {
      const result = submissionStatusEmail({
        speakerName: 'John Doe',
        talkTitle: 'Building Scalable APIs',
        eventName: 'DevConf 2025',
        status: 'REJECTED',
        submissionUrl: 'https://cfp.devconf.com/submissions/123',
      });

      expect(result.subject).toContain('Update');
      expect(result.html).toContain('not selected');
    });

    it('should include feedback when provided', () => {
      const result = submissionStatusEmail({
        speakerName: 'John Doe',
        talkTitle: 'Building Scalable APIs',
        eventName: 'DevConf 2025',
        status: 'ACCEPTED',
        feedback: 'Great submission! Looking forward to it.',
        submissionUrl: 'https://cfp.devconf.com/submissions/123',
      });

      expect(result.html).toContain('Great submission');
    });

    it('should generate waitlisted status email', () => {
      const result = submissionStatusEmail({
        speakerName: 'John Doe',
        talkTitle: 'Building Scalable APIs',
        eventName: 'DevConf 2025',
        status: 'WAITLISTED',
        submissionUrl: 'https://cfp.devconf.com/submissions/123',
      });

      expect(result.html).toContain('waitlist');
    });
  });

  describe('newMessageEmail', () => {
    it('should generate new message notification', () => {
      const result = newMessageEmail({
        recipientName: 'John Doe',
        senderName: 'Event Organizer',
        eventName: 'DevConf 2025',
        talkTitle: 'Building Scalable APIs',
        messagePreview: 'We have a question about your submission...',
        messageUrl: 'https://cfp.devconf.com/submissions/123#messages',
      });

      expect(result.subject).toContain('New Message');
      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('Event Organizer');
      expect(result.html).toContain('We have a question');
    });

    it('should include talk title in email', () => {
      const result = newMessageEmail({
        recipientName: 'John Doe',
        senderName: 'Event Organizer',
        eventName: 'DevConf 2025',
        talkTitle: 'Building Scalable APIs',
        messagePreview: 'Question about your talk',
        messageUrl: 'https://cfp.devconf.com/submissions/123#messages',
      });

      expect(result.html).toContain('Building Scalable APIs');
    });
  });

  describe('reviewInvitationEmail', () => {
    it('should generate review invitation', () => {
      const result = reviewInvitationEmail({
        reviewerName: 'Jane Smith',
        eventName: 'DevConf 2025',
        inviterName: 'Event Admin',
        reviewUrl: 'https://cfp.devconf.com/events/devconf-2025/submissions',
      });

      expect(result.subject).toContain('Review');
      expect(result.subject).toContain('DevConf 2025');
      expect(result.html).toContain('Jane Smith');
      expect(result.html).toContain('Event Admin');
    });

    it('should include link to review submissions', () => {
      const result = reviewInvitationEmail({
        reviewerName: 'Jane Smith',
        eventName: 'DevConf 2025',
        inviterName: 'Event Admin',
        reviewUrl: 'https://cfp.devconf.com/events/devconf-2025/submissions',
      });

      expect(result.html).toContain('https://cfp.devconf.com/events/devconf-2025/submissions');
    });
  });

  describe('eventPublishedEmail', () => {
    it('should generate event published notification', () => {
      const result = eventPublishedEmail({
        eventName: 'DevConf 2025',
        eventUrl: 'https://cfp.devconf.com/events/devconf-2025',
        cfpDeadline: 'April 30, 2025',
      });

      expect(result.subject).toContain('DevConf 2025');
      expect(result.subject).toContain('Open');
      expect(result.html).toContain('DevConf 2025');
      expect(result.html).toContain('April 30, 2025');
    });

    it('should include call to action for submissions', () => {
      const result = eventPublishedEmail({
        eventName: 'DevConf 2025',
        eventUrl: 'https://cfp.devconf.com/events/devconf-2025',
        cfpDeadline: 'April 30, 2025',
      });

      expect(result.html).toContain('Submit');
    });
  });
});

describe('Email Template Structure', () => {
  it('should include proper HTML structure in all templates', () => {
    const templates = [
      welcomeEmail({
        name: 'Test',
        siteName: 'Test',
        loginUrl: 'https://test.com',
      }),
      passwordResetEmail({
        name: 'Test',
        resetUrl: 'https://test.com',
        expiresIn: '1 hour',
      }),
      submissionConfirmationEmail({
        speakerName: 'Test',
        talkTitle: 'Test',
        eventName: 'Test',
        submissionUrl: 'https://test.com',
      }),
      submissionStatusEmail({
        speakerName: 'Test',
        talkTitle: 'Test',
        eventName: 'Test',
        status: 'ACCEPTED',
        submissionUrl: 'https://test.com',
      }),
      newMessageEmail({
        recipientName: 'Test',
        senderName: 'Test',
        eventName: 'Test',
        talkTitle: 'Test',
        messagePreview: 'Test',
        messageUrl: 'https://test.com',
      }),
    ];

    for (const template of templates) {
      expect(template.subject).toBeTruthy();
      expect(template.html).toBeTruthy();
      expect(template.html).toContain('<!DOCTYPE html>');
      expect(template.html).toContain('</html>');
    }
  });
});
