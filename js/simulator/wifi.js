/**
 * ==========================================================
 * Atomic IDE
 * ESP32 WiFi Simulator
 * Version 1.0.0
 * ==========================================================
 */

export class VirtualWiFi {

    constructor() {

        this.mode = "STA";

        this.connected = false;

        this.ssid = "";

        this.password = "";

        this.ip = "0.0.0.0";

        this.gateway = "0.0.0.0";

        this.subnet = "255.255.255.0";

        this.mac = this.generateMAC();

        this.hostname = "AtomicESP32";

        this.rssi = -100;

        this.networks = [

            {

                ssid:"Home WiFi",

                password:"12345678",

                rssi:-45,

                secure:true

            },

            {

                ssid:"Atomic Lab",

                password:"atomic123",

                rssi:-58,

                secure:true

            },

            {

                ssid:"Guest",

                password:"",

                rssi:-72,

                secure:false

            }

        ];

        this.listeners = [];

    }

    /**
     * Scan Networks
     */

    scanNetworks() {

        return this.networks.sort(

            (a,b)=>b.rssi-a.rssi

        );

    }

    /**
     * Connect
     */

    connect(ssid,password="") {

        const network =

            this.networks.find(

                n=>n.ssid===ssid

            );

        if(!network){

            return false;

        }

        if(

            network.secure &&

            network.password!==password

        ){

            return false;

        }

        this.connected=true;

        this.ssid=ssid;

        this.password=password;

        this.rssi=network.rssi;

        this.ip=this.generateIP();

        this.gateway="192.168.1.1";

        this.notify();

        return true;

    }

    /**
     * Disconnect
     */

    disconnect(){

        this.connected=false;

        this.ssid="";

        this.password="";

        this.ip="0.0.0.0";

        this.gateway="0.0.0.0";

        this.rssi=-100;

        this.notify();

    }

    /**
     * Access Point
     */

    startAP(

        ssid="ESP32_AP",

        password="12345678"

    ){

        this.mode="AP";

        this.connected=true;

        this.ssid=ssid;

        this.password=password;

        this.ip="192.168.4.1";

        this.gateway=this.ip;

        this.rssi=-10;

        this.notify();

    }

    stopAP(){

        this.disconnect();

        this.mode="STA";

    }

    /**
     * Status
     */

    status(){

        return this.connected

            ? "WL_CONNECTED"

            : "WL_DISCONNECTED";

    }

    /**
     * Local IP
     */

    localIP(){

        return this.ip;

    }

    /**
     * RSSI
     */

    RSSI(){

        return this.rssi;

    }

    /**
     * Hostname
     */

    setHostname(name){

        this.hostname=name;

    }

    /**
     * Event Listener
     */

    onChange(callback){

        this.listeners.push(callback);

    }

    notify(){

        this.listeners.forEach(

            callback=>callback(this)

        );

    }

    /**
     * DHCP
     */

    generateIP(){

        return `192.168.1.${

            Math.floor(

                Math.random()*180+20

            )

        }`;

    }

    /**
     * MAC
     */

    generateMAC(){

        return Array.from(

            {length:6},

            ()=>Math.floor(

                Math.random()*256

            )

            .toString(16)

            .padStart(2,"0")

        ).join(":");

    }

    /**
     * Ping
     */

    ping(host){

        if(!this.connected){

            return null;

        }

        return{

            host,

            time:

            Math.floor(

                Math.random()*20+5

            ),

            success:true

        };

    }

    /**
     * Export
     */

    serialize(){

        return{

            mode:this.mode,

            connected:this.connected,

            ssid:this.ssid,

            ip:this.ip,

            gateway:this.gateway,

            mac:this.mac,

            hostname:this.hostname,

            rssi:this.rssi

        };

    }

}
