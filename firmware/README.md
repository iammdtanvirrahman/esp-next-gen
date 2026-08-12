# ESP Next Gen ESP32 Firmware

## Arduino libraries

Install these libraries before compiling:

- `WebSockets` by Markus Sattler / Links2004 (for `WebSocketsServer`)
- `ESP32Servo` (only needed for servo commands)
- ESP32 board support package for Arduino IDE

`WiFi.h` is included with the ESP32 Arduino core.

## Setup

Open `firmware/esp32_next_gen/esp32_next_gen.ino` and set:

```cpp
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
```

Upload the firmware, open Serial Monitor at `115200`, and note the printed ESP32 IP address.

In the web IDE, enter that IP and WebSocket port `81`, then connect.

## Default wiring

The current firmware deliberately avoids the old motor/ultrasonic GPIO conflict.

| Device | GPIO |
|---|---:|
| L298N IN1 | 18 |
| L298N IN2 | 19 |
| L298N IN3 | 4 |
| L298N IN4 | 5 |
| L298N ENA | 13 |
| L298N ENB | 14 |
| HC-SR04 TRIG | 32 |
| HC-SR04 ECHO | 33 |
| Green LED | 15 |
| Red LED | 2 |

Change the constants in the `.ino` file when your physical wiring is different.

## Browser protocol

The web IDE sends JSON WebSocket commands:

```json
{"type":"joystick","x":0,"y":100}
{"type":"move","direction":"forward","speed":120}
{"type":"move","direction":"backward","speed":120}
{"type":"move","direction":"left","speed":120}
{"type":"move","direction":"right","speed":120}
{"type":"move","direction":"stop","speed":0}
{"type":"digitalWrite","pin":2,"state":true}
{"type":"analogWrite","pin":13,"value":120}
{"type":"servo","pin":25,"angle":90}
{"type":"run","code":"..."}
```

The firmware also understands legacy text commands such as `PING`, `STOP`, `J_TX:x,y`, `DW:pin:state`, and `AW:pin:value`.

## Telemetry

The ESP32 broadcasts a message approximately once per second:

```json
{"type":"telemetry","distance":12.4,"obstacle":true,"speed":120}
```

`obstacle` becomes `true` at or below the configured `15 cm` threshold.

## Safety

The motors stop when the ESP32 loses the client command stream for the configured timeout or when the WebSocket client disconnects.
