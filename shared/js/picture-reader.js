const PictureReader = (() => {
  const LANG = {
    en: { label: 'English', short: 'EN' },
    zh: { label: '中文', short: '中' },
    pl: { label: 'Polski', short: 'PL' },
  };

  let book;
  let pageIndex = 0;
  let language = 'en';
  let audioEnabled = true;

  const els = {};

  function progressKey() {
    return `ebooks:${book.slug}:progress`;
  }

  function languageKey() {
    return `ebooks:${book.slug}:language`;
  }

  function clampPage(n) {
    return Math.max(0, Math.min(book.pages.length - 1, n));
  }

  function saveProgress() {
    localStorage.setItem(progressKey(), String(pageIndex));
    localStorage.setItem(languageKey(), language);
  }

  function loadProgress() {
    const savedPage = Number(localStorage.getItem(progressKey()));
    if (Number.isFinite(savedPage)) pageIndex = clampPage(savedPage);

    const savedLang = localStorage.getItem(languageKey());
    if (savedLang && book.languages.includes(savedLang)) {
      language = savedLang;
    } else if (!book.languages.includes(language)) {
      language = book.languages[0];
    }
  }

  function currentPage() {
    return book.pages[pageIndex];
  }

  function pageImage(page) {
    return page.images?.[language] || page.image;
  }

  function pageText(page) {
    return page.text?.[language] || '';
  }

  function renderLanguageButtons() {
    els.languageButtons.innerHTML = '';
    book.languages.forEach(lang => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reader-pill';
      button.textContent = LANG[lang]?.short || lang.toUpperCase();
      button.title = LANG[lang]?.label || lang;
      button.setAttribute('aria-pressed', String(lang === language));
      button.addEventListener('click', () => {
        language = lang;
        saveProgress();
        render(true);
      });
      els.languageButtons.appendChild(button);
    });
  }

  function speakCurrent() {
    if (!audioEnabled) return;
    const text = pageText(currentPage());
    if (!text) return;
    TTS.speak(text, language);
  }

  function render(shouldSpeak = false) {
    const page = currentPage();
    const text = pageText(page);

    els.title.textContent = book.title;
    els.counter.textContent = `${pageIndex + 1} / ${book.pages.length}`;
    els.image.src = pageImage(page);
    els.image.alt = `${book.title}, page ${pageIndex + 1}`;
    els.text.textContent = text;
    els.text.hidden = !text;
    els.prev.disabled = pageIndex === 0;
    els.next.disabled = pageIndex === book.pages.length - 1;
    els.audio.disabled = !text;
    els.audio.setAttribute('aria-pressed', String(audioEnabled));
    els.audio.textContent = audioEnabled ? 'Audio On' : 'Audio Off';

    renderLanguageButtons();
    document.documentElement.style.setProperty('--reader-accent', book.accent || '#4FC3F7');
    saveProgress();

    if (shouldSpeak) speakCurrent();
  }

  function changePage(delta) {
    const next = clampPage(pageIndex + delta);
    if (next === pageIndex) return;
    pageIndex = next;
    render(audioEnabled);
  }

  function bind() {
    els.prev.addEventListener('click', () => changePage(-1));
    els.next.addEventListener('click', () => changePage(1));
    els.audio.addEventListener('click', () => {
      audioEnabled = !audioEnabled;
      if (!audioEnabled) window.speechSynthesis?.cancel();
      render(false);
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') changePage(-1);
      if (event.key === 'ArrowRight') changePage(1);
    });

    let touchStartX = 0;
    document.addEventListener('touchstart', event => {
      touchStartX = event.touches[0].clientX;
    }, { passive: true });
    document.addEventListener('touchend', event => {
      const dx = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 60) changePage(dx < 0 ? 1 : -1);
    });
  }

  function init(config) {
    book = config;
    Object.assign(els, {
      title: document.getElementById('readerTitle'),
      counter: document.getElementById('readerCounter'),
      image: document.getElementById('readerImage'),
      text: document.getElementById('readerText'),
      prev: document.getElementById('readerPrev'),
      next: document.getElementById('readerNext'),
      audio: document.getElementById('readerAudio'),
      languageButtons: document.getElementById('readerLanguages'),
    });
    loadProgress();
    bind();
    render(false);
  }

  return { init };
})();
