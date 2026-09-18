/* =========================================================================
   Masar Trading / Tech Track — AI Customer Assistant widget
   -------------------------------------------------------------------------
   This talks to a small backend endpoint (see chat-api.php in the static
   package, or the masar_chat AJAX action in the WordPress theme) which
   forwards the conversation to the real Anthropic API using YOUR OWN API
   key, kept secret on the server. This file never contains an API key.

   Configuration is read from the global `MASAR_CHAT_CONFIG` object, which
   must be defined BEFORE this script runs:

     Static site:
       <script>
         var MASAR_CHAT_CONFIG = { endpoint: 'chat-api.php' };
       </script>

     WordPress theme: already set up for you via wp_localize_script() in
       functions.php — do not add it manually there.
   ========================================================================= */
(function () {
  'use strict';

  var config = window.MASAR_CHAT_CONFIG || {};
  var root = document.getElementById('masarChat');
  if (!root) return;

  var toggleBtn = document.getElementById('masarChatToggle');
  var panel = document.getElementById('masarChatPanel');
  var closeBtn = document.getElementById('masarChatClose');
  var messagesEl = document.getElementById('masarChatMessages');
  var form = document.getElementById('masarChatForm');
  var input = document.getElementById('masarChatInput');
  var sendBtn = document.getElementById('masarChatSend');

  if (!toggleBtn || !panel || !form || !input || !messagesEl) return;

  var STORAGE_KEY = 'masarChatHistory';
  var history = loadHistory(); // {role:'user'|'assistant', content:'...'}
  var busy = false;
  var greeted = history.length > 0;

  // Session-only persistence (sessionStorage clears when the tab closes),
  // so a reload doesn't wipe the conversation but nothing lingers beyond
  // the visit. No server-side storage of the conversation is implied by
  // this — it never leaves the browser except one message at a time to
  // the chat API.
  function loadHistory() {
    try {
      var raw = window.sessionStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory() {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-20)));
    } catch (e) { /* storage unavailable/full — conversation just won't survive a reload */ }
  }

  var STRINGS = {
    en: {
      placeholder: 'Type your question…',
      greeting: "Hi! I'm Tech Track's assistant. Ask me anything about our products, services, or how to reach us.",
      error: 'Sorry, something went wrong. Please try again, or reach us directly on WhatsApp / phone.',
      notConfigured: 'The chat assistant isn\u2019t connected to an AI key yet. Please contact us directly by phone, email or WhatsApp for now.'
    },
    ar: {
      placeholder: 'اكتب سؤالك…',
      greeting: 'أهلاً! أنا مساعد "تك تراك". اسألني عن منتجاتنا أو خدماتنا أو طرق التواصل معنا.',
      error: 'عذرًا، حدث خطأ ما. من فضلك حاول مرة أخرى، أو تواصل معنا مباشرة عبر واتساب أو الهاتف.',
      notConfigured: 'المساعد الذكي غير مُفعّل بعد. من فضلك تواصل معنا مباشرة عبر الهاتف أو البريد الإلكتروني أو واتساب.'
    }
  };

  function currentLang() {
    return document.body.classList.contains('lang-ar') ? 'ar' : 'en';
  }

  function t(key) {
    return STRINGS[currentLang()][key];
  }

  // Exposed so the site-wide language switcher can refresh widget-only text
  // (the placeholder attribute can't be toggled via the normal .en/.ar [hidden] trick).
  window.masarChatSetLang = function (lang) {
    input.setAttribute('placeholder', STRINGS[lang].placeholder);
  };

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addBubble(text, role) {
    var wrap = document.createElement('div');
    wrap.className = 'masar-chat-msg masar-chat-msg-' + role;
    wrap.textContent = text;
    messagesEl.appendChild(wrap);
    scrollToBottom();
    return wrap;
  }

  function addTyping() {
    var wrap = document.createElement('div');
    wrap.className = 'masar-chat-msg masar-chat-msg-assistant masar-chat-typing';
    wrap.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(wrap);
    scrollToBottom();
    return wrap;
  }

  function openPanel() {
    panel.removeAttribute('hidden');
    toggleBtn.setAttribute('aria-expanded', 'true');
    window.masarChatSetLang(currentLang());
    if (!greeted) {
      addBubble(t('greeting'), 'assistant');
      greeted = true;
    } else if (messagesEl.children.length === 0 && history.length > 0) {
      // Panel was closed and reopened (or the page reloaded) — replay the
      // saved turns instead of re-greeting, so the visitor doesn't lose
      // their place mid-conversation.
      history.forEach(function (turn) { addBubble(turn.content, turn.role); });
    }
    setTimeout(function () { input.focus(); }, 30);
  }

  function closePanel() {
    panel.setAttribute('hidden', '');
    toggleBtn.setAttribute('aria-expanded', 'false');
  }

  toggleBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (panel.hasAttribute('hidden')) openPanel(); else closePanel();
  });
  if (closeBtn) closeBtn.addEventListener('click', closePanel);

  // Close on click outside the widget. This never OPENS the panel — it only
  // ever closes it — so it can't cause the auto-popup behavior that must be
  // avoided. Clicks inside the panel itself (including the toggle button,
  // handled above) are excluded via root.contains().
  document.addEventListener('click', function (e) {
    if (panel.hasAttribute('hidden')) return;
    if (root.contains(e.target)) return;
    closePanel();
  });

  // Escape closes the panel when it's open, for keyboard users.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hasAttribute('hidden')) {
      closePanel();
      toggleBtn.focus();
    }
  });

  // Clicks inside the panel (e.g. on a message bubble) must not bubble to
  // the document listener above and self-close the chat.
  panel.addEventListener('click', function (e) { e.stopPropagation(); });

  async function sendMessage(message) {
    // WordPress-style endpoint (admin-ajax action + nonce)
    if (config.action) {
      var body = new URLSearchParams();
      body.set('action', config.action);
      if (config.nonce) body.set('nonce', config.nonce);
      body.set('message', message);
      body.set('history', JSON.stringify(history));
      body.set('lang', currentLang());
      var res = await fetch(config.endpoint, { method: 'POST', body: body });
      var data = await res.json();
      if (!data || !data.success) throw new Error((data && data.data && data.data.message) || 'error');
      return data.data.reply;
    }
    // Plain static-site endpoint (e.g. chat-api.php)
    var res2 = await fetch(config.endpoint || 'chat-api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message, history: history, lang: currentLang() })
    });
    var data2 = await res2.json();
    if (!data2 || data2.error) throw new Error((data2 && data2.error) || 'error');
    return data2.reply;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    var message = input.value.trim();
    if (!message) return;
    input.value = '';
    addBubble(message, 'user');
    history.push({ role: 'user', content: message });
    saveHistory();

    busy = true;
    if (sendBtn) sendBtn.disabled = true;
    var typing = addTyping();

    sendMessage(message).then(function (reply) {
      typing.remove();
      addBubble(reply, 'assistant');
      history.push({ role: 'assistant', content: reply });
      saveHistory();
    }).catch(function (err) {
      typing.remove();
      var msg = (config.notConfigured || (err && err.message === 'not_configured')) ? t('notConfigured') : t('error');
      addBubble(msg, 'assistant');
    }).finally(function () {
      busy = false;
      if (sendBtn) sendBtn.disabled = false;
      input.focus();
    });
  });
})();
