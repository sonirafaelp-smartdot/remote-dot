// Web Audio API Synthesizer for Real-Time Helpdesk & Support Notifications
class SoundService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.7;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  // Play tone helper
  private playTone(freq: number, type: OscillatorType, durationMs: number, delayMs: number = 0, gainMultiplier: number = 1) {
    if (this.isMuted || this.volume <= 0) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const startTime = ctx.currentTime + delayMs / 1000;
      const stopTime = startTime + durationMs / 1000;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      const targetGain = this.volume * 0.3 * gainMultiplier;
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(targetGain, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(stopTime);
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  // 1. Critical Emergency Alert (Pulsing high-low alert)
  public playCriticalAlert() {
    this.playTone(880, 'sawtooth', 140, 0, 1.2);
    this.playTone(660, 'sawtooth', 140, 150, 1.2);
    this.playTone(880, 'sawtooth', 200, 300, 1.4);
  }

  // 2. New Ticket Arrived (Clean double-ding chime)
  public playTicketNotification() {
    this.playTone(659.25, 'sine', 160, 0, 0.9); // E5
    this.playTone(880.0, 'sine', 280, 120, 1.0); // A5
  }

  // 3. Remote Session Request (Tech priority ascending chord)
  public playSessionRequest() {
    this.playTone(523.25, 'triangle', 120, 0, 0.9); // C5
    this.playTone(659.25, 'triangle', 120, 90, 0.9); // E5
    this.playTone(783.99, 'triangle', 140, 180, 1.0); // G5
    this.playTone(1046.5, 'sine', 320, 270, 1.1); // C6
  }

  // 4. Device Online (Upbeat positive confirmation)
  public playDeviceOnline() {
    this.playTone(587.33, 'sine', 120, 0, 0.8); // D5
    this.playTone(880.0, 'sine', 220, 100, 0.9); // A5
  }

  // 5. Device Offline Warning (Soft descending tone)
  public playDeviceOffline() {
    this.playTone(493.88, 'sine', 160, 0, 0.8); // B4
    this.playTone(369.99, 'triangle', 250, 120, 0.9); // F#4
  }

  // 6. Generic Message / Note (Subtle click pop)
  public playMessagePop() {
    this.playTone(784.0, 'sine', 90, 0, 0.7);
  }

  // 7. Remote Session Connected & Authorized (High-tech confirmation chime)
  public playSessionConnected() {
    this.playTone(523.25, 'sine', 100, 0, 0.8);
    this.playTone(659.25, 'sine', 100, 80, 0.9);
    this.playTone(1046.5, 'sine', 200, 160, 1.0);
  }

  // 8. Emergency Revocation / Panic Button (Urgent low-frequency buzzer)
  public playRevokedPanic() {
    this.playTone(330, 'sawtooth', 180, 0, 1.3);
    this.playTone(220, 'sawtooth', 260, 150, 1.4);
  }

  // 9. SendInput Key/Click Audio Feedback
  public playInputClick() {
    this.playTone(1200, 'sine', 30, 0, 0.3);
  }

  // 10. File Transfer Success & SHA-256 Verified
  public playSuccessSound() {
    this.playTone(523.25, 'sine', 90, 0, 0.8);
    this.playTone(659.25, 'sine', 90, 80, 0.85);
    this.playTone(783.99, 'sine', 90, 160, 0.9);
    this.playTone(1046.5, 'sine', 240, 240, 1.0);
  }

  // 11. General Action / Click Confirmation
  public playActionSound() {
    this.playTone(880.0, 'sine', 60, 0, 0.5);
  }

  // 12. Alert Sound / Warning
  public playAlertSound() {
    this.playTone(440, 'triangle', 140, 0, 1.0);
    this.playTone(330, 'triangle', 180, 120, 1.1);
  }
}

export const soundService = new SoundService();
