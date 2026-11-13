function texture(context, output, layers) {
  const now = context.currentTime;
  for (const [delay, duration, frequency, resonance, level] of layers) {
    const source = context.createBufferSource();
    const frames = Math.ceil(context.sampleRate * duration);
    source.buffer = context.createBuffer(1, frames, context.sampleRate);
    const data = source.buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      const attack = Math.min(1, i / (context.sampleRate * .0015));
      data[i] = (Math.random() * 2 - 1) * attack * (1 - i / frames) ** 2;
    }
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = resonance;
    const gain = context.createGain();
    gain.gain.value = level;
    source.connect(filter).connect(gain).connect(output);
    source.start(now + delay);
  }
}

export function createSound() {
  let context;
  let noise;
  let muted = false;

  function unlock() {
    if (muted) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!context) {
        context = new Audio();
        noise = context.createBuffer(1, Math.ceil(context.sampleRate * .25), context.sampleRate);
        const samples = noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      }
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch {
      // The timing cues are also visible when audio is unavailable.
    }
  }

  function tone(start, end, at, duration, volume, type = 'sine') {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(start, at);
    oscillator.frequency.exponentialRampToValueAtTime(end, at + duration);
    gain.gain.setValueAtTime(.001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + .011);
    gain.gain.exponentialRampToValueAtTime(.001, at + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + duration);
  }

  function puff(at, duration, frequency, volume) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noise;
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(.001, at + duration);
    source.connect(filter).connect(gain).connect(context.destination);
    source.start(at);
    source.stop(at + duration);
  }

  function play(name, combo = 1) {
    if (muted || context?.state !== 'running') return;
    const at = context.currentTime;
    if (name === 'toss') {
      puff(at, .16, 1680, .16);
      tone(205, 330, at, .11, .044);
    } else if (name === 'roof' || name === 'face') {
      texture(context, context.destination, name === 'roof' ? [
        [0, .041, 1160, 1.2, .48], [.002, .19, 260, 2.1, .61],
      ] : [[0, .035, 650, .6, .34], [.003, .125, 155, 1.05, .73]]);
    } else if (name === 'early') {
      puff(at, .08, 790, .085);
    } else {
      texture(context, context.destination, [
        [0, .04, 920, 1.3, .37], [.005, .115, 285, 1.2, .54],
      ]);
      if (name === 'perfect' || name === 'combo') {
        const root = 523.25 * 2 ** (Math.min(combo - 1, 5) / 12);
        tone(root, root * .995, at + .028, .24, .10);
        if (name === 'combo') {
          tone(root * 1.25, root * 1.245, at + .075, .25, .07);
          tone(root * 1.5, root * 1.49, at + .13, .32, .065);
        }
      }
    }
  }

  return { unlock, play, setMuted: (value) => { muted = value; } };
}
