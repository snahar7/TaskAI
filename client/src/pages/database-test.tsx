import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

export default function DatabaseTestPage() {
  const queryClient = useQueryClient();
  
  // Test mutation with detailed logging
  const testMutation = useMutation({
    mutationFn: async ({ type, id, completed }: { type: string; id: number; completed: boolean }) => {
      console.log(`Sending request: PATCH /api/${type}s/${id}/complete`, { completed });
      const response = await apiRequest("PATCH", `/api/${type}s/${id}/complete`, { completed });
      console.log(`Response received:`, response);
      return response;
    },
    onSuccess: (data, variables) => {
      console.log(`Success! Variables:`, variables, `Response:`, data);
      // Invalidate all queries to see updated data
      queryClient.invalidateQueries();
    },
    onError: (error, variables) => {
      console.error(`Error! Variables:`, variables, `Error:`, error);
    }
  });

  // Get some test data
  const { data: subtasks } = useQuery<any[]>({
    queryKey: ['/api/tasks/12/subtasks'],
  });

  const testSubtask = subtasks?.[0];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Checkbox Debug Test</h1>
      
      {testSubtask && (
        <div className="space-y-4 border p-4 rounded">
          <div>
            <p className="font-bold">Test Subtask: {testSubtask.title}</p>
            <p>ID: {testSubtask.id}</p>
            <p>Status: {testSubtask.status}</p>
            <p>Completed: {String(testSubtask.completed)}</p>
            <p>Percent Complete: {testSubtask.percentComplete || 'N/A'}</p>
          </div>
          
          <div className="space-x-2">
            <Button 
              onClick={() => {
                console.log('Marking complete...');
                testMutation.mutate({ type: 'subtask', id: testSubtask.id, completed: true });
              }}
              disabled={testMutation.isPending}
            >
              Mark Complete
            </Button>
            
            <Button 
              onClick={() => {
                console.log('Marking incomplete...');
                testMutation.mutate({ type: 'subtask', id: testSubtask.id, completed: false });
              }}
              disabled={testMutation.isPending}
            >
              Mark Incomplete
            </Button>
          </div>
          
          {testMutation.isPending && <p>Loading...</p>}
        </div>
      )}
      
      <div className="mt-8">
        <h2 className="text-lg font-bold mb-2">Console Output</h2>
        <p className="text-sm text-gray-600">Open browser console to see detailed logs</p>
      </div>
    </div>
  );
}