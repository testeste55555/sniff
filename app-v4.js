(() => {
  'use strict';

  const WEBLLM_URL = 'https://esm.run/@mlc-ai/web-llm@0.2.84';
  const MODEL_F16 = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
  const MODEL_F32 = 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC';
  const STORAGE_KEY = 'sniff_local_state_v4';

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
  let selectedModel = null;
  let conversation = [];

  const pick = (items) => items[Math.floor(Math.random() * items.length)];

  function safeLoadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (_) {
      return {};
    }
  }

  const saved = safeLoadState();
  const state = {
    visits: Number(saved.visits || 0) + 1,
    lastSeen: saved.lastSeen || null,
    totalTurns: Number(saved.totalTurns || 0),
    distance: 'new',
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
        lastSeen: new Date().toISOString(),
        totalTurns: state.totalTurns
      }));
    } catch (_) {}
  }

  function deriveWorld() {
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth();

    state.timeBand = hour < 5 ? '深夜' : hour < 8 ? '明け方' : hour < 12 ? '朝' : hour < 17 ? '昼' : hour < 21 ? '夕方' : '夜';
    state.season = [11, 0, 1].includes(month) ? '冬' : [2, 3, 4].includes(month) ? '春' : [5, 6, 7].includes(month) ? '夏' : '秋';
    state.distance = state.visits <= 1 ? '初対面' : state.visits <= 3 ? '顔見知り' : state.visits <= 7 ? 'よく来る相手' : 'かなり親しい相手';

    const activities = {
      '深夜': ['火が消えないように見ている', '眠る前に川を眺めている'],
      '明け方': ['火を起こしている', '湯を沸かしている', '朝の川を見ている'],
      '朝': ['釣り糸を垂らしている', 'パンをかじっている', 'テントのまわりを片づけている'],
      '昼': ['川辺を歩いてきた', '木陰で休んでいる', '釣りをしている'],
      '夕方': ['夕暮れを見ている', '釣り道具をしまっている', '焚き火を始めたところだ'],
      '夜': ['星を見ている', '火を小さくしている', 'ハーモニカをしまったところだ']
    };

    state.activity = pick(activities[state.timeBand]);
    state.mood = pick(['穏やか', '少し機嫌がいい', '少し退屈', '静かにしていたい', '少しいたずらっぽい']);
    state.socialEnergy = pick(['低め', '普通', '少し高め']);
    state.wanderlust = state.season === '秋' ? 'かなり高い' : state.season === '春' ? '低め' : pick(['普通', '少し高い']);
    statusText.textContent = `${state.timeBand}。${state.activity}`;
  }

  deriveWorld();
  saveState();

  function scrollBottom() {
    requestAnimationFrame(() => {
      chat.scrollTop = chat.scrollHeight;
    });
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
    if (state.distance === '初対面') return pick(['……こんにちは。', 'やあ。そこ、座る？', 'こんにちは。']);
    if (state.distance === '顔見知り') return pick(['また来たんだね。', 'やあ。また会ったね。', '来たんだ。']);
    if (state.distance === 'よく来る相手') return pick(['君、最近よくここに来るね。', 'また来たの？　まあ、いいけど。', 'やあ。そこ、空いてるよ。']);
    return pick(['来たんだ。そこ、空いてるよ。', 'やあ。君なら来る気がしてた。', 'また来たね。']);
  }

  function startConversation() {
    opening.textContent = '';
    messagesEl.textContent = '';
    conversation = [];
    const first = greeting();
    const second = pick([
      `今は${state.activity}。`,
      state.socialEnergy === '低め' ? '今日はあまり喋る気分じゃないけど、君ならまあいいよ。' : '何か話す？',
      state.mood === '少しいたずらっぽい' ? '今日は退屈してたところ。面白い話なら歓迎するよ。' : '今日はそんなに悪くない。'
    ]);
    makeMessage(first, 'bot', opening);
    makeMessage(second, 'bot', opening);
    conversation.push({ role: 'assistant', content: first });
    conversation.push({ role: 'assistant', content: second });
  }

  function buildSystemPrompt() {
    if (typeof window.buildSnufkinPersona === 'function') {
      return window.buildSnufkinPersona(state);
    }
    return `非公式ファンメイドのスナフキンとして自然な日本語で短く話す。質問にまず答え、毎回人生訓にしない。現在は${state.season}の${state.timeBand}で、${state.activity}。`;
  }

  function setReadyUI() {
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
    input.focus();
  }

  function setLoadError(message) {
    ready = false;
    loadAiButton.disabled = false;
    loadAiButton.textContent = 'もう一度読み込む';
    progressWrap.hidden = true;
    loadError.hidden = false;
    loadError.textContent = message;
    aiState.textContent = 'ローカルAI：読み込み失敗';
  }

  async function chooseModel() {
    if (!('gpu' in navigator)) {
      throw new Error('このブラウザではWebGPUを確認できません。iPhoneでは新しいSafariで開いてください。');
    }
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('WebGPUのGPUアダプタを取得できませんでした。');
    return adapter.features && adapter.features.has('shader-f16') ? MODEL_F16 : MODEL_F32;
  }

  async function loadLocalAI() {
    if (ready || engine) return;
    loadError.hidden = true;
    loadAiButton.disabled = true;
    loadAiButton.textContent = '読み込み中…';
    progressWrap.hidden = false;
    progressBar.style.width = '2%';
    progressText.textContent = 'ブラウザのAI機能を確認しています…';
    aiState.textContent = 'ローカルAI：準備中';

    try {
      selectedModel = await chooseModel();
      progressText.textContent = 'WebLLMを読み込んでいます…';

      const webllm = await import(WEBLLM_URL);
      const exists = webllm.prebuiltAppConfig?.model_list?.some((item) => item.model_id === selectedModel);
      if (!exists) throw new Error('指定した軽量モデルがWebLLMの一覧にありません。');

      engine = await webllm.CreateMLCEngine(selectedModel, {
        initProgressCallback: (report) => {
          const p = typeof report.progress === 'number' ? Math.max(0, Math.min(1, report.progress)) : null;
          if (p !== null) {
            const percent = Math.max(2, Math.round(p * 100));
            progressBar.style.width = `${percent}%`;
            progressText.textContent = `ローカルAIを準備しています… ${percent}%`;
          } else {
            progressText.textContent = 'ローカルAIを準備しています…';
          }
        }
      });

      progressBar.style.width = '100%';
      progressText.textContent = '準備完了';
      setReadyUI();
    } catch (error) {
      console.error(error);
      engine = null;
      const detail = error && error.message ? `（${String(error.message).slice(0, 160)}）` : '';
      setLoadError(`読み込みに失敗しました。Wi‑Fi、空き容量、新しいSafariを確認して再試行してください。${detail}`);
    }
  }

  function normalizeReply(text) {
    let value = String(text || '')
      .replace(/<\|[^>]+\|>/g, '')
      .replace(/^(スナフキン|assistant|アシスタント)\s*[:：]\s*/i, '')
      .replace(/\n(?:ユーザー|User)\s*[:：].*$/s, '')
      .trim();
    if (!value) value = '……うまく言えないな。もう一度言ってくれる？';
    if (value.length > 260) value = value.slice(0, 260).replace(/[^。！？]*$/, '') || value.slice(0, 260);
    return value;
  }

  function currentModelMessages() {
    return [
      { role: 'system', content: buildSystemPrompt() },
      ...conversation.slice(-12)
    ];
  }

  async function generateReply() {
    const bubble = makeMessage('', 'bot');
    bubble.classList.add('streaming');
    typing.hidden = true;
    let result = '';

    try {
      const chunks = await engine.chat.completions.create({
        messages: currentModelMessages(),
        temperature: 0.76,
        top_p: 0.86,
        max_tokens: 100,
        repetition_penalty: 1.1,
        stop: ['\nユーザー:', '\nUser:'],
        stream: true
      });

      for await (const chunk of chunks) {
        result += chunk.choices?.[0]?.delta?.content || '';
        bubble.textContent = result;
        scrollBottom();
      }

      result = normalizeReply(result);
      bubble.textContent = result;
      bubble.classList.remove('streaming');
      conversation.push({ role: 'assistant', content: result });
      conversation = conversation.slice(-14);
      state.totalTurns += 1;
      saveState();
    } catch (error) {
      console.error(error);
      bubble.classList.remove('streaming');
      bubble.textContent = '……ちょっと待って。今、うまく言葉が出てこない。もう一度話してくれる？';
    }
  }

  async function submitMessage(raw) {
    const text = String(raw || '').trim();
    if (!ready || !engine || generating || !text) return;

    generating = true;
    input.value = '';
    input.disabled = true;
    sendButton.disabled = true;
    makeMessage(text, 'user');
    conversation.push({ role: 'user', content: text });
    conversation = conversation.slice(-14);
    typing.hidden = false;
    scrollBottom();

    try {
      await generateReply();
    } finally {
      typing.hidden = true;
      generating = false;
      input.disabled = false;
      sendButton.disabled = false;
      input.focus();
      scrollBottom();
    }
  }

  loadAiButton.addEventListener('click', loadLocalAI);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitMessage(input.value);
  });

  input.addEventListener('focus', () => setTimeout(scrollBottom, 250));

  clearConversationButton.addEventListener('click', () => {
    if (generating) return;
    if (ready) startConversation();
    else {
      opening.textContent = '';
      messagesEl.textContent = '';
      conversation = [];
    }
  });

  clearDeviceDataButton.addEventListener('click', () => {
    if (generating) return;
    if (!window.confirm('この端末に保存した来訪回数などを消しますか？ 会話本文はもともと保存していません。')) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    state.visits = 1;
    state.totalTurns = 0;
    state.distance = '初対面';
    if (ready) startConversation();
    aiState.textContent = ready ? '端末内AI：準備完了 / 来訪記録なし' : '来訪記録を削除しました';
  });

  scrollBottom();
})();
