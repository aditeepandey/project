document.addEventListener('DOMContentLoaded', function() {
    // ========== GLOBAL VARIABLES ==========
    const logsContainer = document.getElementById('logsContainer');
    let cameraActive = false;
    let cameraStream = null;
    let micActive = false;
    let micStream = null;
    let socket = null;
    let timerInterval = null;
    let timerSeconds = 25 * 60; // Default to 25 minutes
    let timerRunning = false;

    // ========== TIMER FUNCTIONALITY ==========
    function updateTimerDisplay() {
        const minutes = Math.floor(timerSeconds / 60);
        const seconds = timerSeconds % 60;
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function startTimer() {
        if (timerRunning) return;
        
        timerRunning = true;
        addLog('Timer started', 'info');
        showNotification('Timer started');
        
        timerInterval = setInterval(() => {
            timerSeconds--;
            updateTimerDisplay();
            
            if (timerSeconds <= 0) {
                clearInterval(timerInterval);
                timerRunning = false;
                addLog('Timer completed', 'success');
                showNotification('Timer completed!');
                playAlarmSound();
            }
        }, 1000);
    }

    function resetTimer() {
        clearInterval(timerInterval);
        timerRunning = false;
        updateTimerDisplay();
        addLog('Timer reset', 'info');
        showNotification('Timer reset');
    }

    function setTimer(minutes) {
        timerSeconds = minutes * 60;
        updateTimerDisplay();
        addLog(`Timer set to ${minutes} minutes`, 'info');
        showNotification(`Timer set to ${minutes} minutes`);
    }

    function initTimerControls() {
        const startBtn = document.getElementById('startBtn');
        const resetBtn = document.getElementById('resetBtn');
        const timerPresets = document.querySelectorAll('.timer-presets .btn');

        if (startBtn) {
            startBtn.addEventListener('click', () => {
                if (!timerRunning) {
                    startTimer();
                    startBtn.textContent = 'Pause';
                } else {
                    clearInterval(timerInterval);
                    timerRunning = false;
                    startBtn.textContent = 'Start';
                    addLog('Timer paused', 'info');
                    showNotification('Timer paused');
                }
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', resetTimer);
        }

        timerPresets.forEach(btn => {
            btn.addEventListener('click', () => {
                const minutes = parseInt(btn.dataset.minutes);
                setTimer(minutes);
                if (timerRunning) {
                    resetTimer();
                }
            });
        });
    }

    // ========== SCHEDULE FUNCTIONALITY ==========
    function initializeSchedule() {
        // DOM Elements
        const startTimeInput = document.getElementById('startTime');
        const endTimeInput = document.getElementById('endTime');
        const generateBtn = document.getElementById('generateBtn');
        const scheduleOutput = document.getElementById('scheduleOutput');
        const backFromSchedule = document.getElementById('backFromSchedule');
        const alarmControls = document.getElementById('alarmControls');

        // Initialize with current time
        function initializeTimes() {
            const now = new Date();
            const currentHour = now.getHours().toString().padStart(2, '0');
            const currentMinute = Math.floor(now.getMinutes() / 5) * 5; // Round to nearest 5 minutes
            const formattedMinute = currentMinute.toString().padStart(2, '0');
            
            startTimeInput.value = `${currentHour}:${formattedMinute}`;
            
            // Set default end time (2 hours later)
            const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
            const endHour = endTime.getHours().toString().padStart(2, '0');
            const endMinute = Math.floor(endTime.getMinutes() / 5) * 5;
            const formattedEndMinute = endMinute.toString().padStart(2, '0');
            endTimeInput.value = `${endHour}:${formattedEndMinute}`;
        }

        // Convert time string to minutes
        function timeToMinutes(timeStr) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        }

        // Convert minutes to time string
        function minutesToTime(minutes) {
            const hrs = String(Math.floor((minutes % 1440) / 60)).padStart(2, '0');
            const mins = String((minutes % 60)).padStart(2, '0');
            return `${hrs}:${mins}`;
        }

        // Validate time inputs
        function validateTimes() {
            const startTime = startTimeInput.value;
            const endTime = endTimeInput.value;

            if (!startTime || !endTime) {
                showNotification("Please select both start and end times");
                addLog('Schedule generation failed - missing times', 'error');
                return false;
            }

            let startMinutes = timeToMinutes(startTime);
            let endMinutes = timeToMinutes(endTime);

            // Adjust for overnight schedules
            if (endMinutes <= startMinutes) {
                endMinutes += 1440; // Add 24 hours
            }

            // Validate maximum duration (10 hours)
            if (endMinutes - startMinutes > 600) {
                showNotification("Maximum schedule duration is 10 hours");
                addLog('Schedule generation failed - duration too long', 'error');
                return false;
            }

            return { startMinutes, endMinutes };
        }

        // Generate the schedule
        function generateSchedule() {
            const validation = validateTimes();
            if (!validation) return;

            const { startMinutes, endMinutes } = validation;
            const slotDuration = 50; // 50-minute study sessions
            const breakDuration = 10; // 10-minute breaks
            let currentTime = startMinutes;
            let sessionCount = 1;

            let tableHTML = `
                <div class="schedule-header">
                    <h3>Your Study Schedule</h3>
                    <p>From ${minutesToTime(startMinutes)} to ${minutesToTime(endMinutes)}</p>
                </div>
                <table class="schedule-table">
                    <thead>
                        <tr>
                            <th>Session</th>
                            <th>Type</th>
                            <th>Start Time</th>
                            <th>End Time</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            while (currentTime + slotDuration <= endMinutes) {
                // Study session
                const studyStart = currentTime;
                const studyEnd = studyStart + slotDuration;
                
                tableHTML += `
                    <tr>
                        <td>${sessionCount}</td>
                        <td><span class="study-badge">Study</span></td>
                        <td>${minutesToTime(studyStart)}</td>
                        <td>${minutesToTime(studyEnd)}</td>
                    </tr>
                `;

                currentTime = studyEnd;
                sessionCount++;

                // Break session
                if (currentTime + breakDuration <= endMinutes) {
                    const breakStart = currentTime;
                    const breakEnd = breakStart + breakDuration;
                    
                    tableHTML += `
                        <tr>
                            <td>-</td>
                            <td><span class="break-badge">Break</span></td>
                            <td>${minutesToTime(breakStart)}</td>
                            <td>${minutesToTime(breakEnd)}</td>
                        </tr>
                    `;

                    currentTime = breakEnd;
                }
            }

            tableHTML += `
                    </tbody>
                </table>
                <div class="schedule-summary">
                    Total: ${sessionCount-1} study sessions
                </div>
            `;

            scheduleOutput.innerHTML = tableHTML;
            alarmControls.classList.remove('hidden');
            
            addLog('Schedule generated successfully', 'success');
            showNotification("Study schedule generated");
        }

        // Event listeners
        if (generateBtn) {
            generateBtn.addEventListener('click', generateSchedule);
        }

        if (backFromSchedule) {
            backFromSchedule.addEventListener('click', () => {
                document.getElementById('schedulePanel').classList.remove('active');
                addLog('Returned from Schedule Panel', 'info');
            });
        }

        // Initialize
        initializeTimes();
    }

    // ========== ALARM SOUND ==========
    function playAlarmSound() {
        const soundEnabled = localStorage.getItem('soundEnabled') === 'true';
        if (!soundEnabled) return;
        
        const alarmSoundPlayer = document.getElementById('alarmSoundPlayer');
        const soundType = localStorage.getItem('alarmSound') || 'chime';
        
        let soundFile;
        switch(soundType) {
            case 'bell':
                soundFile = 'sounds/bell.mp3';
                break;
            case 'digital':
                soundFile = 'sounds/digital.mp3';
                break;
            default:
                soundFile = 'sounds/chime.mp3';
        }
        
        alarmSoundPlayer.src = soundFile;
        alarmSoundPlayer.play().catch(e => {
            addLog(`Failed to play alarm sound: ${e.message}`, 'error');
        });
    }

    // ========== PANEL NAVIGATION ==========
    function setupPanelNavigation() {
        const leftArrow = document.getElementById('leftArrow');
        const rightArrow = document.getElementById('rightArrow');
        const schedulePanel = document.getElementById('schedulePanel');
        const timerPanel = document.getElementById('timerPanel');
        const backFromSchedule = document.getElementById('backFromSchedule');
        const backFromTimer = document.getElementById('backFromTimer');

        function showPanel(panelToShow) {
            document.querySelectorAll('.panel').forEach(panel => {
                panel.classList.remove('active');
            });
            panelToShow.classList.add('active');
        }

        if (leftArrow && timerPanel) {
            leftArrow.addEventListener('click', (e) => {
                e.stopPropagation();
                showPanel(timerPanel);
                addLog('Navigated to Timer Panel', 'info');
            });
        }

        if (rightArrow && schedulePanel) {
            rightArrow.addEventListener('click', (e) => {
                e.stopPropagation();
                showPanel(schedulePanel);
                addLog('Navigated to Schedule Panel', 'info');
            });
        }

        if (backFromSchedule) {
            backFromSchedule.addEventListener('click', (e) => {
                e.stopPropagation();
                schedulePanel.classList.remove('active');
                addLog('Returned from Schedule Panel', 'info');
            });
        }

        if (backFromTimer) {
            backFromTimer.addEventListener('click', (e) => {
                e.stopPropagation();
                timerPanel.classList.remove('active');
                addLog('Returned from Timer Panel', 'info');
            });
        }
    }

    // ========== SETTINGS FUNCTIONALITY ==========
    function setupSettings() {
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsPanel = document.getElementById('settingsPanel');
        const closeSettings = document.getElementById('closeSettings');
        const darkModeToggle = document.getElementById('darkModeToggle');
        const animationsToggle = document.getElementById('animationsToggle');
        const remindersToggle = document.getElementById('remindersToggle');
        const soundToggle = document.getElementById('soundToggle');
        const logoutBtn = document.getElementById('logoutBtn');
        const donationBtn = document.getElementById('donationBtn');

        if (settingsBtn && settingsPanel) {
            settingsBtn.addEventListener('click', () => {
                settingsPanel.classList.toggle('active');
                addLog('Settings panel toggled', 'info');
            });
        }
        
        if (closeSettings) {
            closeSettings.addEventListener('click', () => {
                settingsPanel.classList.remove('active');
                addLog('Settings panel closed', 'info');
            });
        }

        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', function() {
                document.body.classList.toggle('dark-mode');
                localStorage.setItem('darkMode', this.checked);
                addLog(`Dark mode ${this.checked ? 'enabled' : 'disabled'}`, 'info');
            });
            const darkModeEnabled = localStorage.getItem('darkMode') === 'true';
            darkModeToggle.checked = darkModeEnabled;
            if (darkModeEnabled) document.body.classList.add('dark-mode');
        }

        if (animationsToggle) {
            animationsToggle.addEventListener('change', function() {
                localStorage.setItem('animationsEnabled', this.checked);
                addLog(`Animations ${this.checked ? 'enabled' : 'disabled'}`, 'info');
            });
            const animationsEnabled = localStorage.getItem('animationsEnabled') !== 'false';
            animationsToggle.checked = animationsEnabled;
        }

        if (remindersToggle) {
            remindersToggle.addEventListener('change', function() {
                localStorage.setItem('remindersEnabled', this.checked);
                addLog(`Reminders ${this.checked ? 'enabled' : 'disabled'}`, 'info');
            });
            const remindersEnabled = localStorage.getItem('remindersEnabled') !== 'false';
            remindersToggle.checked = remindersEnabled;
        }

        if (soundToggle) {
            soundToggle.addEventListener('change', function() {
                localStorage.setItem('soundEnabled', this.checked);
                addLog(`Sounds ${this.checked ? 'enabled' : 'disabled'}`, 'info');
            });
            const soundEnabled = localStorage.getItem('soundEnabled') === 'true';
            soundToggle.checked = soundEnabled;
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                showNotification('Logged out successfully');
                settingsPanel.classList.remove('active');
                addLog('User logged out', 'info');
                window.location.href = 'index.html';
            });
        }

        if (donationBtn) {
            donationBtn.addEventListener('click', function() {
                showNotification('Redirecting to donation page');
                addLog('Donation button clicked', 'info');
                window.location.href = 'donation.html';
            });
        }
    }

    // ========== LOGGING SYSTEM ==========
    function addLog(message, type = 'info') {
        if (!logsContainer) return;
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <span class="log-time">${new Date().toLocaleTimeString()}</span>
            <span class="log-message">${message}</span>
        `;
        logsContainer.appendChild(logEntry);
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    // ========== NOTIFICATION SYSTEM ==========
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // ========== CAMERA FUNCTIONALITY ==========
    async function startCamera() {
        try {
            addLog('Attempting to access camera...');
            
            cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: "user"
                } 
            });
            
            const cameraFeed = document.getElementById('cameraFeed');
            if (cameraFeed) {
                cameraFeed.srcObject = cameraStream;
            }
            
            document.getElementById('cameraPreview')?.classList.remove('hidden');
            
            cameraActive = true;
            document.getElementById('initialIcon')?.classList.add('hidden');
            document.getElementById('cameraIcon')?.classList.remove('hidden');
            document.querySelector('.camera-btn')?.classList.add('active');
            
            addLog('Camera activated successfully', 'success');
            showNotification("Camera activated");

        } catch (err) {
            addLog(`Camera error: ${err.message}`, 'error');
            showNotification('Failed to access camera. Please ensure camera permissions are granted.');
        }
    }

    async function stopCamera() {
        try {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
                cameraStream = null;
            }
            
            document.getElementById('cameraPreview')?.classList.add('hidden');
            
            cameraActive = false;
            document.getElementById('initialIcon')?.classList.remove('hidden');
            document.getElementById('cameraIcon')?.classList.add('hidden');
            document.querySelector('.camera-btn')?.classList.remove('active');
            
            addLog('Camera deactivated', 'info');
            showNotification("Camera deactivated");

        } catch (err) {
            addLog(`Error stopping camera: ${err.message}`, 'error');
            showNotification('Failed to stop camera');
        }
    }

    // ========== MICROPHONE FUNCTIONALITY ==========
    async function startMicrophone() {
        try {
            addLog('Attempting to access microphone...');
            
            micStream = await navigator.mediaDevices.getUserMedia({ 
                audio: true 
            });
            
            micActive = true;
            document.getElementById('micMute')?.classList.add('hidden');
            document.getElementById('micOn')?.classList.remove('hidden');
            document.getElementById('micButton')?.classList.add('active');
            
            addLog('Microphone activated successfully', 'success');
            showNotification("Microphone activated");

        } catch (err) {
            addLog(`Microphone error: ${err.message}`, 'error');
            showNotification('Failed to access microphone. Please ensure microphone permissions are granted.');
        }
    }

    async function stopMicrophone() {
        try {
            if (micStream) {
                micStream.getTracks().forEach(track => track.stop());
                micStream = null;
            }
            
            micActive = false;
            document.getElementById('micMute')?.classList.remove('hidden');
            document.getElementById('micOn')?.classList.add('hidden');
            document.getElementById('micButton')?.classList.remove('active');
            
            addLog('Microphone deactivated', 'info');
            showNotification("Microphone deactivated");

        } catch (err) {
            addLog(`Error stopping microphone: ${err.message}`, 'error');
            showNotification('Failed to stop microphone');
        }
    }

    // ========== INITIALIZATION ==========
    function initCameraControls() {
        const cameraBtn = document.querySelector('.camera-btn');
        if (cameraBtn) {
            cameraBtn.addEventListener('click', async () => {
                if (!cameraActive) {
                    await startCamera();
                } else {
                    await stopCamera();
                }
            });
        }
        
        const closeCameraBtn = document.getElementById('closeCamera');
        if (closeCameraBtn) {
            closeCameraBtn.addEventListener('click', stopCamera);
        }
    }

    function initMicrophoneControls() {
        const micButton = document.getElementById('micButton');
        if (micButton) {
            micButton.addEventListener('click', async () => {
                if (!micActive) {
                    await startMicrophone();
                } else {
                    await stopMicrophone();
                }
            });
        }
    }

    function initializeApp() {
        setupPanelNavigation();
        setupSettings();
        initCameraControls();
        initMicrophoneControls();
        initTimerControls();
        initializeSchedule();
        
        // Initialize timer display
        updateTimerDisplay();
        
        // Initialize alarm settings from localStorage
        const alarmsEnabled = localStorage.getItem('alarmsEnabled') === 'true';
        const alarmSound = localStorage.getItem('alarmSound') || 'chime';
        document.getElementById('enableAlarms').checked = alarmsEnabled;
        document.getElementById('alarmSound').value = alarmSound;

        // Add CSS for notifications if not already present
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    padding: 15px 25px;
                    background-color: #8d7b68;
                    color: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    z-index: 1000;
                    animation: fadeIn 0.3s ease-out;
                }
                .fade-out {
                    animation: fadeOut 0.3s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeOut {
                    from { opacity: 1; transform: translateY(0); }
                    to { opacity: 0; transform: translateY(20px); }
                }
                .log-entry {
                    padding: 8px 12px;
                    margin: 4px 0;
                    border-radius: 4px;
                    font-family: monospace;
                }
                .log-entry.info { background-color: #f0f0f0; }
                .log-entry.success { background-color: #e6f7e6; }
                .log-entry.warning { background-color: #fff3e6; }
                .log-entry.error { background-color: #ffebee; }
                .log-entry.server { background-color: #e6f3ff; }
                .dark-mode {
                    background-color: #121212;
                    color: #ffffff;
                }
                .dark-mode .panel {
                    background-color: #1e1e1e;
                    color: #ffffff;
                }
                .schedule-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                    font-size: 0.9em;
                }
                .schedule-table th {
                    background-color: #5d41de;
                    color: white;
                    text-align: left;
                    padding: 12px 15px;
                }
                .schedule-table td {
                    padding: 12px 15px;
                    border-bottom: 1px solid #ddd;
                }
                .schedule-table tr:nth-child(even) {
                    background-color: #f8f8f8;
                }
                .study-badge {
                    background-color: #e6f7e6;
                    color: #2e7d32;
                    padding: 3px 8px;
                    border-radius: 12px;
                    font-size: 0.8em;
                }
                .break-badge {
                    background-color: #fff3e0;
                    color: #e65100;
                    padding: 3px 8px;
                    border-radius: 12px;
                    font-size: 0.8em;
                }
                .schedule-summary {
                    text-align: center;
                    margin-top: 20px;
                    padding: 10px;
                    background-color: #f0f7ff;
                    border-radius: 4px;
                    font-weight: bold;
                }
                .schedule-header {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .schedule-header h3 {
                    margin-bottom: 5px;
                    color: #5d41de;
                }
                .schedule-header p {
                    color: #666;
                    font-size: 0.9em;
                }
                /* Dark mode support */
                .dark-mode .schedule-header p {
                    color: #aaa;
                }
                .dark-mode .schedule-table td {
                    border-bottom: 1px solid #444;
                }
                .dark-mode .schedule-table tr:nth-child(even) {
                    background-color: #2a2a2a;
                }
                .dark-mode .study-badge {
                    background-color: #1b5e20;
                    color: #a5d6a7;
                }
                .dark-mode .break-badge {
                    background-color: #e65100;
                    color: #ffcc80;
                }
                .dark-mode .schedule-summary {
                    background-color: #1a3a5a;
                    color: #bbdefb;
                }
            `;
            document.head.appendChild(style);
        }

        addLog('Application initialized', 'success');
    }

    initializeApp();
});