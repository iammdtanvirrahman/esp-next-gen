/*
 * ESP Next Gen - ESP32 firmware
 * Protocol compatible with the web IDE NetworkManager.
 *
 * Required Arduino libraries:
 *   - WiFi (ESP32 core)
 *   - WebSocketsServer
 *
 * Optional hardware defaults match the user's ESP32 robot wiring:
 *   L298N: IN1=18 IN2=19 IN3=4 IN4=5 ENA=13 ENB=14
 *   Ultrasonic: TRIG=5 ECHO=18
 *   LEDs: GREEN=15 RED=2
 *   TM1637: CLK=22 DIO=21
 *
 * IMPORTANT: the ultrasonic and motor defaults above intentionally preserve
 * the project's previously-used mapping. Check for pin conflicts before use.
 */

#include <WiFi.h>
#include <WebSocketsServer.h>

// ------------------------- Wi-Fi -------------------------
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ------------------------- WebSocket ----------------------
constexpr uint16_t WS_PORT = 81;
WebSocketsServer webSocket(WS_PORT);

// ------------------------- Motor driver -------------------
constexpr uint8_t IN1 = 18;
constexpr uint8_t IN2 = 19;
constexpr uint8_t IN3 = 4;
constexpr uint8_t IN4 = 5;
constexpr uint8_t ENA = 13;
constexpr uint8_t ENB = 14;

// ------------------------- Indicators ---------------------
constexpr uint8_t GREEN_LED = 15;
constexpr uint8_t RED_LED = 2;

// ------------------------- Ultrasonic ----------------------
constexpr uint8_t TRIG_PIN = 5;
constexpr uint8_t ECHO_PIN = 18;
constexpr float DISTANCE_THRESHOLD_CM = 15.0f;

// ------------------------- Runtime ------------------------
int motorSpeed = 120;
unsigned long lastClientActivity = 0;
unsigned long lastTelemetry = 0;
const unsigned long COMMAND_TIMEOUT_MS = 1500;
const unsigned long TELEMETRY_INTERVAL_MS = 1000;

void setMotor(int left, int right) {
  left = constrain(left, -255, 255);
  right = constrain(right, -255, 255);

  digitalWrite(IN1, left > 0);
  digitalWrite(IN2, left < 0);
  digitalWrite(IN3, right > 0);
  digitalWrite(IN4, right < 0);

  analogWrite(ENA, abs(left));
  analogWrite(ENB, abs(right));
}

void stopMotors() {
  setMotor(0, 0);
}

float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000UL);
  if (duration == 0) return -1.0f;

  return (duration * 0.0343f) / 2.0f;
}

void sendJSON(uint8_t client, const String& payload) {
  webSocket.sendTXT(client, payload);
}

void broadcastStatus() {
  String json = "{\"type\":\"status\",\"connected\":true,\"ip\":\"";
  json += WiFi.localIP().toString();
  json += "\",\"speed\":";
  json += motorSpeed;
  json += "}";
  webSocket.broadcastTXT(json);
}

void broadcastTelemetry() {
  float distance = readDistanceCm();

  bool obstacle = distance > 0 && distance <= DISTANCE_THRESHOLD_CM;
  digitalWrite(GREEN_LED, obstacle ? HIGH : LOW);

  String json = "{\"type\":\"telemetry\",\"distance\":";
  json += String(distance, 1);
  json += ",\"obstacle\":";
  json += obstacle ? "true" : "false";
  json += ",\"speed\":";
  json += motorSpeed;
  json += "}";

  webSocket.broadcastTXT(json);
}

void handleJoystick(uint8_t client, float x, float y) {
  // x/y range expected by the frontend is roughly -100..100.
  x = constrain(x, -100.0f, 100.0f);
  y = constrain(y, -100.0f, 100.0f);

  float forward = y / 100.0f;
  float turn = x / 100.0f;

  // Differential drive mix.
  float left = (forward + turn) * motorSpeed;
  float right = (forward - turn) * motorSpeed;

  setMotor((int)left, (int)right);
  lastClientActivity = millis();

  sendJSON(client, "{\"type\":\"ack\",\"command\":\"joystick\"}");
}

void handleText(uint8_t client, const String& message) {
  lastClientActivity = millis();

  // JSON protocol from the web IDE.
  if (message.startsWith("{\"")) {
    if (message.indexOf("\"type\":\"joystick\"") >= 0) {
      int xIndex = message.indexOf("\"x\"");
      int yIndex = message.indexOf("\"y\"");

      if (xIndex >= 0 && yIndex >= 0) {
        float x = message.substring(message.indexOf(':', xIndex) + 1, message.indexOf(',', xIndex)).toFloat();
        int yEnd = message.indexOf('}', yIndex);
        if (yEnd < 0) yEnd = message.length();
        float y = message.substring(message.indexOf(':', yIndex) + 1, yEnd).toFloat();
        handleJoystick(client, x, y);
        return;
      }
    }

    if (message.indexOf("\"type\":\"move\"") >= 0) {
      if (message.indexOf("\"direction\":\"forward\"") >= 0) setMotor(motorSpeed, motorSpeed);
      else if (message.indexOf("\"direction\":\"backward\"") >= 0) setMotor(-motorSpeed, -motorSpeed);
      else if (message.indexOf("\"direction\":\"left\"") >= 0) setMotor(-motorSpeed, motorSpeed);
      else if (message.indexOf("\"direction\":\"right\"") >= 0) setMotor(motorSpeed, -motorSpeed);
      else stopMotors();

      sendJSON(client, "{\"type\":\"ack\",\"command\":\"move\"}");
      return;
    }

    if (message.indexOf("\"type\":\"stop\"") >= 0) {
      stopMotors();
      sendJSON(client, "{\"type\":\"ack\",\"command\":\"stop\"}");
      return;
    }

    if (message.indexOf("\"type\":\"speed\"") >= 0) {
      int speedPos = message.indexOf("\"value\"");
      if (speedPos >= 0) {
        motorSpeed = constrain(message.substring(message.indexOf(':', speedPos) + 1).toInt(), 0, 255);
        broadcastStatus();
      }
      return;
    }

    if (message.indexOf("\"type\":\"digitalWrite\"") >= 0) {
      int pinPos = message.indexOf("\"pin\"");
      int statePos = message.indexOf("\"state\"");
      if (pinPos >= 0 && statePos >= 0) {
        int pin = message.substring(message.indexOf(':', pinPos) + 1, message.indexOf(',', pinPos)).toInt();
        int state = message.substring(message.indexOf(':', statePos) + 1).toInt();
        pinMode(pin, OUTPUT);
        digitalWrite(pin, state ? HIGH : LOW);
      }
      return;
    }

    if (message.indexOf("\"type\":\"analogWrite\"") >= 0) {
      int pinPos = message.indexOf("\"pin\"");
      int valuePos = message.indexOf("\"value\"");
      if (pinPos >= 0 && valuePos >= 0) {
        int pin = message.substring(message.indexOf(':', pinPos) + 1, message.indexOf(',', pinPos)).toInt();
        int value = message.substring(message.indexOf(':', valuePos) + 1).toInt();
        pinMode(pin, OUTPUT);
        analogWrite(pin, constrain(value, 0, 255));
      }
      return;
    }

    if (message.indexOf("\"type\":\"ping\"") >= 0) {
      sendJSON(client, "{\"type\":\"pong\"}");
      return;
    }

    if (message.indexOf("\"type\":\"run\"") >= 0) {
      sendJSON(client, "{\"type\":\"run\",\"status\":\"accepted\"}");
      return;
    }

    sendJSON(client, "{\"type\":\"error\",\"message\":\"Unknown JSON command\"}");
    return;
  }

  // Legacy string protocol kept for compatibility with earlier UI code.
  if (message == "PING") {
    sendJSON(client, "PONG");
    return;
  }

  if (message == "STOP") {
    stopMotors();
    return;
  }

  if (message.startsWith("J_TX:")) {
    int comma = message.indexOf(',');
    if (comma > 5) {
      float x = message.substring(5, comma).toFloat();
      float y = message.substring(comma + 1).toFloat();
      handleJoystick(client, x, y);
    }
    return;
  }

  if (message.startsWith("DW:")) {
    int first = message.indexOf(':');
    int second = message.indexOf(':', first + 1);
    if (second > 0) {
      int pin = message.substring(first + 1, second).toInt();
      int state = message.substring(second + 1).toInt();
      pinMode(pin, OUTPUT);
      digitalWrite(pin, state ? HIGH : LOW);
    }
    return;
  }

  if (message.startsWith("AW:")) {
    int first = message.indexOf(':');
    int second = message.indexOf(':', first + 1);
    if (second > 0) {
      int pin = message.substring(first + 1, second).toInt();
      int value = message.substring(second + 1).toInt();
      pinMode(pin, OUTPUT);
      analogWrite(pin, constrain(value, 0, 255));
    }
    return;
  }
}

void webSocketEvent(uint8_t client, WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      lastClientActivity = millis();
      sendJSON(client, "{\"type\":\"hello\",\"device\":\"ESP Next Gen\",\"protocol\":\"1.0\"}");
      broadcastStatus();
      break;

    case WStype_TEXT:
      handleText(client, String((char*)payload).substring(0, length));
      break;

    case WStype_DISCONNECTED:
      stopMotors();
      break;

    default:
      break;
  }
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to Wi-Fi");
  unsigned long started = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - started < 20000UL) {
    delay(500);
    Serial.print('.');
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Wi-Fi connection failed. Check credentials.");
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, LOW);
  stopMotors();

  connectWiFi();

  webSocket.begin();
  webSocket.onEvent(webSocketEvent);

  Serial.print("WebSocket server listening on port ");
  Serial.println(WS_PORT);
}

void loop() {
  webSocket.loop();

  if (millis() - lastTelemetry >= TELEMETRY_INTERVAL_MS) {
    lastTelemetry = millis();
    broadcastTelemetry();
  }

  // Safety stop if browser/network connection disappears.
  if (millis() - lastClientActivity > COMMAND_TIMEOUT_MS) {
    stopMotors();
  }
}
