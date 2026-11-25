/**
 * Urban Air Quality & Severe Winter Smog Advisor Engine ([Challenge 6]).
 * Computes real-time AQI delta notifications and personalized, location- and
 * lifestyle-tailored routines, indoor air quality hacks, and direct-impact alternatives.
 */

export type HouseholdProfile =
  | 'family_kids'
  | 'elderly_asthma'
  | 'community_group'
  | 'working_adult';

export type CommuteMode = 'car_cab' | 'two_wheeler' | 'metro_bus' | 'wfh';

export type CookingHeatingMode = 'electric_induction' | 'lpg' | 'wood_biomass';

export interface AqiChangeNotification {
  id: string;
  city: string;
  direction: 'increased' | 'decreased';
  previousAqi: number;
  currentAqi: number;
  delta: number;
  severity: 'warning' | 'relief';
  headline: string;
  actionTip: string;
  timestamp: string;
}

export interface SmogRecommendation {
  title: string;
  detail: string;
  directImpact: string;
}

export interface UrbanSmogPlaybook {
  city: string;
  usAqi: number;
  pm25: number;
  smogRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE WINTER SMOG';
  winterInversionAdvisory: string;
  dailyRoutines: SmogRecommendation[];
  indoorHacks: SmogRecommendation[];
  sustainableAlternatives: SmogRecommendation[];
  communityAction: SmogRecommendation;
}

export function getAqiBandLabel(aqi: number): string {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

/**
 * Evaluates whether AQI has meaningfully increased or decreased since the last reading
 * and constructs a user-facing pop-up alert with immediate protective action.
 */
export function evaluateAqiDelta(
  city: string,
  previousAqi: number | null | undefined,
  currentAqi: number,
  minThreshold: number = 1
): AqiChangeNotification | null {
  if (previousAqi === null || previousAqi === undefined || Number.isNaN(previousAqi)) {
    return null;
  }

  const prev = Math.round(previousAqi);
  const curr = Math.round(currentAqi);
  const delta = curr - prev;

  if (Math.abs(delta) < minThreshold) {
    return null;
  }

  const direction = delta > 0 ? 'increased' : 'decreased';
  const band = getAqiBandLabel(curr);

  if (direction === 'increased') {
    return {
      id: `aqi-alert-${city}-${Date.now()}`,
      city,
      direction: 'increased',
      previousAqi: prev,
      currentAqi: curr,
      delta,
      severity: 'warning',
      headline: `AQI Increased in ${city} (+${delta} → ${curr} ${band})`,
      actionTip:
        curr > 150
          ? 'Close exterior windows, turn on HEPA/DIY indoor filtration, and switch outdoor trips to sealed electric transit or indoor routines.'
          : 'Sensitive family members should carry N95 protection and avoid peak roadside corridors.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }

  return {
    id: `aqi-alert-${city}-${Date.now()}`,
    city,
    direction: 'decreased',
    previousAqi: prev,
    currentAqi: curr,
    delta,
    severity: 'relief',
    headline: `AQI Decreased in ${city} (${delta} → ${curr} ${band})`,
    actionTip:
      curr <= 100
        ? 'Clean-air ventilation window is open: cross-ventilate bedrooms and classrooms for 15–20 minutes.'
        : 'Particulate load dropped, though haze lingers—use this brief afternoon window for essential errands before evening smog inversion.',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

export interface SmogPlaybookInput {
  city: string;
  state?: string;
  usAqi: number;
  pm25: number;
  householdProfile: HouseholdProfile;
  commuteMode: CommuteMode;
  cookingHeating: CookingHeatingMode;
}

/**
 * Generates tailored low-emission routines, indoor air quality hacks, and sustainable
 * alternatives for families and communities navigating winter smog and urban pollution.
 */
export function buildUrbanSmogPlaybook(input: SmogPlaybookInput): UrbanSmogPlaybook {
  const { city, state, usAqi, pm25, householdProfile, commuteMode, cookingHeating } = input;
  const locationLabel = state ? `${city}, ${state}` : city;

  const smogRiskLevel: UrbanSmogPlaybook['smogRiskLevel'] =
    usAqi >= 201
      ? 'SEVERE WINTER SMOG'
      : usAqi >= 151
      ? 'HIGH'
      : usAqi >= 101
      ? 'MODERATE'
      : 'LOW';

  const winterInversionAdvisory =
    usAqi >= 151
      ? `Thermal inversion in ${locationLabel} traps PM2.5 (${pm25} µg/m³) near ground level from 05:30–09:30 and after 18:00. Schedule school runs, errands, and ventilation strictly between 12:30 and 15:30 when solar mixing lifts surface smog.`
      : `Current dispersion in ${locationLabel} is manageable (PM2.5: ${pm25} µg/m³). Keep morning outdoor exposure light during cold dawn hours and monitor live AQI spikes.`;

  const dailyRoutines: SmogRecommendation[] = [];
  if (householdProfile === 'family_kids') {
    dailyRoutines.push({
      title: 'Smog-Safe School & Play Schedule',
      detail: `Replace early-morning playground time in ${city} with indoor stretching/reading during peak inversion (before 10:00), and shift outdoor movement to midday.`,
      directImpact: 'Reduces children’s daily PM2.5 lung deposition by ~42% during winter smog episodes.',
    });
  } else if (householdProfile === 'elderly_asthma') {
    dailyRoutines.push({
      title: 'Pre-Dawn Respiratory Shield Routine',
      detail: `Delay morning walks until outdoor AQI drops below 120 or practice gentle indoor mobility in a filtered room; keep rescue inhalers and N95/FFP2 masks by the exit.`,
      directImpact: 'Cuts acute cardiopulmonary irritation risk by ~55% on high-AQI mornings.',
    });
  } else if (householdProfile === 'community_group') {
    dailyRoutines.push({
      title: 'Staggered Errands & Zero-Idling Drop-Offs',
      detail: `Coordinate neighborhood grocery runs and school carpools in ${city} into one consolidated midday loop with strict engine-off waiting rules.`,
      directImpact: 'Eliminates ~3.1 kg CO₂e/day and lowers micro-zone NO₂ spikes near building gates.',
    });
  } else {
    dailyRoutines.push({
      title: 'Midday Errand & Low-Emission Work Window',
      detail: `Batch outdoor errands in ${city} between 12:30–15:30 instead of evening rush-hour smog peaks, and wear a well-sealed N95 mask on arterial roads.`,
      directImpact: 'Cuts personal PM2.5 inhalation dose by ~38% and avoids stop-and-go tailpipe emissions.',
    });
  }

  dailyRoutines.push({
    title: 'Post-Commute Nasal & Clothing Reset',
    detail: 'Change outer jackets at the doorway and perform saline nasal rinsing after returning from high-traffic streets so trapped soot does not resuspend indoors.',
    directImpact: 'Prevents ~20–30% secondary indoor particulate resuspension across living areas.',
  });

  const indoorHacks: SmogRecommendation[] = [
    {
      title: 'Wet-Mopping & Microfiber Dust Lock',
      detail: 'Swap dry broom sweeping for damp microfiber mopping every evening; dry sweeping aerosolizes settled PM2.5 and heavy-metal street dust back into breathing height.',
      directImpact: 'Lowers indoor airborne coarse and fine dust resuspension by up to 65%.',
    },
    {
      title: 'DIY Corsi-Rosenthal Box-Fan Purifier',
      detail: `Tape a MERV-13 / HEPA filter onto a standard household box fan in the main bedroom when ${city} AQI exceeds 150, and seal window gaps with foam weatherstripping.`,
      directImpact: 'Delivers ~250–400 CFM clean air at 1/4th commercial purifier cost, cutting indoor PM2.5 by ~60–75%.',
    },
  ];

  if (cookingHeating === 'wood_biomass') {
    indoorHacks.push({
      title: 'Eliminate Indoor Biomass / Coil Burning',
      detail: 'Stop burning charcoal braziers, incense, mosquito coils, or candles indoors during winter smog; use electric hot-water bags or layered thermal bedding for warmth.',
      directImpact: 'Prevents indoor PM2.5 spikes exceeding 400 µg/m³ and cuts household CO₂e by ~4.5 kg/day.',
    });
  } else if (cookingHeating === 'lpg') {
    indoorHacks.push({
      title: 'Kitchen Exhaust & Lid-On Simmering',
      detail: 'Run a vented range hood or open a kitchen-only crack for 10 minutes while frying/tadka, and keep lids on pots to reduce NO₂ and ultrafine cooking aerosols.',
      directImpact: 'Cuts indoor cooking NO₂ buildup by ~50% and lowers LPG fuel consumption by ~15%.',
    });
  } else {
    indoorHacks.push({
      title: 'Smart Cross-Ventilation Timer',
      detail: 'Keep windows sealed during night/dawn inversion and open opposing windows for just 15 minutes during afternoon AQI dips to flush indoor CO₂.',
      directImpact: 'Maintains indoor CO₂ below 900 ppm while keeping indoor PM2.5 ~55% lower than outdoor air.',
    });
  }

  const sustainableAlternatives: SmogRecommendation[] = [];
  if (commuteMode === 'car_cab' || commuteMode === 'two_wheeler') {
    sustainableAlternatives.push({
      title: `Switch Arterial Commutes in ${city} to Metro / Electric Shuttle`,
      detail: `Replace single-occupancy ${commuteMode === 'car_cab' ? 'petrol/diesel cab rides' : 'two-wheeler traffic trips'} with electric Metro/bus + N95 last-mile walk.`,
      directImpact: 'Saves ~2.8–4.2 kg CO₂e per 15 km round trip and removes tailpipe NOₓ from neighborhood streets.',
    });
  } else {
    sustainableAlternatives.push({
      title: 'Keep Zero-Tailpipe Commute + Off-Peak Hybrid Days',
      detail: `Your ${commuteMode === 'metro_bus' ? 'electric rail/bus' : 'work-from-home'} routine already minimizes road pollution; pair it with 2 WFH days during Severe Smog alerts.`,
      directImpact: 'Avoids ~3.5 kg CO₂e/day compared to solo car commuting and cuts total daily smog exposure by ~70%.',
    });
  }

  if (cookingHeating !== 'electric_induction') {
    sustainableAlternatives.push({
      title: 'Transition High-Heat Boiling to Electric Kettle / Induction',
      detail: 'Shift tea, water boiling, and simmering from open-flame combustion to an electric kettle or induction cooktop powered by cleaner daytime solar grid hours.',
      directImpact: 'Eliminates indoor NO₂/CO combustion byproducts and saves ~0.8–1.6 kg CO₂e/day.',
    });
  } else {
    sustainableAlternatives.push({
      title: 'Solar-Window Appliance Shifting',
      detail: 'Run induction cooking, washing machines, and purifiers during peak solar generation hours (10:00–16:00) rather than evening coal-peaking demand.',
      directImpact: 'Reduces marginal electricity grid carbon intensity by ~25–35% (~1.1 kg CO₂e/day).',
    });
  }

  const communityAction: SmogRecommendation = {
    title: `Community Winter Smog Alert & Zero-Burning Pact (${city})`,
    detail: `Share live ${city} AQI shifts with your RWA/school WhatsApp group, advocate against open garden-leaf or waste burning, and organize shared electric vanpools on >200 AQI days.`,
    directImpact: 'Preventing one neighborhood biomass burn avoids ~18 kg CO₂e and stops localized PM2.5 plumes affecting 100+ residents.',
  };

  return {
    city: locationLabel,
    usAqi,
    pm25,
    smogRiskLevel,
    winterInversionAdvisory,
    dailyRoutines,
    indoorHacks,
    sustainableAlternatives,
    communityAction,
  };
}
