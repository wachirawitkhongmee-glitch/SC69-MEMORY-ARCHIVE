/**
 * MEMORY MIRROR SC69 — Floating Dust Particle System
 * Golden motes slowly drifting through vintage desk light beams
 */

const DustParticles = (function () {
    let canvas = null;
    let ctx = null;
    let particles = [];
    let animationId = null;
    let isRunning = false;
    let isReducedMotion = false;

    const PARTICLE_COUNT = 45;
    const COLORS = [
        "rgba(189, 150, 89, ",
        "rgba(152, 115, 79, ",
        "rgba(216, 189, 150, ",
        "rgba(228, 200, 150, "
    ];

    class Particle {
        constructor(w, h) {
            this.reset(w, h, true);
        }

        reset(w, h, randomY = false) {
            this.x = Math.random() * w;
            this.y = randomY ? Math.random() * h : h + 10;
            this.size = Math.random() * 2.2 + 0.6;
            this.speedY = -(Math.random() * 0.35 + 0.12);
            this.speedX = (Math.random() - 0.5) * 0.25;
            this.opacity = Math.random() * 0.45 + 0.15;
            this.maxOpacity = this.opacity;
            this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
            this.angle = Math.random() * Math.PI * 2;
            this.angleSpeed = (Math.random() - 0.5) * 0.02;
            this.pulseSpeed = Math.random() * 0.02 + 0.01;
        }

        update(w, h) {
            this.y += this.speedY;
            this.x += this.speedX + Math.sin(this.angle) * 0.2;
            this.angle += this.angleSpeed;

            // Subtle twinkle
            this.opacity = this.maxOpacity * (0.6 + 0.4 * Math.sin(this.angle * 2));

            // Wrap or reset
            if (this.y < -15 || this.x < -20 || this.x > w + 20) {
                this.reset(w, h, false);
            }
        }

        draw(ctx) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color + this.opacity + ")";
            ctx.shadowBlur = this.size * 3;
            ctx.shadowColor = "rgba(240, 215, 140, 0.5)";
            ctx.fill();
        }
    }

    function init(canvasId) {
        canvas = document.getElementById(canvasId);
        if (!canvas) return;
        ctx = canvas.getContext("2d");

        // Check reduced motion preference
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        isReducedMotion = mediaQuery.matches;
        mediaQuery.addEventListener("change", e => {
            setReducedMotion(e.matches);
        });

        resize();
        window.addEventListener("resize", resize);

        particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(new Particle(canvas.width, canvas.height));
        }

        start();
    }

    function resize() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function loop() {
        if (!isRunning || isReducedMotion) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < particles.length; i++) {
            particles[i].update(canvas.width, canvas.height);
            particles[i].draw(ctx);
        }

        animationId = requestAnimationFrame(loop);
    }

    function start() {
        if (!isRunning && !isReducedMotion) {
            isRunning = true;
            loop();
        }
    }

    function stop() {
        isRunning = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    function setReducedMotion(val) {
        isReducedMotion = val;
        if (isReducedMotion) {
            stop();
        } else {
            start();
        }
    }

    return {
        init,
        start,
        stop,
        setReducedMotion
    };
})();
