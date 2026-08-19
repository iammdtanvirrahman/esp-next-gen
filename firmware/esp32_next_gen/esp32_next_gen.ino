/*
 * ESP Next Gen — Generic ESP32 Hardware Endpoint
 * Protocol: ESP-NEXT-GEN/2
 *
 * ESP32 has NO project-specific logic.
 * Laptop/App is the brain. This firmware only executes hardware commands.
 *
 * Wi-Fi:
 *   SSID: taifa
 *   Password: 20072311
 *
 * WebSocket: port 81
 *
 * Supported commands:
 *   PING
 *   pinMode
 *   digitalWrite
 *   digitalRead
 *   analogWrite
 *   analogRead
 *   servo
 *   servoDetach
 *   tone
 *   noTone
 *
 * Accepted command keys:
 *   type   (current Next Gen protocol)
 *   cmd    (generic alias)
 *
 * No motor, car, ultrasonic, fine, or application-specific logic lives here.
 */

#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ESP32Servo.h>

// ============================================================
// WIFI / NETWORK
// ============================================================

const char* WIFI_SSID = "taifa";
const char* WIFI_PASSWORD = "20072311";

constexpr uint16_t WS_PORT = 81;

WebSocketsServer webSocket(WS_PORT);

// ============================================================
// SERVO STATE
// ============================================================

Servo servoDevice;
int activeServoPin = -1;

// ============================================================
// COMMAND HELPERS
// ============================================================

void sendJSON(uint8_t client, const String& payload) {
  webSocket.sendTXT(client, payload);
}

void sendError(uint8_t client, const String& message) {
  String json = "{\"type\":\"error\",\"message\":\"";
  json += message;
  json += "\"}";
  sendJSON(client, json);
}

bool validGPIO(int pin) {
  return pin >= 0 && pin <= 39;
}

String readValue(const String& json, const String& key) {
  const String token = "\"" + key + "\"";
  const int keyPos = json.indexOf(token);

  if (keyPos < 0) return "";

  const int colon = json.indexOf(':', keyPos + token.length());
  if (colon < 0) return "";

  int start = colon + 1;
  while (start < (int)json.length() && json[start] == ' ') {
    start++;
  }

  if (start >= (int)json.length()) return "";

  if (json[start] == '"') {
    start++;
    const int end = json.indexOf('"', start);
    return end >= 0 ? json.substring(start, end) : "";
  }

  int end = start;
  while (end < (int)json.length() && json[end] != ',' && json[end] != '}') {
    end++;
  }

  String value = json.substring(start, end);
  value.trim();
  return value;
}

String commandName(const String& json) {
  String cmd = readValue(json, "type");
  if (cmd.length() == 0) {
    cmd = readValue(json, "cmd");
  }
  return cmd;
}

int parsePin(const String& json) {
  return readValue(json, "pin").toInt();
}

bool parseBool(const String& value) {
  return value == "true" || value == "1" || value == "HIGH";
}

int parsePinMode(const String& value) {
  if (value == "INPUT" || value == "0") return INPUT;
  if (value == "OUTPUT" || value == "1") return OUTPUT;
  if (value == "INPUT_PULLUP" || value == "2") return INPUT_PULLUP;

  return -1;
}

// ============================================================
// DEVICE IDENTIFICATION
// ============================================================

void sendHello(uint8_t client) {
  String json = "{";
  json += "\"type\":\"hello\",";
  json += "\"protocol\":\"ESP-NEXT-GEN/2\",";
  json += "\"device\":\"ESP32\",";
  json += "\"ip\":\"";
  json += WiFi.localIP().toString();
  json += "\",";
  json += "\"wsPort\":";
  json += WS_PORT;
  json += ",\"executor\":\"generic-hardware\",";
  json += "\"capabilities\":[";
  json += "\"gpio\",";
  json += "\"pwm\",";
  json += "\"adc\",";
  json += "\"servo\",";
  json += "\"tone\"";
  json += "]}";

  sendJSON(client, json);
}

// ============================================================
// PIN MODE
// ============================================================

void executePinMode(uint8_t client, const String& json) {
  const int pin = parsePin(json);
  const String modeText = readValue(json, "mode");
  const int mode = parsePinMode(modeText);

  if (!validGPIO(pin) || mode < 0) {
    sendError(client, "Invalid pinMode command");
    return;
  }

  pinMode(pin, mode);

  String response = "{";
  response += "\"type\":\"ack\",";
  response += "\"command\":\"pinMode\",";
  response += "\"pin\":";
  response += pin;
  response += ",\"mode\":\"";
  response += modeText;
  response += "\"}";

  sendJSON(client, response);
}

// ============================================================
// DIGITAL WRITE
// ============================================================

void executeDigitalWrite(uint8_t client, const String& json) {
  const int pin = parsePin(json);
  String value = readValue(json, "state");
  if (value.length() == 0) value = readValue(json, "value");

  if (!validGPIO(pin)) {
    sendError(client, "Invalid GPIO");
    return;
  }

  const bool state = parseBool(value);

  pinMode(pin, OUTPUT);
  digitalWrite(pin, state ? HIGH : LOW);

  String response = "{";
  response += "\"type\":\"ack\",";
  response += "\"command\":\"digitalWrite\",";
  response += "\"pin\":";
  response += pin;
  response += ",\"value\":";
  response += state ? "true" : "false";
  response += "}";

  sendJSON(client, response);
}

// ============================================================
// DIGITAL READ
// ============================================================

void executeDigitalRead(uint8_t client, const String& json) {
  const int pin = parsePin(json);

  if (!validGPIO(pin)) {
    sendError(client, "Invalid GPIO");
    return;
  }

  pinMode(pin, INPUT);
  const int value = digitalRead(pin);

  String response = "{";
  response += "\"type\":\"digitalRead\",";
  response += "\"pin\":";
  response += pin;
  response += ",\"value\":";
  response += value;
  response += "}";

  sendJSON(client, response);
}

// ============================================================
// ANALOG WRITE / PWM
// ============================================================

void executeAnalogWrite(uint8_t client, const String& json) {
  const int pin = parsePin(json);
  int value = readValue(json, "value").toInt();

  if (!validGPIO(pin)) {
    sendError(client, "Invalid GPIO");
    return;
  }

  value = constrain(value, 0, 255);

  pinMode(pin, OUTPUT);
  analogWrite(pin, value);

  String response = "{";
  response += "\"type\":\"ack\",";
  response += "\"command\":\"analogWrite\",";
  response += "\"pin\":";
  response += pin;
  response += ",\"value\":";
  response += value;
  response += "}";

  sendJSON(client, response);
}

// ============================================================
// ANALOG READ / ADC
// ============================================================

void executeAnalogRead(uint8_t client, const String& json) {
  const int pin = parsePin(json);

  if (!validGPIO(pin)) {
    sendError(client, "Invalid ADC GPIO");
    return;
  }

  const int value = analogRead(pin);

  String response = "{";
  response += "\"type\":\"analogRead\",";
  response += "\"pin\":";
  response += pin;
  response += ",\"value\":";
  response += value;
  response += "}";

  sendJSON(client, response);
}

// ============================================================
// SERVO
// ============================================================

void executeServo(uint8_t client, const String& json) {
  const int pin = parsePin(json);
  int angle = readValue(json, "angle").toInt();

  if (!validGPIO(pin)) {
    sendError(client, "Invalid servo GPIO");
    return;
  }

  angle = constrain(angle, 0, 180);

  if (activeServoPin != pin) {
    if (activeServoPin >= 0) servoDevice.detach();
    activeServoPin = pin;
    servoDevice.attach(activeServoPin);
  }

  servoDevice.write(angle);

  String response = "{";
  response += "\"type\":\"ack\",";
  response += "\"command\":\"servo\",";
  response += "\"pin\":";
  response += pin;
  response += ",\"angle\":";
  response += angle;
  response += "}";

  sendJSON(client, response);
}

void executeServoDetach(uint8_t client) {
  if (activeServoPin >= 0) {
    servoDevice.detach();
    activeServoPin = -1;
  }

  sendJSON(client, "{\"type\":\"ack\",\"command\":\"servoDetach\"}");
}

// ============================================================
// TONE
// ============================================================

void executeTone(uint8_t client, const String& json) {
  const int pin = parsePin(json);
  const unsigned int frequency = (unsigned int)constrain(readValue(json, "frequency").toInt(), 1, 20000);
  const unsigned long duration = (unsigned long)max(0, readValue(json, "duration").toInt());

  if (!validGPIO(pin)) {
    sendError(client, "Invalid tone GPIO");
    return;
  }

  if (duration > 0) {
    tone(pin, frequency, duration);
  } else {
    tone(pin, frequency);
  }

  sendJSON(client, "{\"type\":\"ack\",\"command\":\"tone\"}");
}

void executeNoTone(uint8_t client, const String& json) {
  const int pin = parsePin(json);

  if (!validGPIO(pin)) {
    sendError(client, "Invalid tone GPIO");
    return;
  }

  noTone(pin);
  sendJSON(client, "{\"type\":\"ack\",\"command\":\"noTone\"}");
}

// ============================================================
// COMMAND EXECUTOR
// ============================================================

void executeCommand(uint8_t client, const String& json) {
  const String command = commandName(json);

  if (command == "ping") {
    sendJSON(client, "{\"type\":\"pong\"}");
    return;
  }

  if (command == "stop") {
    // Generic endpoint has no project-specific motor state to stop.
    // Release active servo only when explicitly requested; otherwise
    // the command is simply acknowledged.
    sendJSON(client, "{\"type\":\"ack\",\"command\":\"stop\"}");
    return;
  }

  if (command == "pinMode") {
    executePinMode(client, json);
    return;
  }

  if (command == "digitalWrite") {
    executeDigitalWrite(client, json);
    return;
  }

  if (command == "digitalRead") {
    executeDigitalRead(client, json);
    return;
  }

  if (command == "analogWrite" || command == "pwm") {
    executeAnalogWrite(client, json);
    return;
  }

  if (command == "analogRead" || command == "adc") {
    executeAnalogRead(client, json);
    return;
  }

  if (command == "servo") {
    executeServo(client, json);
    return;
  }

  if (command == "servoDetach") {
    executeServoDetach(client);
    return;
  }

  if (command == "tone") {
    executeTone(client, json);
    return;
  }

  if (command == "noTone") {
    executeNoTone(client, json);
    return;
  }

  sendError(client, "Unsupported hardware command: " + command);
}

// ============================================================
// WEBSOCKET
// ============================================================

void webSocketEvent(
  uint8_t client,
  WStype_t type,
  uint8_t* payload,
  size_t length
) {
  if (type == WStype_CONNECTED) {
    sendHello(client);
    return;
  }

  if (type == WStype_TEXT) {
    String message((char*)payload, length);

    if (message == "PING") {
      webSocket.sendTXT(client, "PONG");
      return;
    }

    if (message.startsWith("{")) {
      executeCommand(client, message);
      return;
    }

    sendError(client, "Command must be JSON");
  }
}

// ============================================================
// SETUP
// ============================================================

void setup() {
  Serial.begin(115200);
  delay(300);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.println();
  Serial.println("ESP Next Gen Generic Hardware Endpoint");
  Serial.println("Connecting to Wi-Fi...");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print('.');
  }

  Serial.println();
  Serial.println("Wi-Fi connected");
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());

  webSocket.begin();
  webSocket.onEvent(webSocketEvent);

  Serial.print("WebSocket ready on port ");
  Serial.println(WS_PORT);
  Serial.println("Generic hardware command executor READY");
}

// ============================================================
// LOOP
// ============================================================

void loop() {
  webSocket.loop();
}
