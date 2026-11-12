const WORK_DURATION_SECONDS = 25 * 60;
const BREAK_DURATION_SECONDS = 5 * 60;

let currentPhase = "work";
let remainingSeconds = WORK_DURATION_SECONDS;
let timerInterval = null;
let audioContext = null;
let completedSessions = 0;

function init() {
  const startButton = document.getElementById("start-button");
  document.querySelectorAll(".timer-controls button").forEach((button) => {
    button.addEventListener("click", () => playBeep(880, 0.035));
  });
  startButton.addEventListener("click", startTimer);
  document.getElementById("pause-button").addEventListener("click", pauseTimer);
  document.getElementById("reset-button").addEventListener("click", resetTimer);
  startButton.disabled = false;
  completedSessions = loadCompletedSessions();
  document.getElementById("session-count").textContent = completedSessions;
  renderTimer();
}

function loadCompletedSessions() {
  try {
    const saved = localStorage.getItem("completedSessions");
    if (saved !== null && /^\d+$/.test(saved)) {
      const count = Number(saved);
      if (Number.isSafeInteger(count)) {
        return count;
      }
    }
  } catch (error) {
    console.error("Unable to load completed sessions:", error);
  }
  return 0;
}

function saveCompletedSessions(count) {
  try {
    localStorage.setItem("completedSessions", String(count));
  } catch (error) {
    console.error("Unable to save completed sessions:", error);
  }
}

function startTimer() {
  if (timerInterval !== null || remainingSeconds === 0) {
    return;
  }

  document.getElementById("start-button").disabled = true;
  document.getElementById("pause-button").disabled = false;
  document.getElementById("reset-button").disabled = false;
  timerInterval = setInterval(tick, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  document.getElementById("pause-button").disabled = true;
  document.getElementById("start-button").disabled = remainingSeconds === 0;
}

function resetTimer() {
  pauseTimer();
  currentPhase = "work";
  remainingSeconds = WORK_DURATION_SECONDS;
  document.getElementById("start-button").disabled = false;
  document.getElementById("reset-button").disabled = true;
  renderTimer();
}

function tick() {
  remainingSeconds -= 1;
  if (remainingSeconds === 0) {
    transitionPhase();
  }
  renderTimer();
}

function transitionPhase() {
  playTransitionSound();
  if (currentPhase === "work") {
    completedSessions += 1;
    saveCompletedSessions(completedSessions);
    document.getElementById("session-count").textContent = completedSessions;
  }
  currentPhase = currentPhase === "work" ? "break" : "work";
  remainingSeconds = currentPhase === "work" ? WORK_DURATION_SECONDS : BREAK_DURATION_SECONDS;
}

function renderTimer() {
  const phaseDuration = currentPhase === "work" ? WORK_DURATION_SECONDS : BREAK_DURATION_SECONDS;
  const remainingPercent = (remainingSeconds / phaseDuration) * 100;
  document.getElementById("timer-display").textContent = formatTime(remainingSeconds);
  document.getElementById("phase-label").textContent = currentPhase === "work" ? "Work" : "Break";
  document.querySelector(".progress-ring__progress").style.strokeDashoffset = 100 - remainingPercent;
  document.querySelector(".progress-ring").setAttribute("aria-valuenow", remainingPercent);
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function playBeep(frequency, duration) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.error("Web Audio is not supported in this browser.");
      return;
    }

    if (!audioContext || audioContext.state === "closed") {
      audioContext = new AudioContext();
    }

    const context = audioContext;
    const play = () => {
      const start = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.08, start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration);
    };

    if (context.state === "suspended") {
      context.resume().then(play).catch((error) => {
        console.error("Unable to play timer sound:", error);
      });
    } else {
      play();
    }
  } catch (error) {
    console.error("Unable to play timer sound:", error);
  }
}

function playTransitionSound() {
  playBeep(currentPhase === "work" ? 660 : 440, 0.2);
}

init();
