/**
 * ==========================================================
 * Atomic IDE
 * ESP32 Memory Manager
 * Version 2.0.0
 * ==========================================================
 */

export class Memory {

    constructor() {

        /*
        ESP32 Memory Layout
        */

        this.totalHeap = 327680;      // 320 KB

        this.totalFlash = 4194304;    // 4 MB

        this.totalStack = 8192;       // 8 KB

        this.usedHeap = 0;

        this.usedFlash = 0;

        this.usedStack = 0;

        this.heap = new Map();

        this.stack = [];

        this.flash = new Map();

        this.variables = new Map();

        this.nextPointer = 1000;

    }

    /**
     * malloc()
     */

    malloc(size) {

        if (

            this.usedHeap + size >

            this.totalHeap

        ) {

            throw new Error(

                "Heap Overflow"

            );

        }

        const pointer = this.nextPointer;

        this.nextPointer += size;

        this.heap.set(pointer, {

            pointer,

            size,

            allocated:true

        });

        this.usedHeap += size;

        return pointer;

    }

    /**
     * free()
     */

    free(pointer) {

        if (

            !this.heap.has(pointer)

        ) {

            return false;

        }

        const block =

            this.heap.get(pointer);

        this.usedHeap -= block.size;

        this.heap.delete(pointer);

        return true;

    }

    /**
     * Stack Push
     */

    push(value) {

        if (

            this.usedStack >=

            this.totalStack

        ) {

            throw new Error(

                "Stack Overflow"

            );

        }

        this.stack.push(value);

        this.usedStack++;

    }

    /**
     * Stack Pop
     */

    pop() {

        if (

            this.stack.length === 0

        ) {

            return null;

        }

        this.usedStack--;

        return this.stack.pop();

    }

    /**
     * Flash Write
     */

    flashWrite(address, value) {

        this.flash.set(

            address,

            value

        );

        this.usedFlash++;

    }

    /**
     * Flash Read
     */

    flashRead(address) {

        return this.flash.get(address);

    }

    /**
     * Variable Store
     */

    createVariable(

        name,

        value,

        type = "int"

    ) {

        this.variables.set(name, {

            name,

            value,

            type,

            address:this.malloc(4)

        });

    }

    /**
     * Update Variable
     */

    setVariable(name,value){

        if(

            this.variables.has(name)

        ){

            this.variables.get(name)

                .value = value;

        }

    }

    /**
     * Read Variable
     */

    getVariable(name){

        return this.variables.get(name);

    }

    /**
     * Delete Variable
     */

    removeVariable(name){

        const variable =

            this.variables.get(name);

        if(!variable) return;

        this.free(variable.address);

        this.variables.delete(name);

    }

    /**
     * Heap Usage %
     */

    heapUsage(){

        return (

            this.usedHeap /

            this.totalHeap

        ) * 100;

    }

    /**
     * Flash Usage %
     */

    flashUsage(){

        return (

            this.usedFlash /

            this.totalFlash

        ) * 100;

    }

    /**
     * Stack Usage %
     */

    stackUsage(){

        return (

            this.usedStack /

            this.totalStack

        ) * 100;

    }

    /**
     * Free Memory
     */

    freeHeap(){

        return

        this.totalHeap -

        this.usedHeap;

    }

    /**
     * Detect Memory Leak
     */

    detectLeaks(){

        return

        [...this.heap.values()]

        .filter(

            block=>block.allocated

        );

    }

    /**
     * Reset
     */

    reset(){

        this.heap.clear();

        this.flash.clear();

        this.variables.clear();

        this.stack=[];

        this.usedHeap=0;

        this.usedFlash=0;

        this.usedStack=0;

        this.nextPointer=1000;

    }

    /**
     * Statistics
     */

    statistics(){

        return{

            heapTotal:this.totalHeap,

            heapUsed:this.usedHeap,

            heapFree:this.totalHeap-

                     this.usedHeap,

            heapUsage:

                this.heapUsage().toFixed(2),

            flashTotal:this.totalFlash,

            flashUsed:this.usedFlash,

            flashUsage:

                this.flashUsage().toFixed(2),

            stackTotal:this.totalStack,

            stackUsed:this.usedStack,

            stackUsage:

                this.stackUsage().toFixed(2),

            variables:

                this.variables.size,

            allocations:

                this.heap.size

        };

    }

}
