// Web Audio API Synthesizer & Speech Notification Utilities
// 100% Realtime, 0 KB external downloads, Works across Android, iOS & Desktop

let sharedAudioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

/**
 * Initializes and unlocks the Web Audio context upon the first user gesture.
 * Required by modern mobile browser autoplay policies.
 */
export function unlockAudioContext() {
  if (typeof window === "undefined") return;

  try {
    if (!sharedAudioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        sharedAudioCtx = new AudioCtxClass();
      }
    }

    if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().then(() => {
        isAudioUnlocked = true;
      }).catch(() => {});
    } else if (sharedAudioCtx && sharedAudioCtx.state === "running") {
      isAudioUnlocked = true;
    }
  } catch (err) {
    console.warn("Unable to unlock AudioContext:", err);
  }
}

// Auto-register touch/click listeners to unlock audio on first interaction
if (typeof window !== "undefined") {
  const unlockEvents = ["click", "touchstart", "touchend", "pointerdown"];
  const handleInteraction = () => {
    unlockAudioContext();
    unlockEvents.forEach((evt) => window.removeEventListener(evt, handleInteraction));
  };
  unlockEvents.forEach((evt) => window.addEventListener(evt, handleInteraction, { once: true, passive: true }));
}

/**
 * Plays a loud, crystal-clear double cashier bell chime ("Ting-Ting!")
 */
export function playCashierDing() {
  if (typeof window === "undefined") return;

  try {
    unlockAudioContext();
    if (!sharedAudioCtx) return;

    const ctx = sharedAudioCtx;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Bell 1: High metallic ping (1318.5 Hz - E6)
    createBellStrike(ctx, 1318.5, now, 0.45);
    createBellStrike(ctx, 2637, now, 0.25); // harmonic octave

    // Bell 2: Higher celebratory ping (1760 Hz - A6) after 160ms
    createBellStrike(ctx, 1760, now + 0.16, 0.55);
    createBellStrike(ctx, 3520, now + 0.16, 0.3); // harmonic octave
    createBellStrike(ctx, 2093, now + 0.32, 0.5);  // C7 flourish
  } catch (e) {
    console.warn("playCashierDing failed:", e);
  }
}

function createBellStrike(ctx: AudioContext, frequency: number, startTime: number, volume: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, startTime);

  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.9);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + 0.95);
}

/**
 * Speaks an Indonesian voice announcement via Web Speech API
 */
export function speakVoiceAnnouncement(message: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "id-ID";
    utterance.rate = 1.0;
    utterance.pitch = 1.08;

    const voices = window.speechSynthesis.getVoices();
    const indonesianVoice = voices.find(
      (v) =>
        v.lang === "id-ID" ||
        v.lang.toLowerCase().startsWith("id") ||
        v.name.toLowerCase().includes("indonesia")
    );
    if (indonesianVoice) {
      utterance.voice = indonesianVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Speech synthesis error:", err);
  }
}

/**
 * Triggers physical smartphone vibration haptics
 */
export function triggerSmartphoneVibration(pattern: number[] = [250, 100, 250, 100, 450]) {
  if (typeof window === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Ignore devices without vibrator motor
  }
}

/**
 * Dispatches a native smartphone notification (via Service Worker or Notification API)
 */
export function sendSmartphoneNotification(title: string, body: string, url: string = "/portal") {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    // 1. Try Service Worker showNotification (Best for Android / iOS PWA)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body,
          icon: "/api/logo/landing",
          badge: "/api/logo/landing",
          vibrate: [250, 100, 250, 100, 450],
          tag: `alert-${Date.now()}`,
          data: { url },
        } as NotificationOptions).catch(() => {
          fallbackNotification(title, body, url);
        });
      }).catch(() => {
        fallbackNotification(title, body, url);
      });
      return;
    }

    fallbackNotification(title, body, url);
  } catch (err) {
    console.warn("sendSmartphoneNotification error:", err);
  }
}

function fallbackNotification(title: string, body: string, url: string) {
  try {
    const notif = new Notification(title, {
      body,
      icon: "/api/logo/landing",
      badge: "/api/logo/landing",
    });
    notif.onclick = () => {
      window.focus();
      window.location.href = url;
      notif.close();
    };
  } catch {
    // Ignore fallback errors
  }
}
