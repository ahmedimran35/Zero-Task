import { describe, it, expect } from 'vitest';
import { parseNaturalLanguage } from '../utils/naturalLanguage';

describe('parseNaturalLanguage', () => {
  it('parses plain title with no extras', () => {
    const result = parseNaturalLanguage('Fix the login bug');
    expect(result.title).toBe('Fix the login bug');
    expect(result.priority).toBeNull();
    expect(result.dueDate).toBeNull();
    expect(result.tags).toEqual([]);
  });

  it('extracts p1 priority', () => {
    const result = parseNaturalLanguage('Fix login p1');
    expect(result.priority).toBe('urgent');
    expect(result.title).toBe('Fix login');
  });

  it('extracts p2 priority', () => {
    const result = parseNaturalLanguage('Deploy hotfix p2');
    expect(result.priority).toBe('high');
  });

  it('extracts "urgent" keyword', () => {
    const result = parseNaturalLanguage('Server is down urgent');
    expect(result.priority).toBe('urgent');
    expect(result.title).toBe('Server is down');
  });

  it('extracts "high priority" keyword', () => {
    const result = parseNaturalLanguage('Review PR high priority');
    expect(result.priority).toBe('high');
  });

  it('extracts tags', () => {
    const result = parseNaturalLanguage('Fix bug #frontend #backend');
    expect(result.tags).toContain('frontend');
    expect(result.tags).toContain('backend');
    expect(result.title).toBe('Fix bug');
  });

  it('parses "today" as due date', () => {
    const result = parseNaturalLanguage('Meeting today');
    expect(result.dueDate).toBe(new Date().toISOString().split('T')[0]);
    expect(result.title).toBe('Meeting');
  });

  it('parses "tomorrow" as due date', () => {
    const result = parseNaturalLanguage('Submit report tomorrow');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(result.dueDate).toBe(tomorrow.toISOString().split('T')[0]);
    expect(result.title).toBe('Submit report');
  });

  it('parses "next week" as due date', () => {
    const result = parseNaturalLanguage('Plan sprint next week');
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    expect(result.dueDate).toBe(nextWeek.toISOString().split('T')[0]);
  });

  it('parses "in 3 days" as due date', () => {
    const result = parseNaturalLanguage('Review code in 3 days');
    const future = new Date();
    future.setDate(future.getDate() + 3);
    expect(result.dueDate).toBe(future.toISOString().split('T')[0]);
  });

  it('parses YYYY-MM-DD date format', () => {
    const result = parseNaturalLanguage('Release 2026-06-15');
    expect(result.dueDate).toBe('2026-06-15');
    expect(result.title).toBe('Release');
  });

  it('combines priority, tags, and date', () => {
    const result = parseNaturalLanguage('Fix auth bug p1 #security today');
    expect(result.priority).toBe('urgent');
    expect(result.tags).toContain('security');
    expect(result.dueDate).toBe(new Date().toISOString().split('T')[0]);
    expect(result.title).toBe('Fix auth bug');
  });
});
