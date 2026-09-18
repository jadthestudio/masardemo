Masar Trading / Tech Track — Static Demo (v3)
Open index.html in any modern browser (Chrome/Edge/Firefox/Safari) to preview.
Updated in this pass:
- Logo mark corrected: red/navy blocks now stacked and pointing away from
  each other (matching the reference), not mirrored/facing.
- Softer, warmer white tone instead of stark white.
- Subtle geometric texture (dot-grid + fine diagonal lines) behind the page,
  plus outlined circles/squares as accents in the hero, about, "why choose
  us" and contact sections.
- Product cards and project cards now carry a diagonal-line texture and a
  large faint icon instead of a flat empty color block.
Photography is still placeholder (geometric/gradient panels) — swap in real
photos whenever the client provides them.

--- v4 update ---
- Real logo image (assets/logo-lockup.png / logo-lockup-onDark.png) now used in the
  header and footer, generated from the client's approved outline artwork.
- Header search icon now opens a real working search box (site sections,
  services, and products are searchable; Ctrl/Cmd+K also opens it).
- AR/EN switch in the top bar is now functional: it flips the page direction
  to RTL and promotes the Arabic captions to the primary/bold text (English
  becomes the secondary caption) across the header, hero, services, quick
  bar and "why choose us" sections.
- Note: body paragraphs that don't yet have an Arabic translation (About Us
  text, service descriptions, contact form labels) still display in English
  even in Arabic mode — send the final Arabic copy and I will wire it in the
  same way.

--- v5 update ---
- Contact details updated everywhere (top bar, contact section, WhatsApp
  button):
    Phone/WhatsApp: 01212520555
    Email: info@track-egy.com
    Address: Mansoura, First Suez Canal Street, above Tomah Restaurant
             (المنصورة، أول شارع قناة السويس، فوق مطعم تومة)
- AR/EN switch now fully separates the two languages instead of just
  changing emphasis: in English mode only English text shows, in Arabic
  mode only Arabic text shows (RTL layout). The logo lockup ("tech track" /
  "مسار للتجارة") still always shows both, since that's normal branding.
- New: an AI-powered chat bubble (bottom-left of every page) lets visitors
  ask questions and get real answers about the company, in whichever
  language they type in.

  HOW TO TURN THE CHAT ON (2 minutes):
  1. Get an Anthropic API key at https://console.anthropic.com (billed
     per use — check current pricing there).
  2. Open chat-api.php in a text editor and paste your key where it says
     PASTE-YOUR-ANTHROPIC-API-KEY-HERE.
  3. Upload the whole static-demo folder (index.html, chat-api.php,
     assets/) to any normal PHP web host (shared hosting/cPanel all work —
     this does NOT work on a pure static host like GitHub Pages, since
     that can't run chat-api.php).
  Until a key is added, the chat bubble still opens, but replies by asking
  the visitor to contact the team directly by phone/WhatsApp/email.
  Company facts the assistant uses (address/phone/email/services) are
  editable near the top of chat-api.php.
