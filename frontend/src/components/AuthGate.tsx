'use client';

import React, { useState } from 'react';
import { Shield, Lock, Mail, User, Eye, EyeOff, Loader2, Sparkles, CheckCircle } from 'lucide-react';
import { getUserStorageKey } from '@/lib/db';

interface StoredAuthUser {
  name: string;
  email: string;
  password?: string;
  region?: string;
  profilePic?: string;
  ledger?: unknown[];
  budget?: number;
}

interface AuthGateProps {
  onAuthenticate: (name: string, email: string, isLogin: boolean) => void;
}

export default function AuthGate({ onAuthenticate }: AuthGateProps) {
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

  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password || (!isLogin && !name)) return;

    if (!isLogin) {
      if (name.length < 2 || name.length > 50) {
        setError('Name must be between 2 and 50 characters.');
        return;
      }
      if (password.length < 8 || password.length > 128) {
        setError('Passphrase must be between 8 and 128 characters.');
        return;
      }
    }
    if (email.length > 254) {
      setError('Email address length exceeded (maximum 254 characters).');
      return;
    }

    if (typeof window === 'undefined') return;

    setLoading(true);
    setLoadingStage('Establishing link to database node...');

    let authUser = null;
    let fallbackToLocal = false;

    // 1. Try backend server auth first
    try {
      const backendUrl = getBackendUrl();
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin 
        ? { email, password } 
        : { name, email, password, region: 'Asia-Pacific (India)', profilePic: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}` };

      const res = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Backend Auth failed');
      }

      authUser = data.user;
      if (data.token) {
        localStorage.setItem('clint_token', data.token);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('Backend Auth failed or unreachable, trying local fallback:', msg);
      
      // If backend returned a credentials validation error, abort immediately and show error
      if (msg && (msg.includes('passphrase') || msg.includes('already registered') || msg.includes('not found') || msg.includes('Email already'))) {
        setError(msg);
        setLoading(false);
        return;
      }
      
      fallbackToLocal = true;
    }

    // 2. Local fallback if backend is unreachable
    if (fallbackToLocal) {
      const usersStr = localStorage.getItem('clint_envo_users');
      let users: StoredAuthUser[] = usersStr ? JSON.parse(usersStr) : [];

      const seeds = [
        {
          name: 'CLiNt-Tech Administrator',
          email: 'CLiNtech0515@gmail.com',
          password: 'admin1234567',
          region: 'Asia-Pacific (India)',
          profilePic: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin'
        },
        {
          name: 'Siddharth Gopal Dubey',
          email: 'siddharth@dubey.me',
          password: 'password',
          region: 'Asia-Pacific (India)',
          profilePic: 'https://api.dicebear.com/7.x/bottts/svg?seed=founder'
        }
      ];

      let modified = false;
      if (users.length === 0) {
        users = seeds;
        modified = true;
      } else {
        for (const seed of seeds) {
          const exists = users.some((u) => u.email.toLowerCase() === seed.email.toLowerCase());
          if (!exists) {
            users.push(seed);
            modified = true;
          }
        }
      }

      if (modified) {
        localStorage.setItem('clint_envo_users', JSON.stringify(users));
      }

      if (isLogin) {
        const userMatch = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (!userMatch) {
          setError("Account not found. Please switch to the 'Synchronize Biome' tab to create your account first.");
          setLoading(false);
          return;
        }
        if (userMatch.password !== password) {
          setError("Invalid passphrase. Cryptographic handshake rejected.");
          setLoading(false);
          return;
        }
        authUser = userMatch;
      } else {
        const userMatch = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (userMatch) {
          setError("This email is already registered. Please switch to the 'Access Twin Ledger' tab to log in.");
          setLoading(false);
          return;
        }

        const newUser = { 
          name, 
          email: email.toLowerCase().trim(), 
          password, 
          region: 'Asia-Pacific (India)', 
          profilePic: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
          ledger: [],
          budget: 400
        };
        users.push(newUser);
        localStorage.setItem('clint_envo_users', JSON.stringify(users));
        authUser = newUser;
      }
    }

    if (!authUser) {
      setError("Cryptographic authentication handshake failed.");
      setLoading(false);
      return;
    }

    // Save active user profile info to localStorage for dashboard retrieval
    localStorage.setItem('clint_envo_active_user', JSON.stringify(authUser));

    // Ensure dedicated user history is initialized or restored
    if (!isLogin) {
      localStorage.setItem(getUserStorageKey(authUser.email), JSON.stringify([]));
    } else if (authUser.ledger && Array.isArray(authUser.ledger)) {
      localStorage.setItem(getUserStorageKey(authUser.email), JSON.stringify(authUser.ledger));
    }

    // Simulate high-throughput event brokering setup stages
    const stages = isLogin 
      ? [
          'Verifying cryptographic tokens...',
          'Opening TimescaleDB session...',
          'Mounting 3D WebGL twin...'
        ]
      : [
          'Registering Plaid & Maps webhook endpoints...',
          'Provisioning Apache Kafka consumer groups...',
          'Spawning Go carbon-processing workers...',
          'Broadcasting welcome lifecycle payloads...'
        ];

    let currentStage = 0;
    setLoadingStage(stages[0]);

    const interval = setInterval(() => {
      currentStage++;
      if (currentStage < stages.length) {
        setLoadingStage(stages[currentStage]);
      } else {
        clearInterval(interval);
        setLoading(false);

        onAuthenticate(authUser.name, authUser.email, isLogin);
      }
    }, 1000);
  };

  const handleQuickDemo = () => {
    const demoUser = {
      name: 'Siddharth Gopal Dubey',
      email: 'siddharth@dubey.me',
      region: 'Asia-Pacific (India)',
      profilePic: 'https://api.dicebear.com/7.x/bottts/svg?seed=founder'
    };
    localStorage.setItem('clint_envo_active_user', JSON.stringify(demoUser));
    localStorage.setItem('clint_token', 'demo-token-' + Date.now());
    onAuthenticate(demoUser.name, demoUser.email, true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email) return;

    if (typeof window === 'undefined') return;

    const usersStr = localStorage.getItem('clint_envo_users');
    let users: StoredAuthUser[] = usersStr ? JSON.parse(usersStr) : [];
    
    // Seed default accounts if empty, to allow resetting account password
    const seeds: StoredAuthUser[] = [
      {
        name: 'CLiNt-Tech Administrator',
        email: 'CLiNtech0515@gmail.com',
        password: 'admin1234567'
      },
      {
        name: 'Siddharth Gopal Dubey',
        email: 'siddharth@dubey.me',
        password: 'password'
      }
    ];

    let modified = false;
    if (users.length === 0) {
      users = seeds;
      modified = true;
    } else {
      for (const seed of seeds) {
        const exists = users.some((u) => u.email.toLowerCase() === seed.email.toLowerCase());
        if (!exists) {
          users.push(seed);
          modified = true;
        }
      }
    }

    if (modified) {
      localStorage.setItem('clint_envo_users', JSON.stringify(users));
    }

    const userMatch = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!userMatch) {
      setError("Email address not registered in the cryptographic twin database.");
      return;
    }

    setLoading(true);
    setLoadingStage("Resolving cryptographic key pairs...");

    const subject = "CLiNt EnVo: Cryptographic Passphrase Recovery";
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; background-color: #f8f9fa; border: 1px solid #dadce0; color: #202124; border-radius: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #dadce0; padding-bottom: 15px; margin-bottom: 20px;">
          <h2 style="color: #202124; margin: 0; font-family: sans-serif; font-weight: bold;">CLiNt EnVo</h2>
          <span style="font-size: 10px; color: #5f6368; font-family: monospace;">PASSPHRASE RECOVERY</span>
        </div>
        <h1 style="color: #202124; font-size: 20px; margin-bottom: 10px; font-weight: bold;">Passphrase Recovery Request</h1>
        <p style="color: #5f6368; font-size: 14px; line-height: 1.6;">
          Hello ${escapeHtml(userMatch.name)},<br/><br/>
          A passphrase recovery request was triggered for your CLiNt EnVo carbon account.
        </p>
        <div style="background-color: #ffffff; border: 1px solid #dadce0; padding: 15px; border-radius: 8px; margin: 20px 0; font-family: monospace; font-size: 12px; text-align: center;">
          <span style="color: #5f6368; display: block; margin-bottom: 5px; text-transform: uppercase; font-size: 10px;">Your Registered Passphrase:</span>
          <strong style="color: #d93025; font-size: 18px; letter-spacing: 1px;">${escapeHtml(userMatch.password || '')}</strong>
        </div>
        <p style="color: #5f6368; font-size: 13px; line-height: 1.6;">
          You can now return to the login interface, input your email, and enter the passphrase above to re-establish your secure biome session.
        </p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="https://clint-envo.vercel.app" style="background-color: #00f0ff; color: #000000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-family: sans-serif; display: inline-block;">Return to Login Panel</a>
        </div>
        <div style="border-top: 1px solid #dadce0; padding-top: 15px; font-size: 10px; color: #70757a; text-align: center; font-family: monospace; margin-top: 30px;">
          CLiNt EnVo was founded and envisioned by Siddharth Gopal Dubey.
        </div>
      </div>
    `;

    // Retrieve credentials directly from local storage if any, or backend env fallback
    const savedGmailUser = localStorage.getItem('gmail_user') || '';
    const savedGmailAppPass = localStorage.getItem('gmail_app_password') || '';
    const savedResendKey = localStorage.getItem('resend_api_key') || '';

    try {
      setLoadingStage("Dispatching recovery transmission...");
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      const data = await res.json();
      setLoading(false);

      if (data.success || data.warning) {
        setSuccess(`Passphrase recovery email dispatched to ${email}. Check your inbox!`);
      } else {
        setError("Failed to dispatch email. Server returned: " + (data.warning || "Unknown failure."));
      }

    } catch (err: unknown) {
      console.error('SMTP recovery dispatch failed', err);
      setLoading(false);
      setError("Handshake error: Failed to establish link to mail dispatch worker.");
    }
  };

  return (
    <main id="main-content" className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex items-center justify-center p-4 relative transition-colors duration-200">
      
      {/* Main container */}
      <div className="w-full max-w-md p-7 sm:p-8 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-[var(--shadow)] relative z-10 font-sans">
        
        {/* Logo and Brand */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#1e5945] flex items-center justify-center shadow-sm mb-3" aria-hidden="true">
            <span className="text-white text-2xl">ðŸŒ±</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--ink)] font-display">CLiNt EnVo</h1>
          <p className="text-[10px] text-[var(--muted)] font-mono mt-1 text-center uppercase tracking-widest">
            GenAI Urban Air Quality &amp; Winter Smog Assistant
          </p>
        </div>

        {/* Loading overlay screen */}
        {loading ? (
          <div role="status" aria-live="polite" className="py-12 flex flex-col items-center gap-5 justify-center min-h-[300px]">
            <Loader2 aria-hidden="true" className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
            <div className="text-center font-mono">
              <span className="text-xs text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-1 font-bold">SECURE HANDSHAKE ACTIVE</span>
              <p className="text-[11px] text-[var(--muted)] animate-pulse">{loadingStage}</p>
            </div>
          </div>
        ) : isForgotPassword ? (
          <form onSubmit={handleResetPassword} className="space-y-5" aria-label="Recover passphrase form">
            <div className="border-b border-[var(--line)] pb-3">
              <h2 className="text-xs font-mono text-[var(--ink)] uppercase tracking-wider font-bold">Recover Passphrase</h2>
              <p className="text-[10px] text-[var(--muted)] font-mono mt-1 leading-normal">
                Enter your registered email address to dispatch your secure passphrase recovery transmission.
              </p>
            </div>

            {/* Error Message Box */}
            {error && (
              <div role="alert" aria-live="assertive" className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400 text-xs font-mono">
                {error}
              </div>
            )}

            {/* Success Message Box */}
            {success && (
              <div role="status" aria-live="polite" className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 text-xs font-mono flex items-start gap-1.5">
                <CheckCircle aria-hidden="true" className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-1">
              <label htmlFor="auth-recover-email" className="text-[10px] font-mono text-[var(--muted)] uppercase font-bold">Email Address</label>
              <div className="relative">
                <Mail aria-hidden="true" className="absolute left-3 top-2.5 w-4 h-4 text-[var(--muted)]" />
                <input
                  id="auth-recover-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(cleanInputText(e.target.value))}
                  required
                  className="w-full pl-9 pr-4 py-2 text-xs font-mono bg-[#edf2ee] dark:bg-[#14231b] border border-[var(--line)] focus:border-[#1e5945] rounded-lg text-[var(--ink)] placeholder-[var(--muted)] outline-none transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-2.5 text-xs font-mono text-white font-medium bg-[#1e5945] hover:bg-[#286e57] rounded-lg transition-all shadow-sm cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <Shield aria-hidden="true" className="w-3.5 h-3.5" />
              Transmit Recovery Signal
            </button>

            {/* Return Link */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setError(''); setSuccess(''); }}
                className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                &larr; Back to Access Twin Ledger
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" aria-label={isLogin ? 'Sign in form' : 'Create account form'}>
            {/* Toggle */}
            <div role="tablist" aria-label="Authentication mode" className="flex border-b border-[var(--line)] pb-1">
              <button
                type="button"
                role="tab"
                aria-selected={isLogin}
                onClick={() => { setIsLogin(true); setError(''); }}
                className={`flex-1 pb-3 text-xs font-mono border-b-2 transition-all cursor-pointer ${
                  isLogin 
                    ? 'border-[#1e5945] dark:border-emerald-400 text-[var(--ink)] font-bold' 
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                Access Twin Ledger
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={!isLogin}
                onClick={() => { setIsLogin(false); setError(''); }}
                className={`flex-1 pb-3 text-xs font-mono border-b-2 transition-all cursor-pointer ${
                  !isLogin 
                    ? 'border-[#1e5945] dark:border-emerald-400 text-[var(--ink)] font-bold' 
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                Synchronize Biome
              </button>
            </div>

            {/* Error Message Box */}
            {error && (
              <div role="alert" aria-live="assertive" className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400 text-xs font-mono">
                {error}
              </div>
            )}

            {/* Inputs */}
            <div className="space-y-4">
              {/* Name (Signup only) */}
              {!isLogin && (
                <div className="space-y-1">
                  <label htmlFor="auth-name" className="text-[10px] font-mono text-[var(--muted)] uppercase font-bold">Full Name</label>
                  <div className="relative">
                    <User aria-hidden="true" className="absolute left-3 top-2.5 w-4 h-4 text-[var(--muted)]" />
                    <input
                      id="auth-name"
                      type="text"
                      autoComplete="name"
                      placeholder="e.g. Siddharth Gopal Dubey"
                      value={name}
                      onChange={(e) => setName(cleanInputText(e.target.value))}
                      required={!isLogin}
                      className="w-full pl-9 pr-4 py-2 text-xs font-mono bg-[#edf2ee] dark:bg-[#14231b] border border-[var(--line)] focus:border-[#1e5945] rounded-lg text-[var(--ink)] placeholder-[var(--muted)] outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1">
                <label htmlFor="auth-email" className="text-[10px] font-mono text-[var(--muted)] uppercase font-bold">Email Address</label>
                <div className="relative">
                  <Mail aria-hidden="true" className="absolute left-3 top-2.5 w-4 h-4 text-[var(--muted)]" />
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(cleanInputText(e.target.value))}
                    required
                    className="w-full pl-9 pr-4 py-2 text-xs font-mono bg-[#edf2ee] dark:bg-[#14231b] border border-[var(--line)] focus:border-[#1e5945] rounded-lg text-[var(--ink)] placeholder-[var(--muted)] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label htmlFor="auth-password" className="text-[10px] font-mono text-[var(--muted)] uppercase font-bold">Passphrase</label>
                <div className="relative">
                  <Lock aria-hidden="true" className="absolute left-3 top-2.5 w-4 h-4 text-[var(--muted)]" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                    value={password}
                    onChange={(e) => setPassword(cleanInputText(e.target.value))}
                    required
                    className="w-full pl-9 pr-10 py-2 text-xs font-mono bg-[#edf2ee] dark:bg-[#14231b] border border-[var(--line)] focus:border-[#1e5945] rounded-lg text-[var(--ink)] placeholder-[var(--muted)] outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide passphrase' : 'Show passphrase'}
                    aria-pressed={showPassword}
                    className="absolute right-3 top-2.5 text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
                  >
                    {showPassword ? <EyeOff aria-hidden="true" className="w-4 h-4" /> : <Eye aria-hidden="true" className="w-4 h-4" />}
                  </button>
                </div>
                {isLogin && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(true); setError(''); setSuccess(''); }}
                      className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 hover:underline transition-colors cursor-pointer"
                    >
                      Forgot passphrase?
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Consent checkbox (Signup only) */}
            {!isLogin && (
              <div className="flex items-start gap-2 pt-2 select-none">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 accent-[#1e5945] dark:accent-emerald-400 cursor-pointer rounded"
                />
                <label htmlFor="consent" className="text-[10px] text-[var(--muted)] font-mono leading-relaxed cursor-pointer">
                  Authorize CLiNt EnVo to securely parse passive telemetry headers from Plaid & Google Maps APIs.
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isLogin && !consent}
              className="w-full py-2.5 text-xs font-mono text-white font-medium bg-[#1e5945] hover:bg-[#286e57] disabled:opacity-40 rounded-lg transition-all shadow-sm cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <Shield aria-hidden="true" className="w-3.5 h-3.5" />
              {isLogin ? 'Establish Handshake' : 'Synchronize Carbon Twin'}
            </button>

            {/* Instant Demo Access Button */}
            <button
              type="button"
              onClick={handleQuickDemo}
              className="w-full py-2 text-xs font-mono text-emerald-800 dark:text-emerald-300 hover:text-[var(--ink)] bg-[#dff1e7] dark:bg-[#1e3a2b] border border-emerald-600/30 dark:border-emerald-500/30 rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <Sparkles aria-hidden="true" className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>Instant Demo Operator Access</span>
            </button>

            {/* Registered Accounts Tip */}
            <div className="pt-3 border-t border-[var(--line)] text-[9px] text-[var(--muted)] text-center font-mono leading-relaxed flex items-start gap-1 justify-center">
              <Sparkles aria-hidden="true" className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Tip: Create an account under &apos;Synchronize Biome&apos;. Or use founder credentials: <strong className="text-[var(--ink)]">siddharth@dubey.me</strong> (passphrase: <strong className="text-[var(--ink)]">password</strong>)
              </span>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
