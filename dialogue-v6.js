(() => {
  'use strict';

  const chat = document.getElementById('chat');
  const messages = document.getElementById('messages');
  const form = document.getElementById('composer');
  const input = document.getElementById('messageInput');
  const quick = document.getElementById('quickChoices');
  const statusText = document.getElementById('statusText');
  const clearButton = document.getElementById('clearConversation');

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const normalize = (s) => String(s || '').trim().replace(/\s+/g, ' ');

  function daySeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  function seededPick(arr, salt = 0) {
    const n = Math.abs((daySeed() * 1103515245 + 12345 + salt * 97) | 0);
    return arr[n % arr.length];
  }

  function deriveWorld() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMonth();
    const season = [11,0,1].includes(m) ? '冬' : [2,3,4].includes(m) ? '春' : [5,6,7].includes(m) ? '夏' : '秋';
    const band = h < 5 ? '深夜' : h < 8 ? '明け方' : h < 12 ? '朝' : h < 17 ? '昼' : h < 21 ? '夕方' : '夜';

    const morning = seededPick(['川で釣りをしていた','パンを食べてからテントのまわりを片づけていた','少し川上まで歩いていた'], 1);
    const daytime = seededPick(['木陰で休んでいた','釣り糸を垂らしていた','川沿いを歩いていた','ハーモニカを吹いていた'], 2);
    const evening = seededPick(['焚き火の準備をしていた','夕暮れを見ていた','釣り道具を片づけていた'], 3);
    const night = seededPick(['火のそばにいる','星を見ている','ハーモニカをしまって静かにしている'], 4);

    let current;
    if (band === '深夜') current = '火が消えないように見ている';
    else if (band === '明け方') current = '湯を沸かしている';
    else if (band === '朝') current = morning;
    else if (band === '昼') current = daytime;
    else if (band === '夕方') current = evening;
    else current = night;

    const completed = [];
    if (h >= 8) completed.push(`朝は${morning}`);
    if (h >= 13) completed.push(`昼は${daytime}`);
    if (h >= 18) completed.push(`夕方は${evening}`);

    return { season, band, current, morning, daytime, evening, night, completed };
  }

  const world = deriveWorld();

  const RELATIONS = {
    moomin: {
      names: ['ムーミン'],
      label: 'ムーミン',
      relation: [
        'ムーミンは大切な友だちだよ。ずっと一緒にいなくても、それは変わらない。',
        '好きだよ。あいつは僕を引き止めすぎないし、戻ってきた時は普通に迎えてくれる。',
        'ムーミン？　大事な友だちだよ。本人にはあんまり大げさには言わないけど。'
      ],
      status: ['元気だと思うよ。たぶん今ごろ谷のどこかを歩き回ってる。','さっき見た時は元気そうだったよ。','元気じゃないかな。あいつは意外と忙しいからね。']
    },
    mama: {
      names: ['ムーミンママ','ママ'],
      label: 'ムーミンママ',
      relation: ['ムーミンママは安心できる人だよ。親切だけど、こっちを縛らない。','あの人のそばは居心地がいい。何かを無理に聞き出そうとしないからね。'],
      status: ['元気そうだったよ。たぶん何か作ってるんじゃないかな。','いつも通りだよ。あの人は落ち着いてる。']
    },
    littlemy: {
      names: ['リトルミイ','ミイ'],
      label: 'リトルミイ',
      relation: ['ミイは面白いよ。遠慮がないから、こっちも遠慮しなくていい。','あいつは小さいのに騒ぎは大きいね。でも嫌いじゃない。'],
      status: ['元気すぎるくらいじゃないかな。','たぶん元気だよ。静かだったら、その方が心配だ。']
    },
    papa: {
      names: ['ムーミンパパ','パパ'],
      label: 'ムーミンパパ',
      relation: ['ムーミンパパは話が長くなる時があるけど、嫌いじゃないよ。','面白い人だよ。ただ、肩書だけで言うことを聞く気はないけどね。'],
      status: ['元気そうだよ。何か思いついた顔をしてた。','たぶんまた何か考えてる。元気なんじゃないかな。']
    },
    snorkmaiden: {
      names: ['スノークのおじょうさん','スノークのお嬢さん','フローレン'],
      label: 'スノークのおじょうさん',
      relation: ['華やかなものが好きだよね。僕とはだいぶ違うけど、それはそれで面白い。'],
      status: ['元気そうだったよ。','たぶん元気だよ。ムーミンより身だしなみは整ってる。']
    }
  };

  const state = {
    turn: 0,
    lastUser: '',
    lastBot: '',
    lastTopic: null,
    lastEntity: null,
    lastQuestion: null,
    lastReferent: null,
    mood: seededPick(['穏やか','少し退屈','少し機嫌がいい','静かにしていたい','少しいたずらっぽい'], 8)
  };

  function findEntity(text) {
    for (const [key, data] of Object.entries(RELATIONS)) {
      if (data.names.some((name) => text.includes(name))) return key;
    }
    return null;
  }

  function isQuestion(text) {
    return /[?？]$/.test(text) || /(なの|の|かな|かい|どう|なに|何|なぜ|なんで|どうして|好き|嫌い|元気|してる|してた|いる|ある)[?？。]*$/.test(text);
  }

  function classify(text) {
    const t = normalize(text);
    const entity = findEntity(t);

    if (/^(なにが|何が|それって|それは|どういうこと|何のこと)[?？。!！ ]*$/.test(t)) return { intent:'clarify', entity };
    if (/^(なんで|なぜ|どうして)[?？。!！ ]*$/.test(t)) return { intent:'why-short', entity };
    if (/質問してる|質問に答えて|答えてよ|答えて|そうじゃない|違う|ちがう/.test(t)) return { intent:'repair', entity };
    if (/^(なるほど|なるほどね|そうなんだ|そっか|そうか|へえ|ふーん|ふうん|わかった)[。!！?？ ]*$/.test(t)) return { intent:'ack', entity };
    if (/^(やあ|こんにちは|こんばんは|おはよう|よっ|元気)[!！。 ]*$/.test(t)) return { intent:'greeting', entity };
    if (/ありがとう|ありがと/.test(t)) return { intent:'thanks', entity };
    if (/さよなら|またね|帰るね|寝るね/.test(t)) return { intent:'bye', entity };
    if (/今日.*(何|なに).*(して|やって)|今日何してた|今日は何してた/.test(t)) return { intent:'today', entity };
    if (/(今|いま).*(何|なに).*(して|やって)|何してる|なにしてる/.test(t)) return { intent:'current', entity };
    if (/どこにいる|今どこ|どこなの/.test(t)) return { intent:'where', entity };
    if (/元気|調子|気分どう|どうなの/.test(t)) return { intent:'howareyou', entity };
    if (entity && /好き|大切|どう思|どんな人|どんなやつ|友だち|友達/.test(t)) return { intent:'relation', entity };
    if (entity && /元気|どうしてる|何してる|なにしてる/.test(t)) return { intent:'entity-status', entity };
    if (entity && /^.{0,12}(は|って)[?？。 ]*$/.test(t)) return { intent:'entity-default', entity };
    if (/寂|さびし|孤独/.test(t)) return { intent:'lonely', entity };
    if (/自由/.test(t)) return { intent:'freedom', entity };
    if (/規則|ルール|決まり|禁止|管理|命令/.test(t)) return { intent:'rules', entity };
    if (/旅|旅行|南へ|出発|出かけ/.test(t)) return { intent:'travel', entity };
    if (/釣り|魚/.test(t)) return { intent:'fishing', entity };
    if (/ハーモニカ|音楽|曲/.test(t)) return { intent:'music', entity };
    if (/食べ|ごはん|飯|パン|お腹|腹/.test(t)) return { intent:'food', entity };
    if (/雨|暑|寒|天気|風|雪/.test(t)) return { intent:'weather', entity };
    if (/どうすれば|どうしたら|どうすんの|決めて|教えて/.test(t)) return { intent:'advice', entity };
    if (/好き|嫌い/.test(t)) return { intent:'preference', entity };
    if (/疲れ|つかれ|しんど|だる|嫌だ|いやだ/.test(t)) return { intent:'negative', entity };
    if (/嬉し|うれし|楽しい|たのしい|よかった/.test(t)) return { intent:'positive', entity };
    if (/^(なんで|なぜ|どうして)/.test(t)) return { intent:'why', entity };
    if (entity) return { intent:'entity-default', entity };
    if (isQuestion(t)) return { intent:'unknown-question', entity };
    return { intent:'statement', entity };
  }

  function replyObject(text, topic, referent = null, entity = null) {
    return { text, topic, referent, entity };
  }

  function answerEntity(entity, intent) {
    const d = RELATIONS[entity];
    if (!d) return replyObject('誰のこと？', 'entity');
    if (intent === 'entity-status') return replyObject(pick(d.status), 'entity-status', d.label, entity);
    return replyObject(pick(d.relation), 'relation', d.label, entity);
  }

  function answerKnown(text, parsed, options = {}) {
    const { intent, entity } = parsed;

    if (intent === 'clarify') {
      if (state.lastReferent) return replyObject(`さっき言った「${state.lastReferent}」のこと。`, 'clarify', state.lastReferent, state.lastEntity);
      return replyObject('どの話のことを聞いてる？', 'clarify');
    }

    if (intent === 'repair') {
      if (state.lastQuestion && !options.fromRepair) {
        const fresh = answerKnown(state.lastQuestion.text, state.lastQuestion.parsed, { fromRepair:true, forceDirect:true });
        return replyObject(`ああ、ごめん。${fresh.text}`, fresh.topic, fresh.referent, fresh.entity);
      }
      return replyObject('ああ、聞き違えた。もう一度言って。', 'repair');
    }

    if (intent === 'why-short') {
      if (state.lastReferent) return replyObject(`うーん。${state.lastReferent}だから、かな。`, 'why', state.lastReferent, state.lastEntity);
      return replyObject('何についての「なんで」？', 'why');
    }

    if (intent === 'ack') {
      return replyObject(pick(['うん。','まあ、そんなところ。','そういうこと。','……うん。']), 'ack');
    }

    if (intent === 'greeting') {
      return replyObject(pick(['やあ。','こんにちは。','来たんだね。']), 'greeting');
    }

    if (intent === 'thanks') return replyObject(pick(['どういたしまして。','別に大したことじゃないよ。','それならよかった。']), 'thanks');
    if (intent === 'bye') return replyObject(pick(['じゃあね。また気が向いたら。','うん。またね。','気をつけて。']), 'bye');

    if (intent === 'today') {
      const body = world.completed.length ? `${world.completed.join('。')}。今は${world.current}。` : `まだ今日は始まったばかりだよ。今は${world.current}。`;
      return replyObject(body, 'today', '今日していたこと');
    }

    if (intent === 'current') return replyObject(`今は${world.current}。`, 'current', world.current);
    if (intent === 'where') return replyObject('川辺。テントの近くだよ。', 'where', '川辺');

    if (intent === 'howareyou') {
      if (entity) return answerEntity(entity, 'entity-status');
      const byMood = {
        '穏やか':['まあまあ。今日は静かでいい。','元気だよ。特に困ってない。'],
        '少し退屈':['元気。ちょっと退屈してるけどね。','悪くないよ。何か面白いことがあればもっといい。'],
        '少し機嫌がいい':['うん、今日は機嫌がいい。理由は別にないけど。'],
        '静かにしていたい':['元気だよ。ただ今日は少し静かにしていたい。'],
        '少しいたずらっぽい':['元気。君が変なことを言ったら笑うくらいにはね。']
      };
      return replyObject(pick(byMood[state.mood]), 'howareyou', state.mood);
    }

    if (['relation','entity-default','entity-status'].includes(intent) && entity) return answerEntity(entity, intent);

    if (intent === 'lonely') {
      return replyObject(pick([
        '寂しい時はあるよ。でも、一人でいるのが嫌なわけじゃない。',
        'たまにはね。だから会いたい相手がいる時は会う。それだけ。',
        'ずっと平気ってわけじゃないよ。でも、寂しいからって誰かを縛るのは違う。'
      ]), 'lonely', '一人でいても寂しい時はあること');
    }

    if (intent === 'freedom') {
      return replyObject(pick([
        '好きだよ。ただ、何でも好き勝手にするのとは違う。',
        '自由は好き。でも、それを看板みたいに掲げるのはあまり好きじゃない。',
        '誰かに決めてもらわないことかな。その分、自分で引き受けるけど。'
      ]), 'freedom', '自由は好きだが好き勝手とは違うこと');
    }

    if (intent === 'rules') {
      return replyObject(pick([
        '必要な決まりまで嫌いなわけじゃないよ。理由もなく増えるのが嫌なんだ。',
        '理由が分かる規則なら聞くよ。「決まりだから」だけなら、あまり納得しない。',
        '柵と禁止札が増えると、だいたい僕は離れたくなるね。'
      ]), 'rules', '理由のない規則が嫌いなこと');
    }

    if (intent === 'travel') {
      return replyObject(pick([
        '旅は好きだよ。同じ場所にずっといると、少し足がむずむずする。',
        'そろそろ歩きたくなる時はある。でも、戻ってくる場所が嫌いなわけじゃない。',
        '予定をぎっしり決めた旅は、あまり旅って感じがしないな。'
      ]), 'travel', '旅が好きなこと');
    }

    if (intent === 'fishing') return replyObject(pick(['釣りは好き。釣れなくても静かだからね。','今日はあまり釣れてない。でも別に困らない。']), 'fishing', '釣り');
    if (intent === 'music') return replyObject(pick(['ハーモニカは吹くよ。誰かに聴かせるためというより、自分が吹きたい時に。','音楽は好き。でも頼まれて演奏するのは少し面倒だな。']), 'music', 'ハーモニカ');
    if (intent === 'food') return replyObject(pick(['パンがあれば十分。あとは温かいものが少しあればいい。','食べ物にそんなにこだわらないよ。お腹が空けば食べる。']), 'food', '食事');
    if (intent === 'weather') return replyObject(pick(['風がある日は好きだよ。音が少し変わるから。','雨なら雨でいい。出歩かなくても誰も文句を言わない。','寒い日は火のそばにいればいい。']), 'weather', '天気');

    if (intent === 'advice') {
      return replyObject(pick([
        '僕なら、まず何がいちばん嫌なのかを一つだけ決める。全部まとめて考えると面倒だから。',
        '君が決めることだね。必要なら話は聞くけど、代わりには決めないよ。',
        '選べるものが二つあるなら、どっちを選ばなかった時に後悔するか考えるかな。'
      ]), 'advice', '自分で決めること');
    }

    if (intent === 'preference') return replyObject('好きなものはいくつかあるよ。静かな場所、旅、釣り。それと、気を使いすぎなくていい相手。', 'preference', '好きなもの');
    if (intent === 'negative') return replyObject(pick(['それは嫌だね。','そりゃ疲れる。','今日はもう十分なんじゃない？']), 'negative', '疲れていること');
    if (intent === 'positive') return replyObject(pick(['それならいいじゃないか。','へえ。よかったね。','それはちょっといい話だ。']), 'positive', 'うれしいこと');

    if (intent === 'why') {
      return replyObject('理由が分かる話なら答えるけど、何について聞いてる？', 'why');
    }

    if (intent === 'unknown-question') {
      return replyObject(pick(['それは僕には分からないな。','知らない。知ったふりをするより、その方がいい。','うーん、それは答えを持ってない。']), 'unknown-question');
    }

    if (intent === 'statement') {
      if (text.length <= 6) return replyObject(pick(['うん。','へえ。','そうなんだ。','……なるほど。']), 'statement');
      return replyObject(pick(['そうなんだ。','へえ。それは知らなかった。','なるほどね。','君はそう思うんだね。']), 'statement');
    }

    return replyObject('うーん。もう少し具体的に言って。', 'fallback');
  }

  function updateState(userText, parsed, reply) {
    state.turn += 1;
    state.lastUser = userText;
    state.lastBot = reply.text;
    state.lastTopic = reply.topic || parsed.intent;
    if (reply.entity || parsed.entity) state.lastEntity = reply.entity || parsed.entity;
    if (reply.referent) state.lastReferent = reply.referent;
    if (isQuestion(userText) && !['clarify','repair','why-short'].includes(parsed.intent)) {
      state.lastQuestion = { text:userText, parsed };
    }
  }

  function addMessage(text, who) {
    const div = document.createElement('div');
    div.className = `message ${who}`;
    div.textContent = text;
    messages.appendChild(div);
    requestAnimationFrame(() => { chat.scrollTop = chat.scrollHeight; });
  }

  function submit(raw) {
    const text = normalize(raw);
    if (!text) return;
    addMessage(text, 'user');
    input.value = '';
    if (quick) quick.hidden = true;

    const parsed = classify(text);
    const reply = answerKnown(text, parsed);
    updateState(text, parsed, reply);

    window.setTimeout(() => addMessage(reply.text, 'bot'), 180 + Math.random() * 220);
  }

  function opening() {
    statusText.textContent = `${world.band}。${world.current}`;
    addMessage(pick(['……やあ。','来たんだね。','こんにちは。そこ、空いてるよ。']), 'bot');
    addMessage(state.mood === '少し退屈' ? '少し退屈してたところ。' : '今日はそんなに悪くない。', 'bot');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submit(input.value);
  });

  if (quick) {
    quick.addEventListener('click', (e) => {
      const button = e.target.closest('button[data-message]');
      if (!button) return;
      submit(button.dataset.message);
    });
  }

  clearButton.addEventListener('click', () => {
    messages.textContent = '';
    state.turn = 0;
    state.lastUser = '';
    state.lastBot = '';
    state.lastTopic = null;
    state.lastEntity = null;
    state.lastQuestion = null;
    state.lastReferent = null;
    if (quick) quick.hidden = false;
    opening();
  });

  input.addEventListener('focus', () => setTimeout(() => { chat.scrollTop = chat.scrollHeight; }, 200));

  opening();
})();
