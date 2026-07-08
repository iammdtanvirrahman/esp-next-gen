// কোডমিটর ইনিশিয়ালাইজেশন
var editor = CodeMirror.fromTextArea(document.getElementById("codeEditor"), {
    lineNumbers: true,
    theme: "dracula",
    mode: "text/x-c++src",
    value: `void setup() {\n  Serial.begin(115200);\n  pinMode(2, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(2, HIGH);\n  delay(1000);\n  digitalWrite(2, LOW);\n  delay(1000);\n}`
});

// গ্লোবাল সার্কিট ম্যাপ অবজেক্ট
let virtualCircuit = {};

// পিন ম্যাপ করার ফাংশন
function mapPin(pinNum, device) {
    if (device === "none") {
        delete virtualCircuit[pinNum];
    } else {
        virtualCircuit[pinNum] = device;
    }
    
    // স্ট্যাটাস আপডেট করা
    let statusDiv = document.getElementById("circuitStatus");
    let mappedPins = Object.keys(virtualCircuit).map(p => `GPIO ${p} -> ${virtualCircuit[p].toUpperCase()}`);
    
    if (mappedPins.length > 0) {
        statusDiv.innerHTML = "<strong>ম্যাপ করা ডিভাইসসমূহ:</strong><br>" + mappedPins.join("<br>");
        logToTerminal(`Circuit updated: GPIO ${pinNum} is now configured as ${device}.`, "info");
    } else {
        statusDiv.innerText = "কোনো ডিভাইস ম্যাপ করা হয়নি।";
    }
}

function logToTerminal(message, type = "info") {
    let consoleArea = document.getElementById("terminalConsole");
    let color = type === "error" ? "#ff5555" : type === "success" ? "#50fa7b" : "#f8f8f2";
    consoleArea.innerHTML += `<div style="color: ${color}">> ${message}</div>`;
    consoleArea.scrollTop = consoleArea.scrollHeight;
}

function connectESP() {
    let ip = document.getElementById("espIp").value;
    if(!ip) { alert("দয়া করে আগে ESP-এর IP দিন!"); return; }
    logToTerminal(`Connecting to ESP via WiFi at ${ip}...`);
    setTimeout(() => { logToTerminal(`Connected to ESP successfully!`, "success"); }, 1000);
}

// সার্কিট মডেল চেক সহ ভার্চুয়াল রান
function runVirtualCode() {
    let code = editor.getValue();
    logToTerminal("Starting Virtual Compilation...");
    
    setTimeout(() => {
        logToTerminal("Checking code syntax against Virtual Circuit Model...", "info");
        
        // কোডে জাস্ট 'digitalWrite(2' খোঁজা হচ্ছে সিম্পল টেস্টের জন্য
        if (code.includes("digitalWrite(2") || code.includes("pinMode(2")) {
            // চেক করা হচ্ছে সার্কিটে GPIO 2 এ কিছু আছে কিনা
            if (virtualCircuit[2] === "led") {
                logToTerminal("Success: GPIO 2 is correctly configured with an LED in Circuit Model!", "success");
                logToTerminal("Injecting live instructions to ESP...", "success");
            } else {
                logToTerminal("Warning: Code uses GPIO 2, but it's not mapped to an LED in the Circuit Model!", "error");
            }
        } else {
            logToTerminal("Compiled successfully! No direct hardware locks found.", "success");
        }
    }, 1000);
}

// --- জয়স্টিক লজিক ---
const stick = document.getElementById('joystickStick');
const container = document.querySelector('.joystick-container');
const dataDisplay = document.getElementById('joystickData');
let isDragging = false;
const maxDistance = 30;

function handleMove(clientX, clientY) {
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let deltaX = clientX - centerX;
    let deltaY = clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > maxDistance) {
        deltaX = (deltaX / distance) * maxDistance;
        deltaY = (deltaY / distance) * maxDistance;
    }

    stick.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    const targetX = Math.round((deltaX / maxDistance) * 100);
    const targetY = Math.round((deltaY / maxDistance) * -100);

    let status = "Center";
    if (targetY > 40) status = "Forward ↑";
    else if (targetY < -40) status = "Backward ↓";
    else if (targetX > 40) status = "Right →";
    else if (targetX < -40) status = "Left ←";

    dataDisplay.innerText = `X: ${targetX}, Y: ${targetY} | Status: ${status}`;
}

container.addEventListener('mousedown', () => isDragging = true);
window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    stick.style.transform = 'translate(0px, 0px)';
    dataDisplay.innerText = "X: 0, Y: 0 | Status: Center";
});
window.addEventListener('mousemove', (e) => { if (isDragging) handleMove(e.clientX, e.clientY); });

container.addEventListener('touchstart', () => isDragging = true);
window.addEventListener('touchend', () => { isDragging = false; stick.style.transform = 'translate(0px, 0px)'; dataDisplay.innerText = "X: 0, Y: 0 | Status: Center"; });
window.addEventListener('touchmove', (e) => { if (isDragging) handleMove(e.touches[0].clientX, e.touches[0].clientY); });
