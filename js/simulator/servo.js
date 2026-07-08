/**
 * ==========================================================
 * Atomic IDE
 * Virtual Servo Motor
 * Version 1.0.0
 * ==========================================================
 */

export class VirtualServo {

    constructor(options = {}) {

        this.id = options.id || crypto.randomUUID();

        this.pin = options.pin ?? 18;

        this.name = options.name || "Servo";

        this.angle = 90;

        this.targetAngle = 90;

        this.speed = 2;

        this.element = null;

        this.gpio = null;

        this.running = false;

    }

    /**
     * Attach GPIO
     */

    attach(gpio){

        this.gpio = gpio;

        gpio.on(

            this.pin,

            ()=>{

                const pin = gpio.get(this.pin);

                this.setAngle(

                    Math.round(

                        (pin.pwm / 255) * 180

                    )

                );

            }

        );

    }

    /**
     * Mount
     */

    mount(container){

        this.element = document.createElement("div");

        this.element.className = "virtual-servo";

        this.element.innerHTML = `

            <div class="servo-body">

                <div class="servo-arm"></div>

            </div>

            <div class="servo-label">

                ${this.name}

            </div>

        `;

        container.appendChild(

            this.element

        );

        this.render();

    }

    /**
     * Set Angle
     */

    setAngle(angle){

        angle = Math.max(

            0,

            Math.min(

                180,

                angle

            )

        );

        this.targetAngle = angle;

        if(!this.running){

            this.animate();

        }

    }

    /**
     * Smooth Animation
     */

    animate(){

        this.running = true;

        const step = ()=>{

            if(

                this.angle < this.targetAngle

            ){

                this.angle += this.speed;

            }

            else if(

                this.angle > this.targetAngle

            ){

                this.angle -= this.speed;

            }

            this.render();

            if(

                Math.abs(

                    this.angle -

                    this.targetAngle

                ) <= this.speed

            ){

                this.angle = this.targetAngle;

                this.render();

                this.running = false;

                return;

            }

            requestAnimationFrame(step);

        };

        requestAnimationFrame(step);

    }

    /**
     * Render
     */

    render(){

        if(!this.element) return;

        const arm =

        this.element.querySelector(

            ".servo-arm"

        );

        arm.style.transform =

        `rotate(${this.angle-90}deg)`;

    }

    /**
     * Rotate Helpers
     */

    left(){

        this.setAngle(0);

    }

    center(){

        this.setAngle(90);

    }

    right(){

        this.setAngle(180);

    }

    /**
     * Speed
     */

    setSpeed(speed){

        this.speed = Math.max(

            1,

            speed

        );

    }

    /**
     * Export
     */

    serialize(){

        return{

            id:this.id,

            pin:this.pin,

            angle:this.angle,

            speed:this.speed

        };

    }

}
