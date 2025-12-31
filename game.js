/// game.js - Final Fix for Mobile Touch
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("scoreDisplay");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const buttonsDiv = document.getElementById("buttons");

// Âm thanh
const scoreSound = document.getElementById("eatSound");
const bgMusic = document.getElementById("bgMusic");
bgMusic.volume = 0.5;

// Biến kiểm soát delay popup
let canResume = false; 

// Gắn sự kiện cho nút
startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", restartGame);

// Lời chúc
const wishesForHan = [
    "🎉 Chúc Hân sinh nhật vui vẻ! Tuổi mới rực rỡ!",
    "🎓 Ra trường điểm cao chót vót!",
    "💼 Job xịn lương cao, sếp quý đồng nghiệp thương!",
    "💖 Sớm có người yêu đẹp trai, tâm lý, chiều chuộng!",
    "🌟 An nhiên, hạnh phúc và xinh đẹp!"
];

// Biến trạng thái game
let gameLoop;
let isGameRunning = false;
let isPausedForWish = false;
let score = 0;
let wishIndex = 0;
let frames = 0;
const WISH_MILESTONE = 3;

// --- ĐỐI TƯỢNG & VẬT LÝ ---
const bird = {
    x: 50, y: 150, width: 24, height: 24,
    gravity: 0.25, lift: -4.5, velocity: 0,
    color: "#ffeb3b", borderColor: "#f57f17",

    draw: function() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = this.borderColor; ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = "#fff"; ctx.fillRect(this.x + 16, this.y + 4, 6, 6);
        ctx.fillStyle = "#d84315"; ctx.fillRect(this.x + 22, this.y + 12, 6, 4);
    },
    update: function() {
        this.velocity += this.gravity;
        this.y += this.velocity;
        if (this.y + this.height > canvas.height || this.y < 0) { gameOver(); }
    },
    jump: function() {
        if (!isGameRunning || isPausedForWish) return;
        this.velocity = this.lift;
    }
};

let pipes = [];
const pipeWidth = 52;
const pipeGap = 130;
const pipeSpeed = 2;

class Pipe {
    constructor() {
        this.x = canvas.width;
        this.topHeight = Math.random() * (canvas.height - pipeGap - 100) + 50;
        this.bottomY = this.topHeight + pipeGap;
        this.passed = false;
    }
    draw() {
        ctx.fillStyle = "#66bb6a"; ctx.strokeStyle = "#2e7d32"; ctx.lineWidth = 2;
        ctx.fillRect(this.x, 0, pipeWidth, this.topHeight);
        ctx.strokeRect(this.x, 0, pipeWidth, this.topHeight);
        ctx.fillRect(this.x - 2, this.topHeight - 20, pipeWidth + 4, 20);
        ctx.strokeRect(this.x - 2, this.topHeight - 20, pipeWidth + 4, 20);
        let bottomHeight = canvas.height - this.bottomY;
        ctx.fillRect(this.x, this.bottomY, pipeWidth, bottomHeight);
        ctx.strokeRect(this.x, this.bottomY, pipeWidth, bottomHeight);
        ctx.fillRect(this.x - 2, this.bottomY, pipeWidth + 4, 20);
        ctx.strokeRect(this.x - 2, this.bottomY, pipeWidth + 4, 20);
    }
    update() {
        this.x -= pipeSpeed;
        if (bird.x + bird.width > this.x && bird.x < this.x + pipeWidth) {
            if (bird.y < this.topHeight || bird.y + bird.height > this.bottomY) { gameOver(); }
        }
        if (bird.x > this.x + pipeWidth && !this.passed) {
            this.passed = true; increaseScore();
        }
    }
}

// --- XỬ LÝ SỰ KIỆN (QUAN TRỌNG ĐÃ SỬA) ---
function handleInput(e) {
    // 1. Nếu là phím, chỉ nhận phím Space
    if (e.type === 'keydown' && e.code !== 'Space') return;
    
    // 2. Nếu click vào các nút điều khiển (Start, Nhạc...) thì bỏ qua
    // Để tránh việc bấm nút Start mà chim lại nhảy
    if (e.target.tagName === 'BUTTON') return;

    // Chặn hành vi mặc định (cuộn trang, zoom)
    if (e.type !== 'keydown') {
        // Chỉ preventDefault nếu chạm vào vùng game/popup, không chặn nút bấm
        if (!e.target.closest('button')) {
             e.preventDefault(); 
        }
    } else {
        e.preventDefault(); // Chặn phím Space cuộn trang
    }

    // 3. LOGIC POPUP: Kiểm tra xem có được phép tắt popup chưa
    if (isPausedForWish) {
        if (canResume) {
            resumeGameFromWish();
        }
        return; // Nếu chưa hết thời gian chờ (canResume = false) thì không làm gì cả
    }

    // 4. Logic bay bình thường
    if (isGameRunning) {
        bird.jump();
    }
}

// --- LOGIC GAME ---
function init() {
    ctx.fillStyle = "#81d4fa";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    bird.y = 150; bird.velocity = 0; bird.draw();
    ctx.fillStyle = "#fff"; ctx.font = "20px Arial"; ctx.textAlign = "center";
    ctx.fillText("Nhấn 'Bắt đầu' để chơi!", canvas.width/2, canvas.height/2 + 50);
}

function startGame() {
    if(isGameRunning) return;
    startBtn.style.display = "none";
    restartBtn.style.display = "none";
    document.getElementById("container").style.display = "block";
    document.getElementById("celebration").style.display = "none";
    
    bird.y = 150; bird.velocity = 0;
    pipes = []; score = 0; wishIndex = 0; frames = 0;
    isPausedForWish = false;
    updateScoreDisplay();
    
    isGameRunning = true;
    bgMusic.play().catch(() => console.log("Cần tương tác để phát nhạc"));
    gameLoop = requestAnimationFrame(animate);
}

function animate() {
    if (!isGameRunning) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frames++;
    if (frames % 100 === 0) { pipes.push(new Pipe()); }
    for (let i = 0; i < pipes.length; i++) {
        pipes[i].update(); pipes[i].draw();
        if (pipes[i].x + pipeWidth < 0) { pipes.splice(i, 1); i--; }
    }
    bird.update(); bird.draw();
    ctx.fillStyle = "#795548"; ctx.fillRect(0, canvas.height - 10, canvas.width, 10);
    ctx.fillStyle = "#4caf50"; ctx.fillRect(0, canvas.height - 15, canvas.width, 5);

    if (!isPausedForWish) { gameLoop = requestAnimationFrame(animate); }
}

function increaseScore() {
    score++;
    updateScoreDisplay();
    scoreSound.currentTime = 0; scoreSound.play();
    if (score > 0 && score % WISH_MILESTONE === 0) {
        if (wishIndex < wishesForHan.length) {
            pauseForWish(wishIndex); wishIndex++;
        }
    }
    if (wishIndex >= wishesForHan.length) { celebrate(); }
}

function updateScoreDisplay() { scoreElement.innerText = "Điểm: " + score; }

function gameOver() {
    isGameRunning = false;
    cancelAnimationFrame(gameLoop);
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff"; ctx.font = "bold 30px Arial"; ctx.textAlign = "center";
    ctx.fillText("Rơi mất rồi!", canvas.width/2, canvas.height/2 - 20);
    ctx.font = "20px Arial";
    ctx.fillText(`Điểm: ${score}`, canvas.width/2, canvas.height/2 + 20);
    startBtn.style.display = "none";
    restartBtn.style.display = "inline-block";
}

function restartGame() { startGame(); }

// --- POPUP & EFFECT ---
function pauseForWish(index) {
    isPausedForWish = true;
    canResume = false; // Khóa ngay lập tức
    cancelAnimationFrame(gameLoop);
    
    const popup = document.getElementById("wishPopup");
    const instruction = document.getElementById("continueInstruction");
    
    document.getElementById("wishPopupText").textContent = wishesForHan[index];
    
    // Ẩn dòng hướng dẫn lúc đầu
    if(instruction) instruction.style.opacity = "0";
    popup.style.display = "flex";
    launchConfetti(50);

    // Đặt thời gian chờ 1.5 giây
    setTimeout(() => {
        canResume = true; // Mở khóa
        if(instruction) instruction.style.opacity = "1";
    }, 1500); 
}

function resumeGameFromWish() {
    document.getElementById("wishPopup").style.display = "none";
    isPausedForWish = false;
    bird.velocity = bird.lift / 2;
    gameLoop = requestAnimationFrame(animate);
}

function celebrate() {
    isGameRunning = false;
    cancelAnimationFrame(gameLoop);
    bgMusic.pause();
    document.getElementById("container").style.display = "none";
    document.getElementById("celebration").style.display = "flex";
    launchConfetti(200);
    createBalloons();
    bgMusic.currentTime = 0; bgMusic.volume = 0.8;
    setTimeout(() => { bgMusic.play(); }, 1000);
}

function toggleMusic() {
    const btn = document.getElementById("toggleMusicBtn");
    if (bgMusic.paused) { bgMusic.play(); btn.textContent = "🎵 Tắt nhạc"; }
    else { bgMusic.pause(); btn.textContent = "🎵 Bật nhạc"; }
}
function showTutorial() {
    document.getElementById("tutorialPopup").style.display = "flex";
    if(isGameRunning && !isPausedForWish) {
        isPausedForWish = true; cancelAnimationFrame(gameLoop);
    }
}
function hideTutorial() {
    document.getElementById("tutorialPopup").style.display = "none";
    if(isGameRunning && isPausedForWish) {
        isPausedForWish = false; bird.velocity = bird.lift / 2; gameLoop = requestAnimationFrame(animate);
    }
}
function launchConfetti(amount) {
    const colors = ["#f06292", "#ba68c8", "#4dd0e1", "#81c784", "#ffd54f"];
    for (let i = 0; i < amount; i++) {
      setTimeout(() => {
        const confetti = document.createElement("div");
        confetti.className = "confetti-piece";
        confetti.style.width = `${Math.random() * 10 + 5}px`;
        confetti.style.height = `${Math.random() * 10 + 5}px`;
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = `${Math.random() * window.innerWidth}px`;
        confetti.style.top = `-10px`;
        confetti.style.animation = `confetti ${Math.random() * 3 + 2}s linear forwards`;
        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 5000);
      }, i * 20);
    }
}
function createBalloons() {
    for (let i = 0; i < 20; i++) {
      const balloon = document.createElement("div");
      balloon.className = "balloon";
      balloon.style.left = `${Math.random() * 90 + 5}%`;
      balloon.style.animationDuration = `${Math.random() * 3 + 8}s`;
      balloon.style.animationDelay = `${Math.random() * 2}s`;
      const colors = ["#FF5252", "#FF4081", "#E040FB", "#7C4DFF", "#40C4FF"];
      balloon.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      const string = document.createElement("div");
      string.className = "balloon-string";
      balloon.appendChild(string);
      document.body.appendChild(balloon);
    }
}

// --- LẮNG NGHE SỰ KIỆN TOÀN CỬA SỔ (WINDOW) ---
// Đây là chìa khóa để fix lỗi trên mobile: 
// Dù chạm vào popup hay canvas thì window đều bắt được sự kiện.
window.addEventListener("keydown", handleInput);
window.addEventListener("mousedown", handleInput);
window.addEventListener("touchstart", handleInput, {passive: false});

window.onload = init;
