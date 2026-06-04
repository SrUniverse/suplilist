import { describe, it, expect } from 'vitest';
import { ProfileMapper } from './user-profile.entity.js';
import type { UserProfile } from './user-profile.entity.js';

const base: UserProfile = {
  userId: 'aabbccdd1122334455667788', // valid 24-char hex ObjectId string
  displayName: 'Marcos Calistênico',
  avatarUrl: null,
  avatarStatus: 'none',
  firstName: 'Marcos',
  lastName: 'Silva',
  createdAt: new Date('2026-06-03T00:00:00.000Z'),
  updatedAt: new Date('2026-06-03T12:00:00.000Z'),
};

// ── ProfileMapper.toPublic ─────────────────────────────────────────────────────

describe('ProfileMapper.toPublic', () => {
  it('returns only the four public fields', () => {
    const dto = ProfileMapper.toPublic(base);

    expect(Object.keys(dto).sort()).toEqual(
      ['avatarStatus', 'avatarUrl', 'displayName', 'userId'],
    );
  });

  it('maps userId and displayName correctly', () => {
    const dto = ProfileMapper.toPublic(base);
    expect(dto.userId).toBe('aabbccdd1122334455667788');
    expect(dto.displayName).toBe('Marcos Calistênico');
  });

  it('masks avatarUrl when avatarStatus is "none"', () => {
    const dto = ProfileMapper.toPublic({ ...base, avatarStatus: 'none', avatarUrl: 'https://cdn.example.com/a.png' });
    expect(dto.avatarUrl).toBeNull();
  });

  it('masks avatarUrl when avatarStatus is "pending_moderation"', () => {
    const dto = ProfileMapper.toPublic({ ...base, avatarStatus: 'pending_moderation', avatarUrl: 'https://cdn.example.com/a.png' });
    expect(dto.avatarUrl).toBeNull();
  });

  it('masks avatarUrl when avatarStatus is "rejected"', () => {
    const dto = ProfileMapper.toPublic({ ...base, avatarStatus: 'rejected', avatarUrl: 'https://cdn.example.com/a.png' });
    expect(dto.avatarUrl).toBeNull();
  });

  it('exposes avatarUrl only when avatarStatus is "approved"', () => {
    const dto = ProfileMapper.toPublic({ ...base, avatarStatus: 'approved', avatarUrl: 'https://cdn.example.com/a.png' });
    expect(dto.avatarUrl).toBe('https://cdn.example.com/a.png');
  });

  it('does not expose private fields (firstName, lastName, createdAt, updatedAt)', () => {
    const dto = ProfileMapper.toPublic(base) as unknown as Record<string, unknown>;
    expect(dto['firstName']).toBeUndefined();
    expect(dto['lastName']).toBeUndefined();
    expect(dto['createdAt']).toBeUndefined();
    expect(dto['updatedAt']).toBeUndefined();
  });
});

// ── ProfileMapper.toPrivate ────────────────────────────────────────────────────

describe('ProfileMapper.toPrivate', () => {
  it('serializes createdAt Date to ISO 8601 string (wire contract)', () => {
    const dto = ProfileMapper.toPrivate(base);
    expect(dto.createdAt).toBe('2026-06-03T00:00:00.000Z');
    expect(typeof dto.createdAt).toBe('string');
  });

  it('serializes updatedAt Date to ISO 8601 string (wire contract)', () => {
    const dto = ProfileMapper.toPrivate(base);
    expect(dto.updatedAt).toBe('2026-06-03T12:00:00.000Z');
    expect(typeof dto.updatedAt).toBe('string');
  });

  it('createdAt in DTO is not a Date instance (must be string for JSON)', () => {
    const dto = ProfileMapper.toPrivate(base);
    expect(dto.createdAt).not.toBeInstanceOf(Date);
    expect(dto.updatedAt).not.toBeInstanceOf(Date);
  });

  it('includes private fields firstName and lastName', () => {
    const dto = ProfileMapper.toPrivate(base);
    expect(dto.firstName).toBe('Marcos');
    expect(dto.lastName).toBe('Silva');
  });

  it('propagates null firstName and lastName for profiles without personal info', () => {
    const dto = ProfileMapper.toPrivate({ ...base, firstName: null, lastName: null });
    expect(dto.firstName).toBeNull();
    expect(dto.lastName).toBeNull();
  });

  it('includes all public fields from toPublic', () => {
    const dto = ProfileMapper.toPrivate(base);
    expect(dto.userId).toBe(base.userId);
    expect(dto.displayName).toBe(base.displayName);
    expect(dto.avatarStatus).toBe(base.avatarStatus);
  });

  it('exposes raw avatarUrl regardless of avatarStatus (owner sees unfiltered value)', () => {
    // toPrivate is only called for the authenticated owner — no masking applied.
    const dto = ProfileMapper.toPrivate({
      ...base,
      avatarStatus: 'pending_moderation',
      avatarUrl: 'https://cdn.example.com/pending.png',
    });
    expect(dto.avatarUrl).toBe('https://cdn.example.com/pending.png');
  });
});
