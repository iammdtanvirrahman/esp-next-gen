/**
 * ==========================================================
 * Atomic IDE
 * FreeRTOS Task Manager
 * Version 2.0.0
 * ==========================================================
 */

export class TaskManager {

    constructor() {

        this.tasks = [];

        this.nextId = 1;

        this.running = false;

        this.tickRate = 1000;

        this.lastTick = performance.now();

        this.core0 = [];

        this.core1 = [];

    }

    /**
     * Create Task
     */

    create(name, callback, options = {}) {

        const task = {

            id: this.nextId++,

            name,

            callback,

            priority: options.priority ?? 1,

            core: options.core ?? 0,

            state: "READY",

            delayUntil: 0,

            cpuTime: 0,

            runCount: 0

        };

        this.tasks.push(task);

        if (task.core === 0)

            this.core0.push(task);

        else

            this.core1.push(task);

        this.sort();

        return task;

    }

    /**
     * Delete Task
     */

    destroy(id) {

        this.tasks =

            this.tasks.filter(

                task => task.id !== id

            );

        this.core0 =

            this.core0.filter(

                task => task.id !== id

            );

        this.core1 =

            this.core1.filter(

                task => task.id !== id

            );

    }

    /**
     * Start Scheduler
     */

    start() {

        this.running = true;

        this.lastTick = performance.now();

    }

    /**
     * Stop Scheduler
     */

    stop() {

        this.running = false;

    }

    /**
     * Tick
     */

    tick() {

        if (!this.running)

            return;

        const now = performance.now();

        if (

            now - this.lastTick <

            (1000 / this.tickRate)

        ) {

            return;

        }

        this.lastTick = now;

        this.executeCore(

            this.core0,

            now

        );

        this.executeCore(

            this.core1,

            now

        );

    }

    /**
     * Execute Core
     */

    executeCore(tasks, now) {

        tasks.forEach(task => {

            if (

                task.state === "SUSPENDED"

            ) return;

            if (

                now < task.delayUntil

            ) return;

            const start = performance.now();

            task.state = "RUNNING";

            try {

                task.callback();

            }

            catch (e) {

                console.error(

                    "Task Error",

                    task.name,

                    e

                );

            }

            task.cpuTime +=

                performance.now() - start;

            task.runCount++;

            task.state = "READY";

        });

    }

    /**
     * Delay Task
     */

    delay(id, ms) {

        const task =

            this.find(id);

        if (!task)

            return;

        task.delayUntil =

            performance.now() + ms;

        task.state = "BLOCKED";

    }

    /**
     * Suspend Task
     */

    suspend(id) {

        const task =

            this.find(id);

        if (task)

            task.state = "SUSPENDED";

    }

    /**
     * Resume Task
     */

    resume(id) {

        const task =

            this.find(id);

        if (task)

            task.state = "READY";

    }

    /**
     * Find Task
     */

    find(id) {

        return this.tasks.find(

            task => task.id === id

        );

    }

    /**
     * Sort by Priority
     */

    sort() {

        const compare =

            (a, b) =>

                b.priority - a.priority;

        this.tasks.sort(compare);

        this.core0.sort(compare);

        this.core1.sort(compare);

    }

    /**
     * Statistics
     */

    statistics() {

        return {

            running: this.running,

            totalTasks:

                this.tasks.length,

            core0:

                this.core0.length,

            core1:

                this.core1.length,

            tasks:

                this.tasks.map(task => ({

                    id: task.id,

                    name: task.name,

                    priority: task.priority,

                    state: task.state,

                    core: task.core,

                    cpuTime:

                        Number(

                            task.cpuTime.toFixed(3)

                        ),

                    runs:

                        task.runCount

                }))

        };

    }

    /**
     * Reset
     */

    reset() {

        this.tasks = [];

        this.core0 = [];

        this.core1 = [];

        this.nextId = 1;

        this.running = false;

    }

}
