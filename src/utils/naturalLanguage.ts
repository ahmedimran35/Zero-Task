import { addDays, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday, parse, isValid } from 'date-fns';

interface ParsedTask {
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent' | null;
  dueDate: string | null;
  tags: string[];
}

const priorityPatterns = [
  { pattern: /\bp1\b/i, priority: 'urgent' as const },
  { pattern: /\bp2\b/i, priority: 'high' as const },
  { pattern: /\bp3\b/i, priority: 'medium' as const },
  { pattern: /\bp4\b/i, priority: 'low' as const },
  { pattern: /\burgent\b/i, priority: 'urgent' as const },
  { pattern: /\bhigh priority\b/i, priority: 'high' as const },
  { pattern: /\blow priority\b/i, priority: 'low' as const },
];

const dayNames: Record<string, (d: Date) => Date> = {
  monday: nextMonday, tuesday: nextTuesday, wednesday: nextWednesday,
  thursday: nextThursday, friday: nextFriday, saturday: nextSaturday, sunday: nextSunday,
};

export function parseNaturalLanguage(input: string): ParsedTask {
  let title = input;
  let priority: ParsedTask['priority'] = null;
  let dueDate: string | null = null;
  const tags: string[] = [];
  const now = new Date();

  // Extract priority
  for (const { pattern, priority: p } of priorityPatterns) {
    if (pattern.test(title)) {
      priority = p;
      title = title.replace(pattern, '').trim();
      break;
    }
  }

  // Extract tags (#tag)
  const tagMatches = title.match(/#(\w+)/g);
  if (tagMatches) {
    for (const match of tagMatches) {
      tags.push(match.slice(1).toLowerCase());
    }
    title = title.replace(/#\w+/g, '').trim();
  }

  // Extract due date
  const lower = title.toLowerCase();

  if (/\btoday\b/i.test(lower)) {
    dueDate = now.toISOString().split('T')[0];
    title = title.replace(/\btoday\b/gi, '').trim();
  } else if (/\btomorrow\b/i.test(lower)) {
    dueDate = addDays(now, 1).toISOString().split('T')[0];
    title = title.replace(/\btomorrow\b/gi, '').trim();
  } else if (/\bnext week\b/i.test(lower)) {
    dueDate = addDays(now, 7).toISOString().split('T')[0];
    title = title.replace(/\bnext week\b/gi, '').trim();
  } else {
    // Check for day names (monday, tuesday, etc.)
    for (const [day, fn] of Object.entries(dayNames)) {
      const regex = new RegExp(`\\b${day}\\b`, 'i');
      if (regex.test(lower)) {
        dueDate = fn(now).toISOString().split('T')[0];
        title = title.replace(regex, '').trim();
        break;
      }
    }
  }

  // Check for "in X days"
  const inDaysMatch = lower.match(/\bin (\d+) days?\b/);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1]);
    dueDate = addDays(now, days).toISOString().split('T')[0];
    title = title.replace(/\bin \d+ days?\b/gi, '').trim();
  }

  // Check for specific date (MM/DD, M/D, YYYY-MM-DD)
  const datePatterns = [
    { regex: /(\d{4}-\d{2}-\d{2})/, format: 'yyyy-MM-dd' },
    { regex: /(\d{1,2}\/\d{1,2})/, format: 'M/d' },
    { regex: /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})/i, format: 'month day' },
  ];

  for (const { regex, format } of datePatterns) {
    const match = lower.match(regex);
    if (match) {
      try {
        let parsed: Date;
        if (format === 'yyyy-MM-dd') {
          parsed = new Date(match[1]);
        } else if (format === 'M/d') {
          parsed = parse(match[1], 'M/d', now);
          if (parsed < now) parsed = addDays(parsed, 365);
        } else {
          const monthDay = `${match[1]} ${match[2]}`;
          parsed = parse(monthDay, 'MMM d', now);
          if (parsed < now) parsed = addDays(parsed, 365);
        }
        if (isValid(parsed)) {
          dueDate = parsed.toISOString().split('T')[0];
          title = title.replace(regex, '').trim();
        }
      } catch {}
      break;
    }
  }

  // Clean up title
  title = title.replace(/\s+/g, ' ').trim();
  // Remove trailing prepositions
  title = title.replace(/\s+(by|on|at|for|due)\s*$/i, '').trim();

  return { title: title || input, priority, dueDate, tags };
}
