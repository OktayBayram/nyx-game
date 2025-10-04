import React, { createContext, useMemo, useState } from 'react';

export const AchievementsContext = createContext({
  achievements: [],
  addAchievement: () => {},
});

export function AchievementsProvider({ children }) {
  const [achievements, setAchievements] = useState([]);

  const addAchievement = (key, label) => {
    setAchievements((prev) => {
      if (prev.find((a) => a.key === key)) return prev;
      return [...prev, { key, label, earnedAt: Date.now() }];
    });
  };

  const value = useMemo(() => ({ achievements, addAchievement }), [achievements]);
  return (
    <AchievementsContext.Provider value={value}>
      {children}
    </AchievementsContext.Provider>
  );
}




