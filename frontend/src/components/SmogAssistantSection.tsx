'use client';

import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  Home,
  Users,
  Wind,
  Leaf,
  ShieldAlert,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import {
  buildUrbanSmogPlaybook,
  CommuteMode,
  CookingHeatingMode,
  HouseholdProfile,
} from '@/lib/aqiAdvisor';

interface SmogAssistantSectionProps {
  city: string;
  state: string;
  usAqi: number;
  pm25: number;
  backendUrl: string;
}

export default function SmogAssistantSection({
  city,
  state,
  usAqi,
  pm25,
  backendUrl,
}: SmogAssistantSectionProps) {
  const [householdProfile, setHouseholdProfile] = useState<HouseholdProfile>('family_kids');
  const [commuteMode, setCommuteMode] = useState<CommuteMode>('car_cab');
  const [cookingHeating, setCookingHeating] = useState<CookingHeatingMode>('lpg');

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSource, setAiSource] = useState<'gemini' | 'heuristic'>('heuristic');

  const playbook = useMemo(
    () =>
      buildUrbanSmogPlaybook({
        city,
        state,
        usAqi,
        pm25,
        householdProfile,
        commuteMode,
        cookingHeating,
      }),
    [city, state, usAqi, pm25, householdProfile, commuteMode, cookingHeating]
  );

  const buildLocalBrief = () =>
    `${playbook.winterInversionAdvisory}\n\n• Routine: ${playbook.dailyRoutines[0]?.title} — ${playbook.dailyRoutines[0]?.directImpact}\n• Indoor Hack: ${playbook.indoorHacks[0]?.title} — ${playbook.indoorHacks[0]?.directImpact}\n• Sustainable Alternative: ${playbook.sustainableAlternatives[0]?.title} — ${playbook.sustainableAlternatives[0]?.directImpact}`;

  const handleAskGenAiPlaybook = async () => {
    setAiLoading(true);
    try {
      const apiKey =
        typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') || '' : '';
      const res = await fetch(`${backendUrl}/api/aqi/assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
        },
        body: JSON.stringify({
          city,
          state,
          usAqi,
          pm25,
          householdProfile,
          commuteMode,
          cookingHeating,
          apiKey,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { advice?: string; provider?: string };
        if (data.advice) {
          setAiSummary(data.advice);
          setAiSource(data.provider === 'gemini' ? 'gemini' : 'heuristic');
          return;
        }
      }
      setAiSummary(buildLocalBrief());
      setAiSource('heuristic');
    } catch {
      setAiSummary(buildLocalBrief());
      setAiSource('heuristic');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <section
      aria-labelledby="urban-smog-assistant-heading"
      className="bg-[var(--paper)] border border-[var(--line)] p-6 rounded-xl shadow-[var(--shadow)] space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--line)] pb-4">
        <div>
          <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 uppercase font-bold tracking-widest block mb-1">
            GENAI URBAN AIR QUALITY & WINTER SMOG ASSISTANT
          </span>
          <h3
            id="urban-smog-assistant-heading"
            className="text-lg font-bold text-[var(--ink)] font-display flex items-center gap-2"
          >
            <Sparkles aria-hidden="true" className="w-4 h-4 text-emerald-500" />
            <span>
              Family & Community Smog Playbook — {city}
            </span>
          </h3>
          <p className="text-xs text-[var(--muted)] mt-1">
            Tailored low-emission daily routines, indoor air quality (IAQ) hacks, and sustainable
            alternatives with quantified health & carbon impact.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span
            className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border ${
              usAqi >= 201
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                : usAqi >= 101
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
            }`}
          >
            {playbook.smogRiskLevel}
          </span>
          <button
            type="button"
            onClick={handleAskGenAiPlaybook}
            disabled={aiLoading}
            className="px-3.5 py-2 rounded-lg bg-[#1e5945] hover:bg-[#286e57] disabled:opacity-60 text-white font-mono text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
          >
            {aiLoading ? (
              <Loader2 aria-hidden="true" className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles aria-hidden="true" className="w-3.5 h-3.5" />
            )}
            <span>{aiLoading ? 'Synthesizing...' : 'Generate GenAI Smog Brief'}</span>
          </button>
        </div>
      </div>

      {/* Location & Lifestyle Tailoring Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="smog-household-select"
            className="text-[10px] text-[var(--muted)] uppercase font-bold"
          >
            Family / Community Profile
          </label>
          <select
            id="smog-household-select"
            value={householdProfile}
            onChange={(e) => setHouseholdProfile(e.target.value as HouseholdProfile)}
            className="w-full px-3 py-2 bg-[#edf2ee] dark:bg-[#14231b] border border-[var(--line)] rounded-lg text-[var(--ink)] outline-none focus:border-emerald-500"
          >
            <option value="family_kids">Family with Children / School Runs</option>
            <option value="elderly_asthma">Elderly / Asthma-Sensitive Household</option>
            <option value="community_group">Residential Society / Community Group</option>
            <option value="working_adult">Urban Working Commuter</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="smog-commute-select"
            className="text-[10px] text-[var(--muted)] uppercase font-bold"
          >
            Primary Daily Commute
          </label>
          <select
            id="smog-commute-select"
            value={commuteMode}
            onChange={(e) => setCommuteMode(e.target.value as CommuteMode)}
            className="w-full px-3 py-2 bg-[#edf2ee] dark:bg-[#14231b] border border-[var(--line)] rounded-lg text-[var(--ink)] outline-none focus:border-emerald-500"
          >
            <option value="car_cab">Petrol / Diesel Car or Cab</option>
            <option value="two_wheeler">Two-Wheeler / Scooter</option>
            <option value="metro_bus">Metro / Electric Bus</option>
            <option value="wfh">Work From Home / Local Walk</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="smog-cooking-select"
            className="text-[10px] text-[var(--muted)] uppercase font-bold"
          >
            Cooking & Winter Heating
          </label>
          <select
            id="smog-cooking-select"
            value={cookingHeating}
            onChange={(e) => setCookingHeating(e.target.value as CookingHeatingMode)}
            className="w-full px-3 py-2 bg-[#edf2ee] dark:bg-[#14231b] border border-[var(--line)] rounded-lg text-[var(--ink)] outline-none focus:border-emerald-500"
          >
            <option value="lpg">LPG Gas Stove / Space Heater</option>
            <option value="electric_induction">Electric Induction / Heat Pump</option>
            <option value="wood_biomass">Solid Fuel / Biomass / Incense Coils</option>
          </select>
        </div>
      </div>

      {/* Winter Smog Inversion Advisory Banner */}
      <div className="p-4 rounded-xl bg-[#edf2ee] dark:bg-[#14231b] border border-[var(--line)] flex items-start gap-3">
        <ShieldAlert aria-hidden="true" className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase font-bold text-amber-300 tracking-wider">
            Winter Smog & Inversion Window ({playbook.city})
          </div>
          <p className="text-xs text-[var(--ink)] leading-relaxed">
            {playbook.winterInversionAdvisory}
          </p>
        </div>
      </div>

      {/* GenAI Response Panel (when generated) */}
      {aiSummary && (
        <div
          role="region"
          aria-label="Gemini AI Smog Advisory Brief"
          className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 animate-fade-in"
        >
          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-emerald-300 uppercase">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5" />
              GenAI Tailored Household Briefing
            </span>
            <span>{aiSource === 'gemini' ? 'Google Gemini 1.5 Flash' : 'Local Expert Engine'}</span>
          </div>
          <p className="text-xs text-[var(--ink)] whitespace-pre-line leading-relaxed">
            {aiSummary}
          </p>
        </div>
      )}

      {/* 3-Column Actionable Playbook with Direct Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1: Low-Emission Daily Routines */}
        <div className="p-4 rounded-xl bg-[#edf2ee] dark:bg-[#14231b] border border-[var(--line)] space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--ink)] font-mono border-b border-[var(--line)] pb-2">
            <Wind aria-hidden="true" className="w-4 h-4 text-cyan-400" />
            <span>Low-Emission Daily Routines</span>
          </div>
          <div className="space-y-3">
            {playbook.dailyRoutines.map((item, idx) => (
              <div key={idx} className="space-y-1 text-xs">
                <div className="font-bold text-[var(--ink)]">{item.title}</div>
                <p className="text-[11px] text-[var(--muted)] leading-relaxed">{item.detail}</p>
                <div className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                  Direct Impact: {item.directImpact}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Indoor Air Quality Hacks */}
        <div className="p-4 rounded-xl bg-[#edf2ee] dark:bg-[#14231b] border border-[var(--line)] space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--ink)] font-mono border-b border-[var(--line)] pb-2">
            <Home aria-hidden="true" className="w-4 h-4 text-emerald-400" />
            <span>Indoor Air Quality (IAQ) Hacks</span>
          </div>
          <div className="space-y-3">
            {playbook.indoorHacks.map((item, idx) => (
              <div key={idx} className="space-y-1 text-xs">
                <div className="font-bold text-[var(--ink)]">{item.title}</div>
                <p className="text-[11px] text-[var(--muted)] leading-relaxed">{item.detail}</p>
                <div className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                  Direct Impact: {item.directImpact}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Sustainable Alternatives + Community */}
        <div className="p-4 rounded-xl bg-[#edf2ee] dark:bg-[#14231b] border border-[var(--line)] space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--ink)] font-mono border-b border-[var(--line)] pb-2">
            <Leaf aria-hidden="true" className="w-4 h-4 text-emerald-400" />
            <span>Sustainable Alternatives</span>
          </div>
          <div className="space-y-3">
            {playbook.sustainableAlternatives.map((item, idx) => (
              <div key={idx} className="space-y-1 text-xs">
                <div className="font-bold text-[var(--ink)]">{item.title}</div>
                <p className="text-[11px] text-[var(--muted)] leading-relaxed">{item.detail}</p>
                <div className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                  Direct Impact: {item.directImpact}
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-[var(--line)] space-y-1 text-xs">
              <div className="font-bold text-[var(--ink)] flex items-center gap-1.5">
                <Users aria-hidden="true" className="w-3.5 h-3.5 text-cyan-400" />
                <span>{playbook.communityAction.title}</span>
              </div>
              <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                {playbook.communityAction.detail}
              </p>
              <div className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded">
                Community Impact: {playbook.communityAction.directImpact}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
