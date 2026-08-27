(() => {
  'use strict';

  const WEATHER = {
    clear: { label: '晴れ', situation: '空がよく晴れている。' },
    cloudy: { label: 'くもり', situation: '薄い雲が川の上に広がっている。' },
    wind: { label: '風', situation: '川沿いを風が通り抜けている。' },
    light_rain: { label: '小雨', situation: '細い雨が静かに降っている。' }
  };

  const SPOTS = {
    river_edge: '川べり',
    campfire: '焚き火のそば',
    fallen_log: '倒木のそば',
    tent_side: 'テントの横'
  };

  const MOODS = {
    quiet: '今日は静かにしていたいようだ。',
    good: '今日は少し機嫌がよさそうだ。',
    bored: '少し退屈していたようだ。',
    playful: '何かいたずらを思いつきそうな顔をしている。',
    restless: 'ときどき川上の方を気にしている。'
  };

  const ACTIVITIES = {
    fishing: '釣り糸を川へ垂らしている',
    watch_river: '流れる水を眺めている',
    tend_fire: '焚き火の枝を組み直している',
    tidy_tent: 'テントの周りを片づけている',
    eat_bread: 'パンを少しずつ食べている',
    harmonica: 'ハーモニカを吹いている',
    return_walk: '川上から歩いて戻ってきたところだ'
  };

  const VALLEY = {
    none: '今日は谷の方では、まだ誰も見ていないらしい。',
    moomin: 'ムーミンを、さっき谷の方で見かけたらしい。',
    littlemy: 'リトルミイが、少し前まで近くにいたらしい。',
    mama: 'ムーミンママを、朝に谷で見かけたらしい。',
    papa: 'ムーミンパパが、何かを探して歩いていたらしい。'
  };

  const MEMORIES = {
    saw_strange_stone: '一緒に変わった石を見たこと',
    helped_fire: '一緒に焚き火を整えたこと',
    listened_harmonica: '川辺でハーモニカを聴いたこと',
    watched_rain: '並んで小雨を眺めたこと',
    caught_floating_thing: '川から流れてきたものを見届けたこと',
    found_visitor_trace: '誰かが来ていた跡を見つけたこと',
    saved_hat: '風に飛ばされかけた帽子を押さえたこと',
    sat_quietly: '川辺で何も言わずに過ごしたこと',
    shared_departure: '旅支度を少し手伝ったこと'
  };

  const leaveChoice = (id) => ({
    id,
    label: '今日は帰る',
    reply: 'うん。気をつけて。',
    pose: 'idle',
    endReason: 'user_leave',
    effects: { trust: 0, flags: [] }
  });

  const INCIDENTS = {
    fishing_line: {
      text: '釣り糸が急に引かれた。魚にしては、動きが少し変だ。',
      fireMode: 'normal',
      choices: [
        { id: 'incident_fishing_hold', label: '糸を持つのを手伝う', reply: '強く引かなくていいよ。向こうが先に姿を見せるまで待とう。', pose: 'smile', next: 'response', effects: { trust: 0, flags: ['helped_with_line'] } },
        { id: 'incident_fishing_guess', label: '何が掛かったと思うか聞く', reply: '魚なら、もう少し行儀よく逃げると思うんだけどね。', pose: 'thinking', next: 'response', effects: { trust: 0, flags: ['guessed_catch'] } },
        { id: 'incident_fishing_watch', label: '川面を黙って見る', reply: '……今、光ったね。魚じゃないかもしれない。', pose: 'sit', next: 'response', effects: { trust: 1, flags: ['watched_line'] } },
        leaveChoice('leave_fishing_line')
      ]
    },
    wind_hat: {
      text: '風が強くなり、旅人の帽子と足元の紙が同時に動いた。',
      fireMode: 'normal',
      choices: [
        { id: 'incident_hat_catch', label: '帽子を押さえる', reply: 'ありがとう。紙より帽子を選んだんだね。僕もそうする。', pose: 'smile', next: 'response', effects: { trust: 1, flags: ['saved_hat'], memory: 'saved_hat' } },
        { id: 'incident_paper_step', label: '紙を足で止める', reply: 'そっちはただの包み紙だけど、逃がすよりはいい。', pose: 'idle', next: 'response', effects: { trust: 0, flags: ['saved_paper'] } },
        { id: 'incident_hat_laugh', label: '帽子の方が旅に出たそうだと言う', reply: '持ち主より先に出発するのは、少し生意気だな。', pose: 'smile', next: 'response', effects: { trust: 0, flags: ['joked_about_hat'] } },
        leaveChoice('leave_wind_hat')
      ]
    },
    smoke_shift: {
      text: '焚き火の煙が、急にこちらへ向きを変えた。',
      fireMode: 'normal',
      choices: [
        { id: 'incident_smoke_move', label: '少し場所を移る', reply: 'それが一番早い。煙と議論しても、だいたい負けるからね。', pose: 'idle', next: 'response', effects: { trust: 1, flags: ['moved_from_smoke'] } },
        { id: 'incident_smoke_tend', label: '枝の組み方を見る', reply: '湿った枝が一本ある。たぶん、これだ。', pose: 'thinking', next: 'response', effects: { trust: 0, flags: ['checked_smoke'], memory: 'helped_fire' } },
        { id: 'incident_smoke_wait', label: '風が変わるまで待つ', reply: '……君は案外、煙に負けず嫌いなんだね。', pose: 'sit', next: 'response', effects: { trust: 0, flags: ['waited_smoke'] } },
        leaveChoice('leave_smoke_shift')
      ]
    },
    strange_stone: {
      text: '水際に、縞模様の入った変わった石が落ちている。',
      fireMode: 'normal',
      choices: [
        { id: 'incident_stone_pick', label: '拾って近くで見る', reply: '乾くと色が変わりそうだ。しばらくここに置いてみよう。', pose: 'thinking', next: 'response', effects: { trust: 0, flags: ['picked_stone'], memory: 'saw_strange_stone' } },
        { id: 'incident_stone_story', label: 'どこから来た石か考える', reply: '川上かな。それとも、誰かのポケットから落ちたのかもしれない。', pose: 'sit', next: 'response', effects: { trust: 0, flags: ['imagined_stone'], memory: 'saw_strange_stone' } },
        { id: 'incident_stone_leave', label: 'そのまま水際に残す', reply: 'うん。きれいなものを全部持ち帰る必要はない。', pose: 'idle', next: 'response', effects: { trust: 1, flags: ['left_stone'], memory: 'saw_strange_stone' } },
        leaveChoice('leave_strange_stone')
      ]
    },
    floating_thing: {
      text: '川上から、小さな木箱のようなものが流れてきた。',
      fireMode: 'normal',
      choices: [
        { id: 'incident_float_branch', label: '岸から枝を伸ばしてみる', reply: '無理に身を乗り出さないで。届かなければ、それまでだ。', pose: 'thinking', next: 'response', effects: { trust: 0, flags: ['reached_floating'], memory: 'caught_floating_thing' } },
        { id: 'incident_float_follow', label: '岸を歩いて行方を見る', reply: 'それなら安全だ。少し下流まで行ってみよう。', pose: 'idle', next: 'response', effects: { trust: 1, flags: ['followed_floating'], memory: 'caught_floating_thing' } },
        { id: 'incident_float_watch', label: 'ここから見送る', reply: 'あれにも行き先があるのかもしれないね。たぶん、ないけど。', pose: 'sit', next: 'response', effects: { trust: 0, flags: ['watched_floating'] } },
        leaveChoice('leave_floating_thing')
      ]
    },
    visitor_trace: {
      text: '倒木のそばに、誰かが座っていたような跡が残っている。',
      fireMode: 'normal',
      choices: [
        { id: 'incident_trace_look', label: '近くを少し調べる', reply: 'パンくずがある。客は鳥だった可能性も出てきたね。', pose: 'thinking', next: 'response', effects: { trust: 0, flags: ['checked_trace'], memory: 'found_visitor_trace' } },
        { id: 'incident_trace_ask', label: '心当たりを聞く', reply: 'ないな。僕が歩いている間に来たんだろう。', pose: 'idle', next: 'response', effects: { trust: 0, flags: ['asked_trace'], memory: 'found_visitor_trace' } },
        { id: 'incident_trace_ignore', label: '気にせず座る', reply: 'そうしよう。座った跡なら、座るのに向いているはずだ。', pose: 'sit', next: 'response', effects: { trust: 1, flags: ['sat_on_trace'] } },
        leaveChoice('leave_visitor_trace')
      ]
    },
    rain_grows: {
      text: 'さっきまで細かった雨が、少しだけ強くなってきた。',
      fireMode: 'normal',
      choices: [
        { id: 'incident_rain_tent', label: 'テントの近くへ移る', reply: '入るほどじゃないけど、ここなら濡れにくい。', pose: 'idle', next: 'response', effects: { trust: 0, flags: ['moved_to_tent'] } },
        { id: 'incident_rain_fire', label: '焚き火が大丈夫か見る', reply: 'まだ平気だ。太い枝まで濡れる前に少し寄せよう。', pose: 'thinking', next: 'response', effects: { trust: 0, flags: ['protected_fire'], memory: 'helped_fire' } },
        { id: 'incident_rain_watch', label: '川に落ちる雨を見る', reply: '水の上だけ、雨粒の形がよく見える。', pose: 'sit', next: 'response', effects: { trust: 1, flags: ['watched_rain'], memory: 'watched_rain' } },
        leaveChoice('leave_rain_grows')
      ]
    },
    fire_low: {
      text: '焚き火の炎が、急に小さくなった。',
      fireMode: 'low',
      choices: [
        { id: 'incident_fire_twigs', label: '細い枝を渡す', reply: 'それでいい。最初から太い枝を置くと、火も困る。', pose: 'smile', next: 'response', effects: { trust: 1, flags: ['helped_fire'], memory: 'helped_fire' } },
        { id: 'incident_fire_ask', label: '消えそうか聞く', reply: 'まだ消えないよ。少し機嫌が悪いだけだ。', pose: 'thinking', next: 'response', effects: { trust: 0, flags: ['asked_about_fire'] } },
        { id: 'incident_fire_wait', label: '旅人に任せて見ている', reply: '……よし。これで戻るはずだ。', pose: 'idle', next: 'response', effects: { trust: 0, flags: ['watched_fire'] } },
        leaveChoice('leave_fire_low')
      ]
    },
    harmonica_echo: {
      text: '川上から、さっき吹いたハーモニカと似た音が返ってきた。',
      fireMode: 'normal',
      choices: [
        { id: 'incident_echo_listen', label: 'もう一度、静かに聴く', reply: '……鳥じゃないな。誰かが同じ音を返したのかも。', pose: 'harmonica', next: 'response', effects: { trust: 1, flags: ['listened_echo'], memory: 'listened_harmonica' } },
        { id: 'incident_echo_answer', label: 'もう一度吹いてみてと言う', reply: '返事が来るか試すんだね。短い音ならいいよ。', pose: 'harmonica', next: 'response', effects: { trust: 0, flags: ['answered_echo'], memory: 'listened_harmonica' } },
        { id: 'incident_echo_guess', label: '誰の音か考える', reply: '分からない方が、少し面白い気もする。', pose: 'thinking', next: 'response', effects: { trust: 0, flags: ['guessed_echo'] } },
        leaveChoice('leave_harmonica_echo')
      ]
    },
    travel_gear: {
      text: 'テントの横に、いつもはしまってある旅支度の道具が並んでいる。',
      fireMode: 'normal',
      choices: [
        { id: 'incident_gear_ask', label: 'どこかへ行くのか聞く', reply: 'まだ決めてない。道具を出すと、行くかどうか考えやすいんだ。', pose: 'thinking', next: 'response', effects: { trust: 0, flags: ['asked_departure'] } },
        { id: 'incident_gear_fold', label: '布をたたむのを手伝う', reply: '端をそろえなくていいよ。しまえれば十分だ。', pose: 'smile', next: 'response', effects: { trust: 0, flags: ['helped_gear'], memory: 'shared_departure' } },
        { id: 'incident_gear_ignore', label: '道具には触れず川を見る', reply: '聞かないんだね。まあ、まだ話すほど決まってない。', pose: 'sit', next: 'response', effects: { trust: 1, flags: ['left_gear_alone'] } },
        leaveChoice('leave_travel_gear')
      ]
    }
  };

  const NODES = {
    arrival: {
      id: 'arrival', phase: 'ARRIVAL', pose: 'idle',
      choices: [
        { id: 'arrival_call', label: '声をかける', reply: 'やあ。来たんだね。', pose: 'idle', next: 'settle', effects: { trust: 0, flags: ['greeted'] } },
        { id: 'arrival_quiet', label: '近くまで静かに歩く', reply: '気づいてるよ。そこなら座れる。', pose: 'sit', next: 'settle', effects: { trust: 0, flags: ['approached_quietly'] } },
        { id: 'arrival_river', label: '先に川を見る', reply: '今日は水が少し速い。昨日とは違うね。', pose: 'thinking', next: 'settle', effects: { trust: 0, flags: ['watched_river_first'] } },
        leaveChoice('leave_arrival')
      ]
    },
    settle: {
      id: 'settle', phase: 'SETTLE', pose: 'sit',
      choices: [
        { id: 'settle_ask_activity', label: '何をしていたか聞く', reply: '見ればだいたい分かると思うけど。まあ、話してもいい。', pose: 'idle', next: 'incident', effects: { trust: 0, flags: ['asked_activity'] } },
        { id: 'settle_offer_help', label: '手伝うことがあるか聞く', reply: '今はないよ。何か起きたら、その時に頼む。', pose: 'smile', next: 'incident', effects: { trust: 0, flags: ['offered_help'] } },
        { id: 'settle_share_silence', label: '少し黙ってそばにいる', reply: '……静かなのは助かる。', pose: 'sit', next: 'incident', effects: { trust: 1, flags: ['shared_silence'] } },
        leaveChoice('leave_settle')
      ]
    },
    response: {
      id: 'response', phase: 'RESPONSE', pose: 'idle',
      choices: [
        { id: 'response_notice', label: 'もう少し様子を見る', reply: 'うん。急がなくても、たいてい何か分かる。', pose: 'thinking', next: 'quiet', effects: { trust: 0, flags: ['observed_after_incident'] } },
        { id: 'response_small_joke', label: '軽く冗談を言う', reply: '……それは、少しだけ面白い。', pose: 'smile', next: 'quiet', effects: { trust: 0, flags: ['shared_joke'] } },
        { id: 'response_change_subject', label: '別のことをしようと言う', reply: 'そうしよう。ひとつのことを見続ける必要もない。', pose: 'idle', next: 'quiet', effects: { trust: 0, flags: ['changed_subject'] } },
        leaveChoice('leave_response')
      ]
    },
    quiet: {
      id: 'quiet', phase: 'QUIET', pose: 'sit', allowFreeTopic: true,
      choices: [
        { id: 'quiet_harmonica', label: 'ハーモニカを聴く', reply: '短い曲なら。川の音に負けないくらいのね。', pose: 'harmonica', next: 'departure', effects: { trust: 0, flags: ['listened_harmonica'], memory: 'listened_harmonica' } },
        { id: 'quiet_sit', label: '何もせず一緒に座る', reply: '……こういう時間なら、悪くない。', pose: 'sit', next: 'departure', effects: { trust: 1, flags: ['sat_quietly'], memory: 'sat_quietly' } },
        { id: 'quiet_valley', label: '谷で見かけた人の話を聞く', reply: '', pose: 'idle', next: 'departure', effects: { trust: 0, flags: ['asked_about_valley'] } },
        leaveChoice('leave_quiet')
      ]
    },
    departure: {
      id: 'departure', phase: 'DEPARTURE', pose: 'idle',
      choices: [
        { id: 'departure_wave', label: '手を振って帰る', reply: 'じゃあね。また気が向いたら。', pose: 'smile', endReason: 'departure_time', effects: { trust: 0, flags: ['waved_goodbye'] } },
        { id: 'departure_help_pack', label: '片づけを少し手伝ってから帰る', reply: 'ありがとう。残りは僕がやるよ。', pose: 'smile', endReason: 'event_resolved', effects: { trust: 0, flags: ['helped_departure'], memory: 'shared_departure' } },
        { id: 'departure_watch_leave', label: '旅人が歩き出すのを見送る', reply: 'それじゃ、僕も少し歩いてくる。', pose: 'idle', endReason: 'traveler_leave', effects: { trust: 0, flags: ['watched_departure'] } }
      ]
    },
    terminal: { id: 'terminal', phase: 'ENDED', terminal: true, pose: 'idle', choices: [] }
  };

  const ENDINGS = {
    user_leave: '今日はここで帰ることにした。旅人は短く手を上げた。',
    traveler_leave: '旅人は川上へ歩き出した。川辺には火の音だけが残った。',
    night_deepens: '夜が深くなり、今日はここまでにすることにした。',
    rain_intensifies: '雨音が強くなり、それぞれ帰り支度を始めた。',
    departure_time: '風向きが変わるころ、今日は帰ることにした。',
    event_resolved: '小さな出来事が片づき、ちょうどよいところで別れた。'
  };

  const INCIDENT_DIALOGUE = {
    fishing_line: '……これは、いつもの引き方じゃないな。',
    wind_hat: '両方いっぺんに逃げるのは、ずるいね。',
    smoke_shift: '煙は、座っている人をよく選ぶ。',
    strange_stone: 'あの石、少し変わった模様だ。',
    floating_thing: 'あれは何だろう。岸から見た方がよさそうだ。',
    visitor_trace: '僕がいない間に、誰か来たみたいだ。',
    rain_grows: '少し雨脚が変わったね。',
    fire_low: '火が弱くなった。枝の機嫌を見てみよう。',
    harmonica_echo: '……今の、僕が吹いた音じゃないよ。',
    travel_gear: 'まだ出ると決めたわけじゃない。道具を見ていただけ。'
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function findIncidentChoice(choiceId) {
    for (const incident of Object.values(INCIDENTS)) {
      const choice = incident.choices.find((item) => item.id === choiceId);
      if (choice) return choice;
    }
    return null;
  }

  function findChoice(choiceId) {
    for (const node of Object.values(NODES)) {
      const choice = node.choices.find((item) => item.id === choiceId);
      if (choice) return choice;
    }
    return findIncidentChoice(choiceId);
  }

  function greeting(state) {
    const flags = state.activeRun?.flags || [];
    if (flags.includes('long_absence')) return '久しぶりだね。川は前と少し変わったよ。';
    if ((state.visits || 0) <= 1) return '……こんにちは。ここまで来たんだね。';
    if ((state.distanceRank || 0) >= 2) return 'また来たんだね。そこ、座っていいよ。';
    return 'やあ。また会ったね。';
  }

  function previousReply(state) {
    const selected = state.activeRun?.selectedChoiceIds || [];
    const choice = findChoice(selected[selected.length - 1]);
    return choice?.reply || '';
  }

  function getNode(nodeId, context) {
    const { world, state } = context;
    if (nodeId === 'incident') {
      const incident = clone(INCIDENTS[world.incidentId]);
      const leadIn = previousReply(state);
      const text = [leadIn, INCIDENT_DIALOGUE[world.incidentId]].filter(Boolean).join('\n');
      return { id: 'incident', phase: 'INCIDENT', pose: 'thinking', situation: incident.text, text, choices: incident.choices, fireMode: incident.fireMode };
    }

    const node = clone(NODES[nodeId] || NODES.terminal);
    if (nodeId === 'arrival') node.text = greeting(state);
    if (nodeId === 'settle') {
      node.situation = `${SPOTS[world.spot]}で、旅人は${ACTIVITIES[world.activity]}。${MOODS[world.mood]}`;
      node.text = previousReply(state) || '今日は、ここにいるよ。';
    }
    if (nodeId === 'response') {
      node.situation = '小さな出来事に、どう応じるかを決めた。';
      const selected = state.activeRun?.selectedChoiceIds || [];
      const choice = findChoice(selected[selected.length - 1]);
      node.text = choice?.reply || '小さな騒ぎは、いったん落ち着いた。';
      node.pose = choice?.pose || 'idle';
    }
    if (nodeId === 'quiet') {
      node.situation = '出来事が落ち着くと、川の音がまたよく聞こえるようになった。';
      node.text = previousReply(state) || '少し、静かになったね。';
    }
    if (nodeId === 'quiet') {
      const valleyChoice = node.choices.find((choice) => choice.id === 'quiet_valley');
      valleyChoice.reply = VALLEY[world.valleyPresence];
    }
    if (nodeId === 'departure') {
      node.situation = '川辺で過ごす今日の時間が、終わりに近づいている。';
      const leadIn = previousReply(state);
      if (world.weather === 'light_rain') node.text = [leadIn, '雨がまた少し強くなりそうだ。そろそろ戻る時間かな。'].filter(Boolean).join('\n');
      else if (world.departurePressure >= 2) node.text = [leadIn, 'そろそろ、少し歩いてこようと思う。'].filter(Boolean).join('\n');
      else node.text = leadIn || 'そろそろ、今日はここまでかな。';
      if (world.currentTimeBand === 'night') {
        node.choices.forEach((choice) => { if (choice.id === 'departure_wave') choice.endReason = 'night_deepens'; });
      } else if (world.weather === 'light_rain') {
        node.choices.forEach((choice) => { if (choice.id === 'departure_wave') choice.endReason = 'rain_intensifies'; });
      }
    }
    return node;
  }

  function getEnding(endReason) {
    return ENDINGS[endReason] || ENDINGS.event_resolved;
  }

  function getSituation(world) {
    return `${world.seasonLabel}の${SPOTS[world.spot]}。${WEATHER[world.weather].situation}`;
  }

  function getSceneCaption(world) {
    return ACTIVITIES[world.activity];
  }

  function getMemoryLabel(id) {
    return MEMORIES[id] || '';
  }

  function handleTopic(raw, world) {
    const text = String(raw || '').trim().replace(/\s+/g, ' ').slice(0, 120);
    if (!text) return { id: 'empty', text: '何か話したかったんじゃないの。', pose: 'thinking' };
    if (/ムーミンママ|ママ/.test(text)) return { id: 'mama', text: '今朝は谷にいたよ。あの人は、こちらが黙っていても困らないから楽だ。', pose: 'idle' };
    if (/リトルミイ|ミイ/.test(text)) return { id: 'littlemy', text: '少し前に見かけた。静かだったから、たぶん何か考えてたんだろうね。', pose: 'smile' };
    if (/ムーミンパパ|パパ/.test(text)) return { id: 'papa', text: '何かを探して歩いていたよ。聞かなかったから、何かまでは知らない。', pose: 'thinking' };
    if (/ムーミン/.test(text)) return { id: 'moomin', text: world.valleyPresence === 'moomin' ? 'さっき谷で見かけたよ。元気そうだった。' : '今日はまだ会ってない。たぶん谷のどこかにいる。', pose: 'idle' };
    if (/ハーモニカ|音楽|曲/.test(text)) return { id: 'music', text: '曲の名前はないよ。名前をつける前に、だいたい別の曲になる。', pose: 'harmonica' };
    if (/旅|出発|どこかへ|行く/.test(text)) return { id: 'travel', text: '行き先は決めてない。決めてない方が、出る時には身軽だから。', pose: 'thinking' };
    if (/雨|風|晴|天気|寒|暑/.test(text)) return { id: 'weather', text: `${WEATHER[world.weather].label}だね。川辺では、少し変わるだけでもよく分かる。`, pose: 'idle' };
    if (/疲れ|つかれ|しんど|いや|嫌/.test(text)) return { id: 'tired', text: '疲れてるなら、火のそばに座ればいい。話さなくても退屈はしないよ。', pose: 'sit' };
    if (/うれし|嬉し|楽しい|たのし/.test(text)) return { id: 'happy', text: 'それならよかった。理由は、話したくなった時でいい。', pose: 'smile' };
    return { id: 'unknown', text: 'その話は、うまく分からないな。別の話にしようか。', pose: 'thinking' };
  }

  window.SniffContent = Object.freeze({
    ACTIVITIES,
    INCIDENTS,
    MEMORIES,
    NODES,
    PHASE_ORDER: ['ARRIVAL', 'SETTLE', 'INCIDENT', 'RESPONSE', 'QUIET', 'DEPARTURE', 'ENDED'],
    WEATHER,
    findChoice,
    getEnding,
    getMemoryLabel,
    getNode,
    getSceneCaption,
    getSituation,
    handleTopic
  });
})();
