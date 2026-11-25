import { describe, it, expect, beforeEach } from 'vitest';
import {
  addRawEvent,
  clearLedger,
  generateUserReport,
  getCarbonBudget,
  getLedger,
  getStats,
  getUserStorageKey,
  saveCarbonBudget,
} from '@/lib/db';

describe('User-Scoped Ledger & Report Isolation (db.ts)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts brand-new non-demo accounts with 0 transactions and 0 kg CO2e', () => {
    const email = 'newuser@india.in';
    const ledger = getLedger(email);
    const stats = getStats(email);

    expect(ledger).toEqual([]);
    expect(stats.totalCarbon).toBe(0);
    expect(stats.weeklySavingRate).toBe(100);
    expect(stats.isNormal).toBe(true);
  });

  it('strictly isolates transactions, budgets, and reports across accounts', () => {
    const userA = 'aarav@example.in';
    const userB = 'meera@example.in';

    addRawEvent(
      {
        id: 'evt-a-1',
        source: 'plaid',
        timestamp: new Date().toISOString(),
        amount: 500,
        title: 'Cafe Coffee Day',
        rawDetails: 'Coffee shop ₹500',
      },
      userA
    );
    saveCarbonBudget(300, userA);

    // User B must see empty ledger and default budget 400
    expect(getLedger(userB)).toEqual([]);
    expect(getCarbonBudget(userB)).toBe(400);

    const reportA = generateUserReport(userA, 'Aarav');
    const reportB = generateUserReport(userB, 'Meera');

    expect(reportA.transactionCount).toBe(1);
    expect(reportA.totalCarbon).toBe(3.5);
    expect(reportB.transactionCount).toBe(0);
    expect(reportB.totalCarbon).toBe(0);
  });

  it('purges legacy seed-* entries for non-demo accounts', () => {
    const regularUser = 'regular@example.in';
    localStorage.setItem(
      getUserStorageKey(regularUser),
      JSON.stringify([
        {
          id: 'seed-legacy-1',
          source: 'plaid',
          timestamp: new Date().toISOString(),
          title: 'Dummy Event',
          amount: 100,
          unit: 'INR',
          category: 'Dining',
          subcategory: 'dining.coffee',
          carbonFactor: 0.007,
          carbonFootprint: 0.7,
          reasoning: 'seed',
        },
      ])
    );

    expect(getLedger(regularUser)).toEqual([]);
  });

  it('loads showcase seed transactions for the founder demo account', () => {
    const founderLedger = getLedger('siddharth@dubey.me');
    expect(founderLedger.length).toBeGreaterThan(0);
  });

  it('clears only the targeted user ledger without affecting others', () => {
    const userA = 'usera@example.in';
    const userB = 'userb@example.in';

    addRawEvent(
      {
        id: 'a-1',
        source: 'maps',
        timestamp: new Date().toISOString(),
        amount: 10,
        title: 'Delhi Metro',
        rawDetails: 'Metro commute',
      },
      userA
    );
    addRawEvent(
      {
        id: 'b-1',
        source: 'maps',
        timestamp: new Date().toISOString(),
        amount: 10,
        title: 'Mumbai Metro',
        rawDetails: 'Metro commute',
      },
      userB
    );

    clearLedger(userA);
    expect(getLedger(userA)).toEqual([]);
    expect(getLedger(userB)).toHaveLength(1);
  });
});
