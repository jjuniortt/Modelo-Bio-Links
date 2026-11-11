(() => {
const body = document.body;
const micBtn = document.getElementById('mic');
const voice = document.getElementById('voice');
const backdrop = document.getElementById('backdrop');
const statusText = document.getElementById('status-text');
const transcriptEl = document.getElementById('transcript');
const wave = document.getElementById('wave');
const cancelBtn = document.getElementById('cancel');
const sendBtn = document.getElementById('send');
const toastEl = document.getElementById('toast');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const EMPTY_HINT = 'Fale agora…';

let recognition = null;
let isOpen = false;
let isListening = false;
let finalText = '';
let currentText = '';
let toastTimer = 0;
let chat = null;

function toast(message, duration = 2800) {
  toastEl.textContent = message;
  toastEl.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), duration);
}

function haptic(ms = 10) {
  if ('vibrate' in navigator) navigator.vibrate(ms);
}

function setStatus(text) {
  statusText.textContent = text;
}

function setListening(active) {
  isListening = active;
  body.classList.toggle('is-listening', active);
  wave.classList.toggle('is-active', active);
}

function createRecognition() {
  const rec = new SpeechRecognition();
  rec.lang = 'pt-BR';
  rec.interimResults = true;
  rec.continuous = true;
  rec.maxAlternatives = 1;

  rec.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) finalText += result[0].transcript;
      else interim += result[0].transcript;
    }
    currentText = `${finalText}${interim}`.trim();
    transcriptEl.textContent = currentText || EMPTY_HINT;
  };

  rec.onerror = (event) => {
    const messages = {
      'no-speech': 'Não ouvi nada. Toque no microfone para tentar de novo.',
      'audio-capture': 'Nenhum microfone encontrado.',
      'not-allowed': 'Permissão de microfone negada.',
      'service-not-allowed': 'Reconhecimento de voz indisponível neste navegador.',
    };
    setStatus(messages[event.error] || 'Erro ao ouvir. Tente novamente.');
    setListening(false);
  };

  rec.onend = () => {
    if (!isOpen) return;
    setListening(false);
    setStatus(currentText ? 'Pronto para enviar' : 'Toque no microfone para ouvir');
  };

  return rec;
}

function startListening() {
  if (!SpeechRecognition || isListening) return;
  recognition = recognition || createRecognition();
  try {
    recognition.start();
    setStatus('Ouvindo…');
    setListening(true);
  } catch {
    setStatus('Não foi possível iniciar a escuta. Toque novamente.');
    setListening(false);
  }
}

function stopListening() {
  if (recognition && isListening) recognition.stop();
}

function detachRecognition() {
  if (!recognition) return;
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
  try {
    recognition.abort();
  } catch {}
  recognition = null;
}

function openVoice() {
  if (!SpeechRecognition) {
    toast('Seu navegador não suporta reconhecimento de voz.');
    return;
  }
  isOpen = true;
  finalText = '';
  currentText = '';
  transcriptEl.textContent = EMPTY_HINT;
  body.classList.add('voice-open');
  voice.classList.add('is-open');
  voice.setAttribute('aria-hidden', 'false');
  haptic(15);
  startListening();
}

function closeVoice() {
  isOpen = false;
  detachRecognition();
  setListening(false);
  body.classList.remove('voice-open');
  voice.classList.remove('is-open');
  voice.setAttribute('aria-hidden', 'true');
  micBtn.focus({ preventScroll: true });
}

async function sendQuestion() {
  const question = currentText.trim();
  if (!question) {
    toast('Diga algo antes de enviar.');
    return;
  }
  stopListening();
  haptic(20);

  try {
    await navigator.clipboard.writeText(question);
    toast('Pergunta copiada. Cole no chat.');
  } catch {
    toast('Não foi possível copiar. Use o chat abaixo.');
  }

  closeVoice();
  await openChat();
}

async function openChat() {
  if (!chat) {
    try {
      const { default: Chatbox } = await import('https://cdn.jsdelivr.net/npm/@chatvolt/embeds@latest/dist/chatbox/index.js');
      chat = await Chatbox.initBubble({
        agentId: 'cmcve49ym0b6r12sm0r6hnp81',
        contact: {
          firstName: 'Jonas',
          lastName: 'Tófoli',
          email: 'teste@email.com',
          phoneNumber: '+0000000000',
        },
        interface: {
          initialMessages: ['Olá, Jonas.', 'Como posso lhe ajudar?'],
        },
        context: 'O usuário, administrador do AGHUse, trabalha em uma das unidades de saúde do Estado da Paraíba.',
      });
    } catch {
      toast('Assistente indisponível no momento.');
      return;
    }
  }
  chat.open();
}

micBtn.addEventListener('click', () => {
  if (!SpeechRecognition) {
    toast('Seu navegador não suporta reconhecimento de voz.');
    return;
  }
  if (!isOpen) {
    openVoice();
    return;
  }
  haptic(10);
  if (isListening) stopListening();
  else startListening();
});

cancelBtn.addEventListener('click', closeVoice);
backdrop.addEventListener('click', closeVoice);
sendBtn.addEventListener('click', sendQuestion);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && isOpen) closeVoice();
});

window.addEventListener('pagehide', detachRecognition);

if (!SpeechRecognition) {
  micBtn.classList.add('is-unsupported');
  micBtn.setAttribute('aria-disabled', 'true');
}
})();
