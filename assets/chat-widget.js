/* =========================================================================
   Track Trade (مسار للتجارة) — inquiry chat widget (Arabic + English)
   -------------------------------------------------------------------------
   No AI. The floating chat button opens a small panel with quick-reply topics.
   Whatever the visitor taps or types, the bot "connects" them with the team and
   answers with a WhatsApp link (message pre-filled). The visitor presses Send
   inside WhatsApp themselves. Then a 3-face rating is offered.

   The whole conversation is kept as a list of messages and re-drawn whenever the
   site language changes, so every bubble matches the current language. Text the
   visitor typed stays exactly as typed.

   Configuration (optional), defined BEFORE this script runs:
     <script>
       var MASAR_CHAT_CONFIG = {
         whatsapp: '201212520555',
         feedbackEndpoint: '',   // POST JSON {rating, lang, topic, page, time}; empty = rating is not sent anywhere
         hours: null             // e.g. { tz:'Africa/Cairo', days:[0,1,2,3,4,6], start:'09:00', end:'18:00',
                                 //        label:{en:'Cairo time', ar:'بتوقيت القاهرة'} }
       };
     </script>
   With `hours` set, outside those hours the bot says the team is away (and still
   gives the WhatsApp link). Without it the bot never claims anyone is away.
   ========================================================================= */
(function () {
  'use strict';

  var config = window.MASAR_CHAT_CONFIG || {};
  var WA_NUMBER = String(config.whatsapp || '201212520555').replace(/\D/g, '');
  var FEEDBACK_URL = config.feedbackEndpoint || '';
  var HOURS = config.hours || null;

  var root = document.getElementById('masarChat');
  if (!root) return;

  var toggleBtn = document.getElementById('masarChatToggle');
  var panel = document.getElementById('masarChatPanel');
  var closeBtn = document.getElementById('masarChatClose');
  var endBtn = document.getElementById('masarChatEnd');
  var messagesEl = document.getElementById('masarChatMessages');
  var form = document.getElementById('masarChatForm');
  var input = document.getElementById('masarChatInput');

  if (!toggleBtn || !panel || !form || !input || !messagesEl) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STEP = reduceMotion ? 250 : 950;

  var STRINGS = {
    en: {
      placeholder: 'Type your inquiry…',
      greeting: 'Hi! 👋 How can we help you? Choose a topic below or type your inquiry, and we will continue on WhatsApp.',
      connecting: 'One moment, I am connecting you with our team…',
      away: 'Our team is away right now (working hours {h}). Leave your message on WhatsApp and we will reply as soon as we are back.',
      reply: 'Please send your inquiry to us on WhatsApp so our team can reply to you directly.',
      button: 'Chat on WhatsApp',
      hello: 'Hello Track Trade, I have an inquiry.',
      looking: 'No problem, take your time! You can browse our services and projects, and message us on WhatsApp whenever you like.',
      goServices: 'Our Services',
      goProjects: 'Our Projects',
      rateQ: 'Did we answer your question correctly?',
      rateBad: 'No', rateOk: 'Partly', rateGood: 'Yes',
      thanks: 'Thank you for your feedback! 💙',
      topics: {
        price: { label: 'I have a question about prices', wa: 'Hello Track Trade, I would like to ask about prices.' },
        quote: { label: 'I would like a quote', wa: 'Hello Track Trade, I would like to request a quote.' },
        support: { label: 'I need technical support', wa: 'Hello Track Trade, I need technical support.' },
        look: { label: 'I am just looking around' }
      }
    },
    ar: {
      placeholder: 'اكتب استفسارك…',
      greeting: 'أهلاً! 👋 نقدر نساعدك إزاي؟ اختار موضوع من تحت أو اكتب استفسارك، وهنكمل معاك على واتساب.',
      connecting: 'لحظة واحدة، بوصّلك بفريقنا…',
      away: 'فريقنا مش متاح دلوقتي (مواعيد العمل {h}). سيب رسالتك على واتساب وهنرد عليك أول ما نرجع.',
      reply: 'من فضلك ابعت استفسارك لنا على واتساب عشان فريقنا يرد عليك مباشرة.',
      button: 'تواصل عبر واتساب',
      hello: 'مرحباً مسار للتجارة، عندي استفسار.',
      looking: 'مفيش مشكلة، خد وقتك! تقدر تتصفح خدماتنا ومشاريعنا، وتراسلنا على واتساب في أي وقت.',
      goServices: 'خدماتنا',
      goProjects: 'مشاريعنا',
      rateQ: 'هل أجبنا على سؤالك بشكل صحيح؟',
      rateBad: 'لا', rateOk: 'جزئياً', rateGood: 'نعم',
      thanks: 'شكراً على تقييمك! 💙',
      topics: {
        price: { label: 'عندي سؤال عن الأسعار', wa: 'مرحباً مسار للتجارة، عايز أستفسر عن الأسعار.' },
        quote: { label: 'أريد عرض سعر', wa: 'مرحباً مسار للتجارة، عايز أطلب عرض سعر.' },
        support: { label: 'أحتاج دعماً فنياً', wa: 'مرحباً مسار للتجارة، محتاج دعم فني.' },
        look: { label: 'أتصفح فقط' }
      }
    }
  };
  var TOPIC_ORDER = ['price', 'quote', 'support', 'look'];

  var WA_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.7 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.6-.6-2.9-1.3-4.8-4.2-5-4.4-.1-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.4.2.5.7 1.8.8 1.9.1.2.1.3 0 .5-.6 1.2-1.2 1.1-.9 1.7.9 1.9 1.8 2.6 3.5 3.4.3.1.5.1.6-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.6-.1.2.1 1.5.7 1.8.8.3.1.4.2.5.3.1.2.1.9-.1 1.6Z"/></svg>';

  var FACES = {
    bad:  { color: '#e5676a', mouth: 'M8.5 16.2c1.2-1.6 5.8-1.6 7 0' },
    ok:   { color: '#f2a93b', mouth: 'M8.5 15.4h7' },
    good: { color: '#4caf6d', mouth: 'M8.3 14c1.3 2.6 6.1 2.6 7.4 0' }
  };
  function faceSvg(kind) {
    var f = FACES[kind];
    return '<svg viewBox="0 0 24 24" fill="none" stroke="' + f.color + '" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="10"/><circle cx="8.8" cy="9.6" r="1" fill="' + f.color + '" stroke="none"/>' +
      '<circle cx="15.2" cy="9.6" r="1" fill="' + f.color + '" stroke="none"/><path d="' + f.mouth + '"/></svg>';
  }

  function currentLang() { return document.body.classList.contains('lang-ar') ? 'ar' : 'en'; }
  function T() { return STRINGS[currentLang()]; }
  function waUrl(text) {
    return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(String(text).slice(0, 1000));
  }

  /* ---------- working hours (only used when configured) ---------- */
  function toMin(hhmm) { var p = String(hhmm).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  function isOpen() {
    if (!HOURS) return true;
    try {
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: HOURS.tz || 'Africa/Cairo', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
      }).formatToParts(new Date());
      var get = function (t) { for (var i = 0; i < parts.length; i++) if (parts[i].type === t) return parts[i].value; return ''; };
      var wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
      if (HOURS.days && HOURS.days.indexOf(wd) === -1) return false;
      var cur = (+get('hour') % 24) * 60 + (+get('minute'));
      return cur >= toMin(HOURS.start) && cur < toMin(HOURS.end);
    } catch (e) { return true; }
  }
  function hoursText() {
    var l = currentLang();
    var lab = HOURS && HOURS.label && HOURS.label[l] ? ' ' + HOURS.label[l] : '';
    return HOURS ? HOURS.start + '–' + HOURS.end + lab : '';
  }

  /* ---------- conversation model ----------
     { role:'bot',  kind:'greeting' | 'typing' | 'connecting' | 'away' | 'looking' | 'reply-topic'(id) | 'reply-text'(text) }
     { role:'user', kind:'topic'(id) | 'text'(text) }
     { role:'bot',  kind:'rate', value:null|'bad'|'ok'|'good' }                                                      */
  var messages = [];
  var session = 0;          // bumped by "End conversation" so pending timers stop
  var rated = false;
  var lastTopic = 'text';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function botBubble() { return el('div', 'masar-chat-msg masar-chat-msg-assistant'); }

  function waButton(waText) {
    var a = el('a', 'masar-chat-wa');
    a.href = waUrl(waText);
    a.target = '_blank';
    a.rel = 'noopener';
    a.innerHTML = WA_ICON;
    a.appendChild(el('span', null, T().button));
    return a;
  }

  function buildMessage(m) {
    var t = T(), b;
    if (m.role === 'user') {
      return el('div', 'masar-chat-msg masar-chat-msg-user', m.kind === 'topic' ? t.topics[m.id].label : m.text);
    }
    b = botBubble();
    switch (m.kind) {
      case 'greeting':
        b.appendChild(el('div', null, t.greeting));
        var list = el('div', 'masar-chat-quick');
        TOPIC_ORDER.forEach(function (id) {
          var btn = el('button', null, t.topics[id].label);
          btn.type = 'button';
          btn.addEventListener('click', function () { chooseTopic(id); });
          list.appendChild(btn);
        });
        b.appendChild(list);
        b.appendChild(waButton(t.hello));
        break;
      case 'typing':
        b.className += ' masar-chat-typing';
        b.setAttribute('aria-label', '…');
        b.innerHTML = '<span></span><span></span><span></span>';
        break;
      case 'connecting':
        b.appendChild(el('div', null, t.connecting));
        break;
      case 'away':
        b.appendChild(el('div', null, t.away.replace('{h}', hoursText())));
        break;
      case 'looking':
        b.appendChild(el('div', null, t.looking));
        var links = el('div', 'masar-chat-links');
        [['#services', t.goServices], ['#projects', t.goProjects]].forEach(function (l) {
          var a = el('a', 'masar-chat-link', l[1]);
          a.href = l[0];
          a.addEventListener('click', closePanel);
          links.appendChild(a);
        });
        b.appendChild(links);
        break;
      case 'reply-topic':
        b.appendChild(el('div', null, t.reply));
        b.appendChild(waButton(t.topics[m.id].wa));
        break;
      case 'reply-text':
        b.appendChild(el('div', null, t.reply));
        b.appendChild(waButton(m.text));
        break;
      case 'rate':
        if (m.value) {
          b.appendChild(el('div', null, t.thanks));
        } else {
          b.appendChild(el('div', null, t.rateQ));
          var faces = el('div', 'masar-chat-faces');
          [['bad', t.rateBad], ['ok', t.rateOk], ['good', t.rateGood]].forEach(function (f) {
            var btn = el('button', 'masar-chat-face');
            btn.type = 'button';
            btn.title = f[1];
            btn.setAttribute('aria-label', f[1]);
            btn.innerHTML = faceSvg(f[0]);
            btn.addEventListener('click', function () { rate(m, f[0]); });
            faces.appendChild(btn);
          });
          b.appendChild(faces);
        }
        break;
    }
    return b;
  }

  function render(keepScroll) {
    var top = messagesEl.scrollTop;
    messagesEl.textContent = '';
    messages.forEach(function (m) { messagesEl.appendChild(buildMessage(m)); });
    messagesEl.scrollTop = keepScroll ? top : messagesEl.scrollHeight;
    input.setAttribute('placeholder', T().placeholder);
  }
  function push(m) { messages.push(m); render(false); }
  function dropTyping() {
    for (var i = messages.length - 1; i >= 0; i--) if (messages[i].kind === 'typing') { messages.splice(i, 1); break; }
  }
  function later(ms, fn) {
    var sid = session;
    setTimeout(function () { if (sid === session) fn(); }, ms);
  }

  /* ---------- the "connecting you to the team" sequence ---------- */
  function respond(replyMsg) {
    push({ role: 'bot', kind: 'typing' });
    later(STEP, function () {
      dropTyping(); messages.push({ role: 'bot', kind: 'connecting' }); render(false);
      push({ role: 'bot', kind: 'typing' });
      later(STEP, function () {
        dropTyping();
        if (!isOpen()) messages.push({ role: 'bot', kind: 'away' });
        messages.push(replyMsg);
        render(false);
        if (!rated) {
          later(STEP, function () { if (!rated) push({ role: 'bot', kind: 'rate', value: null }); });
        }
      });
    });
  }

  function chooseTopic(id) {
    lastTopic = id;
    push({ role: 'user', kind: 'topic', id: id });
    if (id === 'look') { push({ role: 'bot', kind: 'looking' }); return; }
    respond({ role: 'bot', kind: 'reply-topic', id: id });
  }

  /* ---------- rating ---------- */
  function rate(m, value) {
    rated = true;
    m.value = value;
    render(false);
    if (FEEDBACK_URL) {
      try {
        fetch(FEEDBACK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: value, lang: currentLang(), topic: lastTopic, page: location.pathname, time: new Date().toISOString() }),
          keepalive: true
        }).catch(function () {});
      } catch (e) { /* the visitor never sees an error for a rating */ }
    }
  }

  /* Called by the site's AR/EN switch: redraw everything in the new language. */
  window.masarChatSetLang = function () { render(true); };

  function openPanel() {
    panel.removeAttribute('hidden');
    toggleBtn.setAttribute('aria-expanded', 'true');
    if (!messages.length) messages.push({ role: 'bot', kind: 'greeting' });
    render(false);
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

  // "End conversation": forget the messages and close; next time starts fresh.
  if (endBtn) endBtn.addEventListener('click', function () {
    session++; messages = []; rated = false; lastTopic = 'text';
    render(false);
    closePanel();
    toggleBtn.focus();
  });

  // Click outside closes the panel (but switching language / theme keeps it open).
  document.addEventListener('click', function (e) {
    if (panel.hasAttribute('hidden')) return;
    if (root.contains(e.target)) return;
    if (e.target.closest && e.target.closest('#langSwitch, #themeToggle')) return;
    closePanel();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hasAttribute('hidden')) {
      closePanel();
      toggleBtn.focus();
    }
  });
  panel.addEventListener('click', function (e) { e.stopPropagation(); });

  // Anything typed -> "connecting" step, then the WhatsApp link (message pre-filled).
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var message = input.value.trim();
    if (!message) return;
    input.value = '';
    lastTopic = 'text';
    push({ role: 'user', kind: 'text', text: message });
    respond({ role: 'bot', kind: 'reply-text', text: message });
    input.focus();
  });
})();
