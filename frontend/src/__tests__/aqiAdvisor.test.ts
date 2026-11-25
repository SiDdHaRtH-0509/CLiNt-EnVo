import { describe, it, expect } from 'vitest';
import {
  buildUrbanSmogPlaybook,
  evaluateAqiDelta,
  getAqiBandLabel,
} from '@/lib/aqiAdvisor';

describe('AQI Change Notification Engine (evaluateAqiDelta)', () => {
  it('returns null when there is no prior AQI or zero change', () => {
    expect(evaluateAqiDelta('Delhi', null, 180)).toBeNull();
    expect(evaluateAqiDelta('Delhi', undefined, 180)).toBeNull();
    expect(evaluateAqiDelta('Delhi', 180, 180)).toBeNull();
  });

  it('creates a warning pop-up notification when AQI increases', () => {
    const alert = evaluateAqiDelta('Delhi', 140, 185);
    expect(alert).not.toBeNull();
    expect(alert?.direction).toBe('increased');
    expect(alert?.severity).toBe('warning');
    expect(alert?.delta).toBe(45);
    expect(alert?.headline).toContain('AQI Increased in Delhi (+45');
    expect(alert?.actionTip).toMatch(/Close exterior windows|HEPA/i);
  });

  it('creates a relief pop-up notification when AQI decreases', () => {
    const alert = evaluateAqiDelta('Mumbai', 145, 88);
    expect(alert).not.toBeNull();
    expect(alert?.direction).toBe('decreased');
    expect(alert?.severity).toBe('relief');
    expect(alert?.delta).toBe(-57);
    expect(alert?.headline).toContain('AQI Decreased in Mumbai (-57');
    expect(alert?.actionTip).toMatch(/cross-ventilate/i);
  });

  it('maps numeric AQI values to standard EPA health bands', () => {
    expect(getAqiBandLabel(35)).toBe('Good');
    expect(getAqiBandLabel(85)).toBe('Moderate');
    expect(getAqiBandLabel(125)).toBe('Sensitive Groups');
    expect(getAqiBandLabel(175)).toBe('Unhealthy');
    expect(getAqiBandLabel(240)).toBe('Very Unhealthy');
    expect(getAqiBandLabel(350)).toBe('Hazardous');
  });
});

describe('Urban Winter Smog Playbook (buildUrbanSmogPlaybook)', () => {
  it('flags SEVERE WINTER SMOG and tailors routines for families with children', () => {
    const playbook = buildUrbanSmogPlaybook({
      city: 'Delhi',
      state: 'Delhi',
      usAqi: 265,
      pm25: 132,
      householdProfile: 'family_kids',
      commuteMode: 'car_cab',
      cookingHeating: 'lpg',
    });

    expect(playbook.smogRiskLevel).toBe('SEVERE WINTER SMOG');
    expect(playbook.winterInversionAdvisory).toContain('12:30 and 15:30');
    expect(playbook.dailyRoutines[0].title).toContain('School');
    expect(playbook.dailyRoutines[0].directImpact).toContain('42%');
    expect(playbook.indoorHacks.some((h) => h.title.includes('Corsi-Rosenthal'))).toBe(true);
    expect(playbook.sustainableAlternatives[0].directImpact).toContain('kg CO₂e');
  });

  it('tailors indoor hacks against biomass smoke when solid fuel heating is selected', () => {
    const playbook = buildUrbanSmogPlaybook({
      city: 'Patna',
      state: 'Bihar',
      usAqi: 210,
      pm25: 98,
      householdProfile: 'elderly_asthma',
      commuteMode: 'metro_bus',
      cookingHeating: 'wood_biomass',
    });

    expect(playbook.dailyRoutines[0].title).toContain('Pre-Dawn Respiratory Shield');
    expect(playbook.indoorHacks.some((h) => h.title.includes('Eliminate Indoor Biomass'))).toBe(
      true
    );
    expect(playbook.communityAction.directImpact).toContain('18 kg CO₂e');
  });
});
