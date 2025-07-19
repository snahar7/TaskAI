import { useAtomValue, useSetAtom } from 'jotai';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  eventStoreAtom, 
  publishEventAtom, 
  eventAnalyticsAtom, 
  replayEventsAtom 
} from '@/store/events';
import { schemaStatsAtom, generateFormFields, TaskSchema } from '@/store/schema-generator';
import { Activity, Database, Code, Zap, History, BarChart3 } from 'lucide-react';

// Phase 2: Event Sourcing Demo
export function EventSourcingDemo() {
  const events = useAtomValue(eventStoreAtom);
  const analytics = useAtomValue(eventAnalyticsAtom);
  const publishEvent = useSetAtom(publishEventAtom);
  const replayEvents = useSetAtom(replayEventsAtom);

  const triggerSampleEvent = () => {
    publishEvent({
      type: 'TASK_COMPLETED',
      payload: { taskId: 123 }
    });
  };

  const triggerDeadlineChange = () => {
    publishEvent({
      type: 'DEADLINE_CHANGED',
      payload: { 
        taskId: 456, 
        oldDeadline: '2025-07-20', 
        newDeadline: '2025-07-25' 
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Event Sourcing System</h3>
        <Badge variant="outline" className="bg-blue-50 text-blue-700">
          Phase 2: Live
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Event Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Event Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{analytics.totalEvents}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Event Rate</p>
                <p className="text-2xl font-bold">{analytics.eventRate.toFixed(1)}/min</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2">Events by Type</p>
              {Object.entries(analytics.eventsByType).map(([type, count]) => (
                <div key={type} className="flex justify-between text-xs">
                  <span>{type}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Event Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Event Publisher
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={triggerSampleEvent}
              className="w-full"
              variant="outline"
            >
              Complete Task (Demo Event)
            </Button>
            
            <Button 
              onClick={triggerDeadlineChange}
              className="w-full"
              variant="outline"
            >
              Change Deadline (Demo Event)
            </Button>
            
            <Button 
              onClick={() => replayEvents()}
              className="w-full"
              variant="outline"
            >
              <History className="h-4 w-4 mr-2" />
              Replay All Events
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Events (Live Stream)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.recentEvents.map((event, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" size="sm">{event.type}</Badge>
                  <span className="text-muted-foreground">
                    User {event.userId}
                  </span>
                </div>
                <span className="text-muted-foreground">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
            {events.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No events yet. Trigger some events above to see the audit trail!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Phase 3: Schema-Driven Generation Demo
export function SchemaGenerationDemo() {
  const schemaStats = useAtomValue(schemaStatsAtom);
  const taskFields = generateFormFields(TaskSchema);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Schema-Driven Generation</h3>
        <Badge variant="outline" className="bg-purple-50 text-purple-700">
          Phase 3: Live
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Schema Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Schema Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <p className="text-2xl font-bold">{schemaStats.totalSchemas}</p>
              <p className="text-xs text-muted-foreground">Active Schemas</p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-bold">{schemaStats.totalFields}</p>
              <p className="text-xs text-muted-foreground">Total Fields</p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-bold">{schemaStats.generatedEndpoints}</p>
              <p className="text-xs text-muted-foreground">Auto-Generated Endpoints</p>
            </div>
          </CardContent>
        </Card>

        {/* Auto-Generated Form Fields */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Auto-Generated Form Fields
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-xs">
              {taskFields.slice(0, 6).map((field) => (
                <div key={field.name} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" size="sm">{field.type}</Badge>
                    <span className="font-medium">{field.label}</span>
                  </div>
                  {field.required && (
                    <Badge variant="destructive" size="sm">Required</Badge>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              All form fields generated automatically from TaskSchema definition
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Architecture Benefits */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="text-purple-900">What This Enables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-purple-900 mb-2">Single Schema Changes Generate:</h4>
              <ul className="text-purple-700 space-y-1">
                <li>• Database migrations</li>
                <li>• API endpoints & validation</li>
                <li>• TypeScript types</li>
                <li>• Form components</li>
                <li>• Documentation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-purple-900 mb-2">Zero Manual Synchronization:</h4>
              <ul className="text-purple-700 space-y-1">
                <li>• No more schema drift</li>
                <li>• Automatic validation everywhere</li>
                <li>• Type safety across stack</li>
                <li>• Self-documenting code</li>
                <li>• Zero breaking changes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Combined Advanced Demo Component
export function AdvancedReactiveDemo() {
  return (
    <Tabs defaultValue="events" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="events">Event Sourcing</TabsTrigger>
        <TabsTrigger value="schema">Schema Generation</TabsTrigger>
      </TabsList>
      
      <TabsContent value="events">
        <EventSourcingDemo />
      </TabsContent>
      
      <TabsContent value="schema">
        <SchemaGenerationDemo />
      </TabsContent>
    </Tabs>
  );
}