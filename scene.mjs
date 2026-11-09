const tau = 2 * Math.PI;
const hand = new Path2D('M 224 290 C 178 240 144 197 109 153 C 88 127 60 107 43 86 C 26 73 11 67 -3 53 C -17 38 -36 35 -48 22 C -57 12 -58 2 -51 -2 C -44 -6 -35 0 -27 9 L -15 18 C -21 5 -23 -7 -19 -20 L -13 -45 C -11 -52 -3 -52 0 -44 C 2 -37 -3 -19 -1 -13 L 8 -42 C 11 -53 21 -53 24 -45 C 27 -38 18 -17 18 -10 L 31 -35 C 36 -45 45 -42 45 -32 C 44 -24 36 -11 33 -2 L 44 -17 C 51 -26 59 -21 58 -11 C 55 1 50 12 47 24 C 45 40 50 53 62 66 C 79 83 106 95 129 113 C 171 145 217 198 281 262 L 299 330 Z');
const crease = new Path2D('M -13 19 Q 5 19 15 36 M -1 4 Q 19 8 29 20 M 19 -9 Q 30 -7 35 3 M 43 23 Q 33 39 37 49 M 47 67 Q 42 74 47 83 M 54 73 Q 48 79 53 86');
const heldFingers = new Path2D('M -52 -1 Q -60 11 -46 23 L -33 28 Q -25 29 -23 23 Q -26 14 -35 11 L -46 2 Z M 31 -13 Q 39 -19 44 -11 Q 45 -3 36 4 L 27 13 Q 20 17 17 11 Q 17 4 31 -13 Z');
const felt = document.createElement('canvas');
felt.width = felt.height = 144;
const paint = felt.getContext('2d');
const shade = paint.createRadialGradient(48, 38, 2, 72, 72, 75);
shade.addColorStop(0, '#fcffa9');
shade.addColorStop(.41, '#d5ea70');
shade.addColorStop(.78, '#9eb341');
shade.addColorStop(1, '#505b2a');
paint.beginPath();
paint.arc(72, 72, 69, 0, tau);
paint.fillStyle = shade;
paint.fill();
paint.save();
paint.clip();
let seed = 1261;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}
for (let i = 0; i < 2800; i++) {
  const x = random() * 144;
  const y = random() * 144;
  paint.fillStyle = i % 2 ? '#fff5a546' : '#4e641a42';
  paint.fillRect(x, y, random() * 2 + .4, 1);
}
const seam = new Path2D('M 19 20 C 62 35 80 73 52 116 C 43 130 43 135 48 145 M 122 12 C 87 44 83 84 106 115 C 112 124 114 135 111 145');
paint.lineCap = 'round';
paint.strokeStyle = '#536331a0';
paint.lineWidth = 8;
paint.stroke(seam);
paint.strokeStyle = '#fcf7cf';
paint.lineWidth = 4.5;
paint.stroke(seam);
paint.restore();

export function createScene(canvas) {
  const ctx = canvas.getContext('2d');
  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  function resize() {
    width = canvas.clientWidth || 1;
    height = canvas.clientHeight || 1;
    pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
  }

  function draw({ phase, power, heightInAir, elapsed, effect, now, reduce, sweet, roof }) {
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const x = width * .5;
    const contactY = height * .74;
    const travel = height * .625;
    const scale = Math.min(width / 480, height / 655, 1.28);
    const holding = phase === 'ready' || phase === 'charging';
    const flying = phase === 'flight' || phase === 'window';
    const age = effect ? now - effect.at : Infinity;
    const recoil = age < .35 && !reduce ? Math.sin(Math.PI * age / .35) * 9 : 0;
    const launch = flying && elapsed < .22 && !reduce ? Math.sin(Math.PI * elapsed / .22) * 11 : 0;
    const handY = contactY + (holding ? 32 + power * 11 : 30) * scale + recoil - launch;

    if (phase === 'charging') {
      const predictedY = contactY - Math.min(1, heightInAir) * travel;
      ctx.strokeStyle = sweet ? '#ecfaadbb' : roof ? '#ffab9abb' : '#f8dfcc75';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 7]);
      ctx.beginPath();
      ctx.moveTo(x, handY - 44 * scale);
      ctx.lineTo(x, predictedY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x - 10, predictedY);
      ctx.lineTo(x + 10, predictedY);
      ctx.stroke();
    }

    if (flying) {
      const active = phase === 'window';
      ctx.strokeStyle = active ? '#edffa5' : '#fff0db42';
      ctx.lineWidth = active ? 2.5 : 1;
      ctx.beginPath();
      ctx.ellipse(x, contactY, 33 * scale, 12 * scale, 0, 0, tau);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(x + 7 * scale, handY);
    ctx.scale(scale, scale);
    ctx.rotate(holding ? -.05 - power * .09 : .06);
    const skin = ctx.createLinearGradient(-52, -28, 104, 117);
    skin.addColorStop(0, '#f0b798');
    skin.addColorStop(.29, '#e1a487');
    skin.addColorStop(.62, '#bb7a71');
    skin.addColorStop(1, '#68414c');
    ctx.fillStyle = skin;
    ctx.shadowColor = '#1e121cb0';
    ctx.shadowBlur = 20 * scale;
    ctx.shadowOffsetY = 9 * scale;
    ctx.fill(hand);
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#efba9b54';
    ctx.lineWidth = 1.5;
    ctx.stroke(hand);
    ctx.strokeStyle = '#76475175';
    ctx.lineWidth = 1.9;
    ctx.lineCap = 'round';
    ctx.stroke(crease);
    ctx.restore();

    if (holding || flying) {
      const ballX = x + (flying ? Math.sin(elapsed * 4) * Math.max(0, heightInAir) * 12 * scale : 0);
      const ballY = holding ? handY - 32 * scale : contactY - heightInAir * travel;
      const radius = (flying ? 29 - 10 * Math.max(0, heightInAir) : 29) * scale;
      ctx.save();
      ctx.translate(ballX, ballY);
      ctx.rotate(flying && !reduce ? elapsed * 5 : -.28);
      ctx.shadowColor = '#23182690';
      ctx.shadowBlur = 9 * scale;
      ctx.shadowOffsetY = 5 * scale;
      ctx.drawImage(felt, -radius, -radius, radius * 2, radius * 2);
      ctx.restore();
    }

    if (holding) {
      ctx.save();
      ctx.translate(x + 7 * scale, handY);
      ctx.scale(scale, scale);
      ctx.rotate(-.05 - power * .09);
      ctx.fillStyle = '#e1a689';
      ctx.fill(heldFingers);
      ctx.strokeStyle = '#985f60';
      ctx.lineWidth = 1.4;
      ctx.stroke(heldFingers);
      ctx.restore();
    }

    if (effect && age < .58 && !reduce) {
      const progress = age / .58;
      ctx.save();
      ctx.globalAlpha = (1 - progress) ** 2;
      ctx.strokeStyle = effect.type === 'roof' || effect.type === 'face' ? '#ffb29e' : '#efffa6';
      ctx.lineWidth = 2.5;
      const effectY = effect.type === 'roof' ? contactY - travel
        : effect.type === 'face' ? height * .97 : contactY;
      ctx.beginPath();
      ctx.ellipse(x, effectY, (25 + progress * 108) * scale, (12 + progress * 45) * scale, 0, 0, tau);
      ctx.stroke();
      if (effect.type === 'combo') {
        for (let i = 0; i < 12; i++) {
          const angle = i * tau / 12;
          const distance = (30 + progress * (88 + i % 3 * 22)) * scale;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(angle) * distance, effectY + Math.sin(angle) * distance * .55);
          ctx.lineTo(x + Math.cos(angle) * (distance + 8), effectY + Math.sin(angle) * (distance + 8) * .55);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  resize();
  return { draw, resize };
}
