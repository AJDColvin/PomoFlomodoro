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
const editWorkBtn = document.getElementById('edit-work-btn');
const resetBreakBtn = document.getElementById('reset-break-btn');

let timerInterval;
let isWorking = true; // true = work, false = break
let isRunning = false;
let isEditingTotalWork = false;
let mode = 'flomodoro'; // 'flomodoro' or 'pomodoro'

let totalWorkSeconds = 0;
let bankedBreakSeconds = 0;
let currentSessionSeconds = 0;
let pomodoroSeconds = 25 * 60;
let lastTickTime = 0;

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
            timerDisplay.textContent = formatTime(pomodoroSeconds);
        }
        bankedBreakSection.classList.add('hidden-section');
        statsContainer.classList.add('pomodoro-mode');
    }

    if (!isEditingTotalWork) {
        totalWorkDisplay.textContent = formatTime(totalWorkSeconds);
    }
    bankedBreakDisplay.textContent = formatTime(bankedBreakSeconds);

    // Fix Pomodoro Visibility: Hide the entire section including label and button
    const bankedBreakContainer = document.getElementById('banked-break').closest('.stat-item');
    if (mode === 'pomodoro') {
        bankedBreakContainer.classList.add('hidden-section');
    } else {
        bankedBreakContainer.classList.remove('hidden-section');
    }
}

function saveState() {
    const state = {
        totalWorkSeconds,
        bankedBreakSeconds,
        mode,
        pomodoroSeconds,
        currentSessionSeconds,
        isWorking,
        lastTickTime: Date.now()
    };
    localStorage.setItem('flomodoroState', JSON.stringify(state));
}

function loadState() {
    const savedState = localStorage.getItem('flomodoroState');
    if (savedState) {
        const state = JSON.parse(savedState);
        totalWorkSeconds = state.totalWorkSeconds || 0;
        bankedBreakSeconds = state.bankedBreakSeconds || 0;
        mode = state.mode || 'flomodoro';
        pomodoroSeconds = state.pomodoroSeconds || 25 * 60;
        currentSessionSeconds = state.currentSessionSeconds || 0;
        isWorking = state.isWorking !== undefined ? state.isWorking : true;

        // Restore mode UI
        if (mode === 'pomodoro') {
            appTitle.textContent = "POMODORO";
        } else {
            appTitle.textContent = "FLOMODORO";
        }

        // Restore work/break UI
        if (isWorking) {
            document.body.classList.remove('break-mode');
            statusLabel.textContent = "Ready to Flow";
        } else {
            document.body.classList.add('break-mode');
            statusLabel.textContent = "Ready to Recharge";
        }
    }
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
    const now = Date.now();
    const delta = (now - lastTickTime) / 1000;
    lastTickTime = now;

    if (mode === 'flomodoro') {
        if (isWorking) {
            currentSessionSeconds += delta;
            totalWorkSeconds += delta;
            bankedBreakSeconds += delta / 5;
        } else {
            if (bankedBreakSeconds > 0) {
                bankedBreakSeconds -= delta;
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
            pomodoroSeconds -= delta;
            if (isWorking) {
                totalWorkSeconds += delta;
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
    saveState();
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

    // Auto-cancel edit if active
    if (isEditingTotalWork) {

        const newH = parseInt(document.getElementById('edit-h').value) || 0;
        const newM = parseInt(document.getElementById('edit-m').value) || 0;
        const newS = parseInt(document.getElementById('edit-s').value) || 0;

        totalWorkSeconds = (newH * 3600) + (newM * 60) + newS;
        isEditingTotalWork = false;
        editWorkBtn.classList.remove('hidden');
        updateDisplay();
    }

    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    isRunning = true;
    lastTickTime = Date.now();
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
    saveState();
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
    saveState();
}

toggleBtn.addEventListener('click', toggleTimer);
switchBtn.addEventListener('click', switchWorkBreak);
modeBtn.addEventListener('click', toggleMode);

// User Controls
resetBreakBtn.addEventListener('click', () => {
    bankedBreakSeconds = 0;
    updateDisplay();
    saveState();
});

editWorkBtn.addEventListener('click', () => {
    if (isRunning) pauseTimer();
    isEditingTotalWork = true;
    editWorkBtn.classList.add('hidden');

    const h = Math.floor(totalWorkSeconds / 3600);
    const m = Math.floor((totalWorkSeconds % 3600) / 60);
    const s = Math.floor(totalWorkSeconds % 60);

    totalWorkDisplay.innerHTML = `
        <div class="edit-container">
            <input type="number" class="time-input" id="edit-h" value="${h}" min="0" max="99">
            <span class="edit-separator">:</span>
            <input type="number" class="time-input" id="edit-m" value="${m}" min="0" max="59">
            <span class="edit-separator">:</span>
            <input type="number" class="time-input" id="edit-s" value="${s}" min="0" max="59">
            <button id="save-work-btn" class="mini-btn save-btn" title="Save">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </button>
        </div>
    `;

    const saveBtn = document.getElementById('save-work-btn');
    const inputs = totalWorkDisplay.querySelectorAll('input');

    const save = () => {
        const newH = parseInt(document.getElementById('edit-h').value) || 0;
        const newM = parseInt(document.getElementById('edit-m').value) || 0;
        const newS = parseInt(document.getElementById('edit-s').value) || 0;

        totalWorkSeconds = (newH * 3600) + (newM * 60) + newS;
        isEditingTotalWork = false;
        editWorkBtn.classList.remove('hidden');
        updateDisplay();
        saveState();
    };

    const cancel = () => {
        isEditingTotalWork = false;
        editWorkBtn.classList.remove('hidden');
        updateDisplay();
    };

    saveBtn.addEventListener('click', save);

    inputs.forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') cancel();
        });
        // Select text on focus for easier editing
        input.addEventListener('focus', function () {
            this.select();
        });
    });

    // Focus hours input
    document.getElementById('edit-h').focus();
});

// Initial display
loadState();
updateDisplay();
updateIcons();
