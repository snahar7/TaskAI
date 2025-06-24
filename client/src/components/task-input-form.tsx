import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description must be less than 500 characters"),
  category: z.string().optional(),
  targetDate: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface TaskInputFormProps {
  onSubmit: (data: TaskFormData) => void;
  isLoading: boolean;
  error?: string;
}

export function TaskInputForm({ onSubmit, isLoading, error }: TaskInputFormProps) {
  const [charCount, setCharCount] = useState(0);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      targetDate: "",
    },
  });

  const handleSubmit = (data: TaskFormData) => {
    // Generate title from description if not provided
    const title = data.title || data.description.split('.')[0].substring(0, 50);
    onSubmit({ ...data, title });
  };

  const description = form.watch("description");

  return (
    <Card>
      <CardContent className="p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Plan my wedding, Launch marketing campaign..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What would you like to accomplish?</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Textarea
                        placeholder="e.g., Plan my wedding, Launch a marketing campaign, Organize a team retreat..."
                        rows={4}
                        className="resize-none"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setCharCount(e.target.value.length);
                        }}
                      />
                      <div className="absolute bottom-3 right-3 text-xs text-slate-400">
                        <span className={charCount > 450 ? "text-red-500" : ""}>
                          {charCount}
                        </span>/500
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="work">Work</SelectItem>
                        <SelectItem value="health">Health & Fitness</SelectItem>
                        <SelectItem value="learning">Learning</SelectItem>
                        <SelectItem value="creative">Creative Projects</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Completion (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={isLoading || !description.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AI is analyzing your task...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Break Down This Task
                </>
              )}
            </Button>

            {isLoading && (
              <div className="text-center py-4">
                <div className="inline-flex items-center space-x-3 text-slate-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>AI is analyzing your task...</span>
                </div>
                <p className="text-sm text-slate-500 mt-2">This usually takes 10-15 seconds</p>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}. Please try again.
                </AlertDescription>
              </Alert>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
