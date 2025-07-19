// Phase 2: Event Sourcing System
import { atom } from 'jotai';

// Event types for full audit trail
export type TaskEvent = 
  | { type: 'TASK_CREATED', payload: { task: any }, userId: number, timestamp: string }
  | { type: 'TASK_UPDATED', payload: { taskId: number, updates: any }, userId: number, timestamp: string }
  | { type: 'TASK_COMPLETED', payload: { taskId: number }, userId: number, timestamp: string }
  | { type: 'TASK_DELETED', payload: { taskId: number }, userId: number, timestamp: string }
  | { type: 'DEADLINE_CHANGED', payload: { taskId: number, oldDeadline: string, newDeadline: string }, userId: number, timestamp: string };

// Event store - stores all events that ever happened
export const eventStoreAtom = atom<TaskEvent[]>([]);

// Event publisher - publishes events and updates state
export const publishEventAtom = atom(
  null,
  (get, set, event: Omit<TaskEvent, 'timestamp' | 'userId'>) => {
    const currentEvents = get(eventStoreAtom);
    const newEvent: TaskEvent = {
      ...event,
      userId: 4, // TODO: Get from auth context
      timestamp: new Date().toISOString()
    } as TaskEvent;
    
    // Add to event store (immutable audit trail)
    set(eventStoreAtom, [...currentEvents, newEvent]);
    
    // Log event for demonstration
    console.log('📡 EVENT PUBLISHED:', newEvent);
    
    // Apply event to current state (this is where the magic happens)
    applyEventToState(get, set, newEvent);
    
    // Future: Send to server event store
    // await fetch('/api/events', { method: 'POST', body: JSON.stringify(newEvent) });
  }
);

// Event replay capability - reconstruct any state from events
export const replayEventsAtom = atom(
  null,
  (get, set, fromTimestamp?: string) => {
    const events = get(eventStoreAtom);
    const eventsToReplay = fromTimestamp 
      ? events.filter(e => e.timestamp >= fromTimestamp)
      : events;
    
    console.log(`🔄 REPLAYING ${eventsToReplay.length} EVENTS`);
    
    // Reset to initial state, then replay events
    eventsToReplay.forEach(event => {
      applyEventToState(get, set, event);
    });
  }
);

// Apply events to current state (event sourcing logic)
function applyEventToState(get: any, set: any, event: TaskEvent) {
  switch (event.type) {
    case 'TASK_COMPLETED':
      // Update tasks atom optimistically
      const { tasksAtom } = require('./atoms');
      const currentTasks = get(tasksAtom);
      if (currentTasks.data) {
        const updatedTasks = currentTasks.data.map((task: any) => 
          task.id === event.payload.taskId 
            ? { ...task, completed: true, completedAt: event.timestamp }
            : task
        );
        set(tasksAtom, { ...currentTasks, data: updatedTasks });
      }
      break;
      
    case 'DEADLINE_CHANGED':
      // Similar logic for deadline changes
      break;
      
    // Add more event handlers as needed
  }
}

// Demo: Event analytics
export const eventAnalyticsAtom = atom((get) => {
  const events = get(eventStoreAtom);
  
  return {
    totalEvents: events.length,
    eventsByType: events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    recentEvents: events.slice(-5),
    eventRate: events.length > 0 ? events.length / ((Date.now() - new Date(events[0]?.timestamp || 0).getTime()) / 1000 / 60) : 0 // events per minute
  };
});