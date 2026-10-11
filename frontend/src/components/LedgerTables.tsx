'use client';

import React, { useState } from 'react';
import { Database, Filter, Search, Trash2, ArrowUpDown, Smartphone, MapPin, Zap } from 'lucide-react';
import { LedgerEntry } from '@/lib/carbon';
import { generateUserReport, getActiveUserEmail } from '@/lib/db';

interface LedgerTablesProps {
  ledger: LedgerEntry[];
  onClear: () => void;
}

export default function LedgerTables({ ledger, onClear }: LedgerTablesProps) {
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'timestamp' | 'carbon'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort the ledger entries
  const filteredLedger = ledger
    .filter(entry => {
      const matchSearch = 
        entry.title.toLowerCase().includes(search.toLowerCase()) || 
        entry.reasoning.toLowerCase().includes(search.toLowerCase()) ||
        entry.category.toLowerCase().includes(search.toLowerCase());
      const matchSource = filterSource === 'all' || entry.source === filterSource;
      return matchSearch && matchSource;
    })
    .sort((a, b) => {
      if (sortBy === 'timestamp') {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      } else {
        return sortOrder === 'desc' ? b.carbonFootprint - a.carbonFootprint : a.carbonFootprint - b.carbonFootprint;
      }
    });

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'plaid':
        return <Smartphone className="w-3.5 h-3.5 text-[var(--neon-blue)]" />;
      case 'maps':
        return <MapPin className="w-3.5 h-3.5 text-[var(--neon-yellow)]" />;
      case 'homeassistant':
        return <Zap className="w-3.5 h-3.5 text-[var(--neon-green)]" />;
      default:
        return <Database className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'plaid': return 'Plaid Fin';
      case 'maps': return 'Transit';
      case 'homeassistant': return 'Energy';
      default: return 'Other';
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'plaid': return 'bg-[var(--neon-blue)]/10 text-[var(--neon-blue)] border-[var(--neon-blue)]/20';
      case 'maps': return 'bg-[var(--neon-yellow)]/10 text-[var(--neon-yellow)] border-[var(--neon-yellow)]/20';
      case 'homeassistant': return 'bg-[var(--neon-green)]/10 text-[var(--neon-green)] border-[var(--neon-green)]/20';
      default: return 'bg-neutral-850 text-neutral-400 border-neutral-800';
    }
  };

  const toggleSort = (field: 'timestamp' | 'carbon') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="bg-[var(--paper)] border border-[var(--line)] rounded-xl p-5 sm:p-6 w-full flex flex-col h-full gap-5 shadow-[var(--shadow)]">
      {/* Table Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider font-mono mb-1">
            02 / IMMUTABLE LEDGER
          </div>
          <h2 className="text-lg font-bold font-display tracking-tight text-[var(--ink)] flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Carbon Telemetry Ledger
          </h2>
          <p className="text-xs text-[var(--muted)] font-mono mt-0.5">
            Cryptographic time-series records representing passive ingestion events
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const activeEmail = getActiveUserEmail();
              const report = generateUserReport(activeEmail);
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute("href", dataStr);
              downloadAnchor.setAttribute("download", `clint-envo-report-${activeEmail ? activeEmail.replace(/[^a-zA-Z0-9]/g, '_') : 'user'}-${new Date().toISOString().slice(0, 10)}.json`);
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
            className="px-3 py-1.5 text-xs font-mono text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-medium"
            title="Export Personal Carbon Report & History as JSON"
          >
            <span>📥 Export Report ↓</span>
          </button>

          <button
            onClick={onClear}
            className="px-3 py-1.5 text-xs font-mono text-red-600 dark:text-red-400 hover:text-red-700 border border-red-500/30 bg-red-500/10 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset DB</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 font-mono">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search transactions, logic, categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#edf2ee] dark:bg-[#14231b] border border-[var(--line)] rounded-lg text-[var(--ink)] placeholder-[var(--muted)] outline-none focus:border-emerald-500 transition-all"
          />
        </div>

        {/* Source Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-3.5 h-3.5 text-[var(--muted)]" />
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="bg-[#edf2ee] dark:bg-[#14231b] border border-[var(--line)] rounded-lg px-3 py-2 text-xs text-[var(--ink)] outline-none cursor-pointer"
          >
            <option value="all">All Sources</option>
            <option value="plaid">Plaid Financials</option>
            <option value="maps">Transit Telemetry</option>
            <option value="homeassistant">Home Energy</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-x-auto border border-[var(--line)] bg-[var(--paper)] rounded-lg">
        <table className="w-full border-collapse text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[#edf2ee] dark:bg-[#14231b] text-[var(--muted)] text-[10px] uppercase tracking-wider">
              <th className="p-3 font-semibold">Source</th>
              <th className="p-3 font-semibold">Title</th>
              <th 
                className="p-3 font-semibold cursor-pointer hover:text-[var(--ink)] transition-colors"
                onClick={() => toggleSort('timestamp')}
              >
                <div className="flex items-center gap-1">
                  Timestamp <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3 font-semibold text-right">Telemetry Amount</th>
              <th 
                className="p-3 font-semibold text-right cursor-pointer hover:text-[var(--ink)] transition-colors"
                onClick={() => toggleSort('carbon')}
              >
                <div className="flex items-center justify-end gap-1">
                  GHG Impact <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3 font-semibold hidden lg:table-cell">Pipeline Logic</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {filteredLedger.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[var(--muted)] font-mono">
                  Zero active ledger packets match search filters
                </td>
              </tr>
            ) : (
              filteredLedger.map((entry) => (
                <tr 
                  key={entry.id} 
                  className="hover:bg-[#edf2ee]/60 dark:hover:bg-[#14231b]/60 transition-colors group"
                >
                  <td className="p-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium ${getSourceBadge(entry.source)}`}>
                      {getSourceIcon(entry.source)}
                      {getSourceLabel(entry.source)}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-[var(--ink)]">{entry.title}</td>
                  <td className="p-3 text-[var(--muted)] whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="p-3 text-right text-[var(--ink)] font-semibold whitespace-nowrap">
                    {(entry.unit === 'USD' || entry.unit === 'INR') && `₹${entry.amount.toFixed(2)}`}
                    {entry.unit === 'KM' && `${entry.amount} KM`}
                    {entry.unit === 'KWH' && `${entry.amount} kWh`}
                  </td>
                  <td className="p-3 text-right font-bold whitespace-nowrap">
                    <span className={entry.carbonFootprint > 150 ? 'text-[#d66b52]' : entry.carbonFootprint > 40 ? 'text-[#e9a34a]' : 'text-[#1e5945] dark:text-[#79c696]'}>
                      {entry.carbonFootprint} kg
                    </span>
                  </td>
                  <td className="p-3 text-[var(--muted)] hidden lg:table-cell text-[10px] leading-relaxed max-w-sm overflow-hidden text-ellipsis">
                    {entry.reasoning}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Table Footer */}
      <div className="flex justify-between items-center text-[10px] text-[var(--muted)] font-mono pt-1">
        <span>Showing {filteredLedger.length} of {ledger.length} events</span>
        <span>AUDIT STATE: IMMUTABLE TIME-SERIES LEDGER</span>
      </div>
    </div>
  );
}
