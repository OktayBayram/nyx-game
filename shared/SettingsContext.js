import React, { createContext, useMemo, useState } from 'react';

export const SettingsContext = createContext({
  typeSpeedMs: 12,
  setTypeSpeedMs: () => {},
});

export function SettingsProvider({ children }) {
  const [typeSpeedMs, setTypeSpeedMs] = useState(12);

  const value = useMemo(() => ({ typeSpeedMs, setTypeSpeedMs }), [typeSpeedMs]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}




