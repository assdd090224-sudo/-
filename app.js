/* ==========================================================================
   Electronegativity UNO JavaScript - Game Engine & Canvas Animations
   ========================================================================== */

// --- 1. 원소 및 특수 카드 데이터 정의 ---
const ELEMENT_DATABASE = [
  // 1주기
  { symbol: 'H', name: '수소', atomicNumber: 1, group: 1, period: 1, electronegativity: 2.20, category: 'nonmetal' },
  { symbol: 'He', name: '헬륨', atomicNumber: 2, group: 18, period: 1, electronegativity: 0, category: 'noble', wild: true },
  
  // 2주기
  { symbol: 'Li', name: '리튬', atomicNumber: 3, group: 1, period: 2, electronegativity: 0.98, category: 'metal' },
  { symbol: 'Be', name: '베릴륨', atomicNumber: 4, group: 2, period: 2, electronegativity: 1.57, category: 'metal' },
  { symbol: 'B', name: '붕소', atomicNumber: 5, group: 13, period: 2, electronegativity: 2.04, category: 'metalloid' },
  { symbol: 'C', name: '탄소', atomicNumber: 6, group: 14, period: 2, electronegativity: 2.55, category: 'nonmetal' },
  { symbol: 'N', name: '질소', atomicNumber: 7, group: 15, period: 2, electronegativity: 3.04, category: 'nonmetal' },
  { symbol: 'O', name: '산소', atomicNumber: 8, group: 16, period: 2, electronegativity: 3.44, category: 'nonmetal' },
  { symbol: 'F', name: '플루오린', atomicNumber: 9, group: 17, period: 2, electronegativity: 3.98, category: 'halogen' },
  { symbol: 'Ne', name: '네온', atomicNumber: 10, group: 18, period: 2, electronegativity: 0, category: 'noble', wild: true },
  
  // 3주기
  { symbol: 'Na', name: '소듐', atomicNumber: 11, group: 1, period: 3, electronegativity: 0.93, category: 'metal' },
  { symbol: 'Mg', name: '마그네슘', atomicNumber: 12, group: 2, period: 3, electronegativity: 1.31, category: 'metal' },
  { symbol: 'Al', name: '알루미늄', atomicNumber: 13, group: 13, period: 3, electronegativity: 1.61, category: 'metal' },
  { symbol: 'Si', name: '규소', atomicNumber: 14, group: 14, period: 3, electronegativity: 1.90, category: 'metalloid' },
  { symbol: 'P', name: '인', atomicNumber: 15, group: 15, period: 3, electronegativity: 2.19, category: 'nonmetal' },
  { symbol: 'S', name: '황', atomicNumber: 16, group: 16, period: 3, electronegativity: 2.58, category: 'nonmetal' },
  { symbol: 'Cl', name: '염소', atomicNumber: 17, group: 17, period: 3, electronegativity: 3.16, category: 'halogen' },
  { symbol: 'Ar', name: '아르곤', atomicNumber: 18, group: 18, period: 3, electronegativity: 0, category: 'noble', wild: true },
  
  // 특수 액션 카드 (화학 컨셉 연계형)
  { symbol: 'Cat', name: '촉매 (Skip)', atomicNumber: 0, group: 0, period: 0, electronegativity: 2.50, category: 'nonmetal', action: 'skip' },
  { symbol: 'Et', name: '전자 탈취 (Draw 2)', atomicNumber: 0, group: 0, period: 0, electronegativity: 3.20, category: 'halogen', action: 'draw2' },
  { symbol: 'Rev', name: '역전 (Reverse)', atomicNumber: 0, group: 0, period: 0, electronegativity: 1.00, category: 'metal', action: 'reverse' }
];

// --- 2. 게임 상태 (Game State) ---
const state = {
  deck: [],
  discardPile: [],
  players: {
    player: { name: 'Player (나)', hand: [] },
    ai1: { name: 'AI-1 (연구원 Alpha)', hand: [] },
    ai2: { name: 'AI-2 (연구원 Beta)', hand: [] }
  },
  playerOrder: ['player', 'ai1', 'ai2'],
  currentTurnIndex: 0,
  playDirection: 1, // 1: 시계 방향, -1: 반시계 방향
  targetBondType: 'polar', // polar, nonpolar, ionic
  gameMode: 'beginner', // beginner, expert
  isGameActive: false,
  isWaitingForWildSelect: false,
  canvasAnim: null,
  isProcessingTurn: false
};

// --- 3. Web Audio API 사운드 신디사이저 ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function synthSound(freq, duration, type = 'sine', slideTo = null) {
  try {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, audioCtx.currentTime + duration);
    }
    
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn('Audio play failed:', e);
  }
}

const sounds = {
  playCard: () => synthSound(600, 0.15, 'triangle', 900),
  drawCard: () => synthSound(400, 0.2, 'sine', 200),
  error: () => synthSound(150, 0.3, 'sawtooth'),
  win: () => {
    synthSound(523.25, 0.15); // C5
    setTimeout(() => synthSound(659.25, 0.15), 150); // E5
    setTimeout(() => synthSound(783.99, 0.15), 300); // G5
    setTimeout(() => synthSound(1046.50, 0.4, 'sine', 1200), 450); // C6
  },
  lose: () => {
    synthSound(392.00, 0.2); // G4
    setTimeout(() => synthSound(349.23, 0.2), 200); // F4
    setTimeout(() => synthSound(311.13, 0.2), 400); // Eb4
    setTimeout(() => synthSound(246.94, 0.5, 'sawtooth', 100), 600); // B3
  },
  bond: (type) => {
    if (type === 'nonpolar') {
      synthSound(300, 0.4, 'sine', 300); // 부드러운 드론
    } else if (type === 'polar') {
      synthSound(440, 0.3, 'triangle', 880); // 반짝이는 스위프
    } else {
      // ionic
      synthSound(200, 0.1, 'sawtooth'); // 이온 결합의 짜릿한 지직 소리
      setTimeout(() => synthSound(900, 0.2, 'sine', 100), 100);
    }
  }
};

// --- 4. 캔버스 애니메이션 엔진 (HTML5 Canvas) ---
const canvas = document.getElementById('animation-canvas');
const ctx = canvas.getContext('2d');

class BondAnimation {
  constructor(element1, element2, bondType, deltaEN) {
    this.el1 = element1;
    this.el2 = element2;
    this.bondType = bondType;
    this.deltaEN = deltaEN;
    
    this.progress = 0; // 0 to 1
    this.particles = [];
    this.pulse = 0;
    this.active = true;
    
    this.init();
  }
  
  init() {
    // 결합용 전자 파티클들 생성
    const particleCount = this.bondType === 'nonpolar' ? 12 : this.bondType === 'polar' ? 18 : 6;
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        angle: Math.random() * Math.PI * 2,
        speed: 0.03 + Math.random() * 0.04,
        distanceRatio: Math.random() * 0.4 + 0.3, // 결합 영역 크기 비율
        size: 2 + Math.random() * 3
      });
    }
  }
  
  update() {
    this.progress = Math.min(this.progress + 0.02, 1);
    this.pulse += 0.05;
    
    if (this.progress >= 1 && this.pulse > Math.PI * 4) {
      // 애니메이션 충분히 진행된 후 오버레이 띄우기
      document.getElementById('bond-info-overlay').classList.remove('hidden');
    }
  }
  
  draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const x1 = canvas.width * 0.25;
    const x2 = canvas.width * 0.75;
    const cy = canvas.height * 0.5;
    
    const r1 = 35;
    const r2 = 35;
    
    // 점진적으로 카드가 활성화되는 연출 (슬라이드 인)
    const curX1 = x1 + (1 - this.progress) * -100;
    const curX2 = x2 + (1 - this.progress) * 100;
    const alpha = this.progress;
    
    // 1. 원소 정보 텍스트 및 전하 기호 그리기
    ctx.save();
    ctx.globalAlpha = alpha;
    
    // 원자 1 (좌측)
    ctx.beginPath();
    ctx.arc(curX1, cy, r1, 0, Math.PI * 2);
    ctx.fillStyle = this.getElementColor(this.el1.category, 0.15);
    ctx.fill();
    ctx.strokeStyle = this.getElementColor(this.el1.category, 1);
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.font = "bold 20px 'Rajdhani'";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.el1.symbol, curX1, cy - 5);
    ctx.font = "11px 'Rajdhani'";
    ctx.fillStyle = varColor('text-muted');
    ctx.fillText(`EN ${this.el1.electronegativity || '-'}`, curX1, cy + 15);
    
    // 원자 2 (우측)
    ctx.beginPath();
    ctx.arc(curX2, cy, r2, 0, Math.PI * 2);
    ctx.fillStyle = this.getElementColor(this.el2.category, 0.15);
    ctx.fill();
    ctx.strokeStyle = this.getElementColor(this.el2.category, 1);
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.font = "bold 20px 'Rajdhani'";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(this.el2.symbol, curX2, cy - 5);
    ctx.font = "11px 'Rajdhani'";
    ctx.fillStyle = varColor('text-muted');
    ctx.fillText(`EN ${this.el2.electronegativity || '-'}`, curX2, cy + 15);
    
    // 2. 전자 구름 및 공유 전자쌍 궤도 시각화
    if (this.el1.electronegativity > 0 && this.el2.electronegativity > 0) {
      const en1 = this.el1.electronegativity;
      const en2 = this.el2.electronegativity;
      
      if (this.bondType === 'nonpolar') {
        // --- 무극성 공유 결합: 대칭적인 공유 구름 ---
        const cloudGrad = ctx.createRadialGradient(
          (curX1 + curX2) / 2, cy, 5,
          (curX1 + curX2) / 2, cy, 90
        );
        cloudGrad.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
        cloudGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.15)');
        cloudGrad.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.ellipse((curX1 + curX2) / 2, cy, 90, 45, 0, 0, Math.PI * 2);
        ctx.fillStyle = cloudGrad;
        ctx.fill();
        
        // 전자는 두 원자 사이를 8자 또는 타원 궤도로 균등하게 비행
        this.particles.forEach(p => {
          p.angle += p.speed;
          const px = (curX1 + curX2) / 2 + Math.cos(p.angle) * 70 * p.distanceRatio;
          const py = cy + Math.sin(p.angle * 2) * 20 * p.distanceRatio; // 8자 궤도
          
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fillStyle = '#60a5fa';
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#3b82f6';
          ctx.fill();
          ctx.shadowBlur = 0;
        });
        
      } else if (this.bondType === 'polar') {
        // --- 극성 공유 결합: 높은 전기음성도 쪽으로 치우친 구름 ---
        const isLeftHigher = en1 > en2;
        const higherX = isLeftHigher ? curX1 : curX2;
        const lowerX = isLeftHigher ? curX2 : curX1;
        const centerOffset = isLeftHigher ? -20 : 20;
        
        const cloudGrad = ctx.createRadialGradient(
          (curX1 + curX2) / 2 + centerOffset, cy, 5,
          (curX1 + curX2) / 2 + centerOffset, cy, 95
        );
        cloudGrad.addColorStop(0, 'rgba(244, 63, 94, 0.45)');
        cloudGrad.addColorStop(0.6, 'rgba(244, 63, 94, 0.15)');
        cloudGrad.addColorStop(1, 'transparent');
        
        // 비대칭 물방울 모양을 드로잉하기 위해 베지에 곡선 활용
        ctx.beginPath();
        ctx.moveTo(higherX, cy - 45);
        ctx.bezierCurveTo(higherX + centerOffset * 2, cy - 45, lowerX, cy - 25, lowerX, cy);
        ctx.bezierCurveTo(lowerX, cy + 25, higherX + centerOffset * 2, cy + 45, higherX, cy + 45);
        ctx.bezierCurveTo(higherX - centerOffset * 2, cy + 45, higherX - centerOffset * 2, cy - 45, higherX, cy - 45);
        ctx.fillStyle = cloudGrad;
        ctx.fill();
        
        // 부분 전하 표시 (delta+ / delta-)
        ctx.font = "bold 15px 'Orbit'";
        ctx.fillStyle = "#fb7185";
        ctx.fillText("δ-", higherX, cy - 48);
        ctx.fillStyle = "#60a5fa";
        ctx.fillText("δ+", lowerX, cy - 48);
        
        // 전자는 더 전기음성도가 높은 원자 쪽으로 공전 중심이 치우침
        this.particles.forEach(p => {
          p.angle += p.speed;
          // 높은 쪽에 70%, 낮은 쪽에 30% 머무는 가상의 비대칭 공전
          const biasX = (higherX * 0.7 + lowerX * 0.3);
          const px = biasX + Math.cos(p.angle) * 55 * p.distanceRatio;
          const py = cy + Math.sin(p.angle) * 30 * p.distanceRatio;
          
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fillStyle = '#fda4af';
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#f43f5e';
          ctx.fill();
          ctx.shadowBlur = 0;
        });
        
      } else {
        // --- 이온 결합: 완전히 쪼개진 전자 구름 및 전하 인력 궤도 ---
        const isLeftMetal = en1 < en2;
        const metalX = isLeftMetal ? curX1 : curX2;
        const nonmetalX = isLeftMetal ? curX2 : curX1;
        
        // 금속 양이온 구름 (작음)
        const metalGrad = ctx.createRadialGradient(metalX, cy, 2, metalX, cy, 30);
        metalGrad.addColorStop(0, 'rgba(168, 85, 247, 0.2)');
        metalGrad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(metalX, cy, 30, 0, Math.PI * 2);
        ctx.fillStyle = metalGrad;
        ctx.fill();
        
        // 비금속 음이온 구름 (큼)
        const nonmetalGrad = ctx.createRadialGradient(nonmetalX, cy, 5, nonmetalX, cy, 55);
        nonmetalGrad.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
        nonmetalGrad.addColorStop(0.7, 'rgba(168, 85, 247, 0.15)');
        nonmetalGrad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(nonmetalX, cy, 55, 0, Math.PI * 2);
        ctx.fillStyle = nonmetalGrad;
        ctx.fill();
        
        // 이온 기호 (+ / -)
        ctx.font = "bold 14px 'Orbit'";
        ctx.fillStyle = "#c084fc";
        ctx.fillText("+", metalX + 10, cy - 35);
        ctx.fillText("-", nonmetalX - 10, cy - 35);
        
        // 전자는 완전히 음이온 주위만 도는 형태로 시각화
        this.particles.forEach(p => {
          p.angle += p.speed * 1.5;
          const px = nonmetalX + Math.cos(p.angle) * 45 * p.distanceRatio;
          const py = cy + Math.sin(p.angle) * 45 * p.distanceRatio;
          
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fillStyle = '#d8b4fe';
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#c084fc';
          ctx.fill();
          ctx.shadowBlur = 0;
        });
        
        // 두 이온 간 정전기적 궤도 선 (Sparkle/Zap)
        if (Math.sin(this.pulse * 5) > 0.4) {
          ctx.beginPath();
          ctx.moveTo(metalX + 35, cy);
          // 번개 모양 지그재그
          const midX = (metalX + nonmetalX) / 2;
          ctx.lineTo(midX - 10, cy - 8);
          ctx.lineTo(midX + 10, cy + 8);
          ctx.lineTo(nonmetalX - 35, cy);
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.8)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    } else {
      // Noble gas (Wild) 결합 애니메이션: 우주 성운 같은 신비한 구름
      const cloudGrad = ctx.createRadialGradient(canvas.width/2, cy, 5, canvas.width/2, cy, 110);
      cloudGrad.addColorStop(0, 'rgba(250, 204, 21, 0.3)');
      cloudGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.15)');
      cloudGrad.addColorStop(1, 'transparent');
      
      ctx.beginPath();
      ctx.arc(canvas.width/2, cy, 110, 0, Math.PI * 2);
      ctx.fillStyle = cloudGrad;
      ctx.fill();
      
      // 행성 고리처럼 돌고 도는 자유 전자들
      this.particles.forEach((p, idx) => {
        p.angle += p.speed * 0.8;
        const px = canvas.width/2 + Math.cos(p.angle) * (80 + idx * 6) * p.distanceRatio;
        const py = cy + Math.sin(p.angle) * 25 * p.distanceRatio;
        
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = '#fef08a';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#facc15';
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    }
    
    ctx.restore();
  }
  
  getElementColor(category, alpha) {
    if (category === 'metal') return `rgba(0, 240, 255, ${alpha})`;
    if (category === 'metalloid') return `rgba(16, 185, 129, ${alpha})`;
    if (category === 'nonmetal') return `rgba(249, 115, 22, ${alpha})`;
    if (category === 'halogen') return `rgba(217, 70, 239, ${alpha})`;
    return `rgba(250, 204, 21, ${alpha})`; // noble (wild)
  }
}

function varColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${varName}`).trim();
}

function startLoop() {
  function loop() {
    if (state.canvasAnim) {
      state.canvasAnim.update();
      state.canvasAnim.draw();
      requestAnimationFrame(loop);
    }
  }
  requestAnimationFrame(loop);
}

// --- 5. 게임 엔진 핵심 로직 (Engine) ---

// 덱 빌딩 및 초기화
function createDeck() {
  const deck = [];
  // 각 원소 복사본 추가 (화학 밸런스를 맞춰 개수 조정)
  ELEMENT_DATABASE.forEach(card => {
    let copies = 2; // 기본 2장씩
    if (card.wild) copies = 2; // 비활성 기체 2장씩 (총 6장)
    else if (card.action) copies = 2; // 액션 카드 2장씩 (총 6장)
    else {
      // 일반 원소는 결합 다양성을 위해 3장씩 추가
      copies = 3;
    }
    
    for (let i = 0; i < copies; i++) {
      deck.push({ ...card, id: `${card.symbol}-${i}-${Math.random().toString(36).substr(2, 4)}` });
    }
  });
  
  // 셔플
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// 결합 관계 판정
function checkBondType(card1, card2) {
  if (card1.electronegativity === 0 || card2.electronegativity === 0) {
    return 'wild'; // 비활성 기체와의 결합은 특수 결합(와일드) 처리
  }
  const delta = Math.abs(card1.electronegativity - card2.electronegativity);
  if (delta < 0.4) return 'nonpolar';
  if (delta < 1.7) return 'polar';
  return 'ionic';
}

function getBondName(type) {
  if (type === 'nonpolar') return '무극성 공유 결합';
  if (type === 'polar') return '극성 공유 결합';
  if (type === 'ionic') return '이온 결합';
  return '특수 화학 반응';
}

// 카드 제출 규칙 충족 여부 체크
function isCardPlayable(card, activeCard, targetBondType) {
  // 1. 내가 내는 카드가 비활성 기체(와일드)인 경우 -> 언제나 낼 수 있음
  if (card.wild) return true;
  
  // 2. 바닥 카드가 비활성 기체(와일드)인 경우 -> 어떤 카드든 낼 수 있음
  if (activeCard.wild) return true;
  
  // 3. 족(Group) 매칭
  if (card.group !== 0 && card.group === activeCard.group) return true;
  
  // 4. 주기(Period) 매칭
  if (card.period !== 0 && card.period === activeCard.period) return true;
  
  // 5. 액션 카드끼리 매칭 (같은 종류의 액션 카드인 경우)
  if (card.action && card.action === activeCard.action) return true;
  
  // 6. 전기음성도 차이 결합 규칙 충족 매칭
  const bond = checkBondType(card, activeCard);
  if (bond === targetBondType) return true;
  
  return false;
}

// 게임 시작
function startGame() {
  // 모드 설정
  const selectedMode = document.querySelector('input[name="gameMode"]:checked').value;
  state.gameMode = selectedMode;
  document.getElementById('mode-badge').innerText = selectedMode === 'beginner' ? '초보자 모드' : '숙련자 모드';
  if (selectedMode === 'beginner') {
    document.getElementById('mode-badge').className = 'badge';
  } else {
    document.getElementById('mode-badge').className = 'badge btn-danger';
  }
  
  state.deck = createDeck();
  state.discardPile = [];
  state.playDirection = 1;
  state.currentTurnIndex = 0;
  state.isWaitingForWildSelect = false;
  state.isProcessingTurn = false;
  
  // 각 플레이어 카드 분배 (7장씩)
  state.players.player.hand = [];
  state.players.ai1.hand = [];
  state.players.ai2.hand = [];
  
  for (let i = 0; i < 7; i++) {
    state.players.player.hand.push(state.deck.pop());
    state.players.ai1.hand.push(state.deck.pop());
    state.players.ai2.hand.push(state.deck.pop());
  }
  
  // 첫 바닥 카드 설정 (일반 원소만 나오도록 뽑기)
  let initialCardIndex = state.deck.length - 1;
  while (initialCardIndex >= 0 && (state.deck[initialCardIndex].wild || state.deck[initialCardIndex].action)) {
    initialCardIndex--;
  }
  
  // 만약 덱 전체가 액션뿐인 극단적 상황 방지
  if (initialCardIndex < 0) initialCardIndex = state.deck.length - 1;
  
  const initialCard = state.deck.splice(initialCardIndex, 1)[0];
  state.discardPile.push(initialCard);
  
  // 첫 타겟 결합 유형은 무작위 지정
  const bondTypes = ['nonpolar', 'polar', 'ionic'];
  state.targetBondType = bondTypes[Math.floor(Math.random() * bondTypes.length)];
  updateTargetBondUI();
  
  // UI 전환
  document.getElementById('start-screen').classList.remove('active');
  document.getElementById('game-board').classList.add('active');
  state.isGameActive = true;
  
  // 화면 및 로그 초기화
  clearLogs();
  logMessage(`실험실이 가동되었습니다. 게임 모드: ${selectedMode === 'beginner' ? '초보자' : '숙련자'}`, 'system');
  logMessage(`첫 실험 원소: ${initialCard.name} (${initialCard.symbol}, 전기음성도: ${initialCard.electronegativity})`, 'system');
  
  // 캔버스 정적 첫 화면 그리기
  state.canvasAnim = new BondAnimation(initialCard, initialCard, 'nonpolar', 0);
  startLoop();
  
  updateUI();
  
  // 턴 시작 알림
  triggerTurn();
}

// 턴 관리 루프
function triggerTurn() {
  if (!state.isGameActive) return;
  
  const currentTurnPlayer = state.playerOrder[state.currentTurnIndex];
  
  // 턴 표시 업데이트
  document.getElementById('current-turn-display').innerText = state.players[currentTurnPlayer].name;
  
  // 모든 패널 활성 턴 강조 테두리 제거
  document.getElementById('panel-ai1').classList.remove('active-turn');
  document.getElementById('panel-ai2').classList.remove('active-turn');
  document.getElementById('player-hand').classList.remove('active-turn');
  document.getElementById('player-action-msg').classList.add('hidden');
  
  if (currentTurnPlayer === 'player') {
    document.getElementById('player-action-msg').classList.remove('hidden');
    state.isProcessingTurn = false;
    highlightPlayableCards();
  } else {
    // AI 턴 진행 (지연 효과 적용)
    state.isProcessingTurn = true;
    setTimeout(() => {
      aiPlay(currentTurnPlayer);
    }, 1800);
  }
}

// 턴 넘기기
function nextTurn() {
  if (!state.isGameActive) return;
  
  // 다음 턴 플레이어 인덱스 연산
  state.currentTurnIndex = (state.currentTurnIndex + state.playDirection + state.playerOrder.length) % state.playerOrder.length;
  triggerTurn();
}

// 플레이어 카드 제출 시도
function playerPlayCard(cardId) {
  if (state.isProcessingTurn || state.isWaitingForWildSelect) return;
  
  const playerHand = state.players.player.hand;
  const cardIndex = playerHand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return;
  
  const card = playerHand[cardIndex];
  const activeCard = getActiveCard();
  
  if (isCardPlayable(card, activeCard, state.targetBondType)) {
    // 제출 진행
    playerHand.splice(cardIndex, 1);
    sounds.playCard();
    playCardCommon(card, 'player');
  } else {
    // 낼 수 없는 경우 경고음 및 흔들기 연출
    sounds.error();
    flashError(cardId);
    logMessage(`규칙에 맞지 않아 ${card.name}(${card.symbol}) 원소를 반응기에 투입할 수 없습니다.`, 'system');
  }
}

function flashError(cardId) {
  const cardEl = document.querySelector(`[data-id="${cardId}"]`);
  if (cardEl) {
    cardEl.classList.add('shake');
    setTimeout(() => cardEl.classList.remove('shake'), 500);
  }
}

// 카드 제출 공통 프로세스
function playCardCommon(card, playerKey) {
  const prevCard = getActiveCard();
  state.discardPile.push(card);
  
  // 결합 유형 업데이트 및 캔버스 애니메이션 트리거
  document.getElementById('bond-info-overlay').classList.add('hidden');
  
  let bond = 'wild';
  let delta = 0;
  if (!card.wild && !prevCard.wild) {
    bond = checkBondType(card, prevCard);
    delta = Math.abs(card.electronegativity - prevCard.electronegativity).toFixed(2);
    
    // 만약 액션 카드가 아니라면 타겟 결합 유형이 플레이어의 제출로 자동 갱신됨 (같은 주기/족 매칭 전환 고려)
    if (!card.wild && !card.action) {
      state.targetBondType = bond;
      updateTargetBondUI();
    }
    sounds.bond(bond);
  } else {
    sounds.bond('nonpolar');
  }
  
  // 캔버스 애니메이션 인스턴스 갱신
  state.canvasAnim = new BondAnimation(prevCard, card, bond, delta);
  
  // 로그 작성
  const playerName = state.players[playerKey].name;
  if (card.wild) {
    logMessage(`${playerName}님이 비활성 기체 ${card.name}(${card.symbol})을(를) 뿜었습니다! (만능 와일드)`, playerKey);
  } else if (card.action) {
    logMessage(`${playerName}님이 특수 카드 [${card.name}]를 제출했습니다.`, playerKey);
  } else {
    const bondName = getBondName(bond);
    logMessage(`${playerName}님이 ${card.name}(${card.symbol})을(를) 결합! -> ${bondName} 형성 (&Delta;EN = ${delta})`, 'bond');
  }
  
  // 특수 카드 액션 처리
  if (card.wild) {
    if (playerKey === 'player') {
      // 플레이어는 모달 창을 띄워 선택 대기
      state.isWaitingForWildSelect = true;
      document.getElementById('wild-modal').classList.remove('hidden');
    } else {
      // AI는 현재 가지고 있는 패 중에서 가장 결합을 만들기 유리한 결합 타입을 선택
      aiSelectWild(playerKey);
    }
    updateUI();
    return; // 와일드 선택 완료 후 턴이 진행되도록 리턴
  }
  
  processActionCard(card, playerKey);
}

// 액션 카드 처리
function processActionCard(card, playerKey) {
  if (card.action === 'skip') {
    // 1턴 건너뛰기
    const nextPlayerIndex = (state.currentTurnIndex + state.playDirection + state.playerOrder.length) % state.playerOrder.length;
    const nextPlayerKey = state.playerOrder[nextPlayerIndex];
    showAlert(nextPlayerKey, '촉매 작용! Skip');
    logMessage(`[촉매] 효과로 인해 ${state.players[nextPlayerKey].name}님의 차례가 넘어갑니다.`, 'system');
    
    state.currentTurnIndex = nextPlayerIndex;
    updateUI();
    checkWinCondition();
    if (state.isGameActive) nextTurn();
    
  } else if (card.action === 'draw2') {
    // 다음 차례 플레이어 2장 강제 드로우 및 턴 스킵
    const nextPlayerIndex = (state.currentTurnIndex + state.playDirection + state.playerOrder.length) % state.playerOrder.length;
    const nextPlayerKey = state.playerOrder[nextPlayerIndex];
    
    showAlert(nextPlayerKey, '전자 탈취! Draw 2');
    logMessage(`[전자 탈취] 효과! ${state.players[nextPlayerKey].name}님이 전자를 뺏겨 2장 뽑고 턴을 뺏깁니다.`, 'system');
    
    drawCards(nextPlayerKey, 2);
    
    state.currentTurnIndex = nextPlayerIndex; // 스킵
    updateUI();
    checkWinCondition();
    if (state.isGameActive) nextTurn();
    
  } else if (card.action === 'reverse') {
    // 진행 방향 반전
    state.playDirection *= -1;
    const dirStr = state.playDirection === 1 ? '시계 방향 ↻' : '반시계 방향 ↺';
    document.getElementById('play-direction-display').innerText = dirStr;
    logMessage(`[엔트로피 역전] 결합 방향이 바뀌었습니다! (${dirStr})`, 'system');
    
    // 1v1 구도였다면 스킵 효과가 났겠지만, 3명 대항마이므로 방향만 변경 후 정상 다음 플레이어로 턴 전환
    updateUI();
    checkWinCondition();
    if (state.isGameActive) nextTurn();
  } else {
    // 일반 원소 카드 플레이
    updateUI();
    checkWinCondition();
    if (state.isGameActive) nextTurn();
  }
}

// 승리 조건 체크
function checkWinCondition() {
  for (const playerKey in state.players) {
    if (state.players[playerKey].hand.length === 0) {
      endGame(playerKey);
      return;
    }
  }
}

// 게임 종료 처리
function endGame(winnerKey) {
  state.isGameActive = false;
  const modal = document.getElementById('gameover-modal');
  const title = document.getElementById('gameover-title');
  const msg = document.getElementById('gameover-message');
  
  if (winnerKey === 'player') {
    title.innerText = '실험 성공! 🏆';
    title.style.color = 'var(--color-metal)';
    msg.innerText = '당신이 가장 먼저 손패의 원소들을 결합하고 방출하는 데 성공했습니다!';
    sounds.win();
  } else {
    title.innerText = '실험 실패... 🧪';
    title.style.color = '#f43f5e';
    msg.innerText = `우승: ${state.players[winnerKey].name}\n당신보다 먼저 원소들을 전부 결합시켰습니다. 다시 도전하세요.`;
    sounds.lose();
  }
  
  modal.classList.remove('hidden');
}

// 카드 뽑기 (Draw)
function playerDrawCard() {
  if (state.isProcessingTurn || state.isWaitingForWildSelect || !state.isGameActive) return;
  
  // 낼 수 있는 카드가 있는지 검토
  const playable = state.players.player.hand.some(c => 
    isCardPlayable(c, getActiveCard(), state.targetBondType)
  );
  
  // 낼 수 있는 카드가 숙련자든 초보자든 있을 때는 드로우 불가로 제약하여 게임 텐션 유지
  // (내 손에 낼 카드가 진짜 없을 때만 드로우할 수 있게 하거나, 무제한 드로우 허용)
  // 여기서는 드로우를 항상 허용하되 턴을 바로 넘기는 식으로 설정
  const newCard = drawCards('player', 1)[0];
  sounds.drawCard();
  logMessage(`플레이어가 카드 더미에서 원소 하나를 추출했습니다.`, 'player');
  
  updateUI();
  
  // 만약 뽑은 카드가 바로 낼 수 있는 카드라면 바로 내거나 들고 있을지 선택하도록 기회 부여
  // 편의상 UNO 기본 룰 적용: 뽑은 카드가 즉시 낼 수 있으면 턴을 넘기기 전 낼 수 있고, 아니면 바로 턴이 넘어감.
  if (isCardPlayable(newCard, getActiveCard(), state.targetBondType)) {
    logMessage(`추출된 원소 ${newCard.name}(${newCard.symbol})은(는) 즉시 반응 투입이 가능합니다!`, 'player');
    highlightPlayableCards();
  } else {
    // 낼 수 없으면 턴이 넘어감
    state.isProcessingTurn = true;
    setTimeout(() => {
      nextTurn();
    }, 1000);
  }
}

// 드로우 공통 함수
function drawCards(playerKey, count) {
  const cardsDrawn = [];
  for (let i = 0; i < count; i++) {
    if (state.deck.length === 0) {
      // 무덤 카드 회수하여 리셔플
      const active = state.discardPile.pop();
      state.deck = [...state.discardPile];
      // 셔플
      for (let x = state.deck.length - 1; x > 0; x--) {
        const y = Math.floor(Math.random() * (x + 1));
        [state.deck[x], state.deck[y]] = [state.deck[y], state.deck[x]];
      }
      state.discardPile = [active];
      logMessage(`덱을 모두 소모하여 반응 찌꺼기를 다시 정제 덱으로 환원했습니다.`, 'system');
    }
    
    if (state.deck.length > 0) {
      const card = state.deck.pop();
      state.players[playerKey].hand.push(card);
      cardsDrawn.push(card);
    }
  }
  return cardsDrawn;
}

// AI 의사결정 알고리즘
function aiPlay(aiKey) {
  if (!state.isGameActive) return;
  
  const aiHand = state.players[aiKey].hand;
  const activeCard = getActiveCard();
  
  // 낼 수 있는 카드들 필터링
  const playableCards = aiHand.filter(card => 
    isCardPlayable(card, activeCard, state.targetBondType)
  );
  
  if (playableCards.length > 0) {
    // 의사결정 우선순위:
    // 1. 가장 방해가 되는 특수카드(Draw2 등)를 우선 내거나,
    // 2. 자신이 많이 들고 있는 속성(주기/족)의 연쇄를 노림.
    // 여기서는 간단히 랜덤 플레이하되, 와일드 카드는 가장 마지막 보루로 아낌.
    let selectedCard = playableCards.find(c => !c.wild); // 일반/액션 먼저 찾기
    if (!selectedCard) {
      selectedCard = playableCards[0]; // 없으면 와일드
    } else {
      // 일반 카드 중 랜덤 선택
      const normalPlayable = playableCards.filter(c => !c.wild);
      selectedCard = normalPlayable[Math.floor(Math.random() * normalPlayable.length)];
    }
    
    // 카드 제출
    const cardIndex = aiHand.findIndex(c => c.id === selectedCard.id);
    aiHand.splice(cardIndex, 1);
    sounds.playCard();
    playCardCommon(selectedCard, aiKey);
  } else {
    // 낼 카드 없음 -> 드로우
    const drawn = drawCards(aiKey, 1)[0];
    logMessage(`${state.players[aiKey].name}님이 낼 카드가 없어 덱에서 원소를 드로우했습니다.`, aiKey);
    
    // 뽑은 걸 바로 낼 수 있으면 내기
    if (isCardPlayable(drawn, activeCard, state.targetBondType)) {
      setTimeout(() => {
        aiHand.pop(); // 방금 추가된 거 다시 꺼내기
        sounds.playCard();
        playCardCommon(drawn, aiKey);
      }, 1000);
    } else {
      updateUI();
      nextTurn();
    }
  }
}

// AI 비활성 기체 냈을 때의 결합 유형 임의 선택
function aiSelectWild(aiKey) {
  const aiHand = state.players[aiKey].hand;
  
  // 손패에 많이 들고 있는 속성에 유리하게 타겟 결합 유형 선정
  // (금속이 많으면 -> 이온결합, 비금속이 많으면 -> 공유결합)
  let metalCount = 0;
  let nonmetalCount = 0;
  
  aiHand.forEach(c => {
    if (c.category === 'metal') metalCount++;
    else if (c.category === 'nonmetal' || c.category === 'halogen') nonmetalCount++;
  });
  
  let selectedBond = 'polar';
  if (metalCount > nonmetalCount) {
    selectedBond = 'ionic';
  } else if (nonmetalCount > metalCount) {
    selectedBond = Math.random() > 0.5 ? 'polar' : 'nonpolar';
  } else {
    const bonds = ['nonpolar', 'polar', 'ionic'];
    selectedBond = bonds[Math.floor(Math.random() * bonds.length)];
  }
  
  state.targetBondType = selectedBond;
  updateTargetBondUI();
  
  logMessage(`[AI 선택] 다음 목표 결합 유형이 [${getBondName(selectedBond)}]으로 지정되었습니다.`, 'system');
  
  setTimeout(() => {
    nextTurn();
  }, 1000);
}

// 플레이어가 와일드 카드 목표 결합 선택
function selectWildBond(bondType) {
  state.targetBondType = bondType;
  updateTargetBondUI();
  
  document.getElementById('wild-modal').classList.add('hidden');
  state.isWaitingForWildSelect = false;
  
  logMessage(`플레이어가 다음 목표 결합 유형을 [${getBondName(bondType)}]으로 결정했습니다.`, 'player');
  
  nextTurn();
}

// --- 6. UI 및 DOM 제어 유틸리티 ---

function getActiveCard() {
  return state.discardPile[state.discardPile.length - 1];
}

function updateTargetBondUI() {
  const display = document.getElementById('target-bond-type');
  const range = document.getElementById('target-bond-range');
  
  display.className = 'target-bond-display';
  display.classList.add(state.targetBondType);
  
  if (state.targetBondType === 'nonpolar') {
    display.innerText = '무극성 공유 결합';
    range.innerHTML = '&Delta;EN &lt; 0.4';
  } else if (state.targetBondType === 'polar') {
    display.innerText = '극성 공유 결합';
    range.innerHTML = '0.4 &le; &Delta;EN &lt; 1.7';
  } else if (state.targetBondType === 'ionic') {
    display.innerText = '이온 결합';
    range.innerHTML = '&Delta;EN &ge; 1.7';
  }
}

// 플레이어 패 렌더링
function renderPlayerHand() {
  const handContainer = document.getElementById('player-hand');
  handContainer.innerHTML = '';
  
  const activeCard = getActiveCard();
  
  state.players.player.hand.forEach(card => {
    const cardEl = document.createElement('div');
    cardEl.className = `card ${card.category}`;
    if (card.action) cardEl.classList.add('action-card');
    cardEl.setAttribute('data-id', card.id);
    
    // 초보자 모드 한정: 낼 수 있는 카드 반짝임 힌트 부여
    if (state.gameMode === 'beginner' && isCardPlayable(card, activeCard, state.targetBondType)) {
      cardEl.classList.add('playable');
    }
    
    // 카드 내부 HTML 구성
    let cardContent = '';
    if (card.action) {
      // 액션 카드
      cardContent = `
        <div class="card-top">
          <span class="atomic-number">${card.symbol}</span>
          <span>ACTION</span>
        </div>
        <div class="card-center">
          <div class="element-symbol">${card.symbol}</div>
          <div class="element-name">${card.name}</div>
        </div>
        <div class="card-bottom">
          <span class="electronegativity">${card.electronegativity}</span>
        </div>
      `;
    } else if (card.wild) {
      // 비활성 기체
      cardContent = `
        <div class="card-top">
          <span class="atomic-number">${card.atomicNumber}</span>
          <span>WILD</span>
        </div>
        <div class="card-center">
          <div class="element-symbol">${card.symbol}</div>
          <div class="element-name">${card.name}</div>
        </div>
        <div class="card-bottom">
          <span class="electronegativity">WILD</span>
          <span class="group-period">${card.group}족<br>${card.period}주기</span>
        </div>
      `;
    } else {
      // 일반 원소
      cardContent = `
        <div class="card-top">
          <span class="atomic-number">${card.atomicNumber}</span>
          <span>${card.category.toUpperCase()}</span>
        </div>
        <div class="card-center">
          <div class="element-symbol">${card.symbol}</div>
          <div class="element-name">${card.name}</div>
        </div>
        <div class="card-bottom">
          <span class="electronegativity">${card.electronegativity.toFixed(2)}</span>
          <span class="group-period">${card.group}족<br>${card.period}주기</span>
        </div>
      `;
    }
    
    cardEl.innerHTML = cardContent;
    
    // 이벤트 바인딩
    cardEl.addEventListener('click', () => playerPlayCard(card.id));
    
    // 초보자 모드 마우스 호버 결합성 미리 알림 힌트
    if (state.gameMode === 'beginner') {
      cardEl.addEventListener('mouseenter', () => showHoverHint(card, activeCard));
      cardEl.addEventListener('mouseleave', hideHoverHint);
    }
    
    handContainer.appendChild(cardEl);
  });
  
  document.getElementById('player-card-count').innerText = state.players.player.hand.length;
}

// 힌트 미리 표시
function showHoverHint(card, activeCard) {
  if (card.wild || activeCard.wild || card.action || activeCard.action) return;
  
  const overlay = document.getElementById('bond-info-overlay');
  const typeDisplay = document.getElementById('overlay-bond-type');
  const diffDisplay = document.getElementById('overlay-bond-diff');
  
  const delta = Math.abs(card.electronegativity - activeCard.electronegativity).toFixed(2);
  const type = checkBondType(card, activeCard);
  
  typeDisplay.innerText = `${getBondName(type)} 형성 예정`;
  diffDisplay.innerHTML = `예상 &Delta;EN = ${delta}`;
  
  overlay.classList.remove('hidden');
}

function hideHoverHint() {
  // 애니메이션 구동 중이 아닐 때만 도움말 오버레이를 지움
  // (애니메이션 완료 단계에서는 정보를 지속 노출해야 하므로)
  if (state.canvasAnim && state.canvasAnim.progress < 1) {
    document.getElementById('bond-info-overlay').classList.add('hidden');
  }
}

// 플레이 가능한 카드 직접적으로 클래스 지정 유도
function highlightPlayableCards() {
  if (state.gameMode !== 'beginner') return;
  const activeCard = getActiveCard();
  const cardEls = document.querySelectorAll('#player-hand .card');
  cardEls.forEach(el => {
    const id = el.getAttribute('data-id');
    const card = state.players.player.hand.find(c => c.id === id);
    if (card && isCardPlayable(card, activeCard, state.targetBondType)) {
      el.classList.add('playable');
    } else {
      el.classList.remove('playable');
    }
  });
}

// AI 상태 카드 뒷면 렌더링
function renderAIPanels() {
  // AI1
  const count1 = state.players.ai1.hand.length;
  document.getElementById('ai1-card-count').innerText = count1;
  const container1 = document.getElementById('ai1-cards-preview');
  container1.innerHTML = '';
  for (let i = 0; i < count1; i++) {
    const card = document.createElement('div');
    card.className = 'ai-mini-card';
    container1.appendChild(card);
  }
  
  // AI2
  const count2 = state.players.ai2.hand.length;
  document.getElementById('ai2-card-count').innerText = count2;
  const container2 = document.getElementById('ai2-cards-preview');
  container2.innerHTML = '';
  for (let i = 0; i < count2; i++) {
    const card = document.createElement('div');
    card.className = 'ai-mini-card';
    container2.appendChild(card);
  }
}

// 중앙 바닥 카드 렌더링
function renderActiveCard() {
  const slot = document.getElementById('active-card-slot');
  slot.innerHTML = '';
  
  const card = getActiveCard();
  if (!card) return;
  
  const cardEl = document.createElement('div');
  cardEl.className = `card ${card.category}`;
  if (card.action) cardEl.classList.add('action-card');
  
  let cardContent = '';
  if (card.action) {
    cardContent = `
      <div class="card-top">
        <span class="atomic-number">${card.symbol}</span>
        <span>ACTION</span>
      </div>
      <div class="card-center">
        <div class="element-symbol">${card.symbol}</div>
        <div class="element-name">${card.name}</div>
      </div>
      <div class="card-bottom">
        <span class="electronegativity">${card.electronegativity}</span>
      </div>
    `;
  } else if (card.wild) {
    cardContent = `
      <div class="card-top">
        <span class="atomic-number">${card.atomicNumber}</span>
        <span>WILD</span>
      </div>
      <div class="card-center">
        <div class="element-symbol">${card.symbol}</div>
        <div class="element-name">${card.name}</div>
      </div>
      <div class="card-bottom">
        <span class="electronegativity">WILD</span>
        <span class="group-period">${card.group}족<br>${card.period}주기</span>
      </div>
    `;
  } else {
    cardContent = `
      <div class="card-top">
        <span class="atomic-number">${card.atomicNumber}</span>
        <span>${card.category.toUpperCase()}</span>
      </div>
      <div class="card-center">
        <div class="element-symbol">${card.symbol}</div>
        <div class="element-name">${card.name}</div>
      </div>
      <div class="card-bottom">
        <span class="electronegativity">${card.electronegativity.toFixed(2)}</span>
        <span class="group-period">${card.group}족<br>${card.period}주기</span>
      </div>
    `;
  }
  
  cardEl.innerHTML = cardContent;
  slot.appendChild(cardEl);
}

// 전체 UI 동기화
function updateUI() {
  renderPlayerHand();
  renderAIPanels();
  renderActiveCard();
  document.getElementById('deck-card-count').innerText = state.deck.length;
}

// 특수 동작 오버레이 알림 팝업
function showAlert(playerKey, message) {
  const alertEl = document.getElementById(`${playerKey}-alert`);
  if (alertEl) {
    alertEl.innerText = message;
    alertEl.classList.add('show');
    setTimeout(() => {
      alertEl.classList.remove('show');
    }, 2000);
  }
}

// 로그 기록
function logMessage(text, styleClass = 'system') {
  const container = document.getElementById('game-logs');
  const entry = document.createElement('div');
  entry.className = `log-entry ${styleClass}`;
  
  // 현재 시간 포맷
  const now = new Date();
  const timeStr = `[${now.toLocaleTimeString()}] `;
  entry.innerText = timeStr + text;
  
  container.appendChild(entry);
  container.scrollTop = container.scrollHeight;
}

function clearLogs() {
  document.getElementById('game-logs').innerHTML = '';
}

// --- 7. 이벤트 핸들러 및 초기화 바인딩 ---

document.getElementById('btn-start').addEventListener('click', startGame);

document.getElementById('draw-deck').addEventListener('click', playerDrawCard);

// 도움말 모달/사이드바 토글
const sidebar = document.getElementById('sidebar-panel');
document.getElementById('btn-show-rules').addEventListener('click', () => {
  sidebar.classList.toggle('hidden');
});
document.getElementById('btn-close-sidebar').addEventListener('click', () => {
  sidebar.classList.add('hidden');
});

// Chemical Log 패널 토글 (기본 숨김 상태, 버튼으로 열고 닫음)
const logPanel = document.getElementById('game-log-panel');
document.getElementById('btn-show-log').addEventListener('click', () => {
  logPanel.classList.toggle('hidden');
});
document.getElementById('btn-close-log').addEventListener('click', () => {
  logPanel.classList.add('hidden');
});


// 포기 및 재시작
document.getElementById('btn-restart').addEventListener('click', () => {
  if (confirm('실험을 폐기하고 처음 화면으로 돌아가시겠습니까?')) {
    state.isGameActive = false;
    state.canvasAnim = null;
    document.getElementById('game-board').classList.remove('active');
    document.getElementById('start-screen').classList.add('active');
  }
});

// 와일드 카드 결합 선택 클릭 이벤트 바인딩
document.querySelectorAll('.btn-bond-select').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const bond = e.target.getAttribute('data-bond');
    selectWildBond(bond);
  });
});

// 게임오버 재시작
document.getElementById('btn-gameover-restart').addEventListener('click', () => {
  document.getElementById('gameover-modal').classList.add('hidden');
  document.getElementById('game-board').classList.remove('active');
  document.getElementById('start-screen').classList.add('active');
});

// 창 크기 최적화 및 캔버스 스케일 유지
window.addEventListener('resize', () => {
  if (canvas) {
    // 캔버스 자체 폭 유지
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
});

// 초기 로딩 시 해상도 최적화
(function initCanvasResolution() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
})();
