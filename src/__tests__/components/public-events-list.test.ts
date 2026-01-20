/**
 * Public Events List Tests
 * 
 * Tests for the event display logic on the public landing page.
 */

import { describe, it, expect } from 'vitest';

// Helper functions from the component
function formatDate(date: Date | null): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

function formatDateRange(start: Date | null, end: Date | null): string {
  if (!start) return '';
  if (!end || start.getTime() === end.getTime()) {
    return formatDate(start);
  }
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  if (startDate.getFullYear() === endDate.getFullYear() && 
      startDate.getMonth() === endDate.getMonth()) {
    return `${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(startDate)}-${endDate.getDate()}, ${endDate.getFullYear()}`;
  }
  
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function getDaysUntil(date: Date): number {
  const now = new Date();
  const diff = new Date(date).getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function isCfpOpen(event: { cfpOpensAt: Date | null; cfpClosesAt: Date | null }): boolean {
  const now = new Date();
  return !!(
    event.cfpOpensAt && 
    event.cfpClosesAt && 
    now >= new Date(event.cfpOpensAt) && 
    now <= new Date(event.cfpClosesAt)
  );
}

describe('Public Events List', () => {
  
  // =========================================================================
  // Date Formatting
  // =========================================================================

  describe('formatDate', () => {
    it('should return empty string for null date', () => {
      expect(formatDate(null)).toBe('');
    });

    it('should format date correctly', () => {
      const date = new Date('2024-03-15');
      const result = formatDate(date);
      expect(result).toContain('Mar');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });
  });

  describe('formatDateRange', () => {
    it('should return empty string for null start date', () => {
      expect(formatDateRange(null, new Date())).toBe('');
    });

    it('should format single day event', () => {
      const date = new Date('2024-03-15');
      const result = formatDateRange(date, date);
      expect(result).toContain('Mar');
      expect(result).toContain('15');
    });

    it('should format multi-day event in same month', () => {
      const start = new Date('2024-03-15');
      const end = new Date('2024-03-17');
      const result = formatDateRange(start, end);
      expect(result).toContain('Mar');
      expect(result).toContain('15');
      expect(result).toContain('17');
    });

    it('should handle events spanning months', () => {
      const start = new Date('2024-03-30');
      const end = new Date('2024-04-02');
      const result = formatDateRange(start, end);
      expect(result).toContain('Mar');
      expect(result).toContain('Apr');
    });
  });

  // =========================================================================
  // CFP Status
  // =========================================================================

  describe('getDaysUntil', () => {
    it('should return positive days for future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      
      const days = getDaysUntil(futureDate);
      expect(days).toBeGreaterThan(0);
      expect(days).toBeLessThanOrEqual(8); // Account for time of day
    });

    it('should return negative days for past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      
      const days = getDaysUntil(pastDate);
      expect(days).toBeLessThan(0);
    });

    it('should return 0 or 1 for today', () => {
      const today = new Date();
      const days = getDaysUntil(today);
      expect(days).toBeLessThanOrEqual(1);
      expect(days).toBeGreaterThanOrEqual(0);
    });
  });

  describe('isCfpOpen', () => {
    it('should return false when cfpOpensAt is null', () => {
      const event = { cfpOpensAt: null, cfpClosesAt: new Date() };
      expect(isCfpOpen(event)).toBe(false);
    });

    it('should return false when cfpClosesAt is null', () => {
      const event = { cfpOpensAt: new Date(), cfpClosesAt: null };
      expect(isCfpOpen(event)).toBe(false);
    });

    it('should return true when CFP is currently open', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const event = { cfpOpensAt: yesterday, cfpClosesAt: tomorrow };
      expect(isCfpOpen(event)).toBe(true);
    });

    it('should return false when CFP has not opened yet', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const event = { cfpOpensAt: tomorrow, cfpClosesAt: nextWeek };
      expect(isCfpOpen(event)).toBe(false);
    });

    it('should return false when CFP has closed', () => {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const event = { cfpOpensAt: lastWeek, cfpClosesAt: yesterday };
      expect(isCfpOpen(event)).toBe(false);
    });
  });

  // =========================================================================
  // Event Categorization
  // =========================================================================

  describe('Event Categorization', () => {
    const categorizeEvents = (events: Array<{
      id: string;
      startDate: Date | null;
      cfpOpensAt: Date | null;
      cfpClosesAt: Date | null;
    }>) => {
      const now = new Date();
      
      const openCfp = events.filter(e => isCfpOpen(e));
      const upcoming = events.filter(e => 
        e.startDate && e.startDate > now && !openCfp.includes(e)
      );
      const past = events.filter(e => 
        e.startDate && e.startDate <= now
      );
      
      return { openCfp, upcoming, past };
    };

    it('should categorize event with open CFP', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      const events = [{
        id: '1',
        startDate: nextMonth,
        cfpOpensAt: yesterday,
        cfpClosesAt: nextMonth,
      }];
      
      const { openCfp, upcoming, past } = categorizeEvents(events);
      
      expect(openCfp).toHaveLength(1);
      expect(upcoming).toHaveLength(0);
      expect(past).toHaveLength(0);
    });

    it('should categorize upcoming event without open CFP', () => {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      const events = [{
        id: '1',
        startDate: nextMonth,
        cfpOpensAt: null,
        cfpClosesAt: null,
      }];
      
      const { openCfp, upcoming, past } = categorizeEvents(events);
      
      expect(openCfp).toHaveLength(0);
      expect(upcoming).toHaveLength(1);
      expect(past).toHaveLength(0);
    });

    it('should categorize past event', () => {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      const events = [{
        id: '1',
        startDate: lastMonth,
        cfpOpensAt: null,
        cfpClosesAt: null,
      }];
      
      const { openCfp, upcoming, past } = categorizeEvents(events);
      
      expect(openCfp).toHaveLength(0);
      expect(upcoming).toHaveLength(0);
      expect(past).toHaveLength(1);
    });

    it('should handle multiple events in different categories', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      const events = [
        { id: '1', startDate: nextMonth, cfpOpensAt: yesterday, cfpClosesAt: nextWeek },
        { id: '2', startDate: nextMonth, cfpOpensAt: null, cfpClosesAt: null },
        { id: '3', startDate: lastMonth, cfpOpensAt: null, cfpClosesAt: null },
      ];
      
      const { openCfp, upcoming, past } = categorizeEvents(events);
      
      expect(openCfp).toHaveLength(1);
      expect(upcoming).toHaveLength(1);
      expect(past).toHaveLength(1);
    });
  });

  // =========================================================================
  // CFP Urgency Badge
  // =========================================================================

  describe('CFP Urgency', () => {
    const getUrgencyBadge = (daysUntilClose: number) => {
      if (daysUntilClose <= 0) return 'Last day!';
      if (daysUntilClose <= 3) return 'Closing soon';
      if (daysUntilClose <= 7) return 'This week';
      return `${daysUntilClose}d left`;
    };

    it('should show "Last day!" on closing day', () => {
      expect(getUrgencyBadge(0)).toBe('Last day!');
    });

    it('should show "Closing soon" for 1-3 days', () => {
      expect(getUrgencyBadge(1)).toBe('Closing soon');
      expect(getUrgencyBadge(2)).toBe('Closing soon');
      expect(getUrgencyBadge(3)).toBe('Closing soon');
    });

    it('should show "This week" for 4-7 days', () => {
      expect(getUrgencyBadge(4)).toBe('This week');
      expect(getUrgencyBadge(7)).toBe('This week');
    });

    it('should show days remaining for more than 7 days', () => {
      expect(getUrgencyBadge(10)).toBe('10d left');
      expect(getUrgencyBadge(30)).toBe('30d left');
    });
  });
});
