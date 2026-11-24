/**
 * MEMORY MIRROR SC69 — Interactive Details & Tactile Animations
 * Wax shatter particles, 3D photo mouse tilt, progressive handwriting reveal, stamp slam.
 */

const AnimationController = (function () {

    /**
     * Wax seal break particles effect
     */
    function explodeWaxParticles(originX, originY, container) {
        const particleCount = 18;
        const targetContainer = container || document.body;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement("div");
            particle.className = "wax-particle-fragment";

            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 85 + 25;
            const size = Math.random() * 7 + 4;
            const destX = Math.cos(angle) * distance;
            const destY = Math.sin(angle) * distance + 35; // slight gravity pull

            particle.style.cssText = `
                position: fixed;
                left: ${originX}px;
                top: ${originY}px;
                width: ${size}px;
                height: ${size}px;
                background: ${Math.random() > 0.3 ? "#8E1E26" : "#4A0E13"};
                border-radius: ${Math.random() > 0.5 ? "50%" : "30% 70% 70% 30%"};
                box-shadow: 0 2px 5px rgba(0,0,0,0.4);
                pointer-events: none;
                z-index: 999;
                transition: transform 0.65s cubic-bezier(0.1, 0.9, 0.2, 1), opacity 0.65s ease;
            `;

            targetContainer.appendChild(particle);

            // Animate
            requestAnimationFrame(() => {
                particle.style.transform = `translate(${destX}px, ${destY}px) rotate(${Math.random() * 360}deg) scale(0.6)`;
                particle.style.opacity = "0";
            });

            setTimeout(() => {
                particle.remove();
            }, 700);
        }
    }

    /**
     * Subtle 3D tilt tracking mouse on Polaroid photos
     */
    function attachPhotoTilt(element) {
        if (!element) return;

        element.addEventListener("mousemove", (e) => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -9;
            const rotateY = ((x - centerX) / centerX) * 9;

            element.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.06, 1.06, 1.06)`;
        });

        element.addEventListener("mouseleave", () => {
            element.style.transform = "";
        });
    }

    /**
     * Smooth progressive text reveal (Ink handwriting effect)
     */
    function revealHandwriting(element, fullText, callback) {
        if (!element) return;
        element.textContent = "";

        // Check if user prefers reduced motion
        const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (isReduced) {
            element.textContent = fullText;
            if (callback) callback();
            return;
        }

        let index = 0;
        const totalLen = fullText.length;
        const step = totalLen > 300 ? 3 : 1; // Faster for long letters
        const intervalTime = totalLen > 300 ? 14 : 22;

        const timer = setInterval(() => {
            index += step;
            if (index >= totalLen) {
                element.textContent = fullText;
                clearInterval(timer);
                if (callback) callback();
            } else {
                element.textContent = fullText.substring(0, index);
            }
        }, intervalTime);

        // Allow clicking on text to skip animation immediately
        const skipHandler = () => {
            clearInterval(timer);
            element.textContent = fullText;
            element.removeEventListener("click", skipHandler);
            if (callback) callback();
        };
        element.addEventListener("click", skipHandler);
    }

    return {
        explodeWaxParticles,
        attachPhotoTilt,
        revealHandwriting
    };
})();
