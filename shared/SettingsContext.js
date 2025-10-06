import React, { createContext, useMemo, useState } from 'react';

export const SettingsContext = createContext({
  soundEnabled: true,
  setSoundEnabled: () => {},
  musicEnabled: true,
  setMusicEnabled: () => {},
  hapticsEnabled: true,
  setHapticsEnabled: () => {},
  musicVolume: 0.7,
  setMusicVolume: () => {},
  soundVolume: 0.8,
  setSoundVolume: () => {},
  hapticsStrength: 0.7,
  setHapticsStrength: () => {},
});

export function SettingsProvider({ children }) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.7); // 0..1
  const [soundVolume, setSoundVolume] = useState(0.8); // 0..1
  const [hapticsStrength, setHapticsStrength] = useState(0.7); // 0..1

  const value = useMemo(() => ({
    soundEnabled, setSoundEnabled,
    musicEnabled, setMusicEnabled,
    hapticsEnabled, setHapticsEnabled,
    musicVolume, setMusicVolume,
    soundVolume, setSoundVolume,
    hapticsStrength, setHapticsStrength,
  }), [soundEnabled, musicEnabled, hapticsEnabled, musicVolume, soundVolume, hapticsStrength]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}




