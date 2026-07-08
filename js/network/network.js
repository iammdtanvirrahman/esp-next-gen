/**
 * ==========================================================
 * Atomic IDE
 * Network Manager
 * ESP32 WebSocket Engine
 * ==========================================================
 */

export class NetworkManager {

    constructor() {

        this.socket = null;

        this.connected = false;

        this.ip = "";

        this.port = 81;

        this.autoReconnect = true;

        this.reconnectDelay = 3000;

        this.pingTimer = null;

        this.telemetry = {

            ping:0,

            packetsSent:0,

            packetsReceived:0,

            lastMessage:null

        };

    }

    /**
     * Initialize
     */

    async initialize(){

        this.loadSettings();

    }

    /**
     * Connect
     */

    connect(ip){

        this.ip = ip;

        this.socket = new WebSocket(

            `ws://${ip}:${this.port}`

        );

        this.socket.binaryType = "arraybuffer";

        this.socket.onopen = () => {

            this.connected = true;

            this.startPing();

            this.dispatch("connected");

            console.log(

                "Connected to",

                ip

            );

        };

        this.socket.onmessage = event => {

            this.telemetry.packetsReceived++;

            this.telemetry.lastMessage = event.data;

            this.dispatch(

                "message",

                event.data

            );

        };

        this.socket.onerror = error => {

            console.error(error);

            this.dispatch(

                "error",

                error

            );

        };

        this.socket.onclose = () => {

            this.connected = false;

            this.stopPing();

            this.dispatch("disconnected");

            if(this.autoReconnect){

                setTimeout(

                    ()=>{

                        this.connect(this.ip);

                    },

                    this.reconnectDelay

                );

            }

        };

    }

    /**
     * Disconnect
     */

    disconnect(){

        if(this.socket){

            this.socket.close();

        }

    }

    /**
     * Send Text
     */

    send(message){

        if(!this.connected)

            return false;

        this.socket.send(message);

        this.telemetry.packetsSent++;

        return true;

    }

    /**
     * Send JSON
     */

    sendJSON(data){

        this.send(

            JSON.stringify(data)

        );

    }

    /**
     * Send Binary
     */

    sendBinary(buffer){

        if(!this.connected)

            return;

        this.socket.send(buffer);

        this.telemetry.packetsSent++;

    }

    /**
     * Joystick
     */

    sendJoystick(x,y){

        this.send(

            `J_TX:${x},${y}`

        );

    }

    /**
     * GPIO
     */

    digitalWrite(pin,state){

        this.send(

            `DW:${pin}:${state}`

        );

    }

    analogWrite(pin,value){

        this.send(

            `AW:${pin}:${value}`

        );

    }

    servo(pin,angle){

        this.send(

            `SV:${pin}:${angle}`

        );

    }

    /**
     * Ping
     */

    startPing(){

        this.pingTimer =

        setInterval(()=>{

            const start = performance.now();

            this.send("PING");

            this.telemetry.ping =

            Math.round(

                performance.now()

                -

                start

            );

        },1000);

    }

    stopPing(){

        clearInterval(

            this.pingTimer

        );

    }

    /**
     * Discovery
     */

    async discover(){

        console.log(

            "Searching ESP32..."

        );

    }

    /**
     * Save
     */

    saveSettings(){

        localStorage.setItem(

            "atomic-network",

            JSON.stringify({

                ip:this.ip,

                port:this.port

            })

        );

    }

    loadSettings(){

        const data=

        localStorage.getItem(

            "atomic-network"

        );

        if(!data) return;

        const settings=

        JSON.parse(data);

        this.ip=settings.ip;

        this.port=settings.port;

    }

    /**
     * Events
     */

    dispatch(type,data=null){

        document.dispatchEvent(

            new CustomEvent(

                "network",

                {

                    detail:{

                        type,

                        data

                    }

                }

            )

        );

    }

}
