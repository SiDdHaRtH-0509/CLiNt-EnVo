'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Wind, 
  MapPin, 
  Search, 
  RefreshCw, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  Sliders, 
  Key, 
  ExternalLink, 
  Sparkles, 
  ChevronRight, 
  Info, 
  Check, 
  Navigation,
  Flame,
  CloudRain,
  Eye,
  Thermometer,
  Compass,
  Database,
  BarChart3,
  Calendar,
  Layers,
  Map as MapIcon,
  Star,
  FileSpreadsheet,
  Clock,
  ArrowRight,
  TrendingUp,
  Download,
  Filter
} from 'lucide-react';
import { addRawEvent } from '@/lib/db';
import confetti from 'canvas-confetti';

interface AqiData {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  usAqi: number;
  europeanAqi?: number;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  o3: number;
  co: number;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  updatedAt: string;
  hourly?: {
    time: string[];
    us_aqi?: number[];
    pm2_5?: number[];
    pm10?: number[];
    ozone?: number[];
    nitrogen_dioxide?: number[];
    sulphur_dioxide?: number[];
  };
  provider: string;
}

interface IndiaStationRecord {
  city: string;
  state: string;
  station: string;
  latitude?: number | null;
  longitude?: number | null;
  last_update?: string;
  pollutant: string;
  pollutant_min?: number | null;
  pollutant_max?: number | null;
  pollutant_avg?: number | null;
  pollutant_unit?: string;
  aqi?: number | null;
}

interface MapPoint {
  city: string;
  state: string;
  lat: number;
  lon: number;
  aqi: number;
  pm25: number;
  updated_at: string;
}

const INDIAN_CITIES = [
  { name: 'Delhi', state: 'Delhi', lat: 28.6139, lon: 77.2090 },
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lon: 72.8777 },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lon: 77.5946 },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lon: 88.3639 },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lon: 80.2707 },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lon: 78.4867 },
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lon: 73.8567 },
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lon: 80.9462 },
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lon: 75.7873 },
  { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lon: 72.5714 },
  { name: 'Chandigarh', state: 'Chandigarh', lat: 30.7333, lon: 76.7794 },
  { name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lon: 77.4126 },
  { name: 'Patna', state: 'Bihar', lat: 25.5941, lon: 85.1376 },
  { name: 'Guwahati', state: 'Assam', lat: 26.1445, lon: 91.7362 },
  { name: 'Kochi', state: 'Kerala', lat: 9.9312, lon: 76.2673 },
  { name: 'Srinagar', state: 'Jammu & Kashmir', lat: 34.0837, lon: 74.7973 },
  { name: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lon: 75.8577 },
  { name: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lon: 82.9739 },
  { name: 'Tokyo', state: 'Japan', lat: 35.6762, lon: 139.6503 },
  { name: 'London', state: 'United Kingdom', lat: 51.5074, lon: -0.1278 },
  { name: 'New York', state: 'United States', lat: 40.7128, lon: -74.0060 }
];

export default function AqiMonitor({ theme = 'dark', onNewTelemetry }: { theme?: 'light' | 'dark'; onNewTelemetry?: () => void }) {
  const isLight = false;

  // Active Sub-Track inside Air Intel
  const [activeTrack, setActiveTrack] = useState<'overview' | 'map' | 'india' | 'compare' | 'trends' | 'exposure' | 'saved'>('overview');

  // Core Data States
  const [selectedCity, setSelectedCity] = useState(INDIAN_CITIES[0]);
  const [aqiData, setAqiData] = useState<AqiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Saved Favorites
  const [favorites, setFavorites] = useState<string[]>([]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('clint-air-favorites') || '["Delhi", "Mumbai", "Bengaluru"]');
      setFavorites(saved);
    } catch (e) {
      setFavorites(['Delhi', 'Mumbai']);
    }
  }, []);

  const toggleFavorite = (cityName: string) => {
    setFavorites(prev => {
      const next = prev.includes(cityName) ? prev.filter(c => c !== cityName) : [...prev, cityName];
      localStorage.setItem('clint-air-favorites', JSON.stringify(next));
      return next;
    });
  };

  const getBackendUrl = () => {
    if (process.env.NEXT_PUBLIC_BACKEND_URL) return process.env.NEXT_PUBLIC_BACKEND_URL;
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
      if (isLocal) return 'http://localhost:5000';
    }
    return 'http://localhost:5000';
  };

  // 1. Fetch Main Air Quality (Backend Proxy with resilient Open-Meteo fallback)
  const fetchAirData = async (lat: number, lon: number, cityName: string, countryName: string = 'India') => {
    setLoading(true);
    setError(null);
    try {
      const backendUrl = getBackendUrl();
      const aqiApiKey = typeof window !== 'undefined' ? localStorage.getItem('aqi_api_key') || '' : '';
      const aqiProvider = typeof window !== 'undefined' ? localStorage.getItem('aqi_provider') || 'open-meteo' : 'open-meteo';

      let serverData: any = null;
      try {
        const queryParams = new URLSearchParams({
          lat: lat.toString(),
          lon: lon.toString(),
          city: cityName,
          provider: aqiProvider,
          apiKey: aqiApiKey
        });
        const serverRes = await fetch(`${backendUrl}/api/aqi?${queryParams.toString()}`);
        if (serverRes.ok) {
          serverData = await serverRes.json();
        }
      } catch (err) {
        console.warn('Backend proxy unavailable, running direct upstream fallback:', err);
      }

      let current: any = {};
      let hourly: any = {};
      let providerName = 'Open-Meteo Atmospheric Grid (CAMS Copernicus Model)';

      if (serverData && serverData.data) {
        current = serverData.data.current || {};
        hourly = serverData.data.hourly || {};
        providerName = serverData.provider || providerName;
      } else {
        const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide&timezone=auto`;
        const aqiRes = await fetch(aqiUrl);
        if (!aqiRes.ok) throw new Error('Failed to retrieve atmospheric telemetry');
        const aqiJson = await aqiRes.json();
        current = aqiJson.current || {};
        hourly = aqiJson.hourly || {};
      }

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`;
      const weatherRes = await fetch(weatherUrl).catch(() => null);
      const weatherJson = weatherRes && weatherRes.ok ? await weatherRes.json() : null;

      setAqiData({
        city: cityName,
        country: countryName,
        latitude: lat,
        longitude: lon,
        usAqi: Math.round(current.us_aqi ?? 55),
        europeanAqi: Math.round(current.european_aqi ?? 28),
        pm25: Number((current.pm2_5 ?? 18).toFixed(1)),
        pm10: Number((current.pm10 ?? 32).toFixed(1)),
        no2: Number((current.nitrogen_dioxide ?? 15).toFixed(1)),
        so2: Number((current.sulphur_dioxide ?? 4).toFixed(1)),
        o3: Number((current.ozone ?? 38).toFixed(1)),
        co: Number((current.carbon_monoxide ?? 280).toFixed(0)),
        temperature: weatherJson?.current?.temperature_2m ?? current.temperature,
        humidity: weatherJson?.current?.relative_humidity_2m ?? current.humidity,
        windSpeed: weatherJson?.current?.wind_speed_10m ?? current.wind_speed,
        updatedAt: current.time ? new Date(current.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hourly: hourly,
        provider: providerName
      });
    } catch (e: any) {
      setError(e.message || 'Unable to connect to air quality provider.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAirData(selectedCity.lat, selectedCity.lon, selectedCity.name, selectedCity.state);
  }, []);

  // Geolocation
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        const currentLoc = { name: 'My Coordinates', state: 'GPS Sensor', lat: latitude, lon: longitude };
        setSelectedCity(currentLoc);
        fetchAirData(latitude, longitude, 'My Coordinates', 'Local GPS');
      },
      err => {
        setLoading(false);
        setError(`Location check failed: ${err.message}`);
      }
    );
  };

  // Search geocode
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery.trim())}&count=5&language=en&format=json`);
      const geoJson = await geoRes.json();
      if (geoJson.results && geoJson.results.length > 0) {
        setSearchResults(geoJson.results);
      } else {
        setSearchResults([]);
        setError(`No coordinates found for "${searchQuery}"`);
      }
    } catch {
      setError('Geocoding service unavailable.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (res: any) => {
    const loc = { name: res.name, state: res.admin1 || res.country || '', lat: res.latitude, lon: res.longitude };
    setSelectedCity(loc);
    setSearchResults([]);
    setSearchQuery('');
    fetchAirData(loc.lat, loc.lon, loc.name, loc.state);
  };

  // 2. Track: Official India Stations (CPCB)
  const [stationRecords, setStationRecords] = useState<IndiaStationRecord[]>([]);
  const [stationLoading, setStationLoading] = useState(false);
  const [stationCityFilter, setStationCityFilter] = useState('');
  const [stationStateFilter, setStationStateFilter] = useState('');

  const loadIndiaStations = async () => {
    setStationLoading(true);
    try {
      const params = new URLSearchParams();
      if (stationCityFilter) params.set('city', stationCityFilter);
      if (stationStateFilter) params.set('state', stationStateFilter);
      const res = await fetch(`${getBackendUrl()}/api/india/stations?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setStationRecords(json.records || []);
      }
    } catch {
      // Fallback
    } finally {
      setStationLoading(false);
    }
  };

  useEffect(() => {
    if (activeTrack === 'india' && stationRecords.length === 0) {
      loadIndiaStations();
    }
  }, [activeTrack]);

  // Export Stations CSV
  const handleExportStationsCsv = () => {
    if (!stationRecords.length) return;
    const headers = ['City', 'State', 'Station', 'Pollutant', 'Min', 'Max', 'Average', 'Unit', 'Source AQI', 'Last Update'];
    const rows = stationRecords.map(r => [
      r.city,
      r.state,
      `"${r.station.replace(/"/g, '""')}"`,
      r.pollutant,
      r.pollutant_min ?? '',
      r.pollutant_max ?? '',
      r.pollutant_avg ?? '',
      r.pollutant_unit ?? 'µg/m³',
      r.aqi ?? '',
      r.last_update ?? ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `airwatch-cpcb-stations-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // 3. Track: City Comparison
  const [compareList, setCompareList] = useState<string[]>(['Delhi', 'Mumbai', 'Bengaluru', 'Kolkata', 'Chennai']);
  const [compareResults, setCompareResults] = useState<any[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);

  const loadComparison = async () => {
    setCompareLoading(true);
    try {
      const res = await fetch(`${getBackendUrl()}/api/compare?cities=${encodeURIComponent(compareList.join(','))}`);
      if (res.ok) {
        const json = await res.json();
        setCompareResults(json.cities || []);
      }
    } catch {
      //
    } finally {
      setCompareLoading(false);
    }
  };

  useEffect(() => {
    if (activeTrack === 'compare' && compareResults.length === 0) {
      loadComparison();
    }
  }, [activeTrack, compareList]);

  // 4. Track: Map Data
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [mapFilter, setMapFilter] = useState<string>('all');
  const [selectedMapCity, setSelectedMapCity] = useState<MapPoint | null>(null);

  const loadMapData = async () => {
    try {
      const res = await fetch(`${getBackendUrl()}/api/map-data`);
      if (res.ok) {
        const json = await res.json();
        setMapPoints(json.points || []);
        if (json.points && json.points.length > 0 && !selectedMapCity) {
          setSelectedMapCity(json.points[0]);
        }
      }
    } catch {
      //
    }
  };

  useEffect(() => {
    if (activeTrack === 'map' && mapPoints.length === 0) {
      loadMapData();
    }
  }, [activeTrack]);

  // 5. Track: Trend Explorer Metric
  const [trendMetric, setTrendMetric] = useState<'us_aqi' | 'pm2_5' | 'pm10' | 'ozone'>('us_aqi');

  // 6. Track: Exposure Planner
  const [planActivity, setPlanActivity] = useState('walk');
  const [planDuration, setPlanDuration] = useState(60);
  const [planSensitivity, setPlanSensitivity] = useState('general');
  const [planTime, setPlanTime] = useState('morning');
  const [generatedPlan, setGeneratedPlan] = useState<any | null>(null);

  const handleGeneratePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const currentAqi = aqiData?.usAqi ?? 75;
    let concern = currentAqi <= 50 ? 'Lower Concern' : currentAqi <= 100 ? 'Some Caution' : currentAqi <= 150 ? 'Reduce Exposure' : 'High Caution';
    
    const tips = [];
    if (currentAqi <= 50) {
      tips.push({ title: 'Favourable Atmosphere', copy: 'Air conditions are clean. Normal outdoor activity is safe and encouraged.' });
    } else if (currentAqi <= 100) {
      tips.push({ title: 'Moderate Particulate Level', copy: 'Generally acceptable. Sensitive respiratory individuals should consider easier exertion.' });
    } else {
      tips.push({ title: 'Elevated Particulate Exposure', copy: 'Consider moving strenuous cardio workouts indoors or opting for shaded parks away from arterials.' });
    }

    if (planActivity === 'run') {
      tips.push({ title: 'High Inhalation Volume', copy: 'Cardio significantly elevates respiratory airflow. Choose low-traffic residential routes.' });
    } else if (planActivity === 'outdoor-work') {
      tips.push({ title: 'Scheduled Rest Periods', copy: 'Incorporate breaks in filtered, air-conditioned indoor rooms.' });
    } else if (planActivity === 'kids-play') {
      tips.push({ title: 'Child Health Consideration', copy: 'Children breathe faster per unit body weight; keep outdoor play under 45 minutes.' });
    } else {
      tips.push({ title: 'Bundle Transit Trips', copy: 'Combine travel into single trips to reduce cumulative roadside inhalation.' });
    }

    if (planSensitivity !== 'general') {
      tips.push({ title: 'Vulnerable Demographic Advisory', copy: 'Have personal relief inhalers or protective N95 filtration accessible.' });
    }

    if (planDuration > 90) {
      tips.push({ title: 'Extended Exposure Window', copy: `${planDuration} minutes outdoors increases particulate dose. Consider shortening by 30%.` });
    }

    setGeneratedPlan({ concern, aqi: currentAqi, tips });
  };

  // Carbon Ingest Hook
  const [ingestSuccess, setIngestSuccess] = useState(false);
  const handleIngestCarbon = () => {
    if (!aqiData) return;
    const impact = Math.max(3.2, Number((aqiData.usAqi * 0.14).toFixed(2)));
    addRawEvent({
      id: `aqi-event-${Date.now()}`,
      source: 'homeassistant',
      timestamp: new Date().toISOString(),
      amount: impact,
      title: `Atmospheric Sensor: ${aqiData.city} (AQI ${aqiData.usAqi})`,
      rawDetails: `AirWatch India Telemetry Feed. Place: ${aqiData.city}, ${aqiData.country}. US AQI: ${aqiData.usAqi}, PM2.5: ${aqiData.pm25} µg/m³. Estimated combustion delta: +${impact} kg CO2e.`
    });
    setIngestSuccess(true);
    if (onNewTelemetry) onNewTelemetry();
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 }, colors: ['#48a975', '#6bc3ed'] });
    setTimeout(() => setIngestSuccess(false), 3000);
  };

  // EPA Category Helper
  const aqiCategory = useMemo(() => {
    const val = aqiData?.usAqi ?? 0;
    if (val <= 50) return { label: 'GOOD', tone: 'good', color: '#48a975', advice: 'Air quality is satisfactory. Air pollution poses little or no health risk.' };
    if (val <= 100) return { label: 'MODERATE', tone: 'moderate', color: '#d7ad3e', advice: 'Acceptable air quality. Unusually sensitive people should take minor precautions.' };
    if (val <= 150) return { label: 'SENSITIVE GROUPS', tone: 'sensitive', color: '#e58c4c', advice: 'Children, older adults, and people with respiratory conditions may experience irritation.' };
    if (val <= 200) return { label: 'UNHEALTHY', tone: 'unhealthy', color: '#d85f4d', advice: 'Members of the general public may feel irritation; sensitive individuals face greater risk.' };
    if (val <= 300) return { label: 'VERY UNHEALTHY', tone: 'very-unhealthy', color: '#9657a6', advice: 'Health alert: Risk of health effects increased for everyone in the area.' };
    return { label: 'HAZARDOUS', tone: 'hazardous', color: '#7c304a', advice: 'Emergency conditions. The entire population is likely to be affected by severe respiratory risks.' };
  }, [aqiData?.usAqi]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in font-sans">
      
      {/* Editorial Field Navigation Bar (AirWatch Field Style) */}
      <div className="bg-[var(--paper)] border border-[var(--line)] p-2 sm:p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-[var(--shadow)]">
        
        {/* Track Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'overview', icon: '◉', label: 'Air Overview', track: 'TRACK 01' },
            { id: 'map', icon: '⌖', label: 'Pollution Map', track: 'TRACK 02' },
            { id: 'india', icon: '▤', label: 'India Stations (CPCB)', track: 'OFFICIAL' },
            { id: 'compare', icon: '▥', label: 'City Compare', track: 'MULTI-CITY' },
            { id: 'trends', icon: '⌁', label: 'Trend Explorer', track: 'HOURLY' },
            { id: 'exposure', icon: '✳', label: 'Exposure Planner', track: 'PLAN' },
            { id: 'saved', icon: '☆', label: `Saved (${favorites.length})`, track: 'WATCHLIST' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTrack(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
                activeTrack === tab.id
                  ? 'bg-[#edf2ee] dark:bg-[#14231b] text-emerald-800 dark:text-emerald-400 font-bold border border-[var(--line)]'
                  : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[#edf2ee]/50 dark:hover:bg-[#14231b]/50 border border-transparent'
              }`}
            >
              <span className="text-emerald-700 dark:text-emerald-400">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Global Indicator */}
        <div className="flex items-center gap-2.5 text-xs font-mono ml-auto">
          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] uppercase font-bold tracking-wider">CPCB & CAMS MODEL LIVE</span>
          </span>
          <button
            onClick={() => fetchAirData(selectedCity.lat, selectedCity.lon, selectedCity.name, selectedCity.state)}
            className="p-1.5 rounded-lg bg-[var(--paper)] hover:bg-[#edf2ee] dark:hover:bg-[#14231b] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
            title="Refresh active model"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''}`} />
          </button>
        </div>

      </div>

      {/* TRACK 1: AIR OVERVIEW (FIELD READOUT) */}
      {activeTrack === 'overview' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          
          {/* Hero Banner & Field Selector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Left Hero Statement */}
            <div className="lg:col-span-7 bg-[var(--paper)] border border-[var(--line)] p-6 sm:p-8 rounded-xl flex flex-col justify-between shadow-[var(--shadow)] relative overflow-hidden">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-700 dark:text-emerald-400 uppercase tracking-widest font-bold mb-3">
                  <span className="w-2 h-2 bg-emerald-600 dark:bg-emerald-500 inline-block" />
                  FIELD INTELLIGENCE / ATMOSPHERE STUDY
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--ink)] tracking-tight font-display">
                  Air is a shared <span className="text-emerald-700 dark:text-emerald-400 font-normal italic">experience.</span>
                </h1>
                <p className="text-xs text-[var(--muted)] mt-2 max-w-lg leading-relaxed">
                  Real-time pollution diagnostics, particulate concentrations, and invisible atmospheric variables shaping the way we live, move, and decarbonize.
                </p>
              </div>

              {/* Location Selector Row */}
              <div className="mt-6 pt-5 border-t border-[var(--line)] flex flex-wrap items-center gap-3 font-mono text-xs">
                
                {/* City Picker Dropdown */}
                <div className="flex items-center gap-2 bg-[#edf2ee] dark:bg-[#14231b] px-3 py-2 rounded-lg border border-[var(--line)] flex-1 min-w-[200px]">
                  <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] text-[var(--muted)] block uppercase font-bold">MONITORED CITY</span>
                    <select
                      value={selectedCity.name}
                      onChange={e => {
                        const match = INDIAN_CITIES.find(c => c.name === e.target.value);
                        if (match) {
                          setSelectedCity(match);
                          fetchAirData(match.lat, match.lon, match.name, match.state);
                        }
                      }}
                      className="w-full bg-transparent text-[var(--ink)] font-bold text-xs outline-none cursor-pointer"
                    >
                      {INDIAN_CITIES.map(c => (
                        <option key={c.name} value={c.name} className="bg-[var(--paper)] text-[var(--ink)]">
                          {c.name} ({c.state})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* GPS Button */}
                <button
                  onClick={handleDetectLocation}
                  className="px-3.5 py-2.5 rounded-lg bg-[var(--paper)] hover:bg-[#edf2ee] dark:hover:bg-[#14231b] border border-[var(--line)] text-[var(--ink)] text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Navigation className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Use GPS</span>
                </button>

                {/* Star Favorite Button */}
                <button
                  onClick={() => toggleFavorite(selectedCity.name)}
                  className={`px-3.5 py-2.5 rounded-lg border text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                    favorites.includes(selectedCity.name)
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-300'
                      : 'bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${favorites.includes(selectedCity.name) ? 'fill-amber-400 text-amber-500' : ''}`} />
                  <span>{favorites.includes(selectedCity.name) ? 'Saved' : 'Save'}</span>
                </button>

                {/* Search Form */}
                <form onSubmit={handleSearch} className="relative flex-1 min-w-[160px]">
                  <input
                    type="text"
                    placeholder="Search any place..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 bg-[#edf2ee] dark:bg-[#14231b] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] outline-none focus:border-emerald-500 placeholder-[var(--muted)]"
                  />
                  <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-2.5 top-3 pointer-events-none" />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--paper)] border border-[var(--line)] rounded-lg shadow-xl z-50 overflow-hidden font-mono text-xs">
                      {searchResults.map(res => (
                        <button
                          key={`${res.id}-${res.latitude}`}
                          type="button"
                          onClick={() => handleSelectResult(res)}
                          className="w-full p-2.5 text-left hover:bg-[#edf2ee] dark:hover:bg-[#14231b] text-[var(--ink)] flex justify-between border-b border-[var(--line)] last:border-0"
                        >
                          <span className="font-bold">{res.name}</span>
                          <span className="text-[10px] text-[var(--muted)]">{res.admin1 || res.country}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </form>

              </div>
            </div>

            {/* Right Ambient Atmosphere Graphic (AirWatch Hero Art) */}
            <div className="lg:col-span-5 bg-gradient-to-br from-[#1e5945] to-[#143c2f] text-white border border-emerald-900/30 dark:border-neutral-800 rounded-xl p-6 flex flex-col justify-between shadow-[var(--shadow)] relative overflow-hidden">
              <div className="flex justify-between items-start font-mono text-[10px]">
                <span className="px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  ATMOSPHERE SENSOR
                </span>
                <span className="text-emerald-200/70">
                  {selectedCity.lat.toFixed(2)}° N • {selectedCity.lon.toFixed(2)}° E
                </span>
              </div>

              <div className="my-4">
                <span className="text-[10px] font-mono text-emerald-200/80 uppercase tracking-widest block">CURRENT STATION / CITY</span>
                <h2 className="text-3xl font-extrabold text-white tracking-tight font-display mt-1">
                  {aqiData?.city || selectedCity.name}
                </h2>
                <p className="text-xs text-emerald-300 font-mono mt-0.5">
                  {selectedCity.state} • Updated at {aqiData?.updatedAt || 'Live'}
                </p>
              </div>

              {/* Climate Strip */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-emerald-800/60 font-mono text-xs">
                <div className="p-2.5 rounded-lg bg-black/20 border border-emerald-700/40">
                  <span className="text-[9px] text-emerald-200/70 block">TEMP</span>
                  <span className="font-bold text-white text-sm">{aqiData?.temperature ?? 24}°C</span>
                </div>
                <div className="p-2.5 rounded-lg bg-black/20 border border-emerald-700/40">
                  <span className="text-[9px] text-emerald-200/70 block">HUMIDITY</span>
                  <span className="font-bold text-white text-sm">{aqiData?.humidity ?? 45}%</span>
                </div>
                <div className="p-2.5 rounded-lg bg-black/20 border border-emerald-700/40">
                  <span className="text-[9px] text-emerald-200/70 block">WIND</span>
                  <span className="font-bold text-white text-sm">{aqiData?.windSpeed ?? 8} km/h</span>
                </div>
              </div>
            </div>

          </div>

          {/* Master Field Diagnostic Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Col: Master Conic Gauge & Advice (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              
              {/* AQI Master Panel */}
              <div className="bg-[var(--paper)] border border-[var(--line)] p-6 sm:p-7 rounded-xl shadow-[var(--shadow)] space-y-6">
                
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 font-mono">
                  <div>
                    <span className="text-[10px] text-[var(--muted)] block uppercase font-bold">LIVE MODEL ESTIMATE</span>
                    <h3 className="text-base font-bold text-[var(--ink)] font-display">Air Quality Index</h3>
                  </div>
                  <span className="text-[10px] text-[var(--muted)] font-mono">01 / AQI</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                  
                  {/* Conic Ring Gauge (AirWatch circular design) */}
                  <div className="sm:col-span-5 flex flex-col items-center justify-center p-4">
                    <div 
                      className="w-36 h-36 rounded-full flex items-center justify-center p-2.5 relative shadow-lg transition-all"
                      style={{
                        background: `conic-gradient(#48a975 0% 16%, #d7ad3e 16% 33%, #e58c4c 33% 50%, #d85f4d 50% 66%, #9657a6 66% 83%, #7c304a 83% 100%)`
                      }}
                    >
                      <div className="w-full h-full bg-[var(--paper)] rounded-full flex flex-col items-center justify-center border border-[var(--line)]">
                        <span className="text-5xl font-black font-display text-[var(--ink)] tracking-tighter">
                          {aqiData?.usAqi ?? '--'}
                        </span>
                        <span className="text-[9px] font-mono text-[var(--muted)] uppercase tracking-widest mt-0.5">
                          US AQI
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary & Scale Bar */}
                  <div className="sm:col-span-7 flex flex-col gap-3 font-mono">
                    <div 
                      className="px-3 py-1 rounded-md text-[10px] font-bold uppercase w-fit border"
                      style={{ 
                        backgroundColor: `${aqiCategory.color}15`, 
                        borderColor: `${aqiCategory.color}50`, 
                        color: aqiCategory.color 
                      }}
                    >
                      {aqiCategory.label} AIR QUALITY
                    </div>

                    <h4 className="text-base font-bold text-[var(--ink)] font-display leading-snug">
                      {aqiCategory.advice}
                    </h4>

                    {/* Multi-tone scale bar */}
                    <div className="pt-2">
                      <div className="h-2 w-full rounded-full bg-gradient-to-r from-[#48a975] via-[#d7ad3e] via-[#e58c4c] via-[#d85f4d] to-[#7c304a]" />
                      <div className="flex justify-between text-[9px] text-[var(--muted)] mt-1.5 uppercase font-mono">
                        <span>Good (0-50)</span>
                        <span>Moderate</span>
                        <span>Unhealthy</span>
                        <span>Hazardous</span>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="pt-3 border-t border-[var(--line)] flex justify-between items-center text-[10px] font-mono text-[var(--muted)]">
                  <span>SCALE: US-EPA STANDARD</span>
                  <span>TIME: {aqiData?.updatedAt}</span>
                </div>

              </div>

              {/* 24-Hour Projected Atmospheric Chart */}
              <div className="bg-[var(--paper)] border border-[var(--line)] p-6 rounded-xl shadow-[var(--shadow)] font-mono space-y-4">
                <div className="flex justify-between items-center border-b border-[var(--line)] pb-3">
                  <div>
                    <span className="text-[10px] text-[var(--muted)] block uppercase font-bold">HOURLY DISPERSION CURVE</span>
                    <h3 className="text-sm font-bold text-[var(--ink)] font-display">Air Quality Through the Day</h3>
                  </div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">LOWER IS BETTER ↓</span>
                </div>

                {/* Hourly Visualizer */}
                {aqiData?.hourly?.time && aqiData.hourly.us_aqi ? (
                  <div className="h-36 flex items-end gap-1 overflow-x-auto pt-6 pb-2 scrollbar-none">
                    {aqiData.hourly.time.slice(0, 24).map((timeStr, idx) => {
                      const val = aqiData.hourly?.us_aqi ? aqiData.hourly.us_aqi[idx] ?? 40 : 40;
                      const heightPct = Math.min(100, Math.max(15, (val / 250) * 100));
                      const label = new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                      return (
                        <div key={idx} className="flex-1 min-w-[28px] flex flex-col items-center gap-1 group relative">
                          <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center bg-[var(--paper)] border border-[var(--line)] px-2 py-1 rounded text-[10px] text-[var(--ink)] z-20 whitespace-nowrap shadow-xl">
                            <span>{label}</span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold">AQI {val}</span>
                          </div>
                          <div 
                            className={`w-full rounded-t transition-all ${
                              val <= 50 ? 'bg-emerald-600/80 group-hover:bg-emerald-500' :
                              val <= 100 ? 'bg-yellow-500/80 group-hover:bg-yellow-400' :
                              val <= 150 ? 'bg-orange-500/80 group-hover:bg-orange-400' :
                              'bg-rose-500/85 group-hover:bg-rose-400'
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                          <span className="text-[8px] text-[var(--muted)] group-hover:text-[var(--ink)]">
                            {idx % 4 === 0 ? label : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-xs text-[var(--muted)]">
                    Loading hourly atmospheric trend curve...
                  </div>
                )}

              </div>

            </div>

            {/* Right Col: Pollutant Profile & Carbon Bridge (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-6 font-mono">
              
              {/* Pollutant Profile (AirWatch style) */}
              <div className="bg-[var(--paper)] border border-[var(--line)] p-6 rounded-xl shadow-[var(--shadow)] space-y-4">
                <div className="flex justify-between items-center border-b border-[var(--line)] pb-3">
                  <div>
                    <span className="text-[10px] text-[var(--muted)] block uppercase font-bold">WHAT'S IN THE AIR</span>
                    <h3 className="text-sm font-bold text-[var(--ink)] font-display">Pollutant Diagnostics</h3>
                  </div>
                  <span className="text-[10px] text-[var(--muted)]">02 / MIX</span>
                </div>

                <div className="space-y-3 text-xs">
                  {[
                    { label: 'PM2.5', name: 'Fine Particles', val: aqiData?.pm25, unit: 'µg/m³', max: 75, safe: 15 },
                    { label: 'PM10', name: 'Coarse Particles', val: aqiData?.pm10, unit: 'µg/m³', max: 150, safe: 45 },
                    { label: 'NO₂', name: 'Nitrogen Dioxide', val: aqiData?.no2, unit: 'µg/m³', max: 80, safe: 25 },
                    { label: 'O₃', name: 'Ground Ozone', val: aqiData?.o3, unit: 'µg/m³', max: 120, safe: 50 },
                    { label: 'SO₂', name: 'Sulphur Dioxide', val: aqiData?.so2, unit: 'µg/m³', max: 50, safe: 10 },
                    { label: 'CO', name: 'Carbon Monoxide', val: aqiData?.co, unit: 'µg/m³', max: 800, safe: 300 }
                  ].map(p => {
                    const widthPct = Math.min(100, Math.max(4, ((p.val ?? 0) / p.max) * 100));
                    return (
                      <div key={p.label} className="p-3 bg-[#edf2ee] dark:bg-[#14231b] rounded-lg border border-[var(--line)]">
                        <div className="flex justify-between items-center mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[var(--ink)]">{p.label}</span>
                            <span className="text-[10px] text-[var(--muted)]">({p.name})</span>
                          </div>
                          <span className="font-bold text-[var(--ink)] font-mono">{p.val ?? '--'} {p.unit}</span>
                        </div>
                        <div className="h-1.5 w-full bg-[var(--line)] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-600 dark:bg-emerald-400 rounded-full transition-all duration-500"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-[var(--line)] text-[10px] text-[var(--muted)] flex justify-between">
                  <span>UNITS: CONCENTRATION µg/m³</span>
                  <button onClick={() => setActiveTrack('trends')} className="text-emerald-700 dark:text-emerald-400 hover:underline">
                    Explore Time Series ↗
                  </button>
                </div>
              </div>

              {/* Cross-Link Ingestion to CLiNt EnVo Ledger */}
              <div className="bg-[var(--paper)] border border-[var(--line)] p-6 rounded-xl shadow-[var(--shadow)] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)] flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Carbon Telemetry Commitment
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold">
                    EVENT-SOURCING
                  </span>
                </div>

                <p className="text-xs text-[var(--muted)] leading-relaxed font-sans">
                  Ingest real-time atmospheric readings from <strong className="text-[var(--ink)]">{aqiData?.city}</strong> directly into your CLiNt EnVo Kafka telemetry buffer to quantify local electrical grid and transit emissions.
                </p>

                <button
                  onClick={handleIngestCarbon}
                  disabled={!aqiData || loading}
                  className={`w-full py-2.5 rounded-lg text-xs font-bold font-mono flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm ${
                    ingestSuccess 
                      ? 'bg-emerald-700 text-white' 
                      : 'bg-[#1e5945] hover:bg-[#286e57] text-white'
                  }`}
                >
                  {ingestSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Committed to Carbon Ledger!</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      <span>Ingest Sensor into Carbon Buffer</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* TRACK 2: POLLUTION FIELD MAP (AIRWATCH SPATIAL INTEL) */}
      {activeTrack === 'map' && (
        <div className="flex flex-col gap-6 animate-fade-in font-mono text-xs">
          
          <div className="bg-[var(--paper)] border border-[var(--line)] p-6 rounded-xl shadow-[var(--shadow)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold tracking-widest block mb-1">
                TRACK 02 / SPATIAL INTELLIGENCE
              </span>
              <h2 className="text-2xl font-bold text-[var(--ink)] font-display">
                Pollution has <em className="text-emerald-700 dark:text-emerald-400 not-italic font-normal">a geography.</em>
              </h2>
              <p className="text-xs text-[var(--muted)] font-sans mt-1">
                Explore modelled air-quality conditions across major Indian cities. Select a marker to inspect coordinates and atmospheric payload.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[#edf2ee] dark:bg-[#14231b] px-3 py-2 rounded-lg border border-[var(--line)]">
                <span className="text-[9px] text-[var(--muted)] font-bold">FILTER:</span>
                <select 
                  value={mapFilter} 
                  onChange={e => setMapFilter(e.target.value)}
                  className="bg-transparent text-[var(--ink)] font-bold outline-none cursor-pointer text-xs"
                >
                  <option value="all" className="bg-[var(--paper)] text-[var(--ink)]">All Cities</option>
                  <option value="good" className="bg-[var(--paper)] text-[var(--ink)]">Good (0-50)</option>
                  <option value="moderate" className="bg-[var(--paper)] text-[var(--ink)]">Moderate (51-100)</option>
                  <option value="unhealthy" className="bg-[var(--paper)] text-[var(--ink)]">Unhealthy (101+)</option>
                </select>
              </div>

              <button 
                onClick={loadMapData} 
                className="px-3.5 py-2 rounded-lg bg-[var(--paper)] hover:bg-[#edf2ee] dark:hover:bg-[#14231b] border border-[var(--line)] text-[var(--ink)] cursor-pointer transition-all"
              >
                ↻ Refresh Map
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Interactive Grid Map Visualizer (8 cols) */}
            <div className="lg:col-span-8 bg-[var(--paper)] border border-[var(--line)] p-6 rounded-xl shadow-[var(--shadow)] flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-[var(--ink)]">INDIA CITY-CENTRE MODEL ESTIMATES</span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">{mapPoints.length} Cities Monitored</span>
              </div>

              {/* Geographic Grid Display */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {mapPoints
                  .filter(p => {
                    if (mapFilter === 'good') return p.aqi <= 50;
                    if (mapFilter === 'moderate') return p.aqi > 50 && p.aqi <= 100;
                    if (mapFilter === 'unhealthy') return p.aqi > 100;
                    return true;
                  })
                  .map(p => {
                    const isSelected = selectedMapCity?.city === p.city;
                    const toneColor = p.aqi <= 50 ? '#48a975' : p.aqi <= 100 ? '#d7ad3e' : p.aqi <= 150 ? '#e58c4c' : '#d85f4d';
                    return (
                      <button
                        key={p.city}
                        onClick={() => setSelectedMapCity(p)}
                        className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-[#dff1e7] dark:bg-[#1e3a2b] border-[#1e5945] dark:border-emerald-500 shadow-sm' 
                            : 'bg-[#edf2ee] dark:bg-[#14231b] border-[var(--line)] hover:border-[#1e5945]/40'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-[9px] text-[var(--muted)] uppercase block font-bold">{p.state}</span>
                            <strong className="text-sm font-bold text-[var(--ink)] font-display">{p.city}</strong>
                          </div>
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: toneColor }} 
                          />
                        </div>
                        <div className="flex justify-between items-baseline mt-1 font-mono">
                          <span className="text-lg font-black text-[var(--ink)]">{p.aqi}</span>
                          <span className="text-[10px] text-[var(--muted)]">PM2.5: {p.pm25}</span>
                        </div>
                      </button>
                    );
                  })}
              </div>

              {/* Map Footer Disclaimers */}
              <div className="mt-6 pt-3 border-t border-[var(--line)] text-[10px] text-[var(--muted)] flex justify-between">
                <span>MODEL ESTIMATES · CAMS COPERNICUS</span>
                <span>OPENSTREETMAP GRID READY</span>
              </div>
            </div>

            {/* Selected City Snapshot Inspector (4 cols) */}
            <div className="lg:col-span-4 bg-[var(--paper)] border border-[var(--line)] p-6 rounded-xl shadow-[var(--shadow)] flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-widest block mb-1">
                  CITY SNAPSHOT
                </span>
                <h3 className="text-xl font-bold text-[var(--ink)] font-display">
                  {selectedMapCity?.city || 'Select a City'}
                </h3>
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold block mt-0.5">
                  {selectedMapCity?.state || 'State'}
                </span>

                <div className="my-6 p-4 rounded-lg bg-[#edf2ee] dark:bg-[#14231b] border border-[var(--line)] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[var(--muted)] block font-bold">CURRENT US AQI</span>
                    <span className="text-4xl font-black text-[var(--ink)] font-display">
                      {selectedMapCity?.aqi ?? '--'}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                    {(selectedMapCity?.aqi ?? 0) <= 50 ? 'GOOD' : (selectedMapCity?.aqi ?? 0) <= 100 ? 'MODERATE' : 'UNHEALTHY'}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[var(--line)]">
                    <span className="text-[var(--muted)]">Fine Particulates (PM2.5)</span>
                    <span className="text-[var(--ink)] font-bold">{selectedMapCity?.pm25 ?? '--'} µg/m³</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[var(--line)]">
                    <span className="text-[var(--muted)]">Coordinates</span>
                    <span className="text-[var(--ink)] font-bold">{selectedMapCity?.lat}° N, {selectedMapCity?.lon}° E</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[var(--muted)]">Telemetry Feed</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">Synchronized</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (selectedMapCity) {
                    const match = INDIAN_CITIES.find(c => c.name === selectedMapCity.city) || {
                      name: selectedMapCity.city,
                      state: selectedMapCity.state,
                      lat: selectedMapCity.lat,
                      lon: selectedMapCity.lon
                    };
                    setSelectedCity(match);
                    fetchAirData(match.lat, match.lon, match.name, match.state);
                    setActiveTrack('overview');
                  }
                }}
                className="w-full mt-6 py-2.5 rounded-lg bg-[#1e5945] hover:bg-[#286e57] text-white font-bold text-xs cursor-pointer transition-all shadow-sm"
              >
                Inspect City Dashboard ↗
              </button>
            </div>

          </div>

        </div>
      )}

      {/* TRACK 3: OFFICIAL INDIA CPCB STATION DATA (DATA.GOV.IN) */}
      {activeTrack === 'india' && (
        <div className="flex flex-col gap-6 animate-fade-in font-mono text-xs">
          
          <div className="bg-[var(--paper)] border border-[var(--line)] p-6 rounded-xl shadow-[var(--shadow)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold tracking-widest block mb-1">
                OFFICIAL OBSERVATIONS / CENTRAL POLLUTION CONTROL BOARD
              </span>
              <h2 className="text-2xl font-bold text-[var(--ink)] font-display">
                Ground truth. <em className="text-emerald-700 dark:text-emerald-400 not-italic font-normal">Not a guess.</em>
              </h2>
              <p className="text-xs text-[var(--muted)] font-sans mt-1">
                Inspect official monitoring station observations published through India's Open Government Data Platform (<code className="text-emerald-700 dark:text-emerald-400 font-bold">data.gov.in</code>).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={handleExportStationsCsv}
                className="px-3.5 py-2 rounded-lg bg-[var(--paper)] hover:bg-[#edf2ee] dark:hover:bg-[#14231b] border border-[var(--line)] text-[var(--ink)] flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                <span>Export CSV ↓</span>
              </button>
              <button 
                onClick={loadIndiaStations} 
                className="px-3.5 py-2 rounded-lg bg-[#1e5945] hover:bg-[#286e57] text-white font-bold cursor-pointer transition-all shadow-sm"
              >
                Refresh Stations ↗
              </button>
            </div>
          </div>

          {/* Filtering Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[var(--paper)] p-3 rounded-lg border border-[var(--line)] flex flex-col gap-1">
              <label className="text-[9px] text-[var(--muted)] uppercase font-bold">SEARCH BY CITY</label>
              <input 
                type="text" 
                placeholder="e.g. Delhi, Mumbai, Pune..." 
                value={stationCityFilter}
                onChange={e => setStationCityFilter(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadIndiaStations()}
                className="bg-transparent text-[var(--ink)] font-bold outline-none text-xs placeholder-[var(--muted)]"
              />
            </div>

            <div className="bg-[var(--paper)] p-3 rounded-lg border border-[var(--line)] flex flex-col gap-1">
              <label className="text-[9px] text-[var(--muted)] uppercase font-bold">SEARCH BY STATE</label>
              <input 
                type="text" 
                placeholder="e.g. Maharashtra, Karnataka..." 
                value={stationStateFilter}
                onChange={e => setStationStateFilter(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadIndiaStations()}
                className="bg-transparent text-[var(--ink)] font-bold outline-none text-xs placeholder-[var(--muted)]"
              />
            </div>

            <div className="bg-[var(--paper)] p-3 rounded-lg border border-[var(--line)] flex items-center justify-between">
              <div>
                <span className="text-[9px] text-[var(--muted)] uppercase block font-bold">RECORDS LOADED</span>
                <span className="text-lg font-bold text-[var(--ink)]">{stationRecords.length} Stations</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold">
                ACTIVE
              </span>
            </div>
          </div>

          {/* Official Station Readings Table */}
          <div className="bg-[var(--paper)] border border-[var(--line)] rounded-xl overflow-hidden shadow-[var(--shadow)]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs font-mono">
                <thead>
                  <tr className="bg-[#edf2ee] dark:bg-[#14231b] border-b border-[var(--line)] text-[var(--muted)]">
                    <th className="p-3.5 font-bold">City / State</th>
                    <th className="p-3.5 font-bold">CPCB Station</th>
                    <th className="p-3.5 font-bold">Pollutant</th>
                    <th className="p-3.5 font-bold text-right">Avg Concentration</th>
                    <th className="p-3.5 font-bold text-right">Source AQI</th>
                    <th className="p-3.5 font-bold text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {stationLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[var(--muted)]">
                        Querying Open Government Data Platform node...
                      </td>
                    </tr>
                  ) : stationRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[var(--muted)]">
                        No station records matched filters. Clear city/state filter to reset.
                      </td>
                    </tr>
                  ) : (
                    stationRecords.map((r, idx) => (
                      <tr key={idx} className="hover:bg-[#edf2ee]/60 dark:hover:bg-[#14231b]/60 transition-colors">
                        <td className="p-3.5 font-bold text-[var(--ink)]">
                          {r.city} <small className="text-[var(--muted)] block font-normal">{r.state}</small>
                        </td>
                        <td className="p-3.5 text-[var(--muted)] max-w-xs truncate" title={r.station}>
                          {r.station}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">
                            {r.pollutant}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-bold text-[var(--ink)]">
                          {r.pollutant_avg ?? '--'} <small className="text-[var(--muted)]">{r.pollutant_unit || 'µg/m³'}</small>
                        </td>
                        <td className="p-3.5 text-right font-bold">
                          {r.aqi ? (
                            <span className={r.aqi > 150 ? 'text-rose-600 dark:text-rose-400' : r.aqi > 100 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}>
                              {r.aqi}
                            </span>
                          ) : (
                            <span className="text-[var(--muted)]">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right text-[var(--muted)] text-[10px]">
                          {r.last_update || 'Live'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TRACK 4: CITY COMPARISON (AIRWATCH MULTI-CITY LENS) */}
      {activeTrack === 'compare' && (
        <div className="flex flex-col gap-6 animate-fade-in font-mono text-xs">
          
          <div className="bg-[var(--paper)] border border-[var(--line)] p-6 rounded-xl shadow-[var(--shadow)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold tracking-widest block mb-1">
                TRACK 02 / CITY LENS
              </span>
              <h2 className="text-2xl font-bold text-[var(--ink)] font-display">
                One country. <em className="text-emerald-700 dark:text-emerald-400 not-italic font-normal">Different air.</em>
              </h2>
              <p className="text-xs text-[var(--muted)] font-sans mt-1">
                Compare modelled air quality side-by-side across major Indian hubs to understand environmental disparity.
              </p>
            </div>

            <button 
              onClick={loadComparison} 
              className="px-4 py-2.5 rounded-lg bg-[#1e5945] hover:bg-[#286e57] text-white font-bold cursor-pointer transition-all shadow-sm"
            >
              Re-calculate Comparison ↗
            </button>
          </div>

          {/* Comparative Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {compareLoading ? (
              <div className="col-span-full p-8 text-center text-[var(--muted)] bg-[var(--paper)] border border-[var(--line)] rounded-xl">
                Fetching multi-city atmospheric matrices...
              </div>
            ) : (
              compareResults.map((c, idx) => {
                const tone = c.aqi <= 50 ? '#48a975' : c.aqi <= 100 ? '#d7ad3e' : c.aqi <= 150 ? '#e58c4c' : '#d85f4d';
                return (
                  <div key={idx} className="bg-[var(--paper)] border border-[var(--line)] p-5 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div className="w-1 absolute top-0 bottom-0 left-0" style={{ backgroundColor: tone }} />

                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] text-[var(--muted)] uppercase font-bold">{c.state}</span>
                        <button 
                          onClick={() => toggleFavorite(c.city)}
                          className="text-[var(--muted)] hover:text-amber-500 cursor-pointer"
                        >
                          <Star className={`w-3.5 h-3.5 ${favorites.includes(c.city) ? 'fill-amber-400 text-amber-500' : ''}`} />
                        </button>
                      </div>

                      <h3 className="text-lg font-bold text-[var(--ink)] font-display mt-1">{c.city}</h3>

                      <div className="my-4 flex items-baseline gap-2">
                        <span className="text-4xl font-black text-[var(--ink)] font-display">{c.aqi}</span>
                        <span className="text-[10px] text-[var(--muted)] font-bold">US AQI</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-[var(--line)]">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[var(--muted)]">PM2.5 Level</span>
                        <span className="text-[var(--ink)] font-bold">{c.pm25} µg/m³</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[var(--muted)]">PM10 Level</span>
                        <span className="text-[var(--ink)] font-bold">{c.pm10} µg/m³</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* TRACK 5: TREND EXPLORER */}
      {activeTrack === 'trends' && (
        <div className="flex flex-col gap-6 animate-fade-in font-mono text-xs">
          
          <div className="bg-[var(--paper)] border border-[var(--line)] p-6 rounded-xl shadow-[var(--shadow)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold tracking-widest block mb-1">
                TRACK 03 / TIME SERIES
              </span>
              <h2 className="text-2xl font-bold text-[var(--ink)] font-display">
                Patterns hide <em className="text-emerald-700 dark:text-emerald-400 not-italic font-normal">in the hours.</em>
              </h2>
              <p className="text-xs text-[var(--muted)] font-sans mt-1">
                Inspect 24-hour diurnal shifts for {selectedCity.name} across target metric parameters.
              </p>
            </div>

            {/* Segmented Metric Switcher */}
            <div className="flex items-center gap-1 bg-[#edf2ee] dark:bg-[#14231b] p-1.5 rounded-lg border border-[var(--line)]">
              {[
                { id: 'us_aqi', label: 'US AQI' },
                { id: 'pm2_5', label: 'PM2.5' },
                { id: 'pm10', label: 'PM10' },
                { id: 'ozone', label: 'Ozone (O₃)' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setTrendMetric(m.id as any)}
                  className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                    trendMetric === m.id
                      ? 'bg-[var(--paper)] text-[#1e5945] dark:text-emerald-400 font-bold shadow-sm'
                      : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Large Trend Timeline */}
          <div className="bg-[var(--paper)] border border-[var(--line)] p-6 rounded-xl shadow-[var(--shadow)] space-y-4">
            <div className="flex justify-between items-center border-b border-[var(--line)] pb-3">
              <div>
                <span className="text-sm font-bold text-[var(--ink)] font-display uppercase">{trendMetric.replace('_', ' ')} HOURLY SENSOR</span>
                <span className="text-[10px] text-[var(--muted)] block mt-0.5">{selectedCity.name} • 24-Hour Horizon</span>
              </div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">COPERNICUS TELEMETRY</span>
            </div>

            {/* Bar Timeline */}
            <div className="h-48 flex items-end gap-1.5 overflow-x-auto pt-8 pb-3 scrollbar-none">
              {aqiData?.hourly?.time && (
                aqiData.hourly.time.slice(0, 24).map((t, idx) => {
                  const arr = aqiData.hourly ? (aqiData.hourly as any)[trendMetric] : [];
                  const rawVal = arr ? arr[idx] ?? 30 : 30;
                  const maxRef = trendMetric === 'us_aqi' ? 250 : 100;
                  const heightPct = Math.min(100, Math.max(12, (rawVal / maxRef) * 100));
                  const timeLabel = new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                  return (
                    <div key={idx} className="flex-1 min-w-[28px] flex flex-col items-center gap-1 group relative">
                      <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center bg-[var(--paper)] border border-[var(--line)] px-2 py-1 rounded text-[10px] text-[var(--ink)] z-20 whitespace-nowrap shadow-xl">
                        <span>{timeLabel}</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">{rawVal}</span>
                      </div>
                      <div 
                        className="w-full bg-[#1e5945]/80 hover:bg-[#1e5945] dark:bg-emerald-500/70 dark:hover:bg-emerald-400 rounded-t transition-all"
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className="text-[8px] text-[var(--muted)] group-hover:text-[var(--ink)] font-bold">
                        {idx % 4 === 0 ? timeLabel : ''}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pollutant Field Guide Cards (AirWatch Guide Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#edf2ee] dark:bg-[#14231b] border-l-2 border-emerald-600 dark:border-emerald-500 border-[var(--line)]">
              <strong className="text-[var(--ink)] block mb-1">PM2.5 (Fine Particulates)</strong>
              <p className="text-[10px] text-[var(--muted)] font-sans leading-relaxed">
                Microscopic particles under 2.5 micrometers resulting from vehicle combustion and biomass burning.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#edf2ee] dark:bg-[#14231b] border-l-2 border-cyan-600 dark:border-cyan-500 border-[var(--line)]">
              <strong className="text-[var(--ink)] block mb-1">PM10 (Inhalable Dust)</strong>
              <p className="text-[10px] text-[var(--muted)] font-sans leading-relaxed">
                Coarser aerosols and construction particulate matter that irritate upper respiratory channels.
              </p>
            </div>
            <div className="p-4 rounded-xl border-l-2 border-amber-600 dark:border-amber-500 bg-[#edf2ee] dark:bg-[#14231b] border-[var(--line)]">
              <strong className="text-[var(--ink)] block mb-1">NO₂ (Nitrogen Dioxide)</strong>
              <p className="text-[10px] text-[var(--muted)] font-sans leading-relaxed">
                A toxic gas emitted directly from fuel combustion engines and thermal power generation stations.
              </p>
            </div>
            <div className="p-4 rounded-xl border-l-2 border-purple-600 dark:border-purple-500 bg-[#edf2ee] dark:bg-[#14231b] border-[var(--line)]">
              <strong className="text-[var(--ink)] block mb-1">Ozone (O₃)</strong>
              <p className="text-[10px] text-[var(--muted)] font-sans leading-relaxed">
                Secondary pollutant formed photochemically when sunlight triggers reactions in ambient smog.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* TRACK 6: EXPOSURE PLANNER (AIRWATCH PERSONAL PLANNER) */}
      {activeTrack === 'exposure' && (
        <div className="flex flex-col gap-6 animate-fade-in font-mono text-xs">
          
          <div className="bg-[var(--paper)] border border-[var(--line)] p-6 rounded-xl shadow-[var(--shadow)]">
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold tracking-widest block mb-1">
              TRACK 04 / PERSONAL PLANNING
            </span>
            <h2 className="text-2xl font-bold text-[var(--ink)] font-display">
              Make room for <em className="text-emerald-700 dark:text-emerald-400 not-italic font-normal">cleaner choices.</em>
            </h2>
            <p className="text-xs text-[var(--muted)] font-sans mt-1">
              Turn current atmospheric conditions in <strong>{selectedCity.name}</strong> into an actionable outdoor activity plan.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Form Panel (5 cols) */}
            <form onSubmit={handleGeneratePlan} className="lg:col-span-5 bg-[var(--paper)] border border-[var(--line)] p-6 rounded-xl shadow-[var(--shadow)] space-y-4">
              <div className="flex justify-between items-center border-b border-[var(--line)] pb-3">
                <span className="text-xs font-bold text-[var(--ink)]">BUILD YOUR DAILY PLAN</span>
                <span className="text-[10px] text-[var(--muted)] font-bold">04 / PLAN</span>
              </div>

              <div>
                <label className="text-[10px] text-[var(--muted)] uppercase font-bold block mb-1.5">INTENDED ACTIVITY</label>
                <select 
                  value={planActivity} 
                  onChange={e => setPlanActivity(e.target.value)}
                  className="w-full p-2.5 bg-[#edf2ee] dark:bg-[#14231b] border border-[var(--line)] rounded-lg text-[var(--ink)] outline-none focus:border-[#1e5945]"
                >
                  <option value="walk">Walk / Commute</option>
                  <option value="run">Run / Cycling Workout</option>
                  <option value="outdoor-work">Outdoor Work & Labour</option>
                  <option value="kids-play">Children's Outdoor Play</option>
                  <option value="errands">Short Errands & Market</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-[var(--muted)] uppercase font-bold mb-1.5">
                  <span>PLANNED DURATION</span>
                  <span className="text-[var(--ink)] font-bold">{planDuration} min</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="240" 
                  step="10"
                  value={planDuration} 
                  onChange={e => setPlanDuration(Number(e.target.value))}
                  className="w-full accent-[#1e5945] dark:accent-emerald-400 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[10px] text-[var(--muted)] uppercase font-bold block mb-1.5">SENSITIVITY PROFILE</label>
                <select 
                  value={planSensitivity} 
                  onChange={e => setPlanSensitivity(e.target.value)}
                  className="w-full p-2.5 bg-[#edf2ee] dark:bg-[#14231b] border border-[var(--line)] rounded-lg text-[var(--ink)] outline-none focus:border-[#1e5945]"
                >
                  <option value="general">General Healthy Adult</option>
                  <option value="sensitive">Asthma / Heart / Lung Condition</option>
                  <option value="child">Child / Senior Citizen</option>
                  <option value="pregnant">Pregnancy</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[var(--muted)] uppercase font-bold block mb-1.5">WINDOW TIMING</label>
                <select 
                  value={planTime} 
                  onChange={e => setPlanTime(e.target.value)}
                  className="w-full p-2.5 bg-[#edf2ee] dark:bg-[#14231b] border border-[var(--line)] rounded-lg text-[var(--ink)] outline-none focus:border-[#1e5945]"
                >
                  <option value="flexible">Flexible Timing</option>
                  <option value="morning">Morning (06:00 - 11:00)</option>
                  <option value="afternoon">Afternoon (12:00 - 16:00)</option>
                  <option value="evening">Evening (17:00 - 21:00)</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="w-full py-3 rounded-lg bg-[#1e5945] hover:bg-[#286e57] text-white font-bold text-xs cursor-pointer transition-all shadow-sm"
              >
                Synthesize Exposure Plan ↗
              </button>
            </form>

            {/* Plan Output Result (7 cols) */}
            <div className="lg:col-span-7 bg-[var(--paper)] border border-[var(--line)] p-6 rounded-xl shadow-[var(--shadow)] min-h-[350px] flex flex-col justify-between">
              {generatedPlan ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-[var(--line)]">
                    <div>
                      <span className="text-[10px] text-[var(--muted)] uppercase block font-bold">{selectedCity.name} ATMOSPHERE</span>
                      <h3 className="text-xl font-bold text-[var(--ink)] font-display">{generatedPlan.concern}</h3>
                    </div>
                    <span className="text-3xl font-black text-emerald-700 dark:text-emerald-400 font-display">
                      AQI {generatedPlan.aqi}
                    </span>
                  </div>

                  <div className="space-y-3 font-sans">
                    {generatedPlan.tips.map((t: any, i: number) => (
                      <div key={i} className="p-3 bg-[#edf2ee] dark:bg-[#14231b] rounded-lg border border-[var(--line)] flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold">
                          ✓
                        </span>
                        <div>
                          <strong className="text-[var(--ink)] text-xs block mb-0.5">{t.title}</strong>
                          <p className="text-[11px] text-[var(--muted)] leading-relaxed m-0">{t.copy}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <span className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-2xl font-bold">
                    ✳
                  </span>
                  <h3 className="text-lg font-bold text-[var(--ink)] font-display">Ready to Calculate Exposure</h3>
                  <p className="text-xs text-[var(--muted)] font-sans max-w-sm">
                    Select your planned activity and sensitivity parameters to generate personalized exposure mitigation guidance.
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-[var(--line)] text-[10px] text-[var(--muted)]">
                DISCLAIMER: General environmental awareness guidance, not clinical or medical advice.
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TRACK 7: SAVED PLACES WATCHLIST */}
      {activeTrack === 'saved' && (
        <div className="flex flex-col gap-6 animate-fade-in font-mono text-xs">
          
          <div className="bg-[var(--paper)] border border-[var(--line)] p-6 rounded-xl shadow-[var(--shadow)] flex justify-between items-center">
            <div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold tracking-widest block mb-1">
                YOUR FIELD BOOK
              </span>
              <h2 className="text-2xl font-bold text-[var(--ink)] font-display">
                Places worth <em className="text-emerald-700 dark:text-emerald-400 not-italic font-normal">keeping close.</em>
              </h2>
              <p className="text-xs text-[var(--muted)] font-sans mt-1">
                Your bookmarked city locations stored securely in this browser session.
              </p>
            </div>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{favorites.length} Saved</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map(cityName => {
              const matched = INDIAN_CITIES.find(c => c.name === cityName);
              return (
                <div key={cityName} className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-base font-bold">
                      ⌖
                    </div>
                    <div>
                      <strong className="text-sm font-bold text-[var(--ink)] font-display block">{cityName}</strong>
                      <span className="text-[10px] text-[var(--muted)]">{matched?.state || 'Saved Place'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (matched) {
                          setSelectedCity(matched);
                          fetchAirData(matched.lat, matched.lon, matched.name, matched.state);
                          setActiveTrack('overview');
                        }
                      }}
                      className="px-2.5 py-1 rounded bg-[#edf2ee] dark:bg-[#14231b] hover:bg-[#1e5945] hover:text-white text-[var(--ink)] cursor-pointer transition-colors"
                    >
                      Inspect ↗
                    </button>
                    <button
                      onClick={() => toggleFavorite(cityName)}
                      className="p-1 text-[var(--muted)] hover:text-rose-500 cursor-pointer"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
}
