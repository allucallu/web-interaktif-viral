const videoElement = document.querySelector('.input_video');
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d', { alpha: false }); // Optimasi: Matikan alpha channel canvas

let particles = [];
let isPinching = false;
let currentShapeIndex = 0;
const SHAPES = ["RAJA", "LOVE", "❤️"];

function initCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

class Particle {
    constructor(tx, ty, color) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.targetX = tx;
        this.targetY = ty;
        this.vx = (Math.random() - 0.5) * 3;
        this.vy = (Math.random() - 0.5) * 3;
        this.size = 1.5; // Ukuran tetap agar ringan
        this.color = color;
    }

    update() {
        // Gunakan angka yang lebih pasti untuk HP
        let ease = isPinching ? 0.2 : 0.04;
        
        if (isPinching) {
            this.x += (this.targetX - this.x) * ease;
            this.y += (this.targetY - this.y) * ease;
        } else {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size); // fillRect jauh lebih cepat daripada arc() di HP
    }
}

function createShape(text) {
    const tempParticles = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "white";
    let fontSize = text === "❤️" ? 200 : 80; // Ukuran lebih kecil untuk layar HP
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text === "❤️" ? "❤" : text, canvas.width / 2, canvas.height / 2);

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const color = text === "❤️" ? "#ff2d75" : "#00f7ff";

    // Step 7: Lebih renggang agar jumlah partikel sedikit (HP tidak kuat ribuan partikel)
    for (let y = 0; y < canvas.height; y += 7) {
        for (let x = 0; x < canvas.width; x += 7) {
            const index = (y * canvas.width + x) * 4;
            if (data[index + 3] > 128) {
                tempParticles.push(new Particle(x, y, color));
            }
        }
    }
    particles = tempParticles;
}

const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

// Gunakan modelComplexity 0 untuk HP (Paling Cepat)
hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 0,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const lm = results.multiHandLandmarks[0];
        const distance = Math.sqrt(
            Math.pow(lm[4].x - lm[8].x, 2) + 
            Math.pow(lm[4].y - lm[8].y, 2)
        );

        const nowPinching = distance < 0.06;
        if (nowPinching && !isPinching) {
            currentShapeIndex = (currentShapeIndex + 1) % SHAPES.length;
            createShape(SHAPES[currentShapeIndex]);
        }
        isPinching = nowPinching;
    } else {
        isPinching = false;
    }
});

// Kamera khusus Mobile
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 640, // Resolusi lebih rendah agar lancar di HP
    height: 480
});

function animate() {
    // Matikan efek transparan berlebih, gunakan solid hitam tipis
    ctx.fillStyle = "black";
    ctx.globalAlpha = 0.2;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0;
    
    // Matikan shadowBlur dan globalCompositeOperation karena sangat berat di mobile
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

window.addEventListener('resize', () => { initCanvas(); createShape(SHAPES[currentShapeIndex]); });
