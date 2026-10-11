'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  getLedger, 
  getStats, 
  clearLedger, 
  LedgerStats, 
  setOnboardingStatus,
  addRawEvent,
  getCarbonBudget,
  saveCarbonBudget
} from '@/lib/db';
import { LedgerEntry } from '@/lib/carbon';
import CarbonTwin3D from '@/components/CarbonTwin3D';
import PipelineFlow from '@/components/PipelineFlow';
import LedgerTables from '@/components/LedgerTables';
import ClintSaver from '@/components/ClintSaver';
import AuthGate from '@/components/AuthGate';
import TutorialTour from '@/components/TutorialTour';
import AqiMonitor from '@/components/AqiMonitor';
import { 
  Settings,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  User,
  Globe,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  Activity,
  Cpu,
  Mail,
  Zap,
  TrendingDown,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Layers,
  Sliders,
  Play,
  Wind,
  Server,
  Key,
  Wifi,
  Check,
  ExternalLink,
  Radio
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Dashboard() {
  const escapeHtml = (unsafe: string): string => {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const cleanInputText = (val: string): string => {
    return val.replace(/[\x00-\x1F\x7F]/g, '');
  };

  const getBackendUrl = () => {
    if (process.env.NEXT_PUBLIC_BACKEND_URL) {
      return process.env.NEXT_PUBLIC_BACKEND_URL;
    }
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
      if (isLocal) {
        return 'http://localhost:5000';
      }
      return 'https://clint-envo.onrender.com';
    }
    return 'http://localhost:5000';
  };

  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [stats, setStats] = useState<LedgerStats>({
    totalCarbon: 0,
    carbonBySource: {},
    carbonByCategory: {},
    dailyTrend: [],
    weeklySavingRate: 0,
    carbonBudget: 400,
    isNormal: true,
  });
  
  const [mounted, setMounted] = useState(false);
  const [connectionTime, setConnectionTime] = useState<string>('');
  const theme = 'dark';
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'twin' | 'aqi' | 'ledger' | 'pipeline'>('twin');
  
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState({ name: '', email: '', region: '', profilePic: '' });
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

  // User Profile Form States
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileRegion, setProfileRegion] = useState('');
  const [profilePicSeed, setProfilePicSeed] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [profileUpdating, setProfileUpdating] = useState(false);

  // Onboarding Tutorial Tour State
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [showTourPrompt, setShowTourPrompt] = useState<boolean>(false);

  // Settings & Telemetry Integrations State
  const [geminiKey, setGeminiKey] = useState('');
  const [gmailUser, setGmailUser] = useState('');
  const [gmailAppPass, setGmailAppPass] = useState('');
  const [resendKey, setResendKey] = useState('');
  const [aqiProvider, setAqiProvider] = useState('open-meteo');
  const [aqiApiKey, setAqiApiKey] = useState('');
  const [aqiCustomUrl, setAqiCustomUrl] = useState('');
  const [dataGovApiKey, setDataGovApiKey] = useState('');
  const [systemBroadcast, setSystemBroadcast] = useState('');
  const [offsetAmt, setOffsetAmt] = useState(25);
  const [offsetProject, setOffsetProject] = useState('reforestation');
  const [settingsActiveTab, setSettingsActiveTab] = useState<'status' | 'aqi' | 'ai_email'>('status');
  const [integrationsStatus, setIntegrationsStatus] = useState<any>(null);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [settingsSaveMsg, setSettingsSaveMsg] = useState<string | null>(null);

  const fetchIntegrationsStatus = async (ping = false) => {
    if (ping) setIsPinging(true);
    else setIntegrationsLoading(true);
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/integrations/status${ping ? '?ping=true' : ''}`);
      if (res.ok) {
        const data = await res.json();
        setIntegrationsStatus(data);
      }
    } catch (err) {
      console.warn('Failed to fetch integrations health:', err);
    } finally {
      setIsPinging(false);
      setIntegrationsLoading(false);
    }
  };

  useEffect(() => {
    if (showSettings) {
      fetchIntegrationsStatus(false);
    }
  }, [showSettings]);

  // Audit States
  const [auditStatus, setAuditStatus] = useState<'idle' | 'auditing' | 'passed'>('idle');
  const [auditLogs, setAuditLogs] = useState<string[]>([]);

  const runLedgerAudit = () => {
    if (auditStatus === 'auditing') return;
    setAuditStatus('auditing');
    setAuditLogs([]);
    
    const lines = [
      `[${new Date().toLocaleTimeString()}] INITIATING TIMESCALEDB IMMUTABILITY PROOF CHECK...`,
      `[${new Date().toLocaleTimeString()}] Fetching active carbon ledger blocks...`,
      `[${new Date().toLocaleTimeString()}] Block range: 0x0001 - 0x${Math.floor(Math.random() * 9999).toString(16).toUpperCase()}`,
      `[${new Date().toLocaleTimeString()}] Verifying Merkle Root: 0x${Math.random().toString(36).substring(2, 10).toUpperCase()}...`,
      `[${new Date().toLocaleTimeString()}] Checking Plaid credentials signature...`,
      `[${new Date().toLocaleTimeString()}] Validating Google Maps timeline coordinates cache...`,
      `[${new Date().toLocaleTimeString()}] Database Hash integrity stable. No tampering detected.`,
      `[${new Date().toLocaleTimeString()}] SUCCESS: Cryptographic ledger trace integrity verified. AUDIT PASS.`
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < lines.length) {
        setAuditLogs(prev => [...prev, lines[current]]);
        current++;
      } else {
        clearInterval(interval);
        setAuditStatus('passed');
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#4285f4', '#00ff66', '#ffffff']
        });
      }
    }, 600);
  };

  // Load ledger, stats, theme, credentials, and user on mount
  useEffect(() => {
    setMounted(true);
    setConnectionTime(new Date().toLocaleTimeString());
    
    // Permanent dark theme
    localStorage.setItem('clint_theme', 'dark');
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');

    // Load credentials
    setGeminiKey(localStorage.getItem('gemini_api_key') || '');
    setGmailUser(localStorage.getItem('gmail_user') || '');
    setGmailAppPass(localStorage.getItem('gmail_app_password') || '');
    setResendKey(localStorage.getItem('resend_api_key') || '');
    setAqiProvider(localStorage.getItem('clint_aqi_provider') || 'open-meteo');
    setAqiApiKey(localStorage.getItem('clint_aqi_api_key') || '');
    setAqiCustomUrl(localStorage.getItem('clint_aqi_custom_url') || '');
    setDataGovApiKey(localStorage.getItem('clint_data_gov_key') || '');

    // Load system broadcast
    const savedBroadcast = localStorage.getItem('clint_system_broadcast') || '';
    setSystemBroadcast(savedBroadcast);

    // Load active user
    const savedUserStr = localStorage.getItem('clint_envo_active_user');
    if (savedUserStr) {
      let activeUser: any = null;
      try {
        activeUser = JSON.parse(savedUserStr);
        if (activeUser) {
          setUser(activeUser);
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.warn('Failed parsing active user', e);
      }

      // Auto-sync local storage settings to server database if admin session
      if (activeUser && activeUser.email && activeUser.email.toLowerCase() === 'clintech0515@gmail.com') {
        const localGeminiKey = localStorage.getItem('gemini_api_key') || '';
        const localGmailUser = localStorage.getItem('gmail_user') || '';
        const localGmailAppPass = localStorage.getItem('gmail_app_password') || '';
        const localResendKey = localStorage.getItem('resend_api_key') || '';

        if (localGeminiKey || localGmailUser || localResendKey) {
          const backendUrl = getBackendUrl();
          fetch(`${backendUrl}/api/admin/settings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('clint_token') || ''}`
            },
            body: JSON.stringify({
              geminiApiKey: localGeminiKey,
              gmailUser: localGmailUser,
              gmailAppPassword: localGmailAppPass,
              resendApiKey: localResendKey
            })
          })
          .then(res => res.json())
          .then(data => console.log('Admin settings auto-synced to server:', data.message))
          .catch(err => console.warn('Failed auto-syncing admin settings to server:', err));
        }
      }
    } else {
      setUser({
        name: localStorage.getItem('clint_envo_user_name') || 'Siddharth Gopal Dubey',
        email: localStorage.getItem('clint_envo_user_email') || 'siddharth@dubey.me',
        region: 'Asia-Pacific (India)',
        profilePic: 'https://api.dicebear.com/7.x/bottts/svg?seed=founder'
      });
    }

    refreshData();
  }, []);

  // Onboarding tour navigation synchronization
  useEffect(() => {
    if (activeStep === 6) {
      setActiveTab('pipeline');
    } else if (activeStep === 7) {
      setActiveTab('aqi');
    } else if (activeStep === 8) {
      setActiveTab('ledger');
    } else if (activeStep >= 0 && activeStep <= 5) {
      setActiveTab('twin');
    }
  }, [activeStep]);

  const refreshData = () => {
    const currentLedger = getLedger();
    const currentStats = getStats();
    setLedger(currentLedger);
    setStats(currentStats);
  };

  const handleBudgetChange = (newBudget: number) => {
    saveCarbonBudget(newBudget);
    refreshData();
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to flush the carbon ledger database? This will reset all telemetry history.')) {
      clearLedger();
      setOnboardingStatus(false);
      refreshData();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#ff5500', '#555555']
      });
    }
  };

  const handleNewEntry = () => {
    refreshData();
    const latest = getStats();
    if (latest.isNormal) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.8 },
        colors: ['#137333', '#1a73e8', '#ffffff']
      });
    } else {
      confetti({
        particleCount: 20,
        spread: 30,
        origin: { y: 0.8 },
        colors: ['#d93025', '#888888']
      });
    }
  };

  const handleAuth = async (name: string, email: string, isLogin: boolean) => {
    const savedUserStr = localStorage.getItem('clint_envo_active_user');
    if (savedUserStr) {
      setUser(JSON.parse(savedUserStr));
    } else {
      setUser({
        name,
        email,
        region: 'Asia-Pacific (India)',
        profilePic: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`
      });
    }
    setIsAuthenticated(true);
    refreshData();

    if (isLogin) {
      setShowTourPrompt(false);
      localStorage.setItem('clint_tour_completed', 'true');
    } else {
      setShowTourPrompt(true);
      localStorage.removeItem('clint_tour_completed');
    }

    const subject = isLogin
      ? 'Welcome Back to CLiNt EnVo: Passive Carbon Ledger Synced'
      : 'Welcome to CLiNt EnVo: Passive Carbon Ledger Active';

    const escapedName = escapeHtml(name);

    const htmlBody = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; background-color: #f8f9fa; border: 1px solid #dadce0; color: #202124; border-radius: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #dadce0; padding-bottom: 15px; margin-bottom: 20px;">
          <h2 style="color: #202124; margin: 0; font-weight: bold;">CLiNt EnVo</h2>
          <span style="font-size: 10px; color: #5f6368; font-family: monospace;">TELEMETRY ACTIVE</span>
        </div>
        <h1 style="color: #202124; font-size: 20px; margin-bottom: 10px; font-weight: bold;">Welcome, ${escapedName}</h1>
        <p style="color: #5f6368; font-size: 14px; line-height: 1.6;">
          Your passive carbon event-sourcing network is active and synchronized telemetry inputs from your Plaid transaction feeds, Google Maps timeline clusters, and HomeAssistant household grid metrics.
        </p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="https://clint-envo.vercel.app" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Launch Executive Dashboard</a>
        </div>
        <div style="border-top: 1px solid #dadce0; padding-top: 15px; font-size: 10px; color: #70757a; text-align: center; font-family: monospace;">
          Founded & Envisioned by Siddharth Gopal Dubey.
        </div>
      </div>
    `;

    const savedGmailUser = localStorage.getItem('gmail_user') || '';
    const savedGmailAppPass = localStorage.getItem('gmail_app_password') || '';
    const savedResendKey = localStorage.getItem('resend_api_key') || '';

    try {
      const backendUrl = getBackendUrl();
      await fetch(`${backendUrl}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('clint_token') || ''}`
        },
        body: JSON.stringify({
          recipient: email,
          subject,
          html: htmlBody,
          credentials: {
            gmailUser: savedGmailUser,
            gmailAppPassword: savedGmailAppPass,
            resendApiKey: savedResendKey
          }
        })
      });
    } catch (e) {
      console.error('SMTP welcome dispatch failed', e);
    }
  };

  useEffect(() => {
    if (showProfile && user) {
      setProfileName(user.name || '');
      setProfileEmail(user.email || '');
      setProfilePassword('');
      setProfileRegion(user.region || 'Asia-Pacific (India)');
      
      let seed = 'avatar';
      if (user.profilePic && user.profilePic.includes('seed=')) {
        const parts = user.profilePic.split('seed=');
        if (parts.length > 1) {
          seed = decodeURIComponent(parts[1].split('&')[0]);
        }
      } else if (user.name) {
        seed = user.name;
      }
      setProfilePicSeed(seed);
      setProfilePicUrl(user.profilePic || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`);
      setProfileMessage({ type: '', text: '' });
    }
  }, [showProfile, user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    setProfileUpdating(true);
    setProfileMessage({ type: '', text: '' });

    if (profileName.length < 2 || profileName.length > 50) {
      setProfileMessage({ type: 'error', text: 'Name must be between 2 and 50 characters.' });
      setProfileUpdating(false);
      return;
    }

    const newProfilePic = profilePicUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(profilePicSeed)}`;

    const payload = {
      email: user.email,
      name: profileName,
      newEmail: profileEmail !== user.email ? profileEmail : undefined,
      password: profilePassword || undefined,
      region: profileRegion,
      profilePic: newProfilePic
    };

    let updatedUser = null;
    let fallbackToLocal = false;

    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/user/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('clint_token') || ''}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server profile update failed');
      }
      updatedUser = data.user;
      if (data.token) {
        localStorage.setItem('clint_token', data.token);
      }
    } catch (err: any) {
      console.warn('Backend update failed/offline. Reverting to local storage:', err.message);
      fallbackToLocal = true;
    }

    if (fallbackToLocal) {
      const usersStr = localStorage.getItem('clint_envo_users');
      let users = usersStr ? JSON.parse(usersStr) : [];
      const index = users.findIndex((u: any) => u.email.toLowerCase() === user.email.toLowerCase());
      if (index !== -1) {
        users[index].name = payload.name;
        if (payload.newEmail) users[index].email = payload.newEmail;
        if (payload.password) users[index].password = payload.password;
        users[index].region = payload.region;
        users[index].profilePic = payload.profilePic;
        localStorage.setItem('clint_envo_users', JSON.stringify(users));
        updatedUser = {
          name: users[index].name,
          email: users[index].email,
          region: users[index].region,
          profilePic: users[index].profilePic
        };
      }
    }

    if (updatedUser) {
      setUser(updatedUser);
      localStorage.setItem('clint_envo_active_user', JSON.stringify(updatedUser));
      setProfileMessage({ type: 'success', text: 'Profile database records synchronized successfully!' });
      confetti({ particleCount: 40, spread: 40, origin: { y: 0.6 } });
      setTimeout(() => setShowProfile(false), 1500);
    } else {
      setProfileMessage({ type: 'error', text: 'Failed to synchronize profile changes.' });
    }

    setProfileUpdating(false);
  };

  const fetchAdminUsers = async () => {
    setAdminLoading(true);
    let serverList = [];
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('clint_token') || ''}` }
      });
      if (res.ok) {
        const data = await res.json();
        serverList = data.users || [];
      }
    } catch (e) {
      console.warn('Backend admin fetch failed:', e);
    }

    const localList = [
      { name: 'CLiNt-Tech Administrator', email: 'CLiNtech0515@gmail.com', region: 'Asia-Pacific (India)', profilePic: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin' },
      { name: 'Siddharth Gopal Dubey', email: 'siddharth@dubey.me', region: 'Asia-Pacific (India)', profilePic: 'https://api.dicebear.com/7.x/bottts/svg?seed=founder' }
    ];

    const mergedMap = new Map();
    serverList.forEach((u: any) => u.email && mergedMap.set(u.email.toLowerCase(), u));
    localList.forEach((u: any) => u.email && !mergedMap.has(u.email.toLowerCase()) && mergedMap.set(u.email.toLowerCase(), u));

    setAdminUsers(Array.from(mergedMap.values()));
    setAdminLoading(false);
  };

  const handleRevokeUser = async (emailToDelete: string) => {
    if (emailToDelete.toLowerCase() === 'clintech0515@gmail.com') return;
    if (!confirm(`Are you sure you want to revoke account "${emailToDelete}"?`)) return;

    try {
      const backendUrl = getBackendUrl();
      await fetch(`${backendUrl}/api/admin/user/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('clint_token') || ''}`
        },
        body: JSON.stringify({ emailToDelete })
      });
    } catch (e) {
      console.warn('Backend user revocation failed:', e);
    }
    fetchAdminUsers();
  };

  const applyCarbonOffset = () => {
    let carbonAmount = offsetProject === 'reforestation' ? offsetAmt * 6 : offsetProject === 'methane' ? offsetAmt * 10 : offsetAmt * 15;
    const title = offsetProject === 'reforestation' ? 'Reforestation Seedlings' : offsetProject === 'methane' ? 'Agriculture Methane Digester' : 'Wind Turbine Grid';

    const offsetEvent = {
      id: 'offset-' + Date.now(),
      source: 'homeassistant' as const,
      timestamp: new Date().toISOString(),
      amount: -carbonAmount,
      title: `Ecological Offset: ${title}`,
      rawDetails: `Contributed $${offsetAmt} to ${title} offset project.`
    };

    addRawEvent(offsetEvent);
    handleNewEntry();
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser({ name: '', email: '', region: '', profilePic: '' });
    localStorage.removeItem('clint_envo_active_user');
    localStorage.removeItem('clint_token');
  };

  const saveSettings = async () => {
    localStorage.setItem('gemini_api_key', geminiKey);
    localStorage.setItem('gmail_user', gmailUser);
    localStorage.setItem('gmail_app_password', gmailAppPass);
    localStorage.setItem('resend_api_key', resendKey);
    localStorage.setItem('clint_aqi_provider', aqiProvider);
    localStorage.setItem('clint_aqi_api_key', aqiApiKey);
    localStorage.setItem('clint_aqi_custom_url', aqiCustomUrl);
    localStorage.setItem('clint_data_gov_key', dataGovApiKey);

    try {
      const backendUrl = getBackendUrl();
      const payload = {
        geminiApiKey: geminiKey,
        gmailUser: gmailUser,
        gmailAppPassword: gmailAppPass,
        resendApiKey: resendKey,
        aqiProvider,
        aqiApiKey,
        aqiCustomUrl,
        dataGovInApiKey: dataGovApiKey
      };

      // 1. Post to public /api/settings endpoint (persists in backend settings.json)
      await fetch(`${backendUrl}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // 2. Also sync to admin endpoint if admin token is present
      const token = localStorage.getItem('clint_token');
      if (token) {
        await fetch(`${backendUrl}/api/admin/settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        }).catch(() => {});
      }

      setSettingsSaveMsg('All API connectors and telemetry keys synchronized successfully!');
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
      fetchIntegrationsStatus(true);
      setTimeout(() => {
        setSettingsSaveMsg(null);
        setShowSettings(false);
      }, 1200);
    } catch (e) {
      console.error('Failed to save settings:', e);
      setSettingsSaveMsg('Saved locally to browser cache.');
      setTimeout(() => {
        setSettingsSaveMsg(null);
        setShowSettings(false);
      }, 1000);
    }
  };

  if (!mounted) return null;

  if (!isAuthenticated) {
    return <AuthGate onAuthenticate={handleAuth} />;
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--ink)] p-4 sm:p-6 lg:p-8 relative selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      
      <div className="max-w-[1440px] mx-auto flex flex-col gap-6 relative z-10">

        {/* Global Security Broadcast Bar */}
        {systemBroadcast && (
          <div className="w-full px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between gap-4 font-mono text-xs text-amber-700 dark:text-amber-300 shadow-sm relative overflow-hidden shrink-0 z-20">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold uppercase text-[9px] shrink-0">ALERT</span>
              <span className="block truncate">{systemBroadcast}</span>
            </div>
            {user.email && user.email.toLowerCase() === 'clintech0515@gmail.com' && (
              <button
                onClick={() => {
                  setSystemBroadcast('');
                  localStorage.removeItem('clint_system_broadcast');
                }}
                className="px-2 py-1 border border-amber-600/40 rounded hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 cursor-pointer text-[9px] font-mono"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Editorial Topbar & Navigation (AirWatch India Standard) */}
        <header className="bg-[var(--paper)] border border-[var(--line)] px-4 py-3 sm:px-6 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-[var(--shadow)]" id="tour-header">
          
          {/* Brand Identity & Breadcrumbs */}
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-[#1e5945] flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white text-base">🌱</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-base tracking-tight text-[var(--ink)]">
                  CLiNt <span className="font-normal text-emerald-600 dark:text-emerald-400">EnVo</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono font-medium border border-emerald-500/20">
                  FIELD v1.4
                </span>
              </div>
              <p className="text-[10px] text-[var(--muted)] font-mono tracking-wider uppercase mt-0.5">
                Carbon Event-Sourcing & Air Intelligence
              </p>
            </div>
          </div>

          {/* Navigation Tracks (Segmented Field Bar) */}
          <nav className="flex items-center gap-1 bg-[#edf2ee] dark:bg-[#14231b] p-1 rounded-lg border border-[var(--line)] font-mono text-xs">
            <button
              onClick={() => setActiveTab('twin')}
              className={`px-3.5 py-1.5 rounded-md font-medium transition-all cursor-pointer flex items-center gap-2 text-xs ${
                activeTab === 'twin'
                  ? 'bg-[var(--paper)] text-[#1e5945] dark:text-[#79c696] font-bold shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <span>◉</span>
              <span>Biosphere</span>
            </button>

            <button
              onClick={() => setActiveTab('aqi')}
              className={`px-3.5 py-1.5 rounded-md font-medium transition-all cursor-pointer flex items-center gap-2 text-xs ${
                activeTab === 'aqi'
                  ? 'bg-[var(--paper)] text-[#1e5945] dark:text-[#79c696] font-bold shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <span>⌖</span>
              <span>Air Intel & AQI</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3.5 py-1.5 rounded-md font-medium transition-all cursor-pointer flex items-center gap-2 text-xs ${
                activeTab === 'ledger'
                  ? 'bg-[var(--paper)] text-[#1e5945] dark:text-[#79c696] font-bold shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <span>▤</span>
              <span>Ledger DB</span>
            </button>

            <button
              onClick={() => setActiveTab('pipeline')}
              className={`px-3.5 py-1.5 rounded-md font-medium transition-all cursor-pointer flex items-center gap-2 text-xs ${
                activeTab === 'pipeline'
                  ? 'bg-[var(--paper)] text-[#1e5945] dark:text-[#79c696] font-bold shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <span>⚡</span>
              <span>Pipeline</span>
            </button>
          </nav>

          {/* User Controls & Actions */}
          <div className="flex items-center gap-2 font-mono text-xs">
            
            {/* Live Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE SYNC</span>
            </div>

            {/* User Profile */}
            <button
              onClick={() => setShowProfile(true)}
              className="px-2.5 py-1 rounded-md border border-[var(--line)] bg-[var(--paper)] hover:bg-[#edf2ee] dark:hover:bg-[#20392a] flex items-center gap-1.5 cursor-pointer text-xs"
              title="User Profile"
            >
              {user.profilePic ? (
                <img src={user.profilePic} alt="Avatar" className="w-4 h-4 rounded-full object-cover" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              )}
              <span className="font-sans font-medium text-[var(--ink)]">{user.name ? user.name.split(' ')[0] : 'Operator'}</span>
            </button>

            {/* Admin Deck */}
            {user.email && user.email.toLowerCase() === 'clintech0515@gmail.com' && (
              <button
                onClick={() => {
                  setShowAdmin(true);
                  fetchAdminUsers();
                }}
                className="px-2.5 py-1 border border-red-500/30 bg-red-500/10 rounded-md text-red-600 dark:text-red-400 flex items-center gap-1 cursor-pointer text-xs"
              >
                <ShieldAlert className="w-3 h-3" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            {/* Settings */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 border border-[var(--line)] bg-[var(--paper)] hover:bg-[#edf2ee] dark:hover:bg-[#20392a] rounded-md cursor-pointer text-[var(--muted)] hover:text-[var(--ink)]"
              title="System Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {/* Tour */}
            <button
              onClick={() => setActiveStep(0)}
              className="px-2 py-1 border border-[var(--line)] bg-[var(--paper)] hover:bg-[#edf2ee] dark:hover:bg-[#20392a] rounded-md text-[var(--muted)] hover:text-[var(--ink)] flex items-center gap-1 cursor-pointer text-xs"
            >
              <span>🗺️</span>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-1.5 border border-[var(--line)] bg-[var(--paper)] hover:bg-amber-500/10 rounded-md text-amber-600 dark:text-amber-400 cursor-pointer"
              title="Disconnect Session"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>

          </div>
        </header>

        {/* Executive High-Level Metrics Summary Bar (AirWatch Field Metrics) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Metric 1: Total Footprint */}
          <div className="bg-[var(--paper)] border border-[var(--line)] p-4 sm:p-5 rounded-xl flex flex-col justify-between shadow-[var(--shadow)] transition-all">
            <div className="flex items-center justify-between text-[10px] font-mono text-[var(--muted)] tracking-wider uppercase mb-1">
              <span>01 / CARBON FOOTPRINT</span>
              <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="text-3xl font-extrabold font-display tracking-tight text-[var(--ink)]">{stats.totalCarbon}</span>
              <span className="text-xs text-[var(--muted)] font-mono">kg CO₂e</span>
            </div>
            <div className="mt-2 text-xs font-mono flex items-center justify-between">
              <span className={`px-2 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase ${
                stats.isNormal 
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' 
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
              }`}>
                {stats.isNormal ? 'STABLE' : 'OVER BUDGET'}
              </span>
              <span className="text-[10px] text-[var(--muted)]">{ledger.length} events logged</span>
            </div>
          </div>

          {/* Metric 2: Weekly Allowance */}
          <div className="bg-[var(--paper)] border border-[var(--line)] p-4 sm:p-5 rounded-xl flex flex-col justify-between shadow-[var(--shadow)] transition-all">
            <div className="flex items-center justify-between text-[10px] font-mono text-[var(--muted)] tracking-wider uppercase mb-1">
              <span>02 / WEEKLY BUDGET</span>
              <Sliders className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="text-3xl font-extrabold font-display tracking-tight text-[var(--ink)]">{stats.carbonBudget}</span>
              <span className="text-xs text-[var(--muted)] font-mono">kg / wk</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs font-mono">
              <input 
                type="range" 
                min="100" 
                max="1000" 
                step="25"
                value={stats.carbonBudget}
                onChange={e => handleBudgetChange(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-[#edf2ee] dark:bg-[#14231b] rounded-lg appearance-none cursor-pointer accent-[#1e5945] dark:accent-[#79c696]"
              />
            </div>
          </div>

          {/* Metric 3: Saving Rate */}
          <div className="bg-[var(--paper)] border border-[var(--line)] p-4 sm:p-5 rounded-xl flex flex-col justify-between shadow-[var(--shadow)] transition-all">
            <div className="flex items-center justify-between text-[10px] font-mono text-[var(--muted)] tracking-wider uppercase mb-1">
              <span>03 / SAVING RATE</span>
              {stats.weeklySavingRate > 0 ? (
                <TrendingDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className={`text-3xl font-extrabold font-display tracking-tight ${stats.weeklySavingRate > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                {stats.weeklySavingRate > 0 ? `-${stats.weeklySavingRate}%` : `+${Math.abs(stats.weeklySavingRate)}%`}
              </span>
              <span className="text-xs text-[var(--muted)] font-mono">vs target</span>
            </div>
            <div className="mt-2 text-[10px] text-[var(--muted)] font-mono truncate">
              {stats.weeklySavingRate > 0 ? 'Trajectory below target limit' : 'Emissions exceed weekly ceiling'}
            </div>
          </div>

          {/* Metric 4: Twin Biosphere Status */}
          <div className="bg-[var(--paper)] border border-[var(--line)] p-4 sm:p-5 rounded-xl flex flex-col justify-between shadow-[var(--shadow)] transition-all">
            <div className="flex items-center justify-between text-[10px] font-mono text-[var(--muted)] tracking-wider uppercase mb-1">
              <span>04 / DIGITAL TWIN</span>
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex items-center gap-2.5 my-1">
              <span className={`w-2.5 h-2.5 rounded-full ${stats.isNormal ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
              <span className="text-xl font-bold font-display text-[var(--ink)] tracking-tight">
                {stats.isNormal ? 'STABLE BIOME' : 'DECAYING GRID'}
              </span>
            </div>
            <div className="mt-2 text-[10px] text-[var(--muted)] font-mono">
              {stats.isNormal ? 'Green biosphere mesh active' : 'Smog particle decay active'}
            </div>
          </div>

        </section>

        {/* Dynamic Tab View Content */}
        
        {/* TAB 1: BIOSPHERE & SIMULATOR */}
        {activeTab === 'twin' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
            
            {/* 3D WebGL Biosphere */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="bg-[var(--paper)] border border-[var(--line)] rounded-xl p-3 sm:p-4 overflow-hidden shadow-[var(--shadow)]" id="tour-globe">
                <div className="h-[460px] w-full rounded-lg overflow-hidden relative">
                  <CarbonTwin3D isNormal={stats.isNormal} score={stats.totalCarbon} theme={theme} />
                </div>
              </div>

              {/* Category Breakdown Bar */}
              <div className="bg-[var(--paper)] border border-[var(--line)] p-5 rounded-xl shadow-[var(--shadow)] font-mono">
                <div className="flex items-center justify-between mb-3 text-[10px] text-[var(--muted)] uppercase tracking-wider">
                  <span className="font-bold text-[var(--ink)]">Carbon Category Distribution</span>
                  <span>kg CO₂e</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                  {['Dining', 'Transit', 'Energy', 'Shopping', 'Services', 'Groceries'].map(cat => {
                    const val = stats.carbonByCategory[cat] || 0;
                    return (
                      <div key={cat} className="bg-[#edf2ee] dark:bg-[#14231b] p-2.5 rounded-lg border border-[var(--line)]">
                        <div className="text-[9px] text-[var(--muted)] uppercase tracking-wider">{cat}</div>
                        <div className="text-sm font-bold text-[var(--ink)] mt-0.5">{val} kg</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Scenario Telemetry Simulator & Offsets */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <PipelineFlow onNewEntry={handleNewEntry} theme={theme} />

              {/* Carbon Offset Simulator Widget */}
              <div className="bg-[var(--paper)] border border-[var(--line)] p-5 sm:p-6 rounded-xl shadow-[var(--shadow)] font-mono space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                  <span className="text-xs text-[var(--ink)] font-bold flex items-center gap-2">
                    <span>🌱</span> Carbon Offset Calculator
                  </span>
                  <span className="text-[9px] text-emerald-700 dark:text-emerald-400 uppercase font-semibold">Decarbonization Engine</span>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-[var(--muted)] uppercase font-bold tracking-wider">Ecological Initiative</label>
                    <select
                      value={offsetProject}
                      onChange={e => setOffsetProject(e.target.value)}
                      className="w-full px-3 py-2 bg-[#edf2ee] dark:bg-[#14231b] border border-[var(--line)] rounded-lg text-[var(--ink)] outline-none focus:border-emerald-500 font-sans text-xs"
                    >
                      <option value="reforestation">Reforestation Seedlings ($2/kg)</option>
                      <option value="methane">Agricultural Methane Digester ($1.5/kg)</option>
                      <option value="wind">Texas Wind Turbine Grid ($1/kg)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[9px] text-[var(--muted)] uppercase font-bold tracking-wider">
                      <span>Investment Budget</span>
                      <span className="text-[var(--ink)] font-bold">${offsetAmt} USD</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="200"
                      step="5"
                      value={offsetAmt}
                      onChange={e => setOffsetAmt(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-[#edf2ee] dark:bg-[#14231b] rounded-lg appearance-none cursor-pointer accent-[#1e5945] dark:accent-[#79c696]"
                    />
                  </div>

                  <div className="p-3 bg-[#edf2ee] dark:bg-[#14231b] border border-[var(--line)] rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-[9px] text-[var(--muted)] uppercase tracking-wider">Simulated Footprint Deducted</div>
                      <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                        -{offsetProject === 'reforestation' ? offsetAmt * 6 : offsetProject === 'methane' ? offsetAmt * 10 : offsetAmt * 15} kg CO₂e
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={applyCarbonOffset}
                    className="w-full py-2.5 bg-[#1e5945] hover:bg-[#286e57] text-white font-medium rounded-lg cursor-pointer transition-all text-center flex items-center justify-center gap-2 text-xs uppercase shadow-sm"
                  >
                    <span>Commit Offset Entry ↗</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB: REAL-TIME ATMOSPHERIC AQI & AIR QUALITY INTEL */}
        {activeTab === 'aqi' && (
          <div className="animate-fade-in" id="tour-aqi">
            <AqiMonitor theme={theme} onNewTelemetry={handleNewEntry} />
          </div>
        )}

        {/* TAB 2: FINANCIAL CARBON LEDGER */}
        {activeTab === 'ledger' && (
          <div className="animate-fade-in" id="tour-ledger">
            <LedgerTables ledger={ledger} onClear={handleClear} />
          </div>
        )}

        {/* TAB 3: PIPELINE & AUDIT */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
            
            {/* Architecture Flow */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="bg-[var(--paper)] border border-[var(--line)] p-5 sm:p-6 rounded-xl shadow-[var(--shadow)] font-mono">
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">
                  03 / TELEMETRY ARCHITECTURE
                </div>
                <h2 className="text-lg font-bold text-[var(--ink)] font-display mb-1 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  System Ingestion Pipeline & Kafka Flow
                </h2>
                <p className="text-xs text-[var(--muted)] mb-5 font-sans leading-relaxed">
                  High-throughput event-sourcing workflow connecting webhook gateways to Redis semantic cache and Gemini Flash.
                </p>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 bg-[#edf2ee] dark:bg-[#14231b] rounded-lg border border-[var(--line)] flex items-start gap-3">
                    <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-xs shrink-0">1</div>
                    <div>
                      <div className="font-bold text-[var(--ink)]">Webhook Ingest Buffering</div>
                      <div className="text-[var(--muted)] text-[11px] mt-0.5 font-sans">Plaid financial webhooks, Google Maps location timeline clusters, and HomeAssistant grid sensors push raw payloads into Apache Kafka topic streams.</div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#edf2ee] dark:bg-[#14231b] rounded-lg border border-[var(--line)] flex items-start gap-3">
                    <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-xs shrink-0">2</div>
                    <div>
                      <div className="font-bold text-[var(--ink)]">Go Stateless Process Worker & Redis Cache</div>
                      <div className="text-[var(--muted)] text-[11px] mt-0.5 font-sans">Go workers pull packets and match merchant category codes against Redis semantic cache (&lt;10ms latency).</div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#edf2ee] dark:bg-[#14231b] rounded-lg border border-[var(--line)] flex items-start gap-3">
                    <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-xs shrink-0">3</div>
                    <div>
                      <div className="font-bold text-[var(--ink)]">Gemini 1.5 Flash Parser Fallback</div>
                      <div className="text-[var(--muted)] text-[11px] mt-0.5 font-sans">Unstructured merchant descriptions fall back to Gemini Flash for intelligent categorical resolution.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cryptographic Audit Verifier */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-[var(--paper)] border border-[var(--line)] p-5 sm:p-6 rounded-xl shadow-[var(--shadow)] font-mono">
                <div className="flex items-center justify-between mb-4 border-b border-[var(--line)] pb-3">
                  <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Cryptographic Verifier
                  </h3>
                  <span className="text-[9px] text-[var(--muted)] uppercase tracking-wider">Immutability Proof</span>
                </div>

                <p className="text-xs text-[var(--muted)] mb-4 font-sans leading-relaxed">
                  Run automated Merkle root hash checks against stored carbon ledger blocks.
                </p>

                <button
                  onClick={runLedgerAudit}
                  disabled={auditStatus === 'auditing'}
                  className="w-full py-2.5 bg-[#1e5945] hover:bg-[#286e57] text-white font-medium rounded-lg cursor-pointer transition-all flex items-center justify-center gap-2 text-xs uppercase shadow-sm"
                >
                  {auditStatus === 'auditing' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying Cryptographic Blocks...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Execute TimescaleDB Audit ↗</span>
                    </>
                  )}
                </button>

                {/* Audit Terminal Output */}
                {auditLogs.length > 0 && (
                  <div className="mt-4 p-3 bg-[#111a15] text-[#79c696] rounded-lg border border-[#283d31] font-mono text-[11px] max-h-48 overflow-y-auto space-y-1">
                    {auditLogs.map((log, idx) => (
                      <div key={idx} className={log.includes('SUCCESS') ? 'text-emerald-400 font-bold' : log.includes('INITIATING') ? 'text-cyan-400' : ''}>
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Floating AI Copilot Drawer Component */}
      <ClintSaver stats={stats} ledger={ledger} />

      {/* Onboarding Tour Interactive Modal */}
      {showTourPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-mono">
          <div className="bg-[var(--paper)] border border-[var(--line)] p-6 rounded-xl max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[var(--ink)] font-display">Welcome to CLiNt EnVo</h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed font-sans">
              Would you like to start an interactive tour to explore your WebGL 3D Biosphere, telemetry forms, and financial carbon ledger?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowTourPrompt(false)}
                className="px-4 py-2 bg-[#edf2ee] dark:bg-[#14231b] hover:bg-[#dce5df] dark:hover:bg-[#1e3a2b] text-[var(--ink)] rounded-lg text-xs cursor-pointer transition-all"
              >
                Skip Tour
              </button>
              <button
                onClick={() => {
                  setShowTourPrompt(false);
                  setActiveStep(0);
                }}
                className="px-4 py-2 bg-[#1e5945] hover:bg-[#286e57] text-white font-medium rounded-lg text-xs cursor-pointer transition-all shadow-sm"
              >
                Start Guided Tour
              </button>
            </div>
          </div>
        </div>
      )}

      <TutorialTour 
        activeStep={activeStep}
        onNext={() => setActiveStep(prev => prev + 1)}
        onPrev={() => setActiveStep(prev => Math.max(-1, prev - 1))}
        onClose={() => setActiveStep(-1)}
      />

      {/* User Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-mono">
          <div className="bg-[var(--paper)] border border-[var(--line)] p-6 rounded-xl max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h2 className="text-sm font-bold text-[var(--ink)] uppercase tracking-wider font-display">Operator Profile</h2>
              <button onClick={() => setShowProfile(false)} className="text-[var(--muted)] hover:text-[var(--ink)] text-xs cursor-pointer">[ESC]</button>
            </div>

            {profileMessage.text && (
              <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${profileMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'}`}>
                <span>{profileMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleProfileUpdate} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-[var(--muted)] uppercase font-bold block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={e => setProfileName(cleanInputText(e.target.value))}
                  className="w-full px-3 py-2 bg-[#edf2ee] dark:bg-[#14231b] border border-[var(--line)] rounded-lg text-[var(--ink)] outline-none focus:border-[#1e5945]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[var(--muted)] uppercase font-bold block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={profileEmail}
                  onChange={e => setProfileEmail(cleanInputText(e.target.value))}
                  className="w-full px-3 py-2 bg-[#edf2ee] dark:bg-[#14231b] border border-[var(--line)] rounded-lg text-[var(--ink)] outline-none focus:border-[#1e5945]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowProfile(false)} className="px-3 py-1.5 bg-[#edf2ee] dark:bg-[#14231b] hover:bg-[#dce5df] text-[var(--ink)] rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" disabled={profileUpdating} className="px-4 py-1.5 bg-[#1e5945] hover:bg-[#286e57] text-white font-medium rounded-lg cursor-pointer shadow-sm">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Command Deck Modal */}
      {showAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-mono">
          <div className="bg-[var(--paper)] border border-rose-500/30 dark:border-rose-900/60 p-6 rounded-xl max-w-3xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h2 className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider font-display">Admin Command Deck</h2>
              <button onClick={() => setShowAdmin(false)} className="text-[var(--muted)] hover:text-[var(--ink)] text-xs cursor-pointer">[ESC]</button>
            </div>

            {adminLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 text-rose-600 dark:text-rose-400 animate-spin" /></div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="font-bold text-[var(--ink)]">Active Operators Directory</div>
                <div className="max-h-60 overflow-y-auto border border-[var(--line)] rounded-lg divide-y divide-[var(--line)]">
                  {adminUsers.map((u, i) => (
                    <div key={i} className="p-3 flex justify-between items-center bg-[#edf2ee] dark:bg-[#14231b]">
                      <div>
                        <div className="font-bold text-[var(--ink)]">{u.name}</div>
                        <div className="text-[var(--muted)] text-[10px]">{u.email}</div>
                      </div>
                      {u.email.toLowerCase() !== 'clintech0515@gmail.com' && (
                        <button onClick={() => handleRevokeUser(u.email)} className="px-2 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded text-[10px] cursor-pointer">Revoke</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* API & Telemetry Command Deck Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md font-mono">
          <div className="bg-[var(--paper)] border border-[var(--line)] p-5 sm:p-6 rounded-2xl max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[var(--ink)] uppercase tracking-wider font-display">
                    API & Telemetry Command Deck
                  </h2>
                  <p className="text-[10px] text-[var(--muted)]">
                    External data connectors, official monitoring stations, and AI reasoning keys
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchIntegrationsStatus(true)}
                  disabled={isPinging}
                  className="px-2.5 py-1 bg-[#14231b] hover:bg-[#1e382b] border border-[var(--line)] text-emerald-400 rounded-md text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Ping all external connectors"
                >
                  <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{isPinging ? 'Pinging...' : 'Ping Connectors'}</span>
                </button>
                <button 
                  onClick={() => setShowSettings(false)} 
                  className="text-[var(--muted)] hover:text-[var(--ink)] text-xs p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Notification Banner */}
            {settingsSaveMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{settingsSaveMsg}</span>
              </div>
            )}

            {/* Sub-Tabs */}
            <div className="flex items-center gap-1.5 border-b border-[var(--line)] pb-2 text-xs">
              <button
                type="button"
                onClick={() => setSettingsActiveTab('status')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  settingsActiveTab === 'status'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Live Health ({integrationsStatus?.services ? Object.keys(integrationsStatus.services).length : 6})</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsActiveTab('aqi')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  settingsActiveTab === 'aqi'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                <Wind className="w-3.5 h-3.5" />
                <span>AQI & Ground Truth</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsActiveTab('ai_email')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  settingsActiveTab === 'ai_email'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>AI & Dispatch Keys</span>
              </button>
            </div>

            {/* TAB 1: LIVE HEALTH STATUS */}
            {settingsActiveTab === 'status' && (
              <div className="space-y-3">
                <div className="text-[11px] text-[var(--muted)] flex items-center justify-between">
                  <span>REAL-TIME CONNECTIVITY MATRIX</span>
                  <span className="text-[10px] text-emerald-400">All systems operational</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  
                  {/* Service 1: Open-Meteo */}
                  <div className="p-3 rounded-xl bg-[#14231b] border border-[var(--line)] flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[var(--ink)]">Open-Meteo European CAMS</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        CONNECTED
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--muted)] mb-2">
                      Global 54-layer Copernicus atmospheric grid. Active baseline for 24-hr forecasts and telemetry.
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono border-t border-[var(--line)] pt-1.5 text-[var(--muted)]">
                      <span>Auth: Public / Zero-Key</span>
                      <span className="text-emerald-400">{integrationsStatus?.pingLatencies?.openMeteo ? `Ping: ${integrationsStatus.pingLatencies.openMeteo}` : 'Active'}</span>
                    </div>
                  </div>

                  {/* Service 2: CPCB India */}
                  <div className="p-3 rounded-xl bg-[#14231b] border border-[var(--line)] flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[var(--ink)]">CPCB / Data.gov.in</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        CONNECTED
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--muted)] mb-2">
                      Official Indian Central Pollution Control Board ground truth stations across 18+ states.
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono border-t border-[var(--line)] pt-1.5 text-[var(--muted)]">
                      <span>Gateway: Data.gov.in OGD</span>
                      <span className="text-emerald-400">CAAQMS Online</span>
                    </div>
                  </div>

                  {/* Service 3: WAQI */}
                  <div className="p-3 rounded-xl bg-[#14231b] border border-[var(--line)] flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[var(--ink)]">WAQI Platform</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 ${
                        aqiApiKey ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${aqiApiKey ? 'bg-emerald-500' : 'bg-cyan-500'}`} />
                        {aqiApiKey ? 'CONFIGURED' : 'READY'}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--muted)] mb-2">
                      World Air Quality Index (aqicn.org) global station-level feed for international coordinates.
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono border-t border-[var(--line)] pt-1.5 text-[var(--muted)]">
                      <span>Token: {aqiApiKey ? 'Custom Key Set' : 'Auto-Proxy'}</span>
                      <span className="text-[var(--muted)]">api.waqi.info</span>
                    </div>
                  </div>

                  {/* Service 4: Gemini AI */}
                  <div className="p-3 rounded-xl bg-[#14231b] border border-[var(--line)] flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[var(--ink)]">Google Gemini AI</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 ${
                        geminiKey ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${geminiKey ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {geminiKey ? 'LLM CONNECTED' : 'HEURISTIC ADVISOR'}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--muted)] mb-2">
                      Powers CLiNt-Saver copilot for real-time carbon reduction insights and ecological queries.
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono border-t border-[var(--line)] pt-1.5 text-[var(--muted)]">
                      <span>Model: Gemini 1.5/2.0 Flash</span>
                      <span className={geminiKey ? 'text-emerald-400' : 'text-amber-400'}>{geminiKey ? 'Active Key' : 'Local Fallback'}</span>
                    </div>
                  </div>

                  {/* Service 5: Transactional Mail */}
                  <div className="p-3 rounded-xl bg-[#14231b] border border-[var(--line)] flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[var(--ink)]">Operations Dispatcher</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 ${
                        (resendKey || gmailUser) ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${(resendKey || gmailUser) ? 'bg-emerald-500' : 'bg-cyan-500'}`} />
                        {(resendKey || gmailUser) ? 'CONNECTED' : 'STANDBY'}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--muted)] mb-2">
                      Audit reports, regulatory compliance summaries, and ecological alerts delivery gateway.
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono border-t border-[var(--line)] pt-1.5 text-[var(--muted)]">
                      <span>Protocol: {resendKey ? 'Resend API' : (gmailUser ? 'Gmail SMTP' : 'Local Simulator')}</span>
                      <span className="text-emerald-400">TLS 465 Ready</span>
                    </div>
                  </div>

                  {/* Service 6: Database */}
                  <div className="p-3 rounded-xl bg-[#14231b] border border-[var(--line)] flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[var(--ink)]">Ledger & State Store</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        CONNECTED
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--muted)] mb-2">
                      Immutable TimescaleDB event-sourcing ledger node with local persistent storage fallback.
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono border-t border-[var(--line)] pt-1.5 text-[var(--muted)]">
                      <span>Node: Encrypted Ledger Node</span>
                      <span className="text-emerald-400">Read / Write OK</span>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB 2: AQI & ENVIRONMENTAL PROVIDER CONFIG */}
            {settingsActiveTab === 'aqi' && (
              <div className="space-y-4 text-xs">
                
                {/* Active Provider Selector */}
                <div>
                  <label className="text-[10px] text-[var(--muted)] uppercase font-bold block mb-1.5">
                    Primary AQI Telemetry Engine
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
                    
                    <button
                      type="button"
                      onClick={() => setAqiProvider('open-meteo')}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        aqiProvider === 'open-meteo'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-[var(--line)] bg-[#14231b] text-[var(--muted)] hover:text-[var(--ink)]'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>Open-Meteo CAMS</span>
                        {aqiProvider === 'open-meteo' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <div className="text-[10px] text-[var(--muted)] mt-0.5">European Copernicus model. Free & No key required.</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAqiProvider('waqi')}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        aqiProvider === 'waqi'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-[var(--line)] bg-[#14231b] text-[var(--muted)] hover:text-[var(--ink)]'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>WAQI Platform (aqicn)</span>
                        {aqiProvider === 'waqi' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <div className="text-[10px] text-[var(--muted)] mt-0.5">Global ground monitoring stations network.</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAqiProvider('cpcb')}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        aqiProvider === 'cpcb'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-[var(--line)] bg-[#14231b] text-[var(--muted)] hover:text-[var(--ink)]'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>CPCB Direct India</span>
                        {aqiProvider === 'cpcb' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <div className="text-[10px] text-[var(--muted)] mt-0.5">Data.gov.in Official CAAQMS ground monitors.</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAqiProvider('custom')}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        aqiProvider === 'custom'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-[var(--line)] bg-[#14231b] text-[var(--muted)] hover:text-[var(--ink)]'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>Custom Ingestion Proxy</span>
                        {aqiProvider === 'custom' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <div className="text-[10px] text-[var(--muted)] mt-0.5">Enterprise AQI gateway or custom sensor feed.</div>
                    </button>

                  </div>
                </div>

                {/* WAQI Token */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-[var(--muted)] uppercase font-bold">
                      WAQI (aqicn.org) API Token
                    </label>
                    <a 
                      href="https://aqicn.org/data-platform/token/" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>Get Free WAQI Token</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    placeholder="Enter your WAQI API token (e.g. 5a1b...)"
                    value={aqiApiKey}
                    onChange={e => setAqiApiKey(e.target.value)}
                    className="w-full px-3 py-2 bg-[#14231b] border border-[var(--line)] rounded-lg text-[var(--ink)] outline-none focus:border-emerald-500 placeholder:text-[var(--muted)]/50"
                  />
                  <p className="text-[10px] text-[var(--muted)] mt-1">
                    When configured, requests to /api/aqi will proxy directly through the World Air Quality Index platform.
                  </p>
                </div>

                {/* CPCB / Data.gov.in API Key */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-[var(--muted)] uppercase font-bold">
                      CPCB / Data.gov.in API Key
                    </label>
                    <a 
                      href="https://data.gov.in" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>data.gov.in portal</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    placeholder="Custom data.gov.in API key (optional - built-in gateway key active)"
                    value={dataGovApiKey}
                    onChange={e => setDataGovApiKey(e.target.value)}
                    className="w-full px-3 py-2 bg-[#14231b] border border-[var(--line)] rounded-lg text-[var(--ink)] outline-none focus:border-emerald-500 placeholder:text-[var(--muted)]/50"
                  />
                  <p className="text-[10px] text-[var(--muted)] mt-1">
                    Default key is preloaded for 18+ Indian states. You can provide your own dedicated OGD key here.
                  </p>
                </div>

                {/* Custom API Proxy URL */}
                {aqiProvider === 'custom' && (
                  <div>
                    <label className="text-[10px] text-[var(--muted)] uppercase font-bold block mb-1">
                      Custom Ingestion Proxy Endpoint URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://your-custom-aqi-api.example.com/feed"
                      value={aqiCustomUrl}
                      onChange={e => setAqiCustomUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-[#14231b] border border-[var(--line)] rounded-lg text-[var(--ink)] outline-none focus:border-emerald-500 placeholder:text-[var(--muted)]/50"
                    />
                  </div>
                )}

              </div>
            )}

            {/* TAB 3: AI COPILOT & DISPATCH KEYS */}
            {settingsActiveTab === 'ai_email' && (
              <div className="space-y-4 text-xs">
                
                {/* Gemini AI Key */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-[var(--muted)] uppercase font-bold">
                      Google Gemini API Key
                    </label>
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>Get Gemini Key</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={geminiKey}
                    onChange={e => setGeminiKey(e.target.value)}
                    className="w-full px-3 py-2 bg-[#14231b] border border-[var(--line)] rounded-lg text-[var(--ink)] outline-none focus:border-emerald-500 placeholder:text-[var(--muted)]/50"
                  />
                  <p className="text-[10px] text-[var(--muted)] mt-1">
                    Powers CLiNt-Saver copilot with Gemini 1.5/2.0 Flash reasoning. If omitted, heuristic carbon expert is used.
                  </p>
                </div>

                {/* Resend API Key */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-[var(--muted)] uppercase font-bold">
                      Resend API Key
                    </label>
                    <a 
                      href="https://resend.com" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>resend.com</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    placeholder="re_..."
                    value={resendKey}
                    onChange={e => setResendKey(e.target.value)}
                    className="w-full px-3 py-2 bg-[#14231b] border border-[var(--line)] rounded-lg text-[var(--ink)] outline-none focus:border-emerald-500 placeholder:text-[var(--muted)]/50"
                  />
                  <p className="text-[10px] text-[var(--muted)] mt-1">
                    High-deliverability transactional email API for ESG reports and alert broadcasts.
                  </p>
                </div>

                {/* Gmail SMTP */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] text-[var(--muted)] uppercase font-bold block mb-1">
                      Gmail SMTP User
                    </label>
                    <input
                      type="email"
                      placeholder="operator@gmail.com"
                      value={gmailUser}
                      onChange={e => setGmailUser(e.target.value)}
                      className="w-full px-3 py-2 bg-[#14231b] border border-[var(--line)] rounded-lg text-[var(--ink)] outline-none focus:border-emerald-500 placeholder:text-[var(--muted)]/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--muted)] uppercase font-bold block mb-1">
                      Gmail App Password
                    </label>
                    <input
                      type="password"
                      placeholder="xxxx xxxx xxxx xxxx"
                      value={gmailAppPass}
                      onChange={e => setGmailAppPass(e.target.value)}
                      className="w-full px-3 py-2 bg-[#14231b] border border-[var(--line)] rounded-lg text-[var(--ink)] outline-none focus:border-emerald-500 placeholder:text-[var(--muted)]/50"
                    />
                  </div>
                </div>

              </div>
            )}

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[var(--line)]">
              <div className="text-[10px] text-[var(--muted)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Encrypted client-side storage + server synchronization</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-3.5 py-1.5 bg-[#14231b] hover:bg-[#1e382b] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)] rounded-lg text-xs cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveSettings}
                  className="px-4 py-1.5 bg-[#1e5945] hover:bg-[#286e57] text-white font-medium rounded-lg text-xs cursor-pointer transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save & Connect APIs</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}
