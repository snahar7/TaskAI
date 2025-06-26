import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Target, Calendar } from "lucide-react";

const goalFormSchema = z.object({
  goalInput: z.string().min(1, "Please enter your goal"),
  targetDate: z.string().optional(),
});

type GoalFormData = z.infer<typeof goalFormSchema>;

interface GoalInputFormProps {
  onSubmit: (data: GoalFormData) => void;
  isLoading: boolean;
  error?: string;
}

export function GoalInputForm({ onSubmit, isLoading, error }: GoalInputFormProps) {
  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      goalInput: "",
      targetDate: "",
    },
  });

  const handleSubmit = (data: GoalFormData) => {
    onSubmit(data);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <Target className="w-6 h-6 text-blue-600" />
          Create Your Goal
        </CardTitle>
        <CardDescription>
          Enter a high-level goal and AI will break it down into projects, tasks, and actionable subtasks
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="goalInput"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    What would you like to accomplish?
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Plan my wedding, Start a business, Learn web development..."
                      className="min-h-[100px] text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="targetDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Target completion date (optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating breakdown...
                </>
              ) : (
                "Break Down My Goal"
              )}
            </Button>
          </form>
        </Form>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Examples of great goals:</p>
          <div className="mt-2 space-y-1">
            <p className="text-gray-600">"Plan my wedding for next summer"</p>
            <p className="text-gray-600">"Launch my online store selling handmade jewelry"</p>
            <p className="text-gray-600">"Learn Python programming and build my first app"</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}