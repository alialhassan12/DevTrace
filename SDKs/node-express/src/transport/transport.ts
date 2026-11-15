import { SDK_NAME, SDK_VERSION } from "../config/defaults.js";
import type { MonitoringEvent } from "../types/monitoring-event.js";
import { EventQueue } from "./event-queue.js";

export interface TransportConfig{
    endpoint:string;
    apiKey:string;
    batchSize:number;  // max events per HTTP request; flush as soon as this many are waiting
    flushIntervalMs:number; // every N ms, send whatever is waiting, even if it's less than a full batch
    maxQueueSize:number; // max events held in memory; beyond this the oldest are dropped
    timeoutMs:number; // give up on an HTTP request after N ms
}

export class Transport{
    private readonly queue:EventQueue;
    private readonly timer:NodeJS.Timeout;
    private flushing:Promise<void> | null =null;

    constructor(private readonly config:TransportConfig){
        this.queue=new EventQueue(config.maxQueueSize);
        
        // Flush every flushIntervalMs, even if a full batch isn't waiting,
        // so a quiet app's few events still reach the dashboard.
        this.timer=setInterval(()=>{
            void this.flush();
        },config.flushIntervalMs);

        // A running timer normally keeps Node alive. unref() says:
        // "if I'm the only thing left, let the process exit."
        // Without it, any app using the SDK could never exit on its own.
        this.timer.unref();
    }

    enqueue(event:MonitoringEvent):void{
        this.queue.push(event);

        // A full batch is waiting, so send now instead of waiting for the timer.
        // `void` = start it, don't wait. The user's request continues immediately.
        if(this.queue.size >= this.config.batchSize){
            void this.flush();
        }

    }

    /**
     * "Send everything that's waiting, now."
     * Only one flush runs at a time; extra calls wait on the one already running.
     */
    flush():Promise<void>{
        if(this.flushing){
            return this.flushing;
        }

        // No flush running: start one, and remember it in `flushing`.
        // .finally() runs when it ends (success OR failure) and clears
        // `flushing`, so the next flush() call is allowed to start a new one.
        this.flushing=this.drain().finally(()=>{
            this.flushing=null;
        });

        return this.flushing;
    }

    /**
     * Keep sending batches until the queue is empty.
     * 120 waiting, batchSize 50 → sends 50, then 50, then 20.
     * Batches go one after another (await), never in parallel.
     */
    private async drain():Promise<void>{
        while(this.queue.size>0){
            const batch=this.queue.take(this.config.batchSize);
            await this.send(batch);
        }
    }

    private async send(batch:MonitoringEvent[]):Promise<void>{
        try {
            const response=await fetch(this.config.endpoint,{
                method:"POST",
                headers:{
                    "Content-Type":"application/json",
                    "Authorization":`Bearer ${this.config.apiKey}`,
                    // Tells the backend which SDK and version sent this (useful for debugging).
                    "User-Agent":`devtrace-${SDK_NAME}/${SDK_VERSION}`
                },
                body:JSON.stringify({events:batch}),
                signal:AbortSignal.timeout(this.config.timeoutMs)
            });

            // Read (and ignore) the body. If we don't, Node keeps the
            // connection busy until garbage collection gets around to it.
            await response.text();

            if(!response.ok){
                console.warn(`[DevTrace] ingestion responded ${response.status}; dropped ${batch.length} events`);
            }
        } catch (error) {
            console.warn(`[DevTrace] could not reach ingestion; dropped ${batch.length} events`, error);
        }
    }
}