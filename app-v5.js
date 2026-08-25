import { CreateWebWorkerMLCEngine } from 'https://esm.run/@mlc-ai/web-llm@0.2.82';

const MODEL_F16 = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
const MODEL_F32 = 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC';
const STORAGE_KEY = 'sniff_local_state_v5';

const chat = document.getElementById('chat');
const opening = document.getElementById('opening');
const messagesEl = document.getElementById('messages');
const typing = document.getElementById('typing');
const form = document.getElementById('composer');
const input = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const aiCard = document.getElementById('aiCard');
const aiState = document.getElementById('aiState');
const loadAiButton = document.getElementById('loadAiButton');
const progressWrap = document.getElementById('progressWrap');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const loadError = document.getElementById('loadError');
const clearConversationButton = document.getElementById('clearConversation');
const clearDeviceDataButton = document.getElementById('clearDeviceData');
const statusText = document.getElementById('statusText');
const statusDot = document.getElementById('statusDot');

let engine = null;
let ready = false;
let generating = false;
let conversation = [];
let loadStartedAt = 0;
let lastProgress = 0;
let loadClock = null;

const pick = (items) => items[Math.floor(Math.random() * items.length)];

function safeReadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch (_) { return {}; }
}

const saved = safeReadState();
const state = {
  visits: Number(saved.visits || 0) + 1,
  totalTurns: Number(saved.totalTurns || 0),
  distance: '',
  timeBand: '',
  season: '',
  activity: '',
  mood: '',
  socialEnergy: '',
  wanderlust: ''
};

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      visits: state.visits,
      totalTurns: state.totalTurns,
      lastSeen: new Date().toISOString()
    }));
  } catch (_) {}
}

function deriveWorld() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMonth();
  state.timeBand = h < 5 ? '深夜' : h < 8 ? '明け方' : h < 12 ? '朝' : h < 17 ? '昼' : h < 21 ? '夕方' : '夜';
  state.season = [11,0,1].includes(m) ? '冬' : [2,3,4].includes(m) ? '春' : [5,6,7].includes(m) ? '夏' : '秋';
  state.distance = state.visits <= 1 ? '初対面' : state.visits <= 3 ? '顔見知り' : state.visits <= 7 ? 'よく来る相手' : 'かなり親しい相手';
  const activities = {
    '深夜':['火が消えないように見ている','眠る前に川を眺めている'],
    '明け方':['火を起こしている','湯を沸かしている','朝の川を見ている'],
    '朝':['釣り糸を垂らしている','パンをかじっている','テントのまわりを片づけている'],
    '昼':['川辺を歩いてきた','木陰で休んでいる','釣りをしている'],
    '夕方':['夕暮れを見ている','釣り道具をしまっている','焚き火を始めたところだ'],
    '夜':['星を見ている','火を小さくしている','ハーモニカをしまったところだ']
  };
  state.activity = pick(activities[state.timeBand]);
  state.mood = pick(['穏やか','少し機嫌がいい','少し退屈','静かにしていたい','少しいたずらっぽい']);
  state.socialEnergy = pick(['低め','普通','少し高め']);
  state.wanderlust = state.season === '秋' ? 'かなり高い' : pick(['普通','少し高い']);
  statusText.textContent = `${state.timeBand}。${state.activity}`;
}

deriveWorld();
saveState();

function scrollBottom() {
  requestAnimationFrame(() => { chat.scrollTop = chat.scrollHeight; });
}

function makeMessage(text, who, parent = messagesEl) {
  const div = document.createElement('div');
  div.className = `message ${who}`;
  div.textContent = text;
  parent.appendChild(div);
  scrollBottom();
  return div;
}

function greeting() {
  if (state.distance === '初対面') return pick(['……こんにちは。','やあ。そこ、座る？','こんにちは。']);
  if (state.distance === '顔見知り') return pick(['また来たんだね。','やあ。また会ったね。','来たんだ。']);
  if (state.distance === 'よく来る相手') return pick(['君、最近よくここに来るね。','また来たの？　まあ、いいけど。','やあ。そこ、空いてるよ。']);
  return pick(['来たんだ。そこ、空いてるよ。','やあ。君なら来る気がしてた。','また来たね。']);
}

function startConversation() {
  opening.textContent = '';
  messagesEl.textContent = '';
  conversation = [];
  const first = greeting();
  const second = pick([
    `今は${state.activity}。`,
    state.socialEnergy === '低め' ? '今日はあまり喋る気分じゃないけど、君ならまあいいよ。' : '何か話す？',
    state.mood === '少しいたずらっぽい' ? '今日は少し退屈してたところ。' : '今日はそんなに悪くない。'
  ]);
  makeMessage(first, 'bot', opening);
  makeMessage(second, 'bot', opening);
  conversation.push({role:'assistant',content:first},{role:'assistant',content:second});
}

function systemPrompt() {
  if (typeof window.buildSnufkinPersona === 'function') return window.buildSnufkinPersona(state);
  return `非公式ファンメイドのスナフキンとして自然な日本語で短く話す。質問にまず答え、毎回答えを人生訓にしない。現在は${state.season}の${state.timeBand}で、${state.activity}。`;
}

function beginLoadClock() {
  loadStartedAt = Date.now();
  clearInterval(loadClock);
  loadClock = setInterval(() => {
    if (ready) { clearInterval(loadClock); return; }
    const sec = Math.floor((Date.now() - loadStartedAt) / 1000);
    const pct = Math.round(lastProgress * 100);
    progressText.textContent = pct > 0
      ? `モデル準備中… ${pct}%（${sec}秒）`
      : `モデル準備中… ${sec}秒経過`;
  }, 1000);
}

function finishLoadClock() {
  clearInterval(loadClock);
  loadClock = null;
}

async function chooseModel() {
  if (!('gpu' in navigator)) throw new Error('WebGPUが使えません。iPhoneでは新しいSafariで開いてください。');
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('GPUを取得できませんでした。');
  return adapter.features?.has('shader-f16') ? MODEL_F16 : MODEL_F32;
}

async function loadLocalAI() {
  if (ready || engine) return;
  loadError.hidden = true;
  loadAiButton.disabled = true;
  loadAiButton.textContent = '読み込み中…';
  progressWrap.hidden = false;
  progressBar.style.width = '2%';
  progressText.textContent = 'WebGPUを確認しています…';
  aiState.textContent = 'ローカルAI：準備中';
  lastProgress = 0;
  beginLoadClock();

  try {
    const model = await chooseModel();
    const worker = new Worker('./webllm-worker.js', { type: 'module' });
    engine = await CreateWebWorkerMLCEngine(worker, model, {
      initProgressCallback: (report) => {
        const p = typeof report.progress === 'number' ? Math.max(0, Math.min(1, report.progress)) : 0;
        lastProgress = Math.max(lastProgress, p);
        const percent = Math.max(2, Math.round(lastProgress * 100));
        progressBar.style.width = `${percent}%`;
        const detail = report.text ? String(report.text).replace(/\s+/g,' ').slice(0,90) : '';
        progressText.textContent = detail ? `${percent}% — ${detail}` : `${percent}% — モデル準備中`;
      }
    });
    finishLoadClock();
    ready = true;
    aiState.textContent = '端末内AI：準備完了';
    statusDot.classList.add('ready');
    aiCard.classList.add('compact');
    loadAiButton.hidden = true;
    progressWrap.hidden = true;
    input.disabled = false;
    sendButton.disabled = false;
    input.placeholder = '話しかける…';
    startConversation();
  } catch (error) {
    console.error(error);
    finishLoadClock();
    engine = null;
    loadAiButton.disabled = false;
    loadAiButton.textContent = 'もう一度読み込む';
    progressWrap.hidden = true;
    loadError.hidden = false;
    loadError.textContent = `読み込みに失敗しました。${error?.message ? `（${String(error.message).slice(0,160)}）` : ''}`;
    aiState.textContent = 'ローカルAI：読み込み失敗';
  }
}

function normalizeReply(text) {
  let v = String(text || '').replace(/<\|[^>]+\|>/g,'').replace(/^(スナフキン|assistant|アシスタント)\s*[:：]\s*/i,'').trim();
  if (!v) v = '……もう一度言ってくれる？';
  if (v.length > 240) v = v.slice(0,240).replace(/[^。！？]*$/,'') || v.slice(0,240);
  return v;
}

async function generateReply() {
  const bubble = makeMessage('', 'bot');
  bubble.classList.add('streaming');
  let out = '';
  try {
    const stream = await engine.chat.completions.create({
      messages: [{role:'system',content:systemPrompt()}, ...conversation.slice(-10)],
      temperature: 0.72,
      top_p: 0.86,
      max_tokens: 90,
      repetition_penalty: 1.1,
      stream: true
    });
    for await (const chunk of stream) {
      out += chunk.choices?.[0]?.delta?.content || '';
      bubble.textContent = out;
      scrollBottom();
    }
    out = normalizeReply(out);
    bubble.textContent = out;
    bubble.classList.remove('streaming');
    conversation.push({role:'assistant',content:out});
    conversation = conversation.slice(-12);
    state.totalTurns += 1;
    saveState();
  } catch (error) {
    console.error(error);
    bubble.classList.remove('streaming');
    bubble.textContent = '……今ちょっとうまく言葉が出ない。もう一度言って。';
  }
}

async function submitMessage(raw) {
  const text = String(raw || '').trim();
  if (!ready || !engine || generating || !text) return;
  generating = true;
  input.value = '';
  input.disabled = true;
  sendButton.disabled = true;
  makeMessage(text,'user');
  conversation.push({role:'user',content:text});
  conversation = conversation.slice(-12);
  typing.hidden = false;
  try { await generateReply(); }
  finally {
    typing.hidden = true;
    generating = false;
    input.disabled = false;
    sendButton.disabled = false;
    input.focus();
    scrollBottom();
  }
}

loadAiButton.addEventListener('click', loadLocalAI);
form.addEventListener('submit', (e) => { e.preventDefault(); submitMessage(input.value); });
clearConversationButton.addEventListener('click', () => { if (!generating && ready) startConversation(); });
clearDeviceDataButton.addEventListener('click', () => {
  if (generating) return;
  if (!confirm('来訪回数など、この端末に保存した状態を消しますか？ 会話本文は保存していません。')) return;
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  state.visits = 1;
  state.totalTurns = 0;
  state.distance = '初対面';
  if (ready) startConversation();
});
input.addEventListener('focus', () => setTimeout(scrollBottom,250));
scrollBottom();
