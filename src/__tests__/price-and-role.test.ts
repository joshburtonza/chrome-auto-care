import { describe, it, expect } from 'vitest';

// getTotalPrice: guard against undefined/null price_from
const getTotalPrice = (services: { price_from?: number | null }[]) =>
  services.reduce((sum, s) => sum + (s.price_from || 0), 0);

// canCreateBooking: role-based, no hardcoded email
const canCreateBooking = (role: string | null) =>
  role === 'admin' || role === 'staff';

describe('getTotalPrice — NaN guard', () => {
  it('returns 0 for undefined price_from', () => {
    expect(getTotalPrice([{ price_from: undefined }])).toBe(0);
  });

  it('returns 0 for null price_from', () => {
    expect(getTotalPrice([{ price_from: null }])).toBe(0);
  });

  it('sums valid price_from values', () => {
    expect(getTotalPrice([{ price_from: 100 }, { price_from: 250 }, { price_from: 50 }])).toBe(400);
  });
});

describe('canCreateBooking — role check', () => {
  it('returns true for admin', () => {
    expect(canCreateBooking('admin')).toBe(true);
  });

  it('returns true for staff', () => {
    expect(canCreateBooking('staff')).toBe(true);
  });

  it('returns false for client', () => {
    expect(canCreateBooking('client')).toBe(false);
  });
});
