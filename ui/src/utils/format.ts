export const bytes = (n: number): string => {
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = n;
  for (const unit of u) {
    if (v < 1024) return `${v.toFixed(1)} ${unit}`;
    v /= 1024;
  }
  return `${v.toFixed(1)} PB`;
};

export const seconds = (s: number): string => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
};

export const percent = (n: number, digits = 1): string => `${n.toFixed(digits)}%`;
