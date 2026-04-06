const videoElement = document.getElementsByClassName('input_video')[0];
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

let particles = [];
let isPinching = false;
let currentShapeIndex = 0;
const SHAPES = ["RAJA", "I LOVE YOU", "❤️"];

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
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.size = Math.random() * 2 + 0.5;
        this.color = color;
    }

    update() {
        let ease = isPinching ? 0.25 : 0.04;
        let tx = isPinching ? this.targetX : this.x + this.vx;
        let ty = isPinching ? this.targetY : this.y + this.vy;

        this.x += (tx - this.x) * ease;
        this.y += (ty - this.y) * ease;

        if (!isPinching) {
            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        if (isPinching) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
        }
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset agar tidak berat
    }
}

function createShape(text) {
    const tempParticles = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "white";
    let fontSize = text === "❤️" ? (canvas.width < 600 ? 250 : 450) : (canvas.width < 600 ? 70 : 130);
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text === "❤️" ? "❤" : text, canvas.width / 2, canvas.height / 2);

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const color = text === "❤️" ? "#ff2d75" : "#00f7ff";

    // Step 5 agar tidak lag tapi tetap padat
    for (let y = 0; y < canvas.height; y += 5) {
        for (let x = 0; x < canvas.width; x += 5) {
            const index = (y * canvas.width + x) * 4;
            if (data[index + 3] > 128) {
                tempParticles.push(new Particle(x, y, color));
            }
        }
    }
    particles = tempParticles;
}

// Inisialisasi MediaPipe Hands dengan cara yang lebih aman
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
});

hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const lm = results.multiHandLandmarks[0];
        // Jarak antara ujung jempol (4) dan telunjuk (8)
        const distance = Math.sqrt(
            Math.pow(lm[4].x - lm[8].x, 2) + 
            Math.pow(lm[4].y - lm[8].y, 2)
        );

        const nowPinching = distance < 0.05;
        if (nowPinching && !isPinching) {
            currentShapeIndex = (currentShapeIndex + 1) % SHAPES.length;
            createShape(SHAPES[currentShapeIndex]);
        }
        isPinching = nowPinching;
    } else {
        isPinching = false;
    }
});

// Jalankan Kamera
const camera = new Camera(videoElement, {
    onFrame: async () => {
        try {
            await hands.send({ image: videoElement });
        } catch (e) {
            console.error("MediaPipe Error:", e);
        }
    },
    width: 1280,
    height: 720
});

function animate() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)"; // Efek trail
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.globalCompositeOperation = "lighter";
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    ctx.globalCompositeOperation = "source-over";
    
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