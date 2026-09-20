export const getButtonColors = (colorName = 'green', pressed = false) => {
  const map: Record<string, { base: string; dark: string; border: string; highlight: string }> = {
    green: {
      base: pressed ? '#15803d' : '#22c55e',
      dark: '#14532d',
      border: '#052e16',
      highlight: '#86efac',
    },
    red: {
      base: pressed ? '#b91c1c' : '#ef4444',
      dark: '#7f1d1d',
      border: '#450a0a',
      highlight: '#fca5a5',
    },
    blue: {
      base: pressed ? '#1d4ed8' : '#3b82f6',
      dark: '#1e3a8a',
      border: '#172554',
      highlight: '#93c5fd',
    },
    yellow: {
      base: pressed ? '#ca8a04' : '#eab308',
      dark: '#713f12',
      border: '#422006',
      highlight: '#fef08a',
    },
    black: {
      base: pressed ? '#0f172a' : '#334155',
      dark: '#020617',
      border: '#000000',
      highlight: '#64748b',
    },
  };
  return map[colorName] || map.green;
};
