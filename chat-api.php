<?php
/**
 * Masar Trading / Tech Track — AI chat backend (static site version)
 * =====================================================================
 * WHAT THIS FILE DOES
 * This is a tiny, self-contained proxy: the browser (chat-widget.js)
 * sends it a customer message, this file forwards it to the real
 * Anthropic API together with a system prompt describing the company,
 * and returns the AI's reply as JSON. Your Anthropic API key stays on
 * the server and is never sent to the browser.
 *
 * SETUP (2 steps)
 * 1. Get an API key from https://console.anthropic.com (Anthropic
 *    charges per use — check current pricing on that site).
 * 2. Paste the key below where it says 'PASTE-YOUR-ANTHROPIC-API-KEY-HERE'.
 *    That's it — upload this file next to index.html on any normal PHP
 *    web host (shared hosting, cPanel, etc. all work — PHP is enabled
 *    almost everywhere by default).
 *
 * If you are hosting on something that does NOT support PHP (for
 * example GitHub Pages, or a pure static host), this file will not
 * run. In that case host the "static-demo" folder somewhere that does
 * support PHP, or ask a developer to port this same logic to your
 * platform's serverless functions (Node/Python/etc.) — the logic is
 * only ~30 lines.
 * =====================================================================
 */

// ------------------------------------------------------------------
// 1) YOUR API KEY — replace the placeholder below.
// ------------------------------------------------------------------
$ANTHROPIC_API_KEY = 'PASTE-YOUR-ANTHROPIC-API-KEY-HERE';

// ------------------------------------------------------------------
// 2) Company information the assistant will use to answer questions.
//    Edit freely as your business details change.
// ------------------------------------------------------------------
$SYSTEM_PROMPT_BASE = <<<PROMPT
You are the friendly customer-service assistant for "Masar Trading" (مسار للتجارة), also known as "Tech Track".

Company facts you can share when relevant:
- Founded in 2008. Headquartered in Mansoura, Egypt, with a branch in Saudi Arabia
  (exact Saudi branch address not yet confirmed — if asked, say the Egypt office
  can confirm the Saudi branch address directly).
- Egypt HQ Address: Mansoura, First Suez Canal Street, above Tomah Restaurant, Egypt.
  (بالعربي: المنصورة، أول شارع قناة السويس، فوق مطعم تومة)
- Phone / WhatsApp: 01212520555 (also 0502295525)
- Email: info@track-egy.com
- Services: Trading & Supplies, Technology Solutions, Integrated Security Systems
  (network switches, access control/ACC doors, control rooms and full CCTV coverage
  as one connected system), Fiber Optic Solutions (fixing messy/unplanned fiber
  cabling and internal extensions in factories and homes, with structured cabling
  and our own fusion-splicing equipment, priced below the market average),
  Networking Solutions, Technical Support, Project Solutions.
- Products: Electronics & Devices, Security Systems, Networking Equipment,
  Fiber Splicing Equipment & Accessories, Electrical Supplies, IT Solutions.
- Notable projects in Saudi Arabia: Boulevard City and City Walk (both delivered
  for the General Entertainment Authority), and integrated CCTV/access-control
  security systems for royal palace facilities.
- The company has served 300+ clients, supplied 500+ products, and offers 24/7
  technical support.

Instructions:
- {LANGUAGE_INSTRUCTION}
- Be concise, warm, and helpful — a few short sentences or a short list, not long essays.
- Answer general questions about the company, its services/products, working hours (if asked, say to confirm exact hours by phone), and how to get in touch.
- If you don't know something specific (like an exact price or stock availability), say so honestly and suggest contacting the team directly by phone, WhatsApp or email.
- Never invent facts about the company that are not given above.
PROMPT;

// The widget sends the site's currently active language toggle (ar/en) with
// every message, so the assistant always speaks whichever language the
// visitor currently has the site set to — same as every other piece of text
// on the page — instead of guessing from what they typed.
function masar_language_instruction($lang) {
    if ($lang === 'ar') {
        return 'The visitor currently has the ARABIC version of the site open. Always reply in Arabic, even if they type in English or another language.';
    }
    if ($lang === 'en') {
        return 'The visitor currently has the ENGLISH version of the site open. Always reply in English, even if they type in Arabic or another language.';
    }
    // Fallback if no lang was sent: match whatever language the customer wrote in.
    return 'Reply in the SAME language the customer wrote in (Arabic or English). If they mix both, prefer Arabic.';
}

// ------------------------------------------------------------------
// You shouldn't need to change anything below this line.
// ------------------------------------------------------------------

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

if (!$ANTHROPIC_API_KEY || $ANTHROPIC_API_KEY === 'PASTE-YOUR-ANTHROPIC-API-KEY-HERE') {
    http_response_code(200);
    echo json_encode(['error' => 'not_configured']);
    exit;
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);
$message = isset($payload['message']) ? trim((string) $payload['message']) : '';
$history = isset($payload['history']) && is_array($payload['history']) ? $payload['history'] : [];
$lang = isset($payload['lang']) && in_array($payload['lang'], ['ar', 'en'], true) ? $payload['lang'] : '';

if ($message === '') {
    http_response_code(400);
    echo json_encode(['error' => 'empty_message']);
    exit;
}

$SYSTEM_PROMPT = str_replace('{LANGUAGE_INSTRUCTION}', masar_language_instruction($lang), $SYSTEM_PROMPT_BASE);

// Build the message list: prior turns + the new user message.
$messages = [];
foreach ($history as $turn) {
    if (!isset($turn['role'], $turn['content'])) continue;
    if (!in_array($turn['role'], ['user', 'assistant'], true)) continue;
    $messages[] = ['role' => $turn['role'], 'content' => (string) $turn['content']];
}
$messages[] = ['role' => 'user', 'content' => $message];

// Keep only the last ~20 turns to bound request size/cost.
if (count($messages) > 20) {
    $messages = array_slice($messages, -20);
}

$body = json_encode([
    'model' => 'claude-sonnet-4-6',
    'max_tokens' => 500,
    'system' => $SYSTEM_PROMPT,
    'messages' => $messages,
]);

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $body,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-api-key: ' . $ANTHROPIC_API_KEY,
        'anthropic-version: 2023-06-01',
    ],
    CURLOPT_TIMEOUT => 30,
]);
$response = curl_exec($ch);
$curlErr = curl_error($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($curlErr || $status >= 400) {
    http_response_code(200);
    echo json_encode(['error' => 'upstream_error']);
    exit;
}

$data = json_decode($response, true);
$reply = '';
if (!empty($data['content']) && is_array($data['content'])) {
    foreach ($data['content'] as $block) {
        if (($block['type'] ?? '') === 'text') {
            $reply .= $block['text'];
        }
    }
}

if ($reply === '') {
    echo json_encode(['error' => 'empty_reply']);
    exit;
}

echo json_encode(['reply' => $reply]);
