const videoElement = document.querySelector('.input_video');
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

let particles = [];
let isPinching = false;
let currentShapeIndex = 0;
const SHAPES = ["RAJA", "LOVE", "❤️"];

// Gunakan canvas tersembunyi untuk kalkulasi bentuk agar presisi
const offCanvas = document.createElement('canvas');
const offCtx = offCanvas.getContext('2d');

function initCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Samakan ukuran offscreen canvas
    offCanvas.width = canvas.width;
    offCanvas.height = canvas.height;
}

class Particle {
    constructor(tx, ty, color) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.targetX = tx;
        this.targetY = ty;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.size = 2; 
        this.color = color;
    }

    update() {
        if (isPinching) {
            // Percepat transisi ke 0.4 agar langsung jadi bentuk
            this.x += (this.targetX - this.x) * 0.4;
            this.y += (this.targetY - this.y) * 0.4;
        } else {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

function createShape(text) {
    particles = []; // Kosongkan dulu
    offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);
    
    // Set gaya teks di offscreen canvas
    let isPortrait = offCanvas.width < offCanvas.height;
    let fontSize = text === "❤️" ? (isPortrait ? 200 : 350) : (isPortrait ? 70 : 120);
    
    offCtx.fillStyle = "white";
    offCtx.font = `bold ${fontSize}px Arial`;
    offCtx.textAlign = "center";
    offCtx.textBaseline = "middle";
    offCtx.fillText(text === "❤️" ? "❤" : text, offCanvas.width / 2, offCanvas.height / 2);

    // Ambil data pixel dari offscreen
    const imageData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height).data;
    const color = text === "❤️" ? "#ff2d75" : "#00f7ff";

    // Scan pixel dengan Step 8 (Optimal untuk HP)
    for (let y = 0; y < offCanvas.height; y += 8) {
        for (let x = 0; x < offCanvas.width; x += 8) {
            const index = (y * offCanvas.width + x) * 4;
            if (imageData[index + 3] > 128) {
                particles.push(new Particle(x, y, color));
            }
        }
    }
}

const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 0,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const lm = results.multiHandLandmarks[0];
        // Kalkulasi jarak jempol & telunjuk
        const dx = lm[4].x - lm[8].x;
        const dy = lm[4].y - lm[8].y;
        const distance = Math.sqrt(dx*dx + dy*dy);

        const nowPinching = distance < 0.07; // Sedikit lebih longgar untuk HP
        if (nowPinching && !isPinching) {
            currentShapeIndex = (currentShapeIndex + 1) % SHAPES.length;
            createShape(SHAPES[currentShapeIndex]);
        }
        isPinching = nowPinching;
    } else {
        isPinching = false;
    }
});

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 480, height: 360
});

function animate() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
    }
    requestAnimationFrame(animate);
}

initCanvas();
createShape(SHAPES[0]);
camera.start();
animate();

window.addEventListener('resize', () => { 
    initCanvas(); 
    createShape(SHAPES[currentShapeIndex]); 
});
