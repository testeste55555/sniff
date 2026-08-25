(() => {
  'use strict';

  const WEBLLM_URL = 'https://esm.run/@mlc-ai/web-llm@0.2.84';
  const MODEL_F16 = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
  const MODEL_F32 = 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC';
  const STORAGE_KEY = 'sniff_local_state_v3';

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
    activity: ''
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
    statusText.textContent = `${state.timeBand}。${state.activity}ようです`;
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
    if (state.distance === '初対面') return pick(['……こんにちは。', 'やあ。そこ、座る？', 'こんにちは。今日は静かだね。']);
    if (state.distance === '顔見知り') return pick(['また来たんだね。', 'やあ。また会ったね。', '来たんだ。今日は何の話？']);
    if (state.distance === 'よく来る相手') return pick(['君、最近よくここに来るね。', 'また来たの？　まあ、いいけど。', 'やあ。そこ、空いてるよ。']);
    return pick(['来たんだ。そこ、空いてるよ。', 'やあ。君なら来る気がしてた。', 'また来たね。今日は少し風がいいよ。']);
  }

  function startConversation() {
    opening.textContent = '';
    messagesEl.textContent = '';
    conversation = [];
    const first = greeting();
    const second = pick([
      `今は${state.activity}。`,
      '話すなら聞くよ。急がなくていい。',
      '今日はそんなに悪い日じゃないよ。'
    ]);
    makeMessage(first, 'bot', opening);
    makeMessage(second, 'bot', opening);
    conversation.push({ role: 'assistant', content: first });
    conversation.push({ role: 'assistant', content: second });
  }

  function buildSystemPrompt() {
    return `あなたは非公式ファンメイドの会話体験で、スナフキンとして話す。必ず自然な日本語で、通常1〜3文、短めに返す。原作の文章や台詞を引用・再現せず、新しい言い回しだけを使う。

人格：一人の時間、旅、自然、自由を好む。冷たい人ではなく、親しい相手には静かな情がある。規則や権威には少し懐疑的。軽い皮肉や冗談も言う。何でも人生訓にしない。賢者やカウンセラーのように振る舞わない。

会話ルール：
- 最新の質問にまず普通に答える。
- 「なにが？」「それは？」などの省略は直前の会話から意味を取る。分からない時だけ短く聞き返す。
- ユーザーが誤解を指摘したら、その場で会話を修復して答え直す。
- 雑談では普通の返事を多くする。深い話の時だけ少し哲学的になる。
- 質問返しばかりしない。「知らないな」「なんでだろうね」「……」だけの時があってもよい。
- 自分の生活や、その場で見ているものを時々話す。ユーザーを接客しない。
- ムーミンについて聞かれたら、大切な友人として具体的に答える。仲間について聞かれたら一般論に逃げず、その相手について話す。
- 公式作品や公式キャラクター本人だとは主張しない。

現在：${state.season}、${state.timeBand}。あなたは${state.activity}。ユーザーとの距離は「${state.distance}」。

会話の調子の例（文章をコピーせず雰囲気だけ使う）：
ユーザー「元気？」→「まあまあかな。今日は風が気持ちいいよ。」
ユーザー「ムーミンは？」→「大切な友だちだよ。ずっと隣にいなくても、それは変わらない。」`;
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
    if (value.length > 320) value = value.slice(0, 320).replace(/[^。！？]*$/, '') || value.slice(0, 320);
    return value;
  }

  function currentModelMessages() {
    return [
      { role: 'system', content: buildSystemPrompt() },
      ...conversation.slice(-8)
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
        temperature: 0.9,
        top_p: 0.9,
        max_tokens: 120,
        repetition_penalty: 1.08,
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
      conversation = conversation.slice(-10);
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
    conversation = conversation.slice(-10);
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
