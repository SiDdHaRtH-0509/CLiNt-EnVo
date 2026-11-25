import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AqiMonitor from '@/components/AqiMonitor';

describe('AqiMonitor Pop-Up Alerts & Winter Smog Assistant', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          current: {
            us_aqi: 165,
            european_aqi: 62,
            pm2_5: 68.4,
            pm10: 112.0,
            nitrogen_dioxide: 34.2,
            sulphur_dioxide: 9.1,
            ozone: 41.5,
            carbon_monoxide: 420,
            time: new Date().toISOString(),
          },
          hourly: {
            time: [new Date().toISOString()],
            us_aqi: [165],
            pm2_5: [68.4],
            pm10: [112.0],
            ozone: [41.5],
          },
        }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('triggers and dismisses real-time pop-up notifications when AQI increases or decreases', async () => {
    render(<AqiMonitor />);

    await waitFor(() => {
      expect(screen.getByText('165')).toBeInTheDocument();
    });

    // Trigger AQI increase pop-up
    const surgeBtn = screen.getByRole('button', { name: /preview aqi increased pop-up notification/i });
    fireEvent.click(surgeBtn);

    const alertPopup = screen.getByRole('alert');
    expect(alertPopup).toHaveTextContent(/AQI Increased in Delhi \(\+35/i);

    // Dismiss the alert pop-up
    const dismissBtn = screen.getByRole('button', { name: /dismiss aqi notification/i });
    fireEvent.click(dismissBtn);
    expect(screen.queryByText(/AQI Increased in Delhi/i)).not.toBeInTheDocument();

    // Trigger AQI decrease pop-up
    const reliefBtn = screen.getByRole('button', { name: /preview aqi decreased pop-up notification/i });
    fireEvent.click(reliefBtn);

    const statusPopup = screen.getByRole('status');
    expect(statusPopup).toHaveTextContent(/AQI Decreased in Delhi \(-28/i);
  });

  it('tailors Winter Smog Playbook routines and indoor hacks by household profile', async () => {
    render(<AqiMonitor />);

    expect(screen.getByText(/Family & Community Smog Playbook/i)).toBeInTheDocument();
    expect(screen.getByText(/DIY Corsi-Rosenthal Box-Fan Purifier/i)).toBeInTheDocument();

    const householdSelect = screen.getByLabelText(/family \/ community profile/i);
    fireEvent.change(householdSelect, { target: { value: 'elderly_asthma' } });

    expect(screen.getByText(/Pre-Dawn Respiratory Shield Routine/i)).toBeInTheDocument();

    const briefBtn = screen.getByRole('button', { name: /generate genai smog brief/i });
    fireEvent.click(briefBtn);

    await waitFor(() => {
      expect(screen.getByRole('region', { name: /gemini ai smog advisory brief/i })).toBeInTheDocument();
    });
  });
});
