/*
 * ESP Next Gen - ESP32 firmware
 * WebSocket protocol: 1.0
 *
 * Libraries:
 *   - WiFi (ESP32 Arduino core)
 *   - WebSocketsServer
 *   - ESP32Servo
 *   - TM1637Display
 *
 * Default wiring:
 *   L298N: IN1=18 IN2=19 IN3=4 IN4=5 ENA=13 ENB=14
 *   HC-SR04: TRIG=32 ECHO=33
 *   LEDs: GREEN=15 RED=2
 *   TM1637: CLK=22 DIO=21
 */

#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ESP32Servo.h>
#include <TM1637Display.h>

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

constexpr uint16_t WS_PORT = 81;
WebSocketsServer webSocket(WS_PORT);

constexpr uint8_t IN1 = 18;
constexpr uint8_t IN2 = 19;
constexpr uint8_t IN3 = 4;
constexpr uint8_t IN4 = 5;
constexpr uint8_t ENA = 13;
constexpr uint8_t ENB = 14;

constexpr uint8_t GREEN_LED = 15;
constexpr uint8_t RED_LED = 2;

constexpr uint8_t TRIG_PIN = 32;
constexpr uint8_t ECHO_PIN = 33;
constexpr float DISTANCE_THRESHOLD_CM = 15.0f;

constexpr uint8_t TM1637_CLK = 22;
constexpr uint8_t TM1637_DIO = 21;
TM1637Display fineDisplay(TM1637_CLK, TM1637_DIO);

constexpr unsigned long GRACE_PERIOD_MS = 30000UL;
constexpr unsigned long FINE_STEP_MS = 3000UL;
constexpr int FINE_STEP_AMOUNT = 2;

int motorSpeed = 120;
unsigned long lastClientActivity = 0;
unsigned long lastTelemetry = 0;
unsigned long obstacleStartedAt = 0;
unsigned long lastFineStepAt = 0;
int fineAmount = 0;
bool obstacleActive = false;

constexpr unsigned long COMMAND_TIMEOUT_MS = 1500UL;
constexpr unsigned long TELEMETRY_INTERVAL_MS = 1000UL;

Servo activeServo;
int activeServoPin = -1;

void sendJSON(uint8_t client, const String& payload) {
  webSocket.sendTXT(client, payload);
}

void setMotor(int left, int right) {
  left = constrain(left, -255, 255);
  right = constrain(right, -255, 255);

  digitalWrite(IN1, left > 0 ? HIGH : LOW);
  digitalWrite(IN2, left < 0 ? HIGH : LOW);
  digitalWrite(IN3, right > 0 ? HIGH : LOW);
  digitalWrite(IN4, right < 0 ? HIGH : LOW);
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

  const unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000UL);
  if (duration == 0) return -1.0f;
  return (duration * 0.0343f) / 2.0f;
}

void updateFineDisplay() {
  fineDisplay.showNumberDec(fineAmount, false);
}

void resetFineState() {
  obstacleActive = false;
  obstacleStartedAt = 0;
  lastFineStepAt = 0;
  fineAmount = 0;
  digitalWrite(RED_LED, LOW);
  updateFineDisplay();
}

void updateFineState(bool obstacle) {
  const unsigned long now = millis();

  if (!obstacle) {
    resetFineState();
    return;
  }

  if (!obstacleActive) {
    obstacleActive = true;
    obstacleStartedAt = now;
    lastFineStepAt = 0;
    fineAmount = 0;
    digitalWrite(GREEN_LED, HIGH);
    digitalWrite(RED_LED, LOW);
    updateFineDisplay();
    return;
  }

  digitalWrite(GREEN_LED, HIGH);

  if (now - obstacleStartedAt >= GRACE_PERIOD_MS) {
    digitalWrite(RED_LED, HIGH);

    if (lastFineStepAt == 0) {
      fineAmount = FINE_STEP_AMOUNT;
      lastFineStepAt = now;
      updateFineDisplay();
    } else if (now - lastFineStepAt >= FINE_STEP_MS) {
      fineAmount += FINE_STEP_AMOUNT;
      lastFineStepAt += FINE_STEP_MS;
      updateFineDisplay();
    }
  }
}

void broadcastStatus() {
  String json = "{\"type\":\"status\",\"device\":\"ESP Next Gen\",\"ip\":\"";
  json += WiFi.localIP().toString();
  json += "\",\"speed\":";
  json += motorSpeed;
  json += ",\"fine\":";
  json += fineAmount;
  json += "}";
  webSocket.broadcastTXT(json);
}

void broadcastTelemetry() {
  const float distance = readDistanceCm();
  const bool obstacle = distance > 0 && distance <= DISTANCE_THRESHOLD_CM;
  updateFineState(obstacle);

  String json = "{\"type\":\"telemetry\",\"distance\":";
  json += String(distance, 1);
  json += ",\"obstacle\":";
  json += obstacle ? "true" : "false";
  json += ",\"speed\":";
  json += motorSpeed;
  json += ",\"fine\":";
  json += fineAmount;
  json += ",\"fineActive\":";
  json += (fineAmount > 0 ? "true" : "false");
  json += "}";

  webSocket.broadcastTXT(json);
}

void handleJoystick(uint8_t client, float x, float y) {
  x = constrain(x, -100.0f, 100.0f);
  y = constrain(y, -100.0f, 100.0f);

  const float forward = y / 100.0f;
  const float turn = x / 100.0f;
  const int left = (int)((forward + turn) * motorSpeed);
  const int right = (int)((forward - turn) * motorSpeed);

  setMotor(left, right);
  lastClientActivity = millis();
  sendJSON(client, "{\"type\":\"ack\",\"command\":\"joystick\"}");
}

void handleMove(uint8_t client, const String& direction, int requestedSpeed) {
  if (requestedSpeed > 0) motorSpeed = constrain(requestedSpeed, 0, 255);

  if (direction == "forward") setMotor(motorSpeed, motorSpeed);
  else if (direction == "backward") setMotor(-motorSpeed, -motorSpeed);
  else if (direction == "left") setMotor(-motorSpeed, motorSpeed);
  else if (direction == "right") setMotor(motorSpeed, -motorSpeed);
  else stopMotors();

  lastClientActivity = millis();
  sendJSON(client, "{\"type\":\"ack\",\"command\":\"move\"}");
}

void handleServo(uint8_t client, int pin, int angle) {
  angle = constrain(angle, 0, 180);
  if (activeServoPin != pin) {
    if (activeServoPin >= 0) activeServo.detach();
    activeServoPin = pin;
    activeServo.attach(activeServoPin);
  }
  activeServo.write(angle);
  sendJSON(client, "{\"type\":\"ack\",\"command\":\"servo\"}");
}

void handleDigitalWriteCommand(uint8_t client, int pin, bool state) {
  pinMode(pin, OUTPUT);
  digitalWrite(pin, state ? HIGH : LOW);
  sendJSON(client, "{\"type\":\"ack\",\"command\":\"digitalWrite\"}");
}

void handleAnalogWriteCommand(uint8_t client, int pin, int value) {
  pinMode(pin, OUTPUT);
  analogWrite(pin, constrain(value, 0, 255));
  sendJSON(client, "{\"type\":\"ack\",\"command\":\"analogWrite\"}");
}

void handleText(uint8_t client, const String& message) {
  lastClientActivity = millis();

  if (message == "PING") {
    sendJSON(client, "PONG");
    return;
  }

  if (message == "STOP") {
    stopMotors();
    return;
  }

  if (message.startsWith("J_TX:")) {
    const int comma = message.indexOf(',');
    if (comma > 5) handleJoystick(client, message.substring(5, comma).toFloat(), message.substring(comma + 1).toFloat());
    return;
  }

  if (message.startsWith("DW:")) {
    const int first = message.indexOf(':');
    const int second = message.indexOf(':', first + 1);
    if (second > first) handleDigitalWriteCommand(client, message.substring(first + 1, second).toInt(), message.substring(second + 1).toInt() != 0);
    return;
  }

  if (message.startsWith("AW:")) {
    const int first = message.indexOf(':');
    const int second = message.indexOf(':', first + 1);
    if (second > first) handleAnalogWriteCommand(client, message.substring(first + 1, second).toInt(), message.substring(second + 1).toInt());
    return;
  }

  if (!message.startsWith("{")) return;

  if (message.indexOf("\"type\":\"ping\"") >= 0) {
    sendJSON(client, "{\"type\":\"pong\"}");
    return;
  }

  if (message.indexOf("\"type\":\"stop\"") >= 0) {
    stopMotors();
    sendJSON(client, "{\"type\":\"ack\",\"command\":\"stop\"}");
    return;
  }

  if (message.indexOf("\"type\":\"fineReset\"") >= 0) {
    resetFineState();
    sendJSON(client, "{\"type\":\"ack\",\"command\":\"fineReset\",\"fine\":0}");
    return;
  }

  if (message.indexOf("\"type\":\"fine\"") >= 0) {
    const int amountIndex = message.indexOf("\"amount\"");
    if (amountIndex >= 0) {
      const int colon = message.indexOf(':', amountIndex);
      fineAmount = max(0, message.substring(colon + 1).toInt());
      updateFineDisplay();
    }
    return;
  }

  if (message.indexOf("\"type\":\"joystick\"") >= 0) {
    const int xIndex = message.indexOf("\"x\"");
    const int yIndex = message.indexOf("\"y\"");
    if (xIndex >= 0 && yIndex >= 0) {
      const int xColon = message.indexOf(':', xIndex);
      const int xComma = message.indexOf(',', xColon);
      const int yColon = message.indexOf(':', yIndex);
      const int yEnd = message.indexOf('}', yColon);
      handleJoystick(client,
        message.substring(xColon + 1, xComma).toFloat(),
        message.substring(yColon + 1, yEnd > 0 ? yEnd : message.length()).toFloat());
    }
    return;
  }

  if (message.indexOf("\"type\":\"move\"") >= 0) {
    String direction = "stop";
    if (message.indexOf("\"direction\":\"forward\"") >= 0) direction = "forward";
    else if (message.indexOf("\"direction\":\"backward\"") >= 0) direction = "backward";
    else if (message.indexOf("\"direction\":\"left\"") >= 0) direction = "left";
    else if (message.indexOf("\"direction\":\"right\"") >= 0) direction = "right";

    int requestedSpeed = 0;
    const int speedIndex = message.indexOf("\"speed\"");
    if (speedIndex >= 0) {
      const int colon = message.indexOf(':', speedIndex);
      requestedSpeed = message.substring(colon + 1).toInt();
    }
    handleMove(client, direction, requestedSpeed);
    return;
  }

  if (message.indexOf("\"type\":\"speed\"") >= 0) {
    const int valueIndex = message.indexOf("\"value\"");
    if (valueIndex >= 0) {
      const int colon = message.indexOf(':', valueIndex);
      motorSpeed = constrain(message.substring(colon + 1).toInt(), 0, 255);
      broadcastStatus();
    }
    return;
  }

  if (message.indexOf("\"type\":\"digitalWrite\"") >= 0) {
    const int pinIndex = message.indexOf("\"pin\"");
    const int stateIndex = message.indexOf("\"state\"");
    if (pinIndex >= 0 && stateIndex >= 0) {
      const int pinColon = message.indexOf(':', pinIndex);
      const int pinComma = message.indexOf(',', pinColon);
      const int stateColon = message.indexOf(':', stateIndex);
      const int stateEnd = message.indexOf('}', stateColon);
      const String stateText = message.substring(stateColon + 1, stateEnd > 0 ? stateEnd : message.length());
      handleDigitalWriteCommand(client,
        message.substring(pinColon + 1, pinComma).toInt(),
        stateText.indexOf("true") >= 0 || stateText.toInt() != 0);
    }
    return;
  }

  if (message.indexOf("\"type\":\"analogWrite\"") >= 0) {
    const int pinIndex = message.indexOf("\"pin\"");
    const int valueIndex = message.indexOf("\"value\"");
    if (pinIndex >= 0 && valueIndex >= 0) {
      const int pinColon = message.indexOf(':', pinIndex);
      const int pinComma = message.indexOf(',', pinColon);
      const int valueColon = message.indexOf(':', valueIndex);
      const int valueEnd = message.indexOf('}', valueColon);
      handleAnalogWriteCommand(client,
        message.substring(pinColon + 1, pinComma).toInt(),
        message.substring(valueColon + 1, valueEnd > 0 ? valueEnd : message.length()).toInt());
    }
    return;
  }

  if (message.indexOf("\"type\":\"servo\"") >= 0) {
    const int pinIndex = message.indexOf("\"pin\"");
    const int angleIndex = message.indexOf("\"angle\"");
    if (pinIndex >= 0 && angleIndex >= 0) {
      const int pinColon = message.indexOf(':', pinIndex);
      const int pinComma = message.indexOf(',', pinColon);
      const int angleColon = message.indexOf(':', angleIndex);
      const int angleEnd = message.indexOf('}', angleColon);
      handleServo(client,
        message.substring(pinColon + 1, pinComma).toInt(),
        message.substring(angleColon + 1, angleEnd > 0 ? angleEnd : message.length()).toInt());
    }
    return;
  }

  if (message.indexOf("\"type\":\"run\"") >= 0) {
    sendJSON(client, "{\"type\":\"run\",\"status\":\"accepted\"}");
    return;
  }

  sendJSON(client, "{\"type\":\"error\",\"message\":\"Unknown command\"}");
}

void webSocketEvent(uint8_t client, WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      lastClientActivity = millis();
      sendJSON(client, "{\"type\":\"hello\",\"device\":\"ESP Next Gen\",\"protocol\":\"1.0\"}");
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
  const unsigned long started = millis();
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

  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  pinMode(ENA, OUTPUT); pinMode(ENB, OUTPUT);
  pinMode(GREEN_LED, OUTPUT); pinMode(RED_LED, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT); pinMode(ECHO_PIN, INPUT);

  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, LOW);
  stopMotors();

  fineDisplay.setBrightness(5);
  fineDisplay.showNumberDec(0, false);

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

  if (millis() - lastClientActivity > COMMAND_TIMEOUT_MS) {
    stopMotors();
  }
}
