import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.cjs';

describe('JWT Authentication', () => {
  it('signs and verifies a valid token', () => {
    const payload = { userId: 'user-123', role: 'admin' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.userId).toBe('user-123');
    expect(decoded.role).toBe('admin');
  });

  it('rejects an invalid token', () => {
    expect(() => jwt.verify('invalid-token', JWT_SECRET)).toThrow();
  });

  it('rejects a token signed with wrong secret', () => {
    const token = jwt.sign({ userId: 'user-1', role: 'user' }, 'wrong-secret');
    expect(() => jwt.verify(token, JWT_SECRET)).toThrow();
  });

  it('rejects an expired token', () => {
    const token = jwt.sign({ userId: 'user-1', role: 'user' }, JWT_SECRET, { expiresIn: '0s' });
    expect(() => jwt.verify(token, JWT_SECRET)).toThrow();
  });

  it('token contains correct claims', () => {
    const token = jwt.sign({ userId: 'abc-123', role: 'user' }, JWT_SECRET, { expiresIn: '24h' });
    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded).toHaveProperty('userId', 'abc-123');
    expect(decoded).toHaveProperty('role', 'user');
    expect(decoded).toHaveProperty('iat');
    expect(decoded).toHaveProperty('exp');
  });
});
