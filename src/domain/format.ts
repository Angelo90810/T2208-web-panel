export function faderToDb(fader: number): string {
  if (fader <= 0) return '−∞';
  const db = -60 + (fader / 100) * 70;
  return `${db > 0 ? '+' : ''}${db.toFixed(1)} dB`;
}
