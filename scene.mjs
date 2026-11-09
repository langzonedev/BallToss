import { catchHeight, faceHeight, roofHeight } from './physics.mjs';

const tau = 2 * Math.PI;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const mix = (from, to, amount) => from + (to - from) * amount;

// The same wrist anchor lets both silhouettes follow one wrist motion.
const wrist = 'C 56 74 69 88 92 104 C 143 139 188 177 245 238 L 202 277 C 164 220 125 176 86 144 C 62 124 43 107 29 83 C 19 68 9 62 -6 55';
const openHand = new Path2D('M -6 55 C -23 48 -30 34 -37 20 C -42 9 -50 2 -49 -5 C -48 -12 -42 -14 -35 -10 C -26 -6 -19 4 -13 10 C -10 14 -6 11 -7 4 L -12 -28 C -14 -38 -10 -43 -4 -42 C 3 -42 6 -35 7 -27 L 11 -12 C 12 -9 15 -10 15 -14 L 12 -47 C 11 -56 15 -60 21 -59 C 27 -58 30 -52 30 -45 L 32 -18 C 32 -15 35 -15 36 -19 L 40 -43 C 41 -51 45 -54 51 -52 C 57 -49 58 -44 57 -36 L 53 -13 C 52 -10 55 -9 57 -13 L 63 -27 C 67 -35 72 -37 77 -33 C 83 -29 81 -23 78 -15 L 70 9 C 66 25 54 40 54 57 C 54 64 54 69 56 74 ' + wrist + ' Z');
const gripHand = new Path2D('M -6 55 C -20 50 -27 42 -33 29 C -39 17 -43 8 -41 2 C -38 -6 -30 -4 -25 2 L -12 16 C -10 19 -6 19 -6 15 C -6 4 -4 -12 3 -23 C 11 -37 24 -39 33 -33 C 40 -37 50 -33 53 -25 C 62 -25 68 -20 69 -13 C 77 -10 78 -2 74 8 C 69 23 57 40 55 55 C 54 63 54 70 56 74 ' + wrist + ' Z');
const thumb = new Path2D('M -6 55 C -19 51 -29 44 -34 33 C -39 23 -46 15 -43 8 C -40 2 -33 3 -27 9 C -20 15 -17 23 -10 25 C -1 28 9 24 16 31 C 24 38 21 50 13 55');
const knuckles = new Path2D('M 31 -29 Q 24 -17 24 -10 M 51 -24 Q 43 -13 42 -5 M 67 -13 Q 60 -5 57 4');
const palmLines = new Path2D('M -8 18 Q 7 20 14 37 M 14 8 Q 27 9 37 20 M 34 31 Q 43 38 44 48 M 47 68 Q 44 75 49 82');
const forearmLight = new Path2D('M 53 89 C 62 107 80 123 99 138 C 137 169 174 212 211 264');
const gripLines = new Path2D('M -32 12 Q -37 14 -36 20 Q -34 24 -31 24 M 8 34 Q 15 40 15 47 M 47 68 Q 44 75 49 82');

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

// Positive height travels away from the camera. Below the hand the ball converges
// on the lens and the near plane keeps the perspective scale finite.
function projectBall(z, width, height, scale, reduce) {
  const focalDepth = .46;
  const size = focalDepth / Math.max(reduce ? .23 : .095, focalDepth + z);
  const distance = focalDepth / (focalDepth + Math.max(0, z));
  const towardLens = clamp(z / faceHeight, 0, 1);
  return {
    x: width * mix(.5 + .073 * distance, .5, towardLens),
    y: height * mix(.29 + .39 * distance, .5, towardLens ** 1.35),
    radius: 29 * scale * size,
  };
}

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

  function drawBall({ x, y, radius }, angle, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(felt, -radius, -radius, radius * 2, radius * 2);
    ctx.restore();
  }

  function drawHand(x, y, scale, angle, gripping, foreground = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale * .86, scale);
    const skin = ctx.createLinearGradient(-31, -35, 116, 135);
    skin.addColorStop(0, '#eab498');
    skin.addColorStop(.29, '#e0a68c');
    skin.addColorStop(.55, '#be847b');
    skin.addColorStop(.79, '#935f65');
    skin.addColorStop(1, '#76505a');
    ctx.fillStyle = skin;
    ctx.strokeStyle = '#78505b';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (foreground) {
      ctx.fill(thumb);
      ctx.strokeStyle = '#a16c69';
      ctx.stroke(thumb);
      ctx.stroke(gripLines);
    } else {
      const shape = gripping ? gripHand : openHand;
      ctx.shadowColor = '#2518277a';
      ctx.shadowBlur = 14 * scale;
      ctx.shadowOffsetY = 7 * scale;
      ctx.fill(shape);
      ctx.shadowColor = 'transparent';
      ctx.stroke(shape);
      if (gripping) ctx.stroke(knuckles);
      else ctx.stroke(palmLines);
      ctx.strokeStyle = '#ffc3a52e';
      ctx.stroke(forearmLight);
    }
    ctx.restore();
  }

  function draw({ phase, power, heightInAir, elapsed, effect, now, reduce, sweet, roof }) {
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const scale = Math.min(width / 455, height / 620, 1.4);
    const holding = phase === 'ready' || phase === 'charging';
    const flying = phase === 'flight' || phase === 'window';
    const age = effect ? now - effect.at : Infinity;
    const faceImpact = effect?.type === 'face';
    const roofImpact = effect?.type === 'roof';
    const lens = projectBall(faceHeight, width, height, scale, reduce);
    const overhead = projectBall(roofHeight, width, height, scale, reduce);
    const contact = projectBall(0, width, height, scale, reduce);
    const target = projectBall(catchHeight, width, height, scale, reduce);
    const ball = projectBall(heightInAir, width, height, scale, reduce);
    const jolt = faceImpact && age < .22 && !reduce ? Math.sin(age * 62) * (1 - age / .22) : 0;
    const recoil = age < .25 && !reduce && !faceImpact && !roofImpact ? Math.sin(Math.PI * age / .25) * 8 : 0;
    const flick = flying && elapsed < .18 && !reduce ? Math.sin(Math.PI * elapsed / .18) * 9 : 0;
    const drop = phase === 'over' ? Math.min(1, age / .25) : clamp(heightInAir / faceHeight, 0, 1);
    const handX = contact.x + (power * 5 + drop * 26 + jolt * 5) * scale;
    const flinch = faceImpact && !reduce ? clamp(age / .20, 0, 1) * 60 : 0;
    const handY = contact.y + (power * 13 + drop * 43 + flinch + recoil - flick + jolt * 6) * scale;
    const wristAngle = .06 + power * .19 - flick * .017 + drop * .20;

    // The ceiling shadow tightens as the ball approaches the surface.
    if (flying && heightInAir > .25) {
      const proximity = clamp((heightInAir - .25) / (roofHeight - .25), 0, 1);
      const shadowRadius = mix(35, 9, proximity) * scale;
      const shadowX = overhead.x + (1 - proximity) * 22 * scale;
      const shadowY = overhead.y - (1 - proximity) * 20 * scale;
      const shadow = ctx.createRadialGradient(shadowX, shadowY, 0, shadowX, shadowY, shadowRadius);
      shadow.addColorStop(0, 'rgba(40, 21, 37, ' + proximity * .48 + ')');
      shadow.addColorStop(1, 'transparent');
      ctx.fillStyle = shadow;
      ctx.fillRect(shadowX - shadowRadius, shadowY - shadowRadius, shadowRadius * 2, shadowRadius * 2);
    }

    if (phase === 'charging') {
      const peak = roof ? overhead : ball;
      ctx.strokeStyle = sweet ? '#ecfaadc9' : roof ? '#ffab9ac9' : '#f8dfcc83';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 7]);
      ctx.beginPath();
      ctx.moveTo(handX, handY - 30 * scale);
      ctx.lineTo(peak.x, peak.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(peak.x, peak.y, 5 + peak.radius, 0, tau);
      ctx.stroke();
    }

    const angle = flying && !reduce ? elapsed * 6 - .28 : -.28;
    if (flying && heightInAir >= 0) drawBall(ball, angle);
    drawHand(handX, handY, scale, wristAngle, holding);

    if (holding) {
      drawBall({ x: handX, y: handY, radius: contact.radius }, -.28 + power * .35);
      drawHand(handX, handY, scale, wristAngle, true, true);
    }

    if (flying) {
      const active = phase === 'window';
      ctx.strokeStyle = active ? '#edffa5' : '#fff0db66';
      ctx.lineWidth = active ? 2.4 : 1;
      ctx.beginPath();
      ctx.ellipse(target.x, target.y, target.radius + 6 * scale, target.radius + 6 * scale, 0, 0, tau);
      ctx.stroke();
      if (heightInAir < 0) drawBall(ball, angle);
    }

    if (roofImpact && age < .25) {
      const fade = 1 - age / .25;
      const rebound = reduce ? overhead : projectBall(roofHeight - age * .65, width, height, scale, reduce);
      drawBall(rebound, -.28, fade);
    }

    if (faceImpact) {
      const reach = clamp(age / .08, 0, 1);
      const radius = reduce ? lens.radius : mix(lens.radius, Math.max(width, height) * .61, reach);
      const fade = 1 - clamp((age - .025) / .19, 0, 1);
      ctx.fillStyle = 'rgba(31, 15, 31, ' + (.27 + .20 * fade) + ')';
      ctx.fillRect(0, 0, width, height);
      if (fade > 0) drawBall({ ...lens, radius }, -.28, fade);
    }

    if (effect && !faceImpact && age < .55 && !reduce) {
      const progress = age / .55;
      const point = roofImpact ? overhead : target;
      ctx.save();
      ctx.globalAlpha = (1 - progress) ** 2;
      ctx.strokeStyle = roofImpact ? '#ffb29e' : '#efffa6';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(point.x, point.y, (24 + progress * 93) * scale, (18 + progress * 68) * scale, 0, 0, tau);
      ctx.stroke();
      if (effect.type === 'combo') {
        for (let i = 0; i < 12; i++) {
          const angle = i * tau / 12;
          const distance = (30 + progress * (88 + i % 3 * 22)) * scale;
          ctx.beginPath();
          ctx.moveTo(point.x + Math.cos(angle) * distance, point.y + Math.sin(angle) * distance * .65);
          ctx.lineTo(point.x + Math.cos(angle) * (distance + 8), point.y + Math.sin(angle) * (distance + 8) * .65);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  resize();
  return { draw, resize };
}
