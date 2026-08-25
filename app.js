(() => {
  const chat = document.getElementById('chat');
  const form = document.getElementById('composer');
  const input = document.getElementById('messageInput');
  const quickChoices = document.getElementById('quickChoices');
  const typing = document.getElementById('typing');

  const scrollBottom = () => {
    requestAnimationFrame(() => {
      chat.scrollTop = chat.scrollHeight;
    });
  };

  const addMessage = (text, who) => {
    const div = document.createElement('div');
    div.className = `message ${who}`;
    div.textContent = text;
    chat.insertBefore(div, typing);
    scrollBottom();
  };

  const reply = (text) => {
    if (/仕事|会社|行きたく/.test(text)) {
      return '行きたくない気持ちと、行かないと決めることは、少し別だね。君がいちばん嫌なのは何だろう。';
    }
    if (/自由/.test(text)) {
      return '自由って、好きにすることだけじゃないと思うよ。誰かに決めてもらわずに、自分で引き受けることも含まれる。';
    }
    if (/疲|つか/.test(text)) {
      return '疲れたなら、今日は結論を出さなくてもいいんじゃないかな。静かな場所で少し休むのも悪くない。';
    }
    if (/また|久しぶり|ひさしぶり/.test(text)) {
      return 'また来たんだね。まあ、川は今日も同じように流れてるよ。';
    }
    if (/どうすれば|どうしたら|教えて/.test(text)) {
      return 'それを僕が決めたら、君は少し楽になるかもしれない。でも、その答えはたぶん君のものじゃない。';
    }
    if (/さよなら|またね|帰る/.test(text)) {
      return 'うん。また気が向いたら。';
    }

    const replies = [
      'そういう日もあるね。無理に意味をつけなくてもいいと思うよ。',
      'それは、答えが欲しい話かな。それとも、ただ聞いてほしい話？',
      '少し遠くから見ると、違って見えるかもしれないね。',
      '急いで決めなくてもいいんじゃないかな。'
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  };

  const submitMessage = (raw) => {
    const text = String(raw || '').trim();
    if (!text) return;

    addMessage(text, 'user');
    input.value = '';
    typing.hidden = false;
    scrollBottom();

    window.setTimeout(() => {
      typing.hidden = true;
      addMessage(reply(text), 'bot');
    }, 400);
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitMessage(input.value);
  });

  quickChoices.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-message]');
    if (!button) return;
    event.preventDefault();
    submitMessage(button.dataset.message);
  });

  input.addEventListener('focus', () => {
    window.setTimeout(scrollBottom, 250);
  });

  scrollBottom();
})();
