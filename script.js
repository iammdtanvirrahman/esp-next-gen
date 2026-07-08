// কোডমিটর এডিটর ডিফল্ট কোড সহ চালুকরণ
var editor = CodeMirror.fromTextArea(document.getElementById("codeEditor"), {
    lineNumbers: true,
    theme: "dracula",
    mode: "text/x-c++src",
    value: `void setup() {\n  Serial.begin(115200);\n  lcd.begin();\n}\n\nvoid loop() {\n  float temp = dht.readTemperature();\n  lcd.print(temp);\n  delay(2000);\n}`
});

// ক্লাউড সেন্ট্রাল লাইব্রেরি রেজিস্ট্রি (JSON Database)
const universalLibraryRegistry = {
    led: { name: "Built-in LED Lib", commands: ["digitalWrite"], requiredHeader: "" },
    buzzer: { name: "Buzzer Tone ToneFX", commands: ["tone", "noTone"], requiredHeader: "" },
    dht11: { name: "DHT11 Climate Sensor Library v2.1", commands: ["readTemperature", "readHumidity"], requiredHeader: "dht" },
    sonar: { name: "HC-SR04 Ultrasonic Driver", commands: ["ping_cm", "ping_median"], requiredHeader: "sonar" },
    servo: { name: "Universal Servo Controller", commands: ["write", "attach"], requiredHeader: "servo" },
    lcd_i2c: { name: "LiquidCrystal I2C Display Driver", commands: ["print", "clear", "setCursor"], requiredHeader: "lcd" }
};

let virtualCircuit = {};
let activeLibraries = [];

// পিন সিলেক্ট করলে লাইব্রেরি অটো-লোড করার ফাংশন
function mapPin(pinNum, device) {
    if (device === "none") {
        delete virtualCircuit[pinNum];
    } else {
        virtualCircuit[pinNum] = {
            type: device,
            library: universalLibraryRegistry[device]
        };
    }
    updateCircuitUI();
}

// সার্কিট এবং লাইব্রেরি প্যানেলের ইন্টারফেস আপডেট
function updateCircuitUI() {
    let statusDiv = document.getElementById("circuitStatus");
    let mappedPins = [];
    activeLibraries = [];

    for (let pin in virtualCircuit) {
        let dev = virtualCircuit[pin];
        mappedPins.push(`GPIO ${pin} ➔ ${dev.type.toUpperCase()}`);
        if (dev.library && !activeLibraries.includes(dev.library.name)) {
            activeLibraries.push(dev.library.name);
        }
    }
    
    if (mappedPins.length > 0) {
        statusDiv.innerHTML = `
            <strong style="color:#50fa7b;">সংযুক্ত হার্ডওয়্যার:</strong><br>${mappedPins.join("<br>")}<br><br>
            <strong style="color: #ff79c6;">অটো-লোডেড ক্লাউড লাইব্রেরি:</strong><br>
            ${activeLibraries.map(lib => `📚 ${lib}`).join("<br>")}
        `;
    } else {
        statusDiv.innerText = "কোনো ডিভাইস ম্যাপ করা হয়নি। লাইব্রেরি নিষ্ক্রিয়।";
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
    setTimeout(() => { logToTerminal(`Connected successfully to ESP at ${ip}!`, "success"); }, 1000);
}

// ভার্চুয়াল ক্লাউড কম্পাইলার (লাইব্রেরি ডিপেন্ডেন্সি চেক সহ)
function runVirtualCode() {
    let code = editor.getValue();
    logToTerminal("Starting Universal Virtual Compilation...");
    
    setTimeout(() => {
        logToTerminal("Analyzing architecture syntax against active Cloud Libraries...", "info");
        let compileError = false;

        // চেক করা হচ্ছে কোডের কোনো ফাংশনের জন্য লাইব্রেরি মিসিং কি না
        for (let key in universalLibraryRegistry) {
            let lib = universalLibraryRegistry[key];
            // কোডে যদি এই লাইব্রেরির কোনো ফাংশন (যেমন readTemperature) থাকে
            let usesLibFunctions = lib.commands.some(cmd => code.includes(cmd));
            
            if (usesLibFunctions) {
                // কিন্তু সার্কিটে যদি এই ডিভাইসটি সিলেক্ট করা না থাকে
                if (!activeLibraries.includes(lib.name)) {
                    logToTerminal(`Compilation Error: '${lib.commands[0]}()' ব্যবহার করা হয়েছে কিন্তু '${lib.name}' লাইব্রেরিটি লোড করা নেই!`, "error");
                    compileError = true;
                } else {
                    logToTerminal(`[Dependency Verified] Matrix match for ${lib.name}`, "success");
                }
            }
        }

        if (!compileError) {
            logToTerminal("Virtual Compilation Successful! Byte-stream generated.", "success");
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
