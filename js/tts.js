// Text-to-speech wrapper — Web Speech API
// Falls back gracefully if voices aren't loaded yet.

const TTS = (() => {
  const synth = window.speechSynthesis;
  let voices = [];
  let ready = false;

  const LANG_CODES = {
    en: ['en-GB', 'en-US', 'en'],
    zh: ['zh-CN', 'zh-TW', 'zh'],
    pl: ['pl-PL', 'pl']
  };

  function loadVoices() {
    voices = synth.getVoices();
    if (voices.length) ready = true;
  }

  loadVoices();
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  function pickVoice(langKey) {
    const codes = LANG_CODES[langKey] || [langKey];
    for (const code of codes) {
      const v = voices.find(v => v.lang.startsWith(code));
      if (v) return v;
    }
    return null;
  }

  function speak(text, langKey, rate = 0.8) {
    if (!synth) return;
    synth.cancel();

    // Trigger voice load if needed (some browsers need a user gesture first)
    if (!ready) loadVoices();

    const utt = new SpeechSynthesisUtterance(text);
    const codes = LANG_CODES[langKey] || [langKey];
    utt.lang = codes[0];
    const voice = pickVoice(langKey);
    if (voice) utt.voice = voice;
    utt.rate = rate;
    utt.pitch = 1.1;
    synth.speak(utt);
  }

  return { speak };
})();
