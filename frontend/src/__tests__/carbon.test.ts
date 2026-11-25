import { describe, it, expect } from 'vitest';
import { CARBON_FACTORS, processRawEvent, RawEvent } from '@/lib/carbon';

describe('Carbon Telemetry Engine (processRawEvent)', () => {
  it('calculates coffee shop emissions accurately in INR', () => {
    const event: RawEvent = {
      id: 'test-coffee-1',
      source: 'plaid',
      timestamp: '2026-10-11T10:00:00.000Z',
      amount: 320,
      title: 'Cafe Coffee Day / Blue Tokai',
      rawDetails: 'Payment Gateway: Cafe Coffee Day (₹320)',
    };

    const result = processRawEvent(event);
    expect(result.category).toBe('Dining');
    expect(result.subcategory).toBe('dining.coffee');
    expect(result.unit).toBe('INR');
    expect(result.carbonFactor).toBe(CARBON_FACTORS['dining.coffee'].factor);
    expect(result.carbonFootprint).toBe(Number((320 * 0.007).toFixed(2)));
  });

  it('distinguishes electric rideshare from combustion rideshare', () => {
    const evEvent: RawEvent = {
      id: 'test-ev-1',
      source: 'maps',
      timestamp: '2026-10-11T10:00:00.000Z',
      amount: 20,
      title: 'Uber EV Commute',
      rawDetails: 'Electric Tesla rideshare',
    };
    const gasEvent: RawEvent = {
      id: 'test-gas-1',
      source: 'maps',
      timestamp: '2026-10-11T10:00:00.000Z',
      amount: 20,
      title: 'Uber Cab Drive',
      rawDetails: 'Standard cab commute',
    };

    const evResult = processRawEvent(evEvent);
    const gasResult = processRawEvent(gasEvent);

    expect(evResult.subcategory).toBe('transit.rideshare_ev');
    expect(gasResult.subcategory).toBe('transit.rideshare_gas');
    expect(evResult.carbonFootprint).toBeLessThan(gasResult.carbonFootprint);
  });

  it('classifies short-haul vs long-haul aviation by distance', () => {
    const shortFlight = processRawEvent({
      id: 'flight-short',
      source: 'maps',
      timestamp: '2026-10-11T10:00:00.000Z',
      amount: 500,
      title: 'Domestic Flight DEL-JAI',
      rawDetails: 'Airport departure',
    });
    const longFlight = processRawEvent({
      id: 'flight-long',
      source: 'maps',
      timestamp: '2026-10-11T10:00:00.000Z',
      amount: 1500,
      title: 'Flight DEL-BOM',
      rawDetails: 'Airline flight',
    });

    expect(shortFlight.subcategory).toBe('transit.flight_short');
    expect(longFlight.subcategory).toBe('transit.flight_long');
  });

  it('handles HomeAssistant solar offset negative kWh values cleanly', () => {
    const solar = processRawEvent({
      id: 'solar-1',
      source: 'homeassistant',
      timestamp: '2026-10-11T10:00:00.000Z',
      amount: -10,
      title: 'Solar array offset',
      rawDetails: 'On-site solar clean generation',
    });

    expect(solar.subcategory).toBe('utility.solar_clean');
    expect(solar.carbonFootprint).toBe(-0.3);
  });
});
