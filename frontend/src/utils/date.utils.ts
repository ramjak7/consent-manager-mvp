import { format, parseISO, formatDistanceToNow } from 'date-fns';

/**
 * Format date to localized string
 * @param dateString ISO 8601 date string
 * @param formatString format pattern (default: 'MMM dd, yyyy')
 */
export function formatDate(
  dateString: string,
  formatString: string = 'MMM dd, yyyy'
): string {
  try {
    return format(parseISO(dateString), formatString);
  } catch (error) {
    return dateString;
  }
}

/**
 * Format date with time
 * @param dateString ISO 8601 date string
 */
export function formatDateTime(dateString: string): string {
  return formatDate(dateString, 'MMM dd, yyyy hh:mm a');
}

/**
 * Get relative time (e.g., "2 hours ago")
 * @param dateString ISO 8601 date string
 */
export function getRelativeTime(dateString: string): string {
  try {
    return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
  } catch (error) {
    return dateString;
  }
}

/**
 * Get days remaining until date
 * @param dateString ISO 8601 date string
 */
export function getDaysRemaining(dateString: string): number {
  try {
    const date = parseISO(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch (error) {
    return 0;
  }
}
