(() => {
  'use strict';

  const chat = document.getElementById('chat');
  const form = document.getElementById('composer');
  const input = document.getElementById('messageInput');
  const quickChoices = document.getElementById('quickChoices');
  const typing = document.getElementById('typing');
  const opening = document.getElementById('opening');
  const statusText = document.getElementById('statusText');

  const STORAGE_KEY = 'sniff_v2_state';
  const now = new Date();

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const chance = n => Math.random() < n;

  const safeLoad = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (_) {
      return {};
    }
  };

  const saved = safeLoad();
  const state = {
    visits: Number(saved.visits || 0) + 1,
    lastSeen: saved.lastSeen || null,
    turns: Number(saved.turns || 0),
    recentTopics: Array.isArray(saved.recentTopics) ? saved.recentTopics.slice(-5) : [],
    lastUserText: '',
    lastBotText: '',
    currentTopic: null,
    mood: pick(['quiet', 'light', 'restless', 'dry']),
    activity: null,
    timeBand: null,
    season: null,
    distance: 'new'
  };

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        visits: state.visits,
        lastSeen: new Date().toISOString(),
        turns: state.turns,
        recentTopics: state.recentTopics.slice(-5)
      }));
    } catch (_) {}
  };

  const getTimeBand = hour => {
    if (hour < 5) return 'lateNight';
    if (hour < 8) return 'dawn';
    if (hour < 12) return 'morning';
    if (hour < 17) return 'day';
    if (hour < 21) return 'evening';
    return 'night';
  };

  const getSeason = month => {
    if ([11, 0, 1].includes(month)) return 'winter';
    if ([2, 3, 4].includes(month)) return 'spring';
    if ([5, 6, 7].includes(month)) return 'summer';
    return 'autumn';
  };

  state.timeBand = getTimeBand(now.getHours());
  state.season = getSeason(now.getMonth());
  state.distance = state.visits <= 1 ? 'new' : state.visits <= 3 ? 'familiar' : state.visits <= 7 ? 'known' : 'close';

  const activities = {
    dawn: ['火を起こしている', '川を眺めている', '湯を沸かしている'],
    morning: ['釣り糸を垂らしている', 'テントのまわりを片づけている', 'パンをかじっている'],
    day: ['川辺を歩いている', '木陰で休んでいる', '地図も持たずに少し歩いてきた'],
    evening: ['焚き火のそばにいる', '釣り道具をしまっている', '夕暮れを見ている'],
    night: ['火を小さくしている', '星を見ている', 'ハーモニカをしまったところだ'],
    lateNight: ['まだ起きている', '火が消えないように見ている', '眠る前に川を見ている']
  };
  state.activity = pick(activities[state.timeBand]);

  const statusMap = {
    '火を起こしている': '火を起こしているようです',
    '川を眺めている': '川を眺めているようです',
    '湯を沸かしている': '湯を沸かしているようです',
    '釣り糸を垂らしている': '釣りをしているようです',
    'テントのまわりを片づけている': 'テントのまわりを片づけています',
    'パンをかじっている': '朝ごはんの途中のようです',
    '川辺を歩いている': '川辺を歩いてきたようです',
    '木陰で休んでいる': '木陰で休んでいるようです',
    '地図も持たずに少し歩いてきた': '少し歩いてきたようです',
    '焚き火のそばにいる': '焚き火のそばにいるようです',
    '釣り道具をしまっている': '釣り道具をしまっているようです',
    '夕暮れを見ている': '夕暮れを見ているようです',
    '火を小さくしている': '火を小さくしているようです',
    '星を見ている': '星を見ているようです',
    'ハーモニカをしまったところだ': '静かな夜のようです',
    'まだ起きている': 'まだ起きているようです',
    '火が消えないように見ている': '火の番をしているようです',
    '眠る前に川を見ている': '眠る前に川を見ているようです'
  };
  statusText.textContent = statusMap[state.activity] || '川辺にいるようです';

  const addMessage = (text, who) => {
    const div = document.createElement('div');
    div.className = `message ${who}`;
    div.textContent = text;
    chat.insertBefore(div, quickChoices);
    requestAnimationFrame(() => { chat.scrollTop = chat.scrollHeight; });
  };

  const addOpening = text => {
    const div = document.createElement('div');
    div.className = 'message bot';
    div.textContent = text;
    opening.appendChild(div);
  };

  const greeting = () => {
    if (state.distance === 'new') return pick(['……こんにちは。', 'やあ。', 'こんにちは。ここに座る？']);
    if (state.distance === 'familiar') return pick(['また来たんだね。', 'やあ。今日は早いね。', 'また会ったね。']);
    if (state.distance === 'known') return pick(['また来たの？　まあ、いいけど。', '君、最近よくここに来るね。', 'やあ。今日は何の話？']);
    return pick(['来たんだ。そこ、空いてるよ。', 'やあ。今日は静かだね。', '君なら来る気がしてたよ。']);
  };

  addOpening(greeting());
  if (chance(0.55)) {
    addOpening(pick([
      `今は${state.activity}。`,
      '話すなら聞くよ。別に急がなくていい。',
      '今日はそんなに悪い日じゃないよ。'
    ]));
  }

  const topicOf = text => {
    if (/仕事|会社|上司|職場|働|出勤|休み/.test(text)) return 'work';
    if (/疲|つか|眠|しんど|だる|休みたい/.test(text)) return 'tired';
    if (/自由|人生|生きる|幸せ|意味|孤独|寂し|さびし/.test(text)) return 'deep';
    if (/元気|調子|気分|どうなの|どう？/.test(text)) return 'howareyou';
    if (/何して|なにして|してる|今どこ|どこにいる/.test(text)) return 'activity';
    if (/好き|嫌い|食べ物|音楽|釣り|旅|ハーモニカ/.test(text)) return 'preference';
    if (/ルール|規則|決まり|命令|禁止/.test(text)) return 'rules';
    if (/友達|ムーミン|仲間|人付き合い|人間関係/.test(text)) return 'people';
    if (/帰る|さよなら|またね|寝る/.test(text)) return 'bye';
    if (/ありがとう|ありがと|助かった/.test(text)) return 'thanks';
    if (/なんで|どうして|なぜ/.test(text)) return 'why';
    if (/どうすれば|どうしたら|決めて|教えて/.test(text)) return 'advice';
    if (/腹|おなか|ごはん|飯|食べ/.test(text)) return 'food';
    if (/暑|寒|雨|天気|風/.test(text)) return 'weather';
    return 'general';
  };

  const rememberTopic = topic => {
    state.currentTopic = topic;
    if (!state.recentTopics.includes(topic)) state.recentTopics.push(topic);
    state.recentTopics = state.recentTopics.slice(-5);
  };

  const normalReplies = {
    howareyou: [
      'まあまあかな。君は？',
      '悪くないよ。少し眠いけど。',
      '今日は静かでいい気分だよ。',
      '普通。そういう日も悪くない。'
    ],
    activity: [
      `今は${state.activity}。`,
      `さっきまで少し歩いてた。今は${state.activity}。`,
      `見ればわかると思うけど、${state.activity}よ。`
    ],
    food: [
      'パンがあれば十分かな。',
      '今日は簡単なものでいいよ。食事に悩みすぎるのも疲れる。',
      'お腹は空いてる。でも、まだ急いで食べるほどじゃない。'
    ],
    weather: [
      '風がある日は好きだよ。音が少し変わるから。',
      '暑いね。日陰にいればまだましだよ。',
      '雨なら雨でいいよ。出かけなくて済む。'
    ],
    preference: [
      '好きなものは、静かな場所と、邪魔されない時間かな。',
      '釣りは好きだよ。釣れなくても困らないし。',
      '旅は好き。でも、旅そのものを自慢する人はちょっと苦手だな。'
    ],
    people: [
      '一人でいるのは好きだよ。でも、一人でしかいられないのは違う。',
      '気の合う相手なら、黙って一緒にいるだけでも十分だよ。',
      '近すぎると疲れるし、遠すぎると少し寂しい。難しいね。'
    ],
    rules: [
      '必要な決まりもあるんだろうけど、決まりが増えると安心する人がいるのは不思議だね。',
      '誰かが決めたからって、それだけで正しいとは限らないよ。',
      '守る理由がわかる規則なら、まだ話は早い。理由もないのに従えと言われるのは嫌だな。'
    ]
  };

  const deepReply = text => {
    if (/孤独|寂し|さびし/.test(text)) {
      return pick([
        '一人でいることと、寂しいことは同じじゃないよ。たぶん君も知ってると思うけど。',
        '寂しい時に無理に誰かといると、余計に寂しくなることもある。',
        '誰かに会いたいなら会えばいい。ひとりでいたいなら、それも悪くない。'
      ]);
    }
    if (/自由/.test(text)) {
      return pick([
        '自由って、好き勝手にすることより、自分で決めたことを自分で引き受けることに近い気がする。',
        '自由は軽そうに見えるけど、案外重いよ。誰かのせいにしにくくなるから。',
        '誰にも邪魔されないことだけが自由なら、森の奥に一人でいれば済む。でも、たぶんそれだけじゃない。'
      ]);
    }
    return pick([
      'それは、すぐ答えが出る種類の話じゃないね。',
      '考えすぎて言葉が先に立つと、かえって見えなくなることもあるよ。',
      '僕なら少し歩くかな。歩いてると、頭の中が勝手に並び替わることがある。'
    ]);
  };

  const replyFor = (text, topic) => {
    const previous = state.currentTopic;

    if (topic === 'bye') return pick(['うん。また気が向いたら。', 'じゃあね。気をつけて。', 'また会ったら話そう。']);
    if (topic === 'thanks') return pick(['どういたしまして。', '別に大したことはしてないよ。', 'それならよかった。']);

    if (topic === 'howareyou') return pick(normalReplies.howareyou);
    if (topic === 'activity') return pick(normalReplies.activity);
    if (topic === 'food') return pick(normalReplies.food);
    if (topic === 'weather') return pick(normalReplies.weather);
    if (topic === 'preference') return pick(normalReplies.preference);
    if (topic === 'people') return pick(normalReplies.people);
    if (topic === 'rules') return pick(normalReplies.rules);

    if (topic === 'work') {
      if (/行きたく|辞め|やめたい/.test(text)) {
        return pick([
          '行きたくないのと、行かないと決めるのは別の話だね。いちばん嫌なのは何？',
          '今日は行きたくない、なのか。ずっと行きたくない、なのか。それで話は変わるよ。',
          '仕事そのものが嫌なのか、そこにいる誰かが嫌なのか。まずそこかな。'
        ]);
      }
      return pick([
        '仕事の話か。君、今日はずいぶん仕事を連れてきたね。',
        'それで、君自身はどうしたいの？',
        '誰が正しいかより、君が何に困ってるのかのほうが気になる。'
      ]);
    }

    if (topic === 'tired') {
      return pick([
        '疲れたなら、今日は何かを決める日じゃなくてもいいんじゃない。',
        'それなら少し休めばいいよ。疲れてる時の結論は、だいたい極端だから。',
        'お茶でも飲む？　話すのはそのあとでもいい。'
      ]);
    }

    if (topic === 'deep') return deepReply(text);

    if (topic === 'advice') {
      return pick([
        '君はどうしたいの？　まずそこを聞かないと決められないよ。',
        '僕が決めたら楽かもしれないけど、それじゃ君の答えじゃない。',
        '選択肢を二つか三つまで減らしてみたら？　それでも迷うなら、今日は決めなくていい。'
      ]);
    }

    if (topic === 'why') {
      if (previous === 'deep') return 'なんでって言われてもなあ。そう思うから、としか言えない時もあるよ。';
      if (previous === 'work') return '君の話を聞いてると、問題が一つじゃなさそうだから。';
      return pick(['なんでって言われてもなあ。', '理由が必要？', 'そう見えたから。違った？']);
    }

    if (/君はどう|あなたはどう|そっちは/.test(text)) {
      return pick([
        `僕？　今日は${state.activity}くらいかな。`,
        '僕はまあ、僕なりにやってるよ。',
        '悪くないよ。君ほど考え込んではないけど。'
      ]);
    }

    if (/元気なの/.test(text)) return pick(normalReplies.howareyou);

    const styles = [
      'plain','plain','plain','plain',
      'tease','tease',
      'avoid',
      'reflect'
    ];
    const style = pick(styles);

    if (style === 'tease') {
      return pick([
        '君はずいぶん質問が好きだね。',
        'それ、僕に聞くんだ。',
        'また難しい顔してるね。'
      ]);
    }
    if (style === 'avoid') {
      return pick(['知らないな。', 'それは僕にはよくわからない。', '……どうだろうね。']);
    }
    if (style === 'reflect') {
      return pick([
        '君はどう思ってるの？',
        'それを言葉にするとしたら、どんな感じ？',
        '本当に聞きたいのは、そのこと？'
      ]);
    }

    return pick([
      'そうなんだ。',
      'へえ。それはちょっと面白いね。',
      'なるほどね。',
      'それで？',
      'まあ、そういうこともあるよ。',
      '僕なら少し様子を見るかな。',
      'うん。聞いてるよ。'
    ]);
  };

  const updateQuickChoices = () => {
    const choicesByTime = {
      dawn: ['何してるの？', '眠くない？', '今日はどこへ行くの？', 'コーヒー飲む？'],
      morning: ['何してるの？', '今日はどこへ行くの？', '元気？', '旅って楽しい？'],
      day: ['何してるの？', '暑くない？', '一人が好き？', '自由って何？'],
      evening: ['今日はどうだった？', '何してるの？', '一人が好き？', '疲れたよ'],
      night: ['まだ起きてるの？', '星きれい？', '寂しくならない？', '今日は疲れた'],
      lateNight: ['まだ寝ないの？', '何考えてる？', '眠れない', '寂しくない？']
    };

    let choices = choicesByTime[state.timeBand].slice();
    if (state.distance === 'close') choices[0] = 'また来たよ';
    quickChoices.innerHTML = '';
    choices.forEach(label => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.message = label;
      button.textContent = label;
      quickChoices.appendChild(button);
    });
  };

  updateQuickChoices();

  const submitMessage = raw => {
    const text = String(raw || '').trim();
    if (!text) return;

    addMessage(text, 'user');
    input.value = '';
    typing.hidden = false;
    requestAnimationFrame(() => { chat.scrollTop = chat.scrollHeight; });

    const topic = topicOf(text);
    const reply = replyFor(text, topic);

    state.lastUserText = text;
    state.turns += 1;
    rememberTopic(topic);
    save();

    window.setTimeout(() => {
      typing.hidden = true;
      addMessage(reply, 'bot');
      state.lastBotText = reply;
      if (state.turns % 3 === 0) updateQuickChoices();
    }, 320 + Math.random() * 600);
  };

  form.addEventListener('submit', event => {
    event.preventDefault();
    submitMessage(input.value);
  });

  quickChoices.addEventListener('click', event => {
    const button = event.target.closest('button[data-message]');
    if (!button) return;
    event.preventDefault();
    submitMessage(button.dataset.message);
  });

  input.addEventListener('focus', () => {
    window.setTimeout(() => { chat.scrollTop = chat.scrollHeight; }, 250);
  });

  window.addEventListener('beforeunload', save);
  save();
})();
