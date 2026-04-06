const videoElement = document.querySelector('.input_video');
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }); // Optimasi: Matikan alpha, aktifkan desynchronized untuk low-latency

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
        // Posisi awal acak
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.targetX = tx;
        this.targetY = ty;
        // Kecepatan acak untuk mode scatter
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.size = 2; // Ukuran sedikit lebih besar agar terlihat jelas di HP
        this.color = color;
    }

    update() {
        if (isPinching) {
            // MODE FORM: Paksa posisi instan (Snappy Abis)
            // Kita gunakan 0.5 agar ada sedikit transisi tapi sangat cepat
            this.x += (this.targetX - this.x) * 0.5;
            this.y += (this.targetY - this.y) * 0.5;
        } else {
            // MODE SCATTER: Bergerak acak
            this.x += this.vx;
            this.y += this.vy;
            // Bounce saat melayang acak
            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size); // fillRect tercepat di HP
    }
}

function createShape(text) {
    const tempParticles = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "white";
    // Sesuaikan ukuran teks agar pas di layar HP (lebar < tinggi)
    let isPortrait = canvas.width < canvas.height;
    let fontSize = text === "❤️" ? (isPortrait ? 250 : 400) : (isPortrait ? 80 : 130);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    ctx.fillText(text === "❤️" ? "❤" : text, canvas.width / 2, canvas.height / 2);

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const color = text === "❤️" ? "#ff2d75" : "#00f7ff";

    // Step 8: Kurangi jumlah partikel lebih drastis agar HP tidak berat
    for (let y = 0; y < canvas.height; y += 8) {
        for (let x = 0; x < canvas.width; x += 8) {
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

// Paling Ringan: modelComplexity 0, resolusi deteksi rendah
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

        // Threshold pinch sedikit lebih longgar untuk HP
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

// Resolusi Kamera Terendah agar kompatibel dan cepat
const camera = new Camera(videoElement, {
    onFrame: async () => {
        try {
            await hands.send({ image: videoElement });
        } catch(e) {} // Abaikan error frame MediaPipe
    },
    width: 480,
    height: 360
});

function animate() {
    // Matikan trail transparan, gunakan solid hitam untuk performa maksimal
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
    }
    
    requestAnimationFrame(animate);
}

// Mulai Aplikasi
initCanvas();
createShape(SHAPES[0]);
camera.start();
animate();

window.addEventListener('resize', () => { 
    initCanvas(); 
    createShape(SHAPES[currentShapeIndex]); 
});
