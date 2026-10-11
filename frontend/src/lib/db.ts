import { LedgerEntry, RawEvent, processRawEvent } from './carbon';

const DEMO_FOUNDER_EMAIL = 'siddharth@dubey.me';
const DEMO_ADMIN_EMAIL = 'clintech0515@gmail.com';

// Helper to determine active authenticated user email
export function getActiveUserEmail(): string {
  if (typeof window === 'undefined') return '';
  try {
    const stored = localStorage.getItem('clint_envo_active_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.email) {
        return parsed.email.toLowerCase().trim();
      }
    }
  } catch (e) {
    // ignore
  }
  return '';
}

export function getUserStorageKey(email?: string): string {
  const currentEmail = (email || getActiveUserEmail()).toLowerCase().trim();
  return currentEmail ? `clint_envo_ledger_${currentEmail}` : 'clint_envo_ledger_guest';
}

export function getUserBudgetKey(email?: string): string {
  const currentEmail = (email || getActiveUserEmail()).toLowerCase().trim();
  return currentEmail ? `clint_envo_budget_${currentEmail}` : 'clint_envo_budget_guest';
}

export function getUserOnboardingKey(email?: string): string {
  const currentEmail = (email || getActiveUserEmail()).toLowerCase().trim();
  return currentEmail ? `clint_envo_onboarding_${currentEmail}` : 'clint_envo_onboarding_guest';
}

export function getUserAuditKey(email?: string): string {
  const currentEmail = (email || getActiveUserEmail()).toLowerCase().trim();
  return currentEmail ? `clint_envo_audit_${currentEmail}` : 'clint_envo_audit_guest';
}

// Seed initial ledger transactions ONLY for the demo founder account showcase
const BASE_MOCK_EVENTS: RawEvent[] = [
  {
    id: 'seed-founder-1',
    source: 'plaid',
    timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 320.00,
    title: 'Cafe Coffee Day / Blue Tokai',
    rawDetails: 'Payment Gateway: Cafe Coffee Day, Connaught Place, New Delhi (₹320)'
  },
  {
    id: 'seed-founder-2',
    source: 'maps',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 18.5,
    title: 'Delhi Metro Commute',
    rawDetails: 'Google Maps Timeline: Delhi Metro Yellow Line, Millennium City to Kashmere Gate (18.5 KM)'
  },
  {
    id: 'seed-founder-3',
    source: 'homeassistant',
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 22.4,
    title: 'Grid Energy Ingest',
    rawDetails: 'HomeAssistant Webhook: Active household consumption (22.4 kWh, BSES Delhi regional grid mix)'
  },
  {
    id: 'seed-founder-4',
    source: 'plaid',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 3450.00,
    title: 'AWS Cloud Services Mumbai',
    rawDetails: 'Payment Gateway: Amazon Web Services Cloud (ap-south-1 Mumbai, ₹3,450)'
  },
  {
    id: 'seed-founder-5',
    source: 'plaid',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 450.00,
    title: 'McDonalds Meal',
    rawDetails: 'Payment Gateway: McDonalds India #112, Burger & Fries (₹450)'
  },
  {
    id: 'seed-founder-6',
    source: 'maps',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 1150,
    title: 'Business Trip Flight (DEL - BOM)',
    rawDetails: 'Google Maps Timeline: Domestic Flight New Delhi (DEL) to Mumbai (BOM) (1150 KM)'
  },
  {
    id: 'seed-founder-7',
    source: 'plaid',
    timestamp: new Date().toISOString(),
    amount: 380.00,
    title: 'Pure Veg / Organic Dining',
    rawDetails: 'Payment Gateway: Organic Harvest Cafe, Bengaluru (₹380)'
  },
  {
    id: 'seed-founder-8',
    source: 'homeassistant',
    timestamp: new Date().toISOString(),
    amount: 12.0,
    title: 'Rooftop Solar Array Ingest',
    rawDetails: 'HomeAssistant Webhook: Rooftop Solar array clean generation offset (12.0 kWh, green)'
  }
];

export function getLedger(email?: string): LedgerEntry[] {
  if (typeof window === 'undefined') return [];
  const currentEmail = (email || getActiveUserEmail()).toLowerCase().trim();
  const key = getUserStorageKey(currentEmail);
  const stored = localStorage.getItem(key);

  const isDemoAccount = currentEmail === DEMO_FOUNDER_EMAIL || currentEmail === DEMO_ADMIN_EMAIL;

  if (!stored) {
    // If demo founder account, load the rich baseline transactions for reviewer evaluation
    if (isDemoAccount) {
      const processed = BASE_MOCK_EVENTS.map(processRawEvent);
      localStorage.setItem(key, JSON.stringify(processed));
      return processed;
    }

    // Check if user has saved ledger inside clint_envo_users list
    const usersStr = localStorage.getItem('clint_envo_users');
    if (usersStr && currentEmail) {
      try {
        const users = JSON.parse(usersStr);
        const found = users.find((u: any) => u.email?.toLowerCase().trim() === currentEmail);
        if (found && Array.isArray(found.ledger)) {
          // Filter out any legacy dummy seeds so real accounts don't see another account's history
          const cleaned = found.ledger.filter((e: any) => !e.id?.startsWith('seed-'));
          localStorage.setItem(key, JSON.stringify(cleaned));
          return cleaned;
        }
      } catch (e) {}
    }

    // Normal accounts start strictly with their own clean, empty ledger
    localStorage.setItem(key, JSON.stringify([]));
    return [];
  }

  try {
    const parsed = JSON.parse(stored) as LedgerEntry[];
    
    // For non-demo users, purge any legacy seed-* events that may have leaked from previous versions
    const filtered = isDemoAccount 
      ? parsed 
      : parsed.filter(entry => entry && entry.id && !entry.id.startsWith('seed-'));

    const isCorrupt = filtered.some(entry => 
      !entry || 
      isNaN(entry.carbonFootprint) || 
      !isFinite(entry.carbonFootprint) || 
      entry.carbonFootprint > 1000000 || 
      entry.amount > 1000000
    );
    
    if (isCorrupt) {
      const resetVal = isDemoAccount ? BASE_MOCK_EVENTS.map(processRawEvent) : [];
      localStorage.setItem(key, JSON.stringify(resetVal));
      return resetVal;
    }

    const unique: LedgerEntry[] = [];
    const seen = new Set<string>();
    
    for (const entry of filtered) {
      if (entry && entry.id && !seen.has(entry.id)) {
        seen.add(entry.id);
        unique.push(entry);
      }
    }
    
    if (unique.length !== parsed.length) {
      localStorage.setItem(key, JSON.stringify(unique));
    }
    return unique;
  } catch (e) {
    console.error('Failed to parse ledger from storage', e);
    return [];
  }
}

export function saveLedger(ledger: LedgerEntry[], email?: string): void {
  if (typeof window === 'undefined') return;
  const currentEmail = (email || getActiveUserEmail()).toLowerCase().trim();
  const key = getUserStorageKey(currentEmail);
  localStorage.setItem(key, JSON.stringify(ledger));

  // Keep user ledger synchronized inside clint_envo_users list
  try {
    const usersStr = localStorage.getItem('clint_envo_users');
    if (usersStr && currentEmail) {
      const users = JSON.parse(usersStr);
      const idx = users.findIndex((u: any) => u.email?.toLowerCase().trim() === currentEmail);
      if (idx !== -1) {
        users[idx].ledger = ledger;
        localStorage.setItem('clint_envo_users', JSON.stringify(users));
      }
    }
  } catch (e) {}
  
  // Asynchronously synchronize with backend cloud node if authenticated
  syncLedgerToBackend(ledger, currentEmail);
}

export function addRawEvent(raw: RawEvent, email?: string): LedgerEntry {
  const currentEmail = (email || getActiveUserEmail()).toLowerCase().trim();
  const current = getLedger(currentEmail);
  const exists = current.some(e => e.id === raw.id);
  const processed = processRawEvent(raw);
  
  if (exists) {
    return processed;
  }
  
  const updated = [processed, ...current];
  saveLedger(updated, currentEmail);
  return processed;
}

export function clearLedger(email?: string): void {
  if (typeof window === 'undefined') return;
  const currentEmail = (email || getActiveUserEmail()).toLowerCase().trim();
  const key = getUserStorageKey(currentEmail);
  localStorage.setItem(key, JSON.stringify([]));

  try {
    const usersStr = localStorage.getItem('clint_envo_users');
    if (usersStr && currentEmail) {
      const users = JSON.parse(usersStr);
      const idx = users.findIndex((u: any) => u.email?.toLowerCase().trim() === currentEmail);
      if (idx !== -1) {
        users[idx].ledger = [];
        localStorage.setItem('clint_envo_users', JSON.stringify(users));
      }
    }
  } catch (e) {}

  syncLedgerToBackend([], currentEmail);
}

export function getOnboardingStatus(email?: string): boolean {
  if (typeof window === 'undefined') return false;
  const key = getUserOnboardingKey(email);
  return localStorage.getItem(key) === 'true';
}

export function setOnboardingStatus(sent: boolean, email?: string): void {
  if (typeof window === 'undefined') return;
  const key = getUserOnboardingKey(email);
  localStorage.setItem(key, sent ? 'true' : 'false');
}

export interface LedgerStats {
  totalCarbon: number; // in kg CO2e
  carbonBySource: Record<string, number>;
  carbonByCategory: Record<string, number>;
  dailyTrend: { date: string; amount: number }[];
  weeklySavingRate: number; // relative to budget
  carbonBudget: number; // 400 kg CO2e per week
  isNormal: boolean; // green vs orange/grey shader flag
}

export function getCarbonBudget(email?: string): number {
  if (typeof window === 'undefined') return 400;
  const currentEmail = (email || getActiveUserEmail()).toLowerCase().trim();
  const key = getUserBudgetKey(currentEmail);
  const saved = localStorage.getItem(key);
  if (saved) return parseInt(saved, 10);

  try {
    const usersStr = localStorage.getItem('clint_envo_users');
    if (usersStr && currentEmail) {
      const users = JSON.parse(usersStr);
      const found = users.find((u: any) => u.email?.toLowerCase().trim() === currentEmail);
      if (found && typeof found.budget === 'number') {
        localStorage.setItem(key, found.budget.toString());
        return found.budget;
      }
    }
  } catch (e) {}

  return 400;
}

export function saveCarbonBudget(budget: number, email?: string): void {
  if (typeof window === 'undefined') return;
  const currentEmail = (email || getActiveUserEmail()).toLowerCase().trim();
  const key = getUserBudgetKey(currentEmail);
  localStorage.setItem(key, budget.toString());

  try {
    const usersStr = localStorage.getItem('clint_envo_users');
    if (usersStr && currentEmail) {
      const users = JSON.parse(usersStr);
      const idx = users.findIndex((u: any) => u.email?.toLowerCase().trim() === currentEmail);
      if (idx !== -1) {
        users[idx].budget = budget;
        localStorage.setItem('clint_envo_users', JSON.stringify(users));
      }
    }
  } catch (e) {}

  syncLedgerToBackend(getLedger(currentEmail), currentEmail, budget);
}

export function getStats(email?: string): LedgerStats {
  const currentEmail = (email || getActiveUserEmail()).toLowerCase().trim();
  const ledger = getLedger(currentEmail);
  const carbonBudget = getCarbonBudget(currentEmail);
  
  let totalCarbon = 0;
  const carbonBySource: Record<string, number> = { plaid: 0, maps: 0, homeassistant: 0 };
  const carbonByCategory: Record<string, number> = {};
  
  // Daily trends calculation for the last 7 days
  const dailyRecord: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dailyRecord[dateStr] = 0;
  }

  ledger.forEach(entry => {
    totalCarbon += entry.carbonFootprint;
    if (carbonBySource[entry.source] !== undefined) {
      carbonBySource[entry.source] += entry.carbonFootprint;
    }
    
    carbonByCategory[entry.category] = (carbonByCategory[entry.category] || 0) + entry.carbonFootprint;
    
    // Group into dates
    const dateStr = new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (dailyRecord[dateStr] !== undefined) {
      dailyRecord[dateStr] += entry.carbonFootprint;
    }
  });

  const dailyTrend = Object.keys(dailyRecord).map(date => ({
    date,
    amount: Number(dailyRecord[date].toFixed(1))
  }));

  // Clean rounding
  totalCarbon = Number(totalCarbon.toFixed(1));
  Object.keys(carbonBySource).forEach(k => {
    carbonBySource[k] = Number(carbonBySource[k].toFixed(1));
  });
  Object.keys(carbonByCategory).forEach(k => {
    carbonByCategory[k] = Number(carbonByCategory[k].toFixed(1));
  });

  // Saving rate = percentage below budget
  const diff = carbonBudget - totalCarbon;
  const weeklySavingRate = Number(((diff / carbonBudget) * 100).toFixed(1));

  // Determine if ecological footprint is healthy
  const isNormal = totalCarbon <= carbonBudget;

  return {
    totalCarbon,
    carbonBySource,
    carbonByCategory,
    dailyTrend,
    weeklySavingRate,
    carbonBudget,
    isNormal
  };
}

export interface UserReportSummary {
  userEmail: string;
  userName: string;
  generatedAt: string;
  totalCarbon: number;
  carbonBudget: number;
  weeklySavingRate: number;
  isNormal: boolean;
  carbonByCategory: Record<string, number>;
  carbonBySource: Record<string, number>;
  dailyTrend: { date: string; amount: number }[];
  transactionCount: number;
  latestTransactions: LedgerEntry[];
}

export function generateUserReport(email?: string, name?: string): UserReportSummary {
  const currentEmail = (email || getActiveUserEmail()).toLowerCase().trim();
  const currentStats = getStats(currentEmail);
  const currentLedger = getLedger(currentEmail);
  
  return {
    userEmail: currentEmail,
    userName: name || (currentEmail ? currentEmail.split('@')[0] : 'Operator'),
    generatedAt: new Date().toISOString(),
    totalCarbon: currentStats.totalCarbon,
    carbonBudget: currentStats.carbonBudget,
    weeklySavingRate: currentStats.weeklySavingRate,
    isNormal: currentStats.isNormal,
    carbonByCategory: currentStats.carbonByCategory,
    carbonBySource: currentStats.carbonBySource,
    dailyTrend: currentStats.dailyTrend,
    transactionCount: currentLedger.length,
    latestTransactions: currentLedger.slice(0, 10)
  };
}

// Asynchronously sync to backend cloud node
export async function syncLedgerToBackend(ledger: LedgerEntry[], email?: string, budget?: number): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const token = localStorage.getItem('clint_token');
    if (!token) return;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || (window.location.hostname.includes('localhost') ? 'http://localhost:5000' : 'https://clint-envo.onrender.com');
    await fetch(`${backendUrl}/api/user/ledger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ledger,
        budget: budget ?? getCarbonBudget(email)
      })
    });
  } catch (e) {
    // Non-blocking offline-first
  }
}
