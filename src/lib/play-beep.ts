"use client";

/** Kratki zvucni signal za novu online rezervaciju (poglavlje 7) — generiran preko Web Audio API, bez audio datoteke. */
export function playBeep() {
  try {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.4);
    oscillator.onended = () => void ctx.close();
  } catch {
    // Audio nije dostupan (npr. autoplay policy) — nije kriticno.
  }
}
