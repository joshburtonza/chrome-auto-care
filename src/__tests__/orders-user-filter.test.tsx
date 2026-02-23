import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted ensures these are available when vi.mock factories execute
const { mockSupabase, mockQueryBuilder } = vi.hoisted(() => {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
  return {
    mockQueryBuilder,
    mockSupabase: { from: vi.fn(() => mockQueryBuilder) },
  };
});

// Mutable so the null-user test can swap it before rendering
let currentUser: { id: string } | null = { id: 'test-user-id' };

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: currentUser, session: null, userRole: null, loading: false }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useLocation: () => ({ pathname: '/' }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

vi.mock('@/components/client/ClientNav', () => ({
  ClientNav: () => null,
}));

vi.mock('@/components/chrome/ChromeSurface', () => ({
  ChromeSurface: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

import Orders from '@/pages/Orders';

describe('Orders — user_id filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = { id: 'test-user-id' };
    mockSupabase.from.mockImplementation(() => mockQueryBuilder);
    mockQueryBuilder.select.mockReturnThis();
    mockQueryBuilder.eq.mockReturnThis();
    mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });
  });

  it('calls supabase.from with orders table', async () => {
    render(<Orders />);
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('orders');
    });
  });

  it('filters query by user_id', async () => {
    render(<Orders />);
    await waitFor(() => {
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'test-user-id');
    });
  });

  it('orders results by created_at descending', async () => {
    render(<Orders />);
    await waitFor(() => {
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  it('does not query supabase when user is null', async () => {
    currentUser = null;
    render(<Orders />);
    await waitFor(() => screen.getByText('No orders yet'));
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
});
