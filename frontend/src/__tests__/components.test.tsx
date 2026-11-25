import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AuthGate from '@/components/AuthGate';
import LedgerTables from '@/components/LedgerTables';
import PipelineFlow from '@/components/PipelineFlow';
import ClintSaver from '@/components/ClintSaver';
import { LedgerEntry } from '@/lib/carbon';

const mockLedger: LedgerEntry[] = [
  {
    id: 'test-1',
    source: 'plaid',
    timestamp: '2026-10-11T10:00:00.000Z',
    title: 'Cafe Coffee Day',
    amount: 320,
    unit: 'INR',
    category: 'Dining',
    subcategory: 'dining.coffee',
    carbonFactor: 0.007,
    carbonFootprint: 2.24,
    reasoning: 'Coffee shop coefficient applied',
  },
  {
    id: 'test-2',
    source: 'maps',
    timestamp: '2026-10-11T12:00:00.000Z',
    title: 'Delhi Metro Commute',
    amount: 18,
    unit: 'KM',
    category: 'Transit',
    subcategory: 'transit.train',
    carbonFactor: 0.035,
    carbonFootprint: 0.63,
    reasoning: 'Electric rail coefficient applied',
  },
];

describe('UI Components & Accessibility Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders AuthGate with accessible labels, tabs, and password visibility toggle', () => {
    const onAuth = vi.fn();
    render(<AuthGate onAuthenticate={onAuth} />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: /authentication mode/i })).toBeInTheDocument();

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^passphrase$/i);
    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByRole('button', { name: /show passphrase/i });
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');

    const registerTab = screen.getByRole('tab', { name: /synchronize biome/i });
    fireEvent.click(registerTab);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });

  it('renders LedgerTables in INR (₹) and filters entries accessibly', () => {
    const onClear = vi.fn();
    render(<LedgerTables ledger={mockLedger} onClear={onClear} />);

    expect(screen.getByText('₹320.00')).toBeInTheDocument();
    expect(screen.getByText('18 KM')).toBeInTheDocument();

    const searchInput = screen.getByLabelText(/search ledger transactions/i);
    fireEvent.change(searchInput, { target: { value: 'Metro' } });

    expect(screen.queryByText('Cafe Coffee Day')).not.toBeInTheDocument();
    expect(screen.getByText('Delhi Metro Commute')).toBeInTheDocument();
  });

  it('renders PipelineFlow forms with associated labels and INR telemetry', () => {
    const onNewEntry = vi.fn();
    render(<PipelineFlow onNewEntry={onNewEntry} userEmail="auditor@test.in" />);

    expect(screen.getByLabelText(/amount spent \(₹ inr\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/distance traveled \(km\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/usage \/ generation \(kwh\)/i)).toBeInTheDocument();
  });

  it('opens and closes ClintSaver AI Copilot dialog accessibly', () => {
    render(
      <ClintSaver
        stats={{
          totalCarbon: 2.87,
          carbonBySource: { plaid: 2.24, maps: 0.63, homeassistant: 0 },
          carbonByCategory: { Dining: 2.24, Transit: 0.63 },
          dailyTrend: [],
          weeklySavingRate: 99.3,
          carbonBudget: 400,
          isNormal: true,
        }}
        ledger={mockLedger}
      />
    );

    const openBtn = screen.getByRole('button', { name: /open clint-saver ai copilot/i });
    fireEvent.click(openBtn);

    const dialog = screen.getByRole('dialog', { name: /clint-saver ai copilot/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText(/ask clint-saver/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /close clint-saver ai copilot/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
