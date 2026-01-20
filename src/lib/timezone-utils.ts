/**
 * Timezone Utilities
 * 
 * Helpers for timezone selection and formatting.
 */

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

// Common timezones organized by region
const TIMEZONE_DATA: { value: string; region: string }[] = [
  // UTC
  { value: 'UTC', region: 'UTC' },
  
  // Americas
  { value: 'America/New_York', region: 'Americas' },
  { value: 'America/Chicago', region: 'Americas' },
  { value: 'America/Denver', region: 'Americas' },
  { value: 'America/Los_Angeles', region: 'Americas' },
  { value: 'America/Phoenix', region: 'Americas' },
  { value: 'America/Anchorage', region: 'Americas' },
  { value: 'America/Toronto', region: 'Americas' },
  { value: 'America/Vancouver', region: 'Americas' },
  { value: 'America/Mexico_City', region: 'Americas' },
  { value: 'America/Sao_Paulo', region: 'Americas' },
  { value: 'America/Buenos_Aires', region: 'Americas' },
  { value: 'America/Santiago', region: 'Americas' },
  { value: 'America/Lima', region: 'Americas' },
  { value: 'America/Bogota', region: 'Americas' },
  { value: 'Pacific/Honolulu', region: 'Americas' },
  
  // Europe
  { value: 'Europe/London', region: 'Europe' },
  { value: 'Europe/Dublin', region: 'Europe' },
  { value: 'Europe/Paris', region: 'Europe' },
  { value: 'Europe/Berlin', region: 'Europe' },
  { value: 'Europe/Amsterdam', region: 'Europe' },
  { value: 'Europe/Brussels', region: 'Europe' },
  { value: 'Europe/Zurich', region: 'Europe' },
  { value: 'Europe/Vienna', region: 'Europe' },
  { value: 'Europe/Rome', region: 'Europe' },
  { value: 'Europe/Madrid', region: 'Europe' },
  { value: 'Europe/Lisbon', region: 'Europe' },
  { value: 'Europe/Stockholm', region: 'Europe' },
  { value: 'Europe/Oslo', region: 'Europe' },
  { value: 'Europe/Copenhagen', region: 'Europe' },
  { value: 'Europe/Helsinki', region: 'Europe' },
  { value: 'Europe/Warsaw', region: 'Europe' },
  { value: 'Europe/Prague', region: 'Europe' },
  { value: 'Europe/Budapest', region: 'Europe' },
  { value: 'Europe/Athens', region: 'Europe' },
  { value: 'Europe/Istanbul', region: 'Europe' },
  { value: 'Europe/Moscow', region: 'Europe' },
  { value: 'Europe/Kiev', region: 'Europe' },
  
  // Asia
  { value: 'Asia/Dubai', region: 'Asia' },
  { value: 'Asia/Riyadh', region: 'Asia' },
  { value: 'Asia/Jerusalem', region: 'Asia' },
  { value: 'Asia/Karachi', region: 'Asia' },
  { value: 'Asia/Kolkata', region: 'Asia' },
  { value: 'Asia/Mumbai', region: 'Asia' },
  { value: 'Asia/Dhaka', region: 'Asia' },
  { value: 'Asia/Bangkok', region: 'Asia' },
  { value: 'Asia/Jakarta', region: 'Asia' },
  { value: 'Asia/Singapore', region: 'Asia' },
  { value: 'Asia/Kuala_Lumpur', region: 'Asia' },
  { value: 'Asia/Hong_Kong', region: 'Asia' },
  { value: 'Asia/Shanghai', region: 'Asia' },
  { value: 'Asia/Taipei', region: 'Asia' },
  { value: 'Asia/Seoul', region: 'Asia' },
  { value: 'Asia/Tokyo', region: 'Asia' },
  { value: 'Asia/Manila', region: 'Asia' },
  
  // Australia & Pacific
  { value: 'Australia/Perth', region: 'Pacific' },
  { value: 'Australia/Adelaide', region: 'Pacific' },
  { value: 'Australia/Brisbane', region: 'Pacific' },
  { value: 'Australia/Sydney', region: 'Pacific' },
  { value: 'Australia/Melbourne', region: 'Pacific' },
  { value: 'Pacific/Auckland', region: 'Pacific' },
  { value: 'Pacific/Fiji', region: 'Pacific' },
  
  // Africa
  { value: 'Africa/Cairo', region: 'Africa' },
  { value: 'Africa/Johannesburg', region: 'Africa' },
  { value: 'Africa/Lagos', region: 'Africa' },
  { value: 'Africa/Nairobi', region: 'Africa' },
  { value: 'Africa/Casablanca', region: 'Africa' },
];

/**
 * Get the UTC offset for a timezone
 */
function getTimezoneOffset(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find(p => p.type === 'timeZoneName');
    
    if (offsetPart) {
      // Convert "GMT+5:30" to "+05:30" format
      const match = offsetPart.value.match(/GMT([+-])(\d+)(?::(\d+))?/);
      if (match) {
        const sign = match[1];
        const hours = match[2].padStart(2, '0');
        const minutes = (match[3] || '00').padStart(2, '0');
        return `${sign}${hours}:${minutes}`;
      }
      return offsetPart.value.replace('GMT', '');
    }
    return '';
  } catch {
    return '';
  }
}

/**
 * Format timezone for display
 */
function formatTimezoneLabel(timezone: string): string {
  const offset = getTimezoneOffset(timezone);
  const city = timezone.split('/').pop()?.replace(/_/g, ' ') || timezone;
  
  if (timezone === 'UTC') {
    return 'UTC (Coordinated Universal Time)';
  }
  
  return `${city} (UTC${offset})`;
}

/**
 * Get all timezone options sorted by offset
 */
export function getTimezoneOptions(): TimezoneOption[] {
  return TIMEZONE_DATA
    .map(tz => ({
      value: tz.value,
      label: formatTimezoneLabel(tz.value),
      offset: getTimezoneOffset(tz.value),
    }))
    .sort((a, b) => {
      // Sort by offset first, then by label
      const offsetA = parseOffset(a.offset);
      const offsetB = parseOffset(b.offset);
      if (offsetA !== offsetB) {
        return offsetA - offsetB;
      }
      return a.label.localeCompare(b.label);
    });
}

/**
 * Parse offset string to minutes for sorting
 */
function parseOffset(offset: string): number {
  if (!offset) return 0;
  const match = offset.match(/([+-])(\d+):(\d+)/);
  if (!match) return 0;
  const sign = match[1] === '+' ? 1 : -1;
  const hours = parseInt(match[2], 10);
  const minutes = parseInt(match[3], 10);
  return sign * (hours * 60 + minutes);
}

/**
 * Get the current user's timezone with offset
 */
export function getCurrentTimezoneWithOffset(): TimezoneOption {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = getTimezoneOffset(timezone);
    return {
      value: timezone,
      label: formatTimezoneLabel(timezone),
      offset,
    };
  } catch {
    return {
      value: 'UTC',
      label: 'UTC (Coordinated Universal Time)',
      offset: '+00:00',
    };
  }
}

/**
 * Get timezone by value
 */
export function getTimezoneByValue(value: string): TimezoneOption | undefined {
  const options = getTimezoneOptions();
  return options.find(tz => tz.value === value);
}

/**
 * Convert a date to a specific timezone
 */
export function formatInTimezone(date: Date, timezone: string, format: Intl.DateTimeFormatOptions = {}): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      ...format,
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

/**
 * Get current time in a specific timezone
 */
export function getCurrentTimeInTimezone(timezone: string): string {
  return formatInTimezone(new Date(), timezone, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Check if a timezone is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
