/*
 * ESP Next Gen — Universal ESP32 Servant
 * Protocol: ESP-NEXT-GEN/2
 *
 * Upload this firmware ONCE to the ESP32.
 * The PC/Web application is the brain; this firmware is the hardware servant.
 *
 * Supported commands:
 *   PING
 *   STOP
 *   digitalWrite / digitalRead
 *   analogWrite / analogRead
 *   pinMode
 *   pwm
 *   servo
 *   move / joystick
 *
 * WebSocket: port 81
 */

#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ESP32Servo.h>

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

constexpr uint16_t WS_PORT = 81;
constexpr unsigned long COMMAND_TIMEOUT_MS = 1500UL;
constexpr unsigned long TELEMETRY_INTERVAL_MS = 1000UL;

WebSocketsServer webSocket(WS_PORT);
Servo servoDevice;
int servoPin = -1;
int motorSpeed = 120;
unsigned long lastCommandAt = 0;
unsigned long lastTelemetryAt = 0;

void sendJSON(uint8_t client, const String& json) {
  webSocket.sendTXT(client, json);
}

void stopMotors() {
  // Generic servant does not assume a motor pin map.
  // The PC brain should issue the appropriate GPIO/PWM commands.
}

void sendHello(uint8_t client) {
  String json = "{\"type\":\"hello\",\"protocol\":\"ESP-NEXT-GEN/2\",\"device\":\"ESP32\",\"ip\":\"";
  json += WiFi.localIP().toString();
  json += "\",\"wsPort\":";
  json += WS_PORT;
  json += ",\"capabilities\":[\"gpio\",\"pwm\",\"adc\",\"servo\",\"motor\",\"telemetry\"]}";
  sendJSON(client, json);
}

void handleDigitalWrite(uint8_t client, int pin, bool state) {
  if (pin < 0 || pin > 39) return;
  pinMode(pin, OUTPUT);
  digitalWrite(pin, state ? HIGH : LOW);
  sendJSON(client, "{\"type\":\"ack\",\"command\":\"digitalWrite\"}");
}

void handleDigitalRead(uint8_t client, int pin) {
  if (pin < 0 || pin > 39) return;
  pinMode(pin, INPUT);
  int value = digitalRead(pin);
  String json = "{\"type\":\"digitalRead\",\"pin\":";
  json += pin;
  json += ",\"value\":";
  json += value;
  json += "}";
  sendJSON(client, json);
}

void handleAnalogWrite(uint8_t client, int pin, int value) {
  if (pin < 0 || pin > 39) return;
  value = constrain(value, 0, 255);
  pinMode(pin, OUTPUT);
  analogWrite(pin, value);
  sendJSON(client, "{\"type\":\"ack\",\"command\":\"analogWrite\"}");
}

void handleAnalogRead(uint8_t client, int pin) {
  if (pin < 0 || pin > 39) return;
  int value = analogRead(pin);
  String json = "{\"type\":\"analogRead\",\"pin\":";
  json += pin;
  json += ",\"value\":";
  json += value;
  json += "}";
  sendJSON(client, json);
}

void handlePinMode(uint8_t client, int pin, int mode) {
  if (pin < 0 || pin > 39) return;
  pinMode(pin, mode);
  sendJSON(client, "{\"type\":\"ack\",\"command\":\"pinMode\"}");
}

void handleServo(uint8_t client, int pin, int angle) {
  if (pin < 0 || pin > 39) return;
  angle = constrain(angle, 0, 180);

  if (servoPin != pin) {
    if (servoPin >= 0) servoDevice.detach();
    servoPin = pin;
    servoDevice.attach(servoPin);
  }

  servoDevice.write(angle);
  sendJSON(client, "{\"type\":\"ack\",\"command\":\"servo\"}");
}

void handleJoystick(uint8_t client, float x, float y) {
  // Generic differential-drive calculation.
  // Actual motor GPIO mapping remains a PC-side hardware profile.
  x = constrain(x, -100.0f, 100.0f);
  y = constrain(y, -100.0f, 100.0f);

  float left = constrain((y + x) / 100.0f, -1.0f, 1.0f);
  float right = constrain((y - x) / 100.0f, -1.0f, 1.0f);

  String json = "{\"type\":\"motorVector\",\"left\":";
  json += String(left, 3);
  json += ",\"right\":";
  json += String(right, 3);
  json += "}";
  sendJSON(client, json);
}

void handleText(uint8_t client, const String& message) {
  lastCommandAt = millis();

  if (message == "PING") {
    sendJSON(client, "PONG");
    return;
  }

  if (message == "STOP") {
    stopMotors();
    sendJSON(client, "{\"type\":\"ack\",\"command\":\"stop\"}");
    return;
  }

  if (!message.startsWith("{")) {
    sendJSON(client, "{\"type\":\"error\",\"message\":\"Invalid command format\"}");
    return;
  }

  if (message.indexOf("\"type\":\"ping\"") >= 0) {
    sendJSON(client, "{\"type\":\"pong\"}");
    return;
  }

  if (message.indexOf("\"type\":\"digitalWrite\"") >= 0) {
    int p = message.indexOf("\"pin\"");
    int s = message.indexOf("\"state\"");
    if (p >= 0 && s >= 0) {
      int pc = message.indexOf(':', p);
      int pe = message.indexOf(',', pc);
      int sc = message.indexOf(':', s);
      int se = message.indexOf('}', sc);
      handleDigitalWrite(client, message.substring(pc + 1, pe).toInt(), message.substring(sc + 1, se).indexOf("true") >= 0 || message.substring(sc + 1, se).toInt() != 0);
    }
    return;
  }

  if (message.indexOf("\"type\":\"digitalRead\"") >= 0) {
    int p = message.indexOf("\"pin\"");
    if (p >= 0) {
      int pc = message.indexOf(':', p);
      int pe = message.indexOf('}', pc);
      handleDigitalRead(client, message.substring(pc + 1, pe).toInt());
    }
    return;
  }

  if (message.indexOf("\"type\":\"analogWrite\"") >= 0) {
    int p = message.indexOf("\"pin\"");
    int v = message.indexOf("\"value\"");
    if (p >= 0 && v >= 0) {
      int pc = message.indexOf(':', p);
      int pe = message.indexOf(',', pc);
      int vc = message.indexOf(':', v);
      int ve = message.indexOf('}', vc);
      handleAnalogWrite(client, message.substring(pc + 1, pe).toInt(), message.substring(vc + 1, ve).toInt());
    }
    return;
  }

  if (message.indexOf("\"type\":\"analogRead\"") >= 0) {
    int p = message.indexOf("\"pin\"");
    if (p >= 0) {
      int pc = message.indexOf(':', p);
      int pe = message.indexOf('}', pc);
      handleAnalogRead(client, message.substring(pc + 1, pe).toInt());
    }
    return;
  }

  if (message.indexOf("\"type\":\"pinMode\"") >= 0) {
    int p = message.indexOf("\"pin\"");
    int m = message.indexOf("\"mode\"");
    if (p >= 0 && m >= 0) {
      int pc = message.indexOf(':', p);
      int pe = message.indexOf(',', pc);
      int mc = message.indexOf(':', m);
      int me = message.indexOf('}', mc);
      handlePinMode(client, message.substring(pc + 1, pe).toInt(), message.substring(mc + 1, me).toInt());
    }
    return;
  }

  if (message.indexOf("\"type\":\"servo\"") >= 0) {
    int p = message.indexOf("\"pin\"");
    int a = message.indexOf("\"angle\"");
    if (p >= 0 && a >= 0) {
      int pc = message.indexOf(':', p);
      int pe = message.indexOf(',', pc);
      int ac = message.indexOf(':', a);
      int ae = message.indexOf('}', ac);
      handleServo(client, message.substring(pc + 1, pe).toInt(), message.substring(ac + 1, ae).toInt());
    }
    return;
  }

  if (message.indexOf("\"type\":\"joystick\"") >= 0) {
    int x = message.indexOf("\"x\"");
    int y = message.indexOf("\"y\"");
    if (x >= 0 && y >= 0) {
      int xc = message.indexOf(':', x);
      int xe = message.indexOf(',', xc);
      int yc = message.indexOf(':', y);
      int ye = message.indexOf('}', yc);
      handleJoystick(client, message.substring(xc + 1, xe).toFloat(), message.substring(yc + 1, ye).toFloat());
    }
    return;
  }

  sendJSON(client, "{\"type\":\"error\",\"message\":\"Unknown command\"}");
}

void webSocketEvent(uint8_t client, WStype_t type, uint8_t* payload, size_t length) {
  if (type == WStype_CONNECTED) {
    lastCommandAt = millis();
    sendHello(client);
    return;
  }

  if (type == WStype_TEXT) {
    String message((char*)payload, length);
    handleText(client, message);
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print('.');
  }

  Serial.println();
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());

  webSocket.begin();
  webSocket.onEvent(webSocketEvent);

  lastCommandAt = millis();
  Serial.println("ESP Next Gen Universal Servant READY");
}

void loop() {
  webSocket.loop();

  // Safety: stop any future motor implementation if the brain disappears.
  if (millis() - lastCommandAt > COMMAND_TIMEOUT_MS) {
    stopMotors();
  }

  if (millis() - lastTelemetryAt >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryAt = millis();
    String json = "{\"type\":\"telemetry\",\"uptime\":";
    json += millis();
    json += ",\"wifi\":";
    json += WiFi.status() == WL_CONNECTED ? "true" : "false";
    json += "}";
    webSocket.broadcastTXT(json);
  }
}
