import type { MonitoringEvent } from "../types/monitoring-event.js";

export class EventQueue{
    private events:MonitoringEvent[]=[];
    private dropped=0;

    constructor(private readonly maxSize:number){
        if(maxSize < 1 || !Number.isInteger(maxSize)){
            throw new Error("[DevTrace] maxQueueSize must be an integer >= 1");
        }
    }

    push(event:MonitoringEvent):void{
        if(this.events.length >= this.maxSize){
            this.events.shift();
            this.dropped++;
        }
        this.events.push(event);

    }

    take(n:number):MonitoringEvent[]{
        return this.events.splice(0,n);
    }

    get size():number{
        return this.events.length;
    }

    get droppedCount():number{
        return this.dropped;
    }
}