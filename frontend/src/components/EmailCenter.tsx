'use client';

import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, RefreshCw, Eye, Code, Terminal, Clock, CheckCircle } from 'lucide-react';
import { LedgerStats } from '@/lib/db';

interface EmailCenterProps {
  stats?: LedgerStats;
  user?: { name?: string; email?: string };
}

interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  timestamp: string;
  status: 'delivered' | 'bounced' | 'processing';
  type: 'welcome' | 'weekly_summary';
}

export default function EmailCenter({ stats, user }: EmailCenterProps) {
  const [activeTab, setActiveTab] = useState<'welcome' | 'weekly' | 'logs'>('welcome');
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([
    {
      id: 'email-1',
      recipient: user?.email || 'siddharth@dubey.me',
      subject: 'Welcome to CLiNt EnVo: Passive Carbon Ledger Active',
      timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toLocaleString(),
      status: 'delivered',
      type: 'welcome'
    },
    {
      id: 'email-2',
      recipient: user?.email || 'siddharth@dubey.me',
      subject: 'Weekly Carbon Ledger Summary: -12.5% below budget',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleString(),
      status: 'delivered',
      type: 'weekly_summary'
    }
  ]);
  const [bounceRate, setBounceRate] = useState<number>(0.0);
  const [sentCount, setSentCount] = useState<number>(2);

  // Trigger simulated weekly summary update
  useEffect(() => {
    // Increment logs when total carbon updates
    if (stats?.totalCarbon && stats.totalCarbon > 0) {
      setSentCount(prev => prev + 1);
      const newLog: EmailLog = {
        id: `email-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        recipient: user?.email || 'user@clint-envo.net',
        subject: `Carbon Ledger Event Alert: Ingest committed (${stats.totalCarbon} kg CO2e)`,
        timestamp: new Date().toLocaleString(),
        status: 'delivered',
        type: 'weekly_summary'
      };
      setEmailLogs(prev => [newLog, ...prev]);
    }
  }, [stats?.totalCarbon, user?.email]);

  // Synchronize email logs to the current user's email on authentication
  useEffect(() => {
    if (user?.email && user.email !== '') {
      setEmailLogs([
        {
          id: `email-welcome-${Date.now()}`,
          recipient: user.email,
          subject: 'Welcome to CLiNt EnVo: Passive Carbon Ledger Active',
          timestamp: new Date().toLocaleString(),
          status: 'delivered',
          type: 'welcome'
        },
        {
          id: `email-weekly-${Date.now() - 5000}`,
          recipient: user.email,
          subject: 'Weekly Carbon Ledger Summary: -12.5% below budget',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleString(),
          status: 'delivered',
          type: 'weekly_summary'
        }
      ]);
      setSentCount(2);
    }
  }, [user?.email, user?.name]);

  return (
    <div className="bg-[var(--paper)] border border-[var(--line)] rounded-xl p-5 sm:p-6 w-full flex flex-col h-full gap-5 shadow-[var(--shadow)]">
      {/* Header and stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider font-mono mb-1">
            04 / DISPATCH CENTER
          </div>
          <h2 className="text-lg font-bold font-display tracking-tight text-[var(--ink)] flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Operations & Lifecycle Engine
          </h2>
          <p className="text-xs text-[var(--muted)] font-mono mt-0.5">
            Non-blocking background events & Resend worker hooks
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <div className="flex flex-col items-end">
            <span className="text-[var(--muted)] uppercase">TOTAL SENT</span>
            <span className="text-[var(--ink)] font-bold">{sentCount} emails</span>
          </div>
          <div className="w-px h-6 bg-[var(--line)]" />
          <div className="flex flex-col items-end">
            <span className="text-[var(--muted)] uppercase">BOUNCE RATE</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">{bounceRate.toFixed(2)}%</span>
          </div>
          <div className="w-px h-6 bg-[var(--line)]" />
          <div className="flex flex-col items-end">
            <span className="text-[var(--muted)] uppercase">DELIVERABILITY</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> 99.98%
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--line)]">
        <button
          onClick={() => setActiveTab('welcome')}
          className={`px-4 py-2 text-xs font-mono border-b-2 transition-all cursor-pointer ${
            activeTab === 'welcome'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          Welcome HTML
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`px-4 py-2 text-xs font-mono border-b-2 transition-all cursor-pointer ${
            activeTab === 'weekly'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          Weekly Summary HTML
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-xs font-mono border-b-2 transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'border-[var(--neon-blue)] text-[var(--neon-blue)]'
              : 'border-transparent text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Deliverability Logs
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 bg-black/60 rounded-xl border border-neutral-950 p-4 min-h-[300px] flex flex-col">
        {activeTab === 'welcome' && (
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-2 mb-2">
              <div className="flex flex-col">
                <span className="text-xs font-mono text-neutral-400">Subject: <span className="text-white">Welcome to CLiNt EnVo: Passive Carbon Ledger Active</span></span>
                <span className="text-[10px] font-mono text-neutral-500 font-semibold text-neutral-400">From: team@clint-envo.net • To: {user?.email || 'user@clint-envo.net'}</span>
              </div>
              <span className="text-[10px] bg-[var(--neon-green)]/10 text-[var(--neon-green)] border border-[var(--neon-green)]/20 px-2 py-0.5 rounded font-mono">ONBOARDING TRIGGERED</span>
            </div>
            
            {/* HTML Welcome Email Content */}
            <div className="clint-email-preview rounded-lg p-5 text-neutral-350 text-sm max-w-2xl mx-auto w-full font-sans shadow-lg">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-gradient-to-tr from-[var(--neon-green)] to-[var(--neon-blue)] flex items-center justify-center font-bold text-black font-mono">CT</div>
                  <span className="font-bold font-mono tracking-wider text-white">CLiNt EnVo</span>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">ECOLOGICAL LEDGER SETUP COMPLETE</span>
              </div>
              
              <h1 className="text-xl font-bold text-white mb-3 tracking-tight">Your Passive Carbon Event-Sourcing Ledger is Active</h1>
              <p className="text-neutral-400 mb-4 leading-relaxed">
                Welcome to CLiNt EnVo, {user?.name || 'User'} ({user?.email || 'user@clint-envo.net'}). This next-generation sustainability ecosystem maps your digital activity onto an immutable, high-throughput carbon ledger. The platform runs a passive, zero-input ingestion engine, pulling variables directly from your authorized digital touchpoints.
              </p>
              
              <div className="clint-email-inner-box rounded-lg p-4 mb-4 font-mono text-xs">
                <div className="text-white font-semibold mb-2">CONNECTED TELEMETRY INTEGRATIONS:</div>
                <div className="flex justify-between py-1 border-b border-neutral-900">
                  <span className="text-[var(--neon-blue)]">Plaid Bank Webhooks</span>
                  <span className="text-[var(--neon-green)]">CONNECTED</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-900">
                  <span className="text-[var(--neon-yellow)]">Google Maps Timeline Clusters</span>
                  <span className="text-[var(--neon-green)]">CONNECTED</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[var(--neon-green)]">HomeAssistant Grid Intensity</span>
                  <span className="text-[var(--neon-green)]">CONNECTED</span>
                </div>
              </div>
              
              <p className="text-neutral-400 mb-6 leading-relaxed">
                As transactions and coordinates filter through our Apache Kafka event queues, Go workers resolve emissions profiles with Redis semantic caching and Gemini Flash. You can inspect your real-time 3D Digital Carbon Twin on the platform dashboard at any time.
              </p>

              <div className="border-t border-neutral-800 pt-4 text-xs text-neutral-500 font-mono text-center">
                CLiNt EnVo was founded and envisioned by <span className="text-neutral-300">Siddharth Gopal Dubey</span>.
                <br />
                Security-first carbon event-sourcing network.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'weekly' && (
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-2 mb-2">
              <div className="flex flex-col">
                <span className="text-xs font-mono text-neutral-400">Subject: <span className="text-white">Weekly Carbon Ledger Summary: {(stats?.weeklySavingRate ?? 0) > 0 ? `-${stats?.weeklySavingRate}% decrease` : `+${Math.abs(stats?.weeklySavingRate ?? 0)}% increase`}</span></span>
                <span className="text-[10px] font-mono text-neutral-500 font-semibold text-neutral-400">From: team@clint-envo.net • To: {user?.email || 'user@clint-envo.net'}</span>
              </div>
              <span className="text-[10px] bg-[var(--neon-blue)]/10 text-[var(--neon-blue)] border border-[var(--neon-blue)]/20 px-2 py-0.5 rounded font-mono">AUTOMATED WEEKLY WORKER</span>
            </div>
            
            {/* HTML Weekly Summary Content */}
            <div className="clint-email-preview rounded-lg p-5 text-neutral-350 text-sm max-w-2xl mx-auto w-full font-sans shadow-lg">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-gradient-to-tr from-[var(--neon-green)] to-[var(--neon-blue)] flex items-center justify-center font-bold text-black font-mono">CT</div>
                  <span className="font-bold font-mono tracking-wider text-white">CLiNt EnVo</span>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">WEEKLY LEDGER SUMMARY</span>
              </div>
              
              <h1 className="text-lg font-bold text-white mb-2 tracking-tight">Week 24 Carbon Audit: Summary & Dynamic Twin State</h1>
              <p className="text-neutral-450 mb-4 leading-relaxed text-xs">
                Your automated carbon ledger report is ready. Below is your aggregated greenhouse gas emission balance computed across registered financial transactions, transit grids, and household energy sensors.
              </p>
              
              <div className="grid grid-cols-2 gap-3 mb-5 font-mono text-xs">
                <div className="clint-email-inner-box rounded-lg p-3">
                  <span className="text-neutral-500 block mb-1 text-[10px]">TOTAL GHG EMISSIONS</span>
                  <span className={`text-xl font-bold ${stats?.isNormal ? 'text-[var(--neon-green)]' : 'text-[var(--neon-orange)]'}`}>
                    {stats?.totalCarbon ?? 0} kg CO2e
                  </span>
                </div>
                <div className="clint-email-inner-box rounded-lg p-3">
                  <span className="text-neutral-500 block mb-1 text-[10px]">BUDGET SURPLUS/DEFICIT</span>
                  <span className={`text-xl font-bold ${(stats?.weeklySavingRate ?? 0) > 0 ? 'text-[var(--neon-green)]' : 'text-[var(--neon-orange)]'}`}>
                    {(stats?.weeklySavingRate ?? 0) > 0 ? `${stats?.weeklySavingRate}% SAVED` : `${Math.abs(stats?.weeklySavingRate ?? 0)}% OVER`}
                  </span>
                </div>
              </div>

              <div className="clint-email-inner-box rounded-lg p-4 mb-4 font-mono text-xs">
                <div className="text-white font-semibold mb-2">CARBON BREAKDOWN BY EMISSION SOURCE:</div>
                {Object.entries(stats?.carbonByCategory || {}).map(([cat, val]) => (
                  <div key={cat} className="flex justify-between py-1 border-b border-neutral-900 last:border-0">
                    <span className="text-neutral-400">{cat}</span>
                    <span className="text-white font-semibold">{val} kg CO2e</span>
                  </div>
                ))}
              </div>

              <p className="text-neutral-400 mb-6 leading-relaxed text-xs">
                Based on your weekly budget of <strong>{stats?.carbonBudget ?? 400} kg CO2e</strong>, your 3D Digital Carbon Twin has loaded the <strong>{stats?.isNormal ? 'STABLE GREEN BIOSPHERE' : 'DECAYING SMOKY ORANGE'}</strong> WebGL context shader variables. Continue passive tracking to maintain balance.
              </p>

              <div className="border-t border-neutral-800 pt-4 text-xs text-neutral-500 font-mono text-center">
                Platform founded by Siddharth Gopal Dubey. Thank you for utilizing CLiNt EnVo.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="flex-1 flex flex-col font-mono text-xs gap-3">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-2 mb-2">
              <span className="text-neutral-400">Background Worker Email Thread Log Output</span>
              <button
                onClick={() => {
                  setEmailLogs([
                    {
                      id: `email-${Math.random().toString(36).substring(2, 9)}`,
                      recipient: 'siddharth@dubey.me',
                      subject: 'Scheduled Weekly summary: Ledger Audit',
                      timestamp: new Date().toLocaleString(),
                      status: 'delivered',
                      type: 'weekly_summary'
                    },
                    ...emailLogs
                  ]);
                }}
                className="px-2 py-0.5 border border-[var(--line)] bg-[var(--paper)] hover:bg-[#edf2ee] dark:hover:bg-[#14231b] rounded text-[10px] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-all"
              >
                Send Manual Report
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[250px] flex flex-col gap-2">
              {emailLogs.map((log) => (
                <div key={log.id} className="p-3 clint-log-item rounded-lg flex items-center justify-between gap-4 border border-[var(--line)] bg-[var(--paper)]">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[var(--ink)] font-medium">{log.subject}</span>
                      <span className="text-[10px] text-[var(--muted)]">Recipient: {log.recipient} • ID: {log.id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-neutral-400">{log.timestamp}</span>
                    <span className="text-[10px] bg-[var(--neon-green)]/10 text-[var(--neon-green)] border border-[var(--neon-green)]/20 px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> {log.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
