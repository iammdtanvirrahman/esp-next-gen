// কোডমিটর এডিটর ইনিশিয়ালাইজ করা (C++ মোডে)
var editor = CodeMirror.fromTextArea(document.getElementById("codeEditor"), {
    lineNumbers: true,
    theme: "dracula",
    mode: "text/x-c++src", // C++ স্ট্রাকচার হাইলাইট করবে
    value: `void setup() {\n  // এখানে কোড লিখুন\n  print("ESP Connected!");\n}\n\nvoid loop() {\n  digitalWrite(2, HIGH);\n  delay(1000);\n  digitalWrite(2, LOW);\n  delay(1000);\n}`
});

// টার্মিনালে মেসেজ দেখানোর ফাংশন
function logToTerminal(message, type = "info") {
    let consoleArea = document.getElementById("terminalConsole");
    let color = type === "error" ? "#ff5555" : type === "success" ? "#50fa7b" : "#f8f8f2";
    
    consoleArea.innerHTML += `<div style="color: ${color}">> ${message}</div>`;
    consoleArea.scrollTop = consoleArea.scrollHeight; // স্ক্রোল নিচে রাখা
}

// ESP ওয়াইফাই কানেক্ট করার ডামি লজিক
function connectESP() {
    let ip = document.getElementById("espIp").value;
    if(!ip) {
        alert("দয়া করে আগে ESP-এর IP অ্যাড্রেস দিন!");
        return;
    }
    logToTerminal(`Connecting to ESP at ${ip}...`);
    // এখানে আমরা পরে WebSocket বা Fetch API যোগ করব
    setTimeout(() => {
        logToTerminal(`Connected successfully to ${ip}!`, "success");
    }, 1500);
}

// ভার্চুয়াল কম্পাইল এবং রান করার লজিক
function runVirtualCode() {
    let code = editor.getValue(); // এডিটর থেকে কোড নেওয়া
    logToTerminal("Starting Virtual Compilation...");
    
    // একদম সাধারণ একটি ভার্চুয়াল পার্সিং (টেস্ট করার জন্য)
    setTimeout(() => {
        logToTerminal("Parsing syntax tree... No errors found.", "success");
        logToTerminal("Compiling into ESP Bytecode...", "info");
        
        // কোডের ভেতর থেকে delay এবং digitalWrite খোঁজা
        if(code.includes("digitalWrite")) {
            logToTerminal("Generated Instruction: [PIN_COMMANDS_DETECTED]");
            logToTerminal("Sending byte-stream to ESP via WiFi...", "success");
            // এই লাইনে আমরা ESP-তে ডাটা পাঠাবো
        } else {
            logToTerminal("Code executed successfully (No hardware action required).", "success");
        }
    }, 1000);
}
