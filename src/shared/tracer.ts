export interface TraceEvent {
  timestamp: number;
  hexagon: 'front-desk' | 'player-registry' | 'lane-manager' | 'scoring-engine';
  layer: 'port' | 'adapter' | 'domain' | 'bridge';
  action: string;
  input?: any;
  output?: any;
}

export class Tracer {
  private events: TraceEvent[] = [];
  
  trace(event: Omit<TraceEvent, 'timestamp'>): void {
    this.events.push({ ...event, timestamp: Date.now() });
  }
  
  flush(): TraceEvent[] {
    const events = [...this.events];
    this.events = [];
    return events;
  }
}
