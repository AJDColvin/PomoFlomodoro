const timerDisplay = document.getElementById('timer-display');
const statusLabel = document.getElementById('status-label');
const appTitle = document.getElementById('app-title');
const toggleBtn = document.getElementById('toggle-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const switchBtn = document.getElementById('switch-btn');
const coffeeIcon = document.getElementById('coffee-icon');
const briefcaseIcon = document.getElementById('briefcase-icon');
const modeBtn = document.getElementById('mode-btn');
const infinityIcon = document.getElementById('infinity-icon');
const tomatoIcon = document.getElementById('tomato-icon');
const totalWorkDisplay = document.getElementById('total-work');
const bankedBreakDisplay = document.getElementById('banked-break');
const bankedBreakSection = document.getElementById('banked-break').parentElement;
const statsContainer = document.querySelector('.stats');

let timerInterval;
let isWorking = true; // true = work, false = break
let isRunning = false;
let mode = 'flomodoro'; // 'flomodoro' or 'pomodoro'

let totalWorkSeconds = 0;
let bankedBreakSeconds = 0;
let currentSessionSeconds = 0;
let pomodoroSeconds = 25 * 60;

// Audio Context for sound
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playAlertSound() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    oscillator.frequency.exponentialRampToValueAtTime(261.63, audioCtx.currentTime + 0.5); // Drop to C4

    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);
}

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateDisplay() {
    if (mode === 'flomodoro') {
        if (isWorking) {
            timerDisplay.textContent = formatTime(currentSessionSeconds);
        } else {
            timerDisplay.textContent = formatTime(bankedBreakSeconds);
        }
        bankedBreakSection.classList.remove('hidden-section');
        statsContainer.classList.remove('pomodoro-mode');
    } else { // Pomodoro
        if (isWorking) {
            timerDisplay.textContent = formatTime(pomodoroSeconds);
        } else {
            // Standard Pomodoro break? Or just a timer? 
            // Usually 5 mins. Let's default to 5 mins for break if switching in Pomodoro mode.
            // But wait, the user didn't specify Pomodoro break logic, just "Switch to normal Pomodoro technique".
            // Let's assume standard 5 min break for Pomodoro.
            timerDisplay.textContent = formatTime(pomodoroSeconds);
        }
        bankedBreakSection.classList.add('hidden-section');
        statsContainer.classList.add('pomodoro-mode');
    }

    totalWorkDisplay.textContent = formatTime(totalWorkSeconds);
    bankedBreakDisplay.textContent = formatTime(bankedBreakSeconds);
}

function updateIcons() {
    // Toggle Button
    if (isRunning) {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
        toggleBtn.setAttribute('aria-label', 'Pause');
    } else {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        toggleBtn.setAttribute('aria-label', 'Start');
    }

    // Switch Button
    if (isWorking) {
        coffeeIcon.classList.remove('hidden');
        briefcaseIcon.classList.add('hidden');
        switchBtn.setAttribute('aria-label', 'Switch to Break');
    } else {
        coffeeIcon.classList.add('hidden');
        briefcaseIcon.classList.remove('hidden');
        switchBtn.setAttribute('aria-label', 'Switch to Work');
    }

    // Mode Button
    if (mode === 'flomodoro') {
        tomatoIcon.classList.remove('hidden');
        infinityIcon.classList.add('hidden');
        modeBtn.setAttribute('aria-label', 'Switch to Pomodoro');
    } else {
        tomatoIcon.classList.add('hidden');
        infinityIcon.classList.remove('hidden');
        modeBtn.setAttribute('aria-label', 'Switch to Flomodoro');
    }
}

function tick() {
    if (mode === 'flomodoro') {
        if (isWorking) {
            currentSessionSeconds++;
            totalWorkSeconds++;
            bankedBreakSeconds += 0.2;
        } else {
            if (bankedBreakSeconds > 0) {
                bankedBreakSeconds -= 1;
                if (bankedBreakSeconds < 0) bankedBreakSeconds = 0;
            } else {
                pauseTimer();
                playAlertSound();
                switchWorkBreak();
                return;
            }
        }
    } else { // Pomodoro
        if (pomodoroSeconds > 0) {
            pomodoroSeconds--;
            if (isWorking) {
                totalWorkSeconds++;
            }
        } else {
            pauseTimer();
            playAlertSound();
            // Auto switch or just stop? Pomodoro usually rings.
            // Let's stop and let user switch.
            // Reset timer for next phase?
            if (isWorking) {
                pomodoroSeconds = 5 * 60; // 5 min break
                switchWorkBreak();
            } else {
                pomodoroSeconds = 25 * 60; // 25 min work
                switchWorkBreak();
            }
            return;
        }
    }
    updateDisplay();
}

function toggleTimer() {
    if (isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    if (isRunning) return;

    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    isRunning = true;
    timerInterval = setInterval(tick, 1000);

    switchBtn.disabled = false;
    statusLabel.textContent = isWorking ? "Flowing..." : "Recharging...";
    updateIcons();
}

function pauseTimer() {
    if (!isRunning) return;

    isRunning = false;
    clearInterval(timerInterval);

    statusLabel.textContent = "Paused";
    updateIcons();
}

function switchWorkBreak() {
    pauseTimer();
    isWorking = !isWorking;

    if (isWorking) {
        document.body.classList.remove('break-mode');
        statusLabel.textContent = "Ready to Flow";
        if (mode === 'flomodoro') {
            currentSessionSeconds = 0;
        } else {
            pomodoroSeconds = 25 * 60;
        }
    } else {
        document.body.classList.add('break-mode');
        statusLabel.textContent = "Ready to Recharge";
        if (mode === 'pomodoro') {
            pomodoroSeconds = 5 * 60;
        }
    }

    updateIcons();
    updateDisplay();
}

function toggleMode() {
    pauseTimer();
    if (mode === 'flomodoro') {
        mode = 'pomodoro';
        pomodoroSeconds = 25 * 60;
        isWorking = true;
        appTitle.textContent = "POMODORO";
    } else {
        mode = 'flomodoro';
        currentSessionSeconds = 0;
        isWorking = true;
        appTitle.textContent = "FLOMODORO";
    }

    // Reset UI to work state
    document.body.classList.remove('break-mode');
    statusLabel.textContent = "Ready to Flow";

    updateIcons();
    updateDisplay();
}

toggleBtn.addEventListener('click', toggleTimer);
switchBtn.addEventListener('click', switchWorkBreak);
modeBtn.addEventListener('click', toggleMode);

// Initial display
updateDisplay();
updateIcons();
