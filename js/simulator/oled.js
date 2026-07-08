/**
 * ==========================================================
 * Atomic IDE
 * SSD1306 OLED Simulator
 * Version 1.0.0
 * ==========================================================
 */

export class VirtualOLED {

    constructor(options = {}) {

        this.id = options.id || crypto.randomUUID();

        this.width = options.width || 128;

        this.height = options.height || 64;

        this.scale = options.scale || 4;

        this.cursorX = 0;

        this.cursorY = 12;

        this.textColor = "#00ff99";

        this.background = "#000000";

        this.canvas = null;

        this.ctx = null;

    }

    /**
     * Mount OLED
     */

    mount(container) {

        this.canvas = document.createElement("canvas");

        this.canvas.width = this.width;

        this.canvas.height = this.height;

        this.canvas.style.width =

            `${this.width * this.scale}px`;

        this.canvas.style.height =

            `${this.height * this.scale}px`;

        this.canvas.style.background = this.background;

        this.canvas.style.border =

            "2px solid #444";

        this.canvas.style.imageRendering =

            "pixelated";

        container.appendChild(this.canvas);

        this.ctx = this.canvas.getContext("2d");

        this.ctx.font = "10px monospace";

        this.ctx.fillStyle = this.textColor;

        this.ctx.textBaseline = "top";

        this.clearDisplay();

    }

    /**
     * Clear Display
     */

    clearDisplay() {

        if (!this.ctx) return;

        this.ctx.fillStyle = this.background;

        this.ctx.fillRect(

            0,

            0,

            this.width,

            this.height

        );

        this.ctx.fillStyle = this.textColor;

        this.cursorX = 0;

        this.cursorY = 12;

    }

    /**
     * Display
     */

    display() {

        // Reserved for future framebuffer support

    }

    /**
     * Cursor
     */

    setCursor(x, y) {

        this.cursorX = x;

        this.cursorY = y;

    }

    /**
     * Print
     */

    print(text) {

        if (!this.ctx) return;

        this.ctx.fillText(

            String(text),

            this.cursorX,

            this.cursorY

        );

        this.cursorX +=

            String(text).length * 6;

    }

    /**
     * Println
     */

    println(text = "") {

        this.print(text);

        this.cursorX = 0;

        this.cursorY += 12;

    }

    /**
     * Pixel
     */

    drawPixel(x, y) {

        if (!this.ctx) return;

        this.ctx.fillRect(x, y, 1, 1);

    }

    /**
     * Line
     */

    drawLine(x1, y1, x2, y2) {

        if (!this.ctx) return;

        this.ctx.beginPath();

        this.ctx.moveTo(x1, y1);

        this.ctx.lineTo(x2, y2);

        this.ctx.strokeStyle = this.textColor;

        this.ctx.stroke();

    }

    /**
     * Rectangle
     */

    drawRect(x, y, w, h) {

        if (!this.ctx) return;

        this.ctx.strokeStyle = this.textColor;

        this.ctx.strokeRect(x, y, w, h);

    }

    /**
     * Filled Rectangle
     */

    fillRect(x, y, w, h) {

        if (!this.ctx) return;

        this.ctx.fillRect(x, y, w, h);

    }

    /**
     * Circle
     */

    drawCircle(x, y, r) {

        if (!this.ctx) return;

        this.ctx.beginPath();

        this.ctx.arc(

            x,

            y,

            r,

            0,

            Math.PI * 2

        );

        this.ctx.strokeStyle = this.textColor;

        this.ctx.stroke();

    }

    /**
     * Bitmap
     */

    drawBitmap(bitmap, width, height) {

        if (!this.ctx) return;

        let i = 0;

        for (let y = 0; y < height; y++) {

            for (let x = 0; x < width; x++) {

                if (bitmap[i]) {

                    this.drawPixel(x, y);

                }

                i++;

            }

        }

    }

    /**
     * Rotation
     */

    setRotation(rotation) {

        this.rotation = rotation;

    }

    /**
     * Brightness
     */

    setBrightness(value) {

        if (!this.canvas) return;

        this.canvas.style.filter =

            `brightness(${value}%)`;

    }

    /**
     * Screenshot
     */

    screenshot() {

        if (!this.canvas) return null;

        return this.canvas.toDataURL("image/png");

    }

    /**
     * Information
     */

    info() {

        return {

            width: this.width,

            height: this.height,

            cursorX: this.cursorX,

            cursorY: this.cursorY,

            scale: this.scale

        };

    }

}
