import { LedgerEntry, RawEvent, processRawEvent } from './carbon';

const STORAGE_KEY = 'clint_envo_ledger';
const ONBOARDING_SENT_KEY = 'clint_envo_onboarding_sent';
const BUDGET_KEY = 'clint_envo_budget';

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
  return currentEmail ? `clint_envo_ledger_${currentEmail}` : STORAGE_KEY;
}

export function getUserBudgetKey(email?: string): string {
  const currentEmail = (email || getActiveUserEmail()).toLowerCase().trim();
  return currentEmail ? `clint_envo_budget_${currentEmail}` : BUDGET_KEY;
}

export function getUserOnboardingKey(email?: string): string {
  const currentEmail = (email || getActiveUserEmail()).toLowerCase().trim();
  return currentEmail ? `clint_envo_onboarding_${currentEmail}` : ONBOARDING_SENT_KEY;
}

export function getUserAuditKey(email?: string): string {
  const currentEmail = (email || getActiveUserEmail()).toLowerCase().trim();
  return currentEmail ? `clint_envo_audit_${currentEmail}` : 'clint_envo_audit';
}

// Seed initial ledger transactions for first-time use
const BASE_MOCK_EVENTS: RawEvent[] = [
  {
    id: 'seed-1',
    source: 'plaid',
    timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
    amount: 320.00,
    title: 'Cafe Coffee Day / Blue Tokai',
    rawDetails: 'Payment Gateway: Cafe Coffee Day, Connaught Place, New Delhi (₹320)'
  },
  {
    id: 'seed-2',
    source: 'maps',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    amount: 18.5,
    title: 'Delhi Metro Commute',
    rawDetails: 'Google Maps Timeline: Delhi Metro Yellow Line, Millennium City to Kashmere Gate (18.5 KM)'
  },
  {
    id: 'seed-3',
    source: 'homeassistant',
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    amount: 22.4,
    title: 'Grid Energy Ingest',
    rawDetails: 'HomeAssistant Webhook: Active household consumption (22.4 kWh, BSES Delhi regional grid mix)'
  },
  {
    id: 'seed-4',
    source: 'plaid',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    amount: 3450.00,
    title: 'AWS Cloud Services Mumbai',
    rawDetails: 'Payment Gateway: Amazon Web Services Cloud (ap-south-1 Mumbai, ₹3,450)'
  },
  {
    id: 'seed-5',
    source: 'plaid',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    amount: 450.00,
    title: 'McDonalds Meal',
    rawDetails: 'Payment Gateway: McDonalds India #112, Burger & Fries (₹450)'
  },
  {
    id: 'seed-6',
    source: 'maps',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    amount: 1150,
    title: 'Business Trip Flight (DEL - BOM)',
    rawDetails: 'Google Maps Timeline: Domestic Flight New Delhi (DEL) to Mumbai (BOM) (1150 KM)'
  },
  {
    id: 'seed-7',
    source: 'plaid',
    timestamp: new Date().toISOString(), // Today
    amount: 380.00,
    title: 'Pure Veg / Organic Dining',
    rawDetails: 'Payment Gateway: Organic Harvest Cafe, Bengaluru (₹380)'
  },
  {
    id: 'seed-8',
    source: 'homeassistant',
    timestamp: new Date().toISOString(), // Today
    amount: 12.0,
    title: 'Rooftop Solar Array Ingest',
    rawDetails: 'HomeAssistant Webhook: Rooftop Solar array clean generation offset (12.0 kWh, green)'
  }
];

// Initialize clean personalized baseline history for a newly registered user
export function initNewUserLedger(email: string, userName?: string): LedgerEntry[] {
  if (typeof window === 'undefined') return [];
  const key = getUserStorageKey(email);
  const cleanEmail = email.toLowerCase().trim();
  const displayName = userName || cleanEmail.split('@')[0];

  const userSeedEvents: RawEvent[] = [
    {
      id: `seed-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}-1`,
      source: 'plaid',
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 320.00,
      title: `${displayName}: Cafe Coffee Day Connaught Place`,
      rawDetails: `Payment Gateway: Welcome baseline transaction for ${displayName} (₹320)`
    },
    {
      id: `seed-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}-2`,
      source: 'maps',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 18.5,
      title: `${displayName}: Delhi Metro Commute`,
      rawDetails: `Google Maps Timeline: Baseline transit route for ${displayName} (18.5 KM)`
    },
    {
      id: `seed-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}-3`,
      source: 'homeassistant',
      timestamp: new Date().toISOString(),
      amount: 22.4,
      title: `${displayName}: Household Smart Meter Ingest`,
      rawDetails: `HomeAssistant Webhook: Smart grid baseline ingest for ${displayName} (22.4 kWh)`
    }
  ];

  const processed = userSeedEvents.map(processRawEvent);
  localStorage.setItem(key, JSON.stringify(processed));
  return processed;
}

export function getLedger(email?: string): LedgerEntry[] {
  if (typeof window === 'undefined') return [];
  const key = getUserStorageKey(email);
  let stored = localStorage.getItem(key);

  if (!stored) {
    const currentEmail = (email || getActiveUserEmail()).toLowerCase().trim();

    // If legacy ledger exists and user is founder/admin/first-run, migrate it
    const legacy = localStorage.getItem(STORAGE_KEY);
    if (legacy && (!currentEmail || currentEmail === 'siddharth@dubey.me' || currentEmail === 'clintech0515@gmail.com')) {
      try {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localStorage.setItem(key, legacy);
          return parsed;
        }
      } catch (e) {
        // ignore
      }
    }

    // If a brand new user registers, initialize their personal baseline
    if (currentEmail) {
      let userName = '';
      const activeStr = localStorage.getItem('clint_envo_active_user');
      if (activeStr) {
        try {
          const user = JSON.parse(activeStr);
          if (user.email?.toLowerCase().trim() === currentEmail) {
            userName = user.name;
          }
        } catch (e) {}
      }
      return initNewUserLedger(currentEmail, userName);
    }

    // Default seed fallback
    const processed = BASE_MOCK_EVENTS.map(processRawEvent);
    localStorage.setItem(key, JSON.stringify(processed));
    return processed;
  }

  try {
    const parsed = JSON.parse(stored) as LedgerEntry[];
    
    // Check if the ledger is corrupted/crazy
    const isCorrupt = parsed.some(entry => 
      !entry || 
      isNaN(entry.carbonFootprint) || 
      !isFinite(entry.carbonFootprint) || 
      entry.carbonFootprint > 1000000 || 
      entry.amount > 1000000
    );
    
    if (isCorrupt) {
      const processed = BASE_MOCK_EVENTS.map(processRawEvent);
      localStorage.setItem(key, JSON.stringify(processed));
      return processed;
    }

    const unique: LedgerEntry[] = [];
    const seen = new Set<string>();
    
    for (const entry of parsed) {
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
  const key = getUserStorageKey(email);
  localStorage.setItem(key, JSON.stringify(ledger));
  
  // Asynchronously synchronize with backend cloud node if authenticated
  syncLedgerToBackend(ledger, email);
}

export function addRawEvent(raw: RawEvent, email?: string): LedgerEntry {
  const current = getLedger(email);
  const exists = current.some(e => e.id === raw.id);
  const processed = processRawEvent(raw);
  
  if (exists) {
    return processed; // prevent duplicate clicks
  }
  
  const updated = [processed, ...current];
  saveLedger(updated, email);
  return processed;
}

export function clearLedger(email?: string): void {
  if (typeof window === 'undefined') return;
  const key = getUserStorageKey(email);
  localStorage.setItem(key, JSON.stringify([]));
  syncLedgerToBackend([], email);
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
  const key = getUserBudgetKey(email);
  const saved = localStorage.getItem(key);
  return saved ? parseInt(saved, 10) : 400;
}

export function saveCarbonBudget(budget: number, email?: string): void {
  if (typeof window === 'undefined') return;
  const key = getUserBudgetKey(email);
  localStorage.setItem(key, budget.toString());
  syncLedgerToBackend(getLedger(email), email, budget);
}

export function getStats(email?: string): LedgerStats {
  const ledger = getLedger(email);
  const carbonBudget = getCarbonBudget(email);
  
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
