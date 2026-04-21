// อ้างอิง Element ต่างๆ ใน HTML
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const finalScoreEl = document.getElementById('final-score');
const titleEl = document.getElementById('game-title');
const bgm = document.getElementById('bgm');

// ตกแต่งชื่อเกมให้เป็นสีพาสเทลสลับกัน
const titleText = titleEl.innerText;
titleEl.innerHTML = '';
for (let i = 0; i < titleText.length; i++) {
    let span = document.createElement('span');
    span.innerText = titleText[i];
    span.className = `pastel-${(i % 5) + 1}`;
    titleEl.appendChild(span);
}

// โหลดรูปภาพ
const cookieImg = new Image();
cookieImg.src = 'assets/คุกกี้.png';

const boxImg = new Image();
boxImg.src = 'assets/ถาด.png';

// ตัวแปรระบบเกม
let isGameOver = false;
let isPlaying = false;
let score = 0;
let animationId;
let cameraY = 0; // ตัวแปรสำหรับเลื่อนกล้องขึ้นเมื่อกองคุ้กกี้สูงขึ้น

// ขนาดมาตรฐานของวัตถุ
const COOKIE_WIDTH = 80;
const COOKIE_HEIGHT = 40;
const BOX_WIDTH = 120;
const BOX_HEIGHT = 80;

// อาร์เรย์เก็บคุ้กกี้ที่ต่อสำเร็จ
let stack = [];
// คุ้กกี้ที่กำลังลอยอยู่
let activeCookie = null;

// คลาสสำหรับกล่อง (ฐานรับคุ้กกี้)
class Box {
    constructor() {
        this.width = BOX_WIDTH;
        this.height = BOX_HEIGHT;
        this.x = (canvas.width - this.width) / 2;
        this.y = canvas.height - this.height - 20;
    }
    draw() {
        if (boxImg.complete) {
            ctx.drawImage(boxImg, this.x, this.y + cameraY, this.width, this.height);
        } else {
            // Placeholder สีพาสเทลกรณีรูปยังไม่โหลด
            ctx.fillStyle = '#FFDFBA';
            ctx.fillRect(this.x, this.y + cameraY, this.width, this.height);
        }
    }
}

// คลาสสำหรับคุ้กกี้
class Cookie {
    constructor(yPos) {
        this.width = COOKIE_WIDTH;
        this.height = COOKIE_HEIGHT;
        this.x = 0;
        this.y = yPos;
        this.speedX = 3 + (score * 0.2); // เร็วขึ้นเมื่อคะแนนเยอะ
        this.speedY = 0;
        this.isDropped = false;
        this.isSettled = false;
    }

    update() {
        if (!this.isDropped) {
            // ลอยไปมาซ้ายขวา
            this.x += this.speedX;
            if (this.x + this.width > canvas.width || this.x < 0) {
                this.speedX = -this.speedX;
            }
        } else if (!this.isSettled) {
            // ร่วงลงมาด้วยแรงโน้มถ่วง
            this.speedY += 0.5; // แรงโน้มถ่วง
            this.y += this.speedY;

            this.checkCollision();
        }
    }

    draw() {
        if (cookieImg.complete) {
            ctx.drawImage(cookieImg, this.x, this.y + cameraY, this.width, this.height);
        } else {
            // Placeholder กรณีรูปยังไม่โหลด
            ctx.fillStyle = '#FFB3BA';
            ctx.beginPath();
            ctx.ellipse(this.x + this.width/2, this.y + this.height/2 + cameraY, this.width/2, this.height/2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drop() {
        this.isDropped = true;
    }

    checkCollision() {
        // เช็คการชนกับฐานล่างสุด (กล่อง หรือ คุ้กกี้ชิ้นบนสุด)
        let targetArea;
        let targetY;

        if (stack.length === 0) {
            targetArea = { x: baseBox.x, width: baseBox.width };
            targetY = baseBox.y;
        } else {
            const topCookie = stack[stack.length - 1];
            targetArea = { x: topCookie.x, width: topCookie.width };
            targetY = topCookie.y;
        }

        // หากตำแหน่ง Y ของคุ้กกี้ที่กำลังตก แตะชั้นล่าสุด
        if (this.y + this.height >= targetY) {
            // เช็คว่าตำแหน่งแกน X ตรงกันพอที่จะวางซ้อนได้หรือไม่ (Tolerence ให้เหลื่อมได้นิดหน่อย)
            const overlap = Math.max(0, Math.min(this.x + this.width, targetArea.x + targetArea.width) - Math.max(this.x, targetArea.x));
            
            if (overlap > 20) { // ต้องซ้อนทับกันอย่างน้อย 20px
                this.y = targetY - this.height; // จัดตำแหน่งให้พอดี
                this.isSettled = true;
                stack.push(this);
                score++;
                spawnNewCookie();
                adjustCamera();
            } else {
                // พลาดเป้า เกมจบ
                gameOver();
            }
        }

        // หากตกเลยขอบจอด้านล่างไปแล้ว
        if (this.y > canvas.height - cameraY) {
            gameOver();
        }
    }
}

let baseBox;

// สร้างคุ้กกี้ชิ้นใหม่
function spawnNewCookie() {
    let spawnY = 100 - cameraY; // ลอยอยู่ด้านบนของกล้องปัจจุบัน
    activeCookie = new Cookie(spawnY);
}

// เลื่อนมุมกล้องขึ้นเมื่อกองคุ้กกี้สูงเกินกลางจอ
function adjustCamera() {
    if (stack.length > 0) {
        const topCookie = stack[stack.length - 1];
        const targetCameraY = (canvas.height / 2) - topCookie.y;
        if (targetCameraY > cameraY) {
            cameraY = targetCameraY;
        }
    }
}

// เริ่มเกมใหม่
function initGame() {
    stack = [];
    score = 0;
    cameraY = 0;
    isGameOver = false;
    isPlaying = true;
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    baseBox = new Box();
    spawnNewCookie();
    
    // จัดการเพลง
    bgm.volume = 0.5;
    bgm.play().catch(e => console.log("รอผู้ใช้โต้ตอบเพื่อเล่นเสียง"));

    cancelAnimationFrame(animationId);
    gameLoop();
}

// ลอจิกการจบเกม
function gameOver() {
    isGameOver = true;
    isPlaying = false;
    finalScoreEl.innerText = score;
    gameOverScreen.classList.remove('hidden');
    bgm.pause();
    bgm.currentTime = 0;
}

// ลูปอนิเมชันของเกม
function gameLoop() {
    if (!isPlaying) return;

    // เคลียร์หน้าจอแคนวาส
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // วาดฐานกล่อง
    baseBox.draw();

    // วาดกองคุ้กกี้ที่ต่อสำเร็จ
    stack.forEach(cookie => {
        cookie.draw();
    });

    // วาดและอัปเดตคุ้กกี้ที่กำลังลอย/ตก
    if (activeCookie) {
        activeCookie.update();
        activeCookie.draw();
    }

    // วาดคะแนนซ้อนบนจอ (ใช้วิธีวาดลง Canvas เลย)
    ctx.fillStyle = '#555';
    ctx.font = "30px 'DSBanballTester', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText(`ชั้น: ${score}`, 15, 35);

    animationId = requestAnimationFrame(gameLoop);
}

// รับค่าการคลิกหรือแตะหน้าจอ
function handleInput(e) {
    e.preventDefault(); // ป้องกันการเกิด Event ซ้ำซ้อนระหว่าง Touch และ Click
    if (isPlaying && activeCookie && !activeCookie.isDropped) {
        activeCookie.drop();
    }
}

// การดักจับ Event ต่างๆ
canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', handleInput, { passive: false });

startBtn.addEventListener('click', initGame);
restartBtn.addEventListener('click', initGame);
