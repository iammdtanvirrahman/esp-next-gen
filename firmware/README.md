# ESP Next Gen ESP32 Firmware

## Arduino libraries

Install these libraries before compiling:

- `WebSockets` by Markus Sattler / Links2004 (for `WebSocketsServer`)
- `ESP32Servo` (for servo commands)
- `TM1637Display` (for the fine amount display)
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
| TM1637 CLK | 22 |
| TM1637 DIO | 21 |

Change the constants in the `.ino` file when your physical wiring is different.

## Fine system

The firmware and web IDE use the same safety model:

- detection threshold: `15 cm`
- grace period: `30 seconds`
- after the grace period: fine starts at `$2`
- fine increases by `$2` every `3 seconds`
- green LED: obstacle detected / grace period
- red LED: fine active
- TM1637: displays the current fine amount
- browser dashboard: distance, state, countdown, and fine amount

The web IDE sends `fineReset` when the user presses **Reset Fine**. The ESP32 also maintains its own fine state from the ultrasonic sensor, so the physical display and LEDs remain meaningful even without the browser dashboard running.

## Browser protocol

Examples:

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
{"type":"fineReset"}
```

The firmware also understands legacy text commands such as `PING`, `STOP`, `J_TX:x,y`, `DW:pin:state`, and `AW:pin:value`.

## Telemetry

The ESP32 broadcasts approximately once per second:

```json
{"type":"telemetry","distance":12.4,"obstacle":true,"speed":120,"fine":2,"fineActive":true}
```

`obstacle` becomes `true` at or below the configured `15 cm` threshold.

## Safety

The motors stop when the ESP32 loses the client command stream for the configured timeout or when the WebSocket client disconnects.
