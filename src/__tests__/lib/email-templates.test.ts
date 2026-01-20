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
    it('should generate welcome email with user name', () => {
      const result = welcomeEmail({
        userName: 'John Doe',
        isFirstUser: false,
      });

      expect(result.subject).toContain('Welcome');
      expect(result.html).toContain('John Doe');
    });

    it('should show first user message when isFirstUser is true', () => {
      const result = welcomeEmail({
        userName: 'Admin User',
        isFirstUser: true,
      });

      expect(result.html).toContain('first user');
      expect(result.html).toContain('administrator');
    });

    it('should not show first user message when isFirstUser is false', () => {
      const result = welcomeEmail({
        userName: 'Regular User',
        isFirstUser: false,
      });

      expect(result.html).not.toContain('first user');
    });
  });

  describe('passwordResetEmail', () => {
    it('should generate password reset email', () => {
      const result = passwordResetEmail({
        userName: 'John Doe',
        resetUrl: 'https://cfp.devconf.com/auth/reset?token=abc123',
        expiresIn: '1 hour',
      });

      expect(result.subject).toContain('Password');
      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('https://cfp.devconf.com/auth/reset?token=abc123');
      expect(result.html).toContain('1 hour');
    });

    it('should include the reset URL twice (button and text link)', () => {
      const resetUrl = 'https://example.com/reset?token=test';
      const result = passwordResetEmail({
        userName: 'Jane',
        resetUrl,
        expiresIn: '30 minutes',
      });

      // Should appear at least twice - once in button, once in plain text
      const matches = result.html.match(new RegExp(resetUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
      expect(matches?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('submissionConfirmationEmail', () => {
    it('should generate submission confirmation email', () => {
      const result = submissionConfirmationEmail({
        speakerName: 'John Doe',
        eventName: 'DevConf 2025',
        submissionTitle: 'Building Better APIs',
        eventUrl: 'https://cfp.devconf.com/events/devconf-2025',
      });

      expect(result.subject).toContain('Building Better APIs');
      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('DevConf 2025');
      expect(result.html).toContain('Building Better APIs');
    });

    it('should show pending status', () => {
      const result = submissionConfirmationEmail({
        speakerName: 'Speaker',
        eventName: 'Event',
        submissionTitle: 'Talk',
        eventUrl: 'https://example.com',
      });

      expect(result.html).toContain('Pending');
    });
  });

  describe('submissionStatusEmail', () => {
    it('should generate accepted status email', () => {
      const result = submissionStatusEmail({
        speakerName: 'John Doe',
        eventName: 'DevConf 2025',
        submissionTitle: 'Building Better APIs',
        status: 'ACCEPTED',
        eventUrl: 'https://cfp.devconf.com',
      });

      expect(result.subject).toContain('Accepted');
      expect(result.html).toContain('Congratulations');
      expect(result.html).toContain('John Doe');
    });

    it('should generate rejected status email', () => {
      const result = submissionStatusEmail({
        speakerName: 'John Doe',
        eventName: 'DevConf 2025',
        submissionTitle: 'Building Better APIs',
        status: 'REJECTED',
        eventUrl: 'https://cfp.devconf.com',
      });

      expect(result.subject).toContain('Not Selected');
      expect(result.html).toContain('not selected');
    });

    it('should generate waitlisted status email', () => {
      const result = submissionStatusEmail({
        speakerName: 'John Doe',
        eventName: 'DevConf 2025',
        submissionTitle: 'Building Better APIs',
        status: 'WAITLISTED',
        eventUrl: 'https://cfp.devconf.com',
      });

      expect(result.subject).toContain('Waitlisted');
      expect(result.html).toContain('waitlisted');
    });

    it('should include feedback when provided', () => {
      const result = submissionStatusEmail({
        speakerName: 'John Doe',
        eventName: 'DevConf 2025',
        submissionTitle: 'Building Better APIs',
        status: 'ACCEPTED',
        feedback: 'Great talk proposal! Looking forward to it.',
        eventUrl: 'https://cfp.devconf.com',
      });

      expect(result.html).toContain('Feedback');
      expect(result.html).toContain('Great talk proposal');
    });

    it('should not include feedback section when not provided', () => {
      const result = submissionStatusEmail({
        speakerName: 'John Doe',
        eventName: 'DevConf 2025',
        submissionTitle: 'Building Better APIs',
        status: 'ACCEPTED',
        eventUrl: 'https://cfp.devconf.com',
      });

      expect(result.html).not.toContain('Feedback');
    });
  });

  describe('newMessageEmail', () => {
    it('should generate new message email', () => {
      const result = newMessageEmail({
        recipientName: 'John Doe',
        senderName: 'Jane Smith',
        eventName: 'DevConf 2025',
        submissionTitle: 'Building Better APIs',
        messagePreview: 'Thanks for your submission. I have a question',
        messageUrl: 'https://cfp.devconf.com/messages/123',
      });

      expect(result.subject).toContain('Building Better APIs');
      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('Jane Smith');
      expect(result.html).toContain('Thanks for your submission');
    });

    it('should include the message URL', () => {
      const messageUrl = 'https://cfp.devconf.com/messages/456';
      const result = newMessageEmail({
        recipientName: 'User',
        senderName: 'Organizer',
        eventName: 'Event',
        submissionTitle: 'Talk',
        messagePreview: 'Message content',
        messageUrl,
      });

      expect(result.html).toContain(messageUrl);
    });
  });

  describe('reviewInvitationEmail', () => {
    it('should generate reviewer invitation email', () => {
      const result = reviewInvitationEmail({
        reviewerName: 'John Doe',
        eventName: 'DevConf 2025',
        organizerName: 'Jane Smith',
        role: 'REVIEWER',
        eventUrl: 'https://cfp.devconf.com/events/devconf-2025',
      });

      expect(result.subject).toContain('Reviewer');
      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('Jane Smith');
      expect(result.html).toContain('DevConf 2025');
    });

    it('should generate lead reviewer invitation email', () => {
      const result = reviewInvitationEmail({
        reviewerName: 'John Doe',
        eventName: 'DevConf 2025',
        organizerName: 'Jane Smith',
        role: 'LEAD',
        eventUrl: 'https://cfp.devconf.com/events/devconf-2025',
      });

      expect(result.subject).toContain('Lead Reviewer');
      expect(result.html).toContain('Lead Reviewer');
      expect(result.html).toContain('Manage the review process');
    });
  });

  describe('eventPublishedEmail', () => {
    it('should generate event published email', () => {
      const result = eventPublishedEmail({
        organizerName: 'John Doe',
        eventName: 'DevConf 2025',
        eventUrl: 'https://cfp.devconf.com/events/devconf-2025',
      });

      expect(result.subject).toContain('DevConf 2025');
      expect(result.subject).toContain('Live');
      expect(result.html).toContain('published');
      expect(result.html).toContain('John Doe');
    });

    it('should include CFP dates when provided', () => {
      const result = eventPublishedEmail({
        organizerName: 'John Doe',
        eventName: 'DevConf 2025',
        eventUrl: 'https://cfp.devconf.com/events/devconf-2025',
        cfpOpensAt: new Date('2025-01-15'),
        cfpClosesAt: new Date('2025-03-15'),
      });

      expect(result.html).toContain('CFP Opens');
      expect(result.html).toContain('CFP Closes');
    });

    it('should not include CFP dates section when not provided', () => {
      const result = eventPublishedEmail({
        organizerName: 'John Doe',
        eventName: 'DevConf 2025',
        eventUrl: 'https://cfp.devconf.com/events/devconf-2025',
      });

      expect(result.html).not.toContain('CFP Opens');
      expect(result.html).not.toContain('CFP Closes');
    });
  });

  describe('Email layout', () => {
    it('should include proper HTML structure', () => {
      const result = welcomeEmail({
        userName: 'Test',
        isFirstUser: false,
      });

      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<html');
      expect(result.html).toContain('<head>');
      expect(result.html).toContain('<body>');
      expect(result.html).toContain('</html>');
    });

    it('should include CSS styles', () => {
      const result = welcomeEmail({
        userName: 'Test',
        isFirstUser: false,
      });

      expect(result.html).toContain('<style>');
      expect(result.html).toContain('.button');
    });
  });
});
