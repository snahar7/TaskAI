import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Target, Calendar, FolderOpen, CheckSquare, ListTodo } from "lucide-react";

type HierarchyLevel = 'goal' | 'project' | 'task' | 'subtask';

const hierarchyFormSchema = z.object({
  level: z.enum(['goal', 'project', 'task', 'subtask']),
  title: z.string().min(1, "Please enter a title"),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  estimatedHours: z.number().optional(),
  parentId: z.number().optional(),
});

type HierarchyFormData = z.infer<typeof hierarchyFormSchema>;

interface HierarchicalInputFormProps {
  onSubmit: (data: HierarchyFormData) => void;
  isLoading: boolean;
  error?: string;
}

const levelConfig = {
  goal: {
    icon: Target,
    title: "Create Goal",
    description: "A high-level objective or outcome you want to achieve",
    placeholder: "e.g., Plan my wedding, Launch my business, Learn web development...",
    color: "text-blue-600",
    showTargetDate: true,
    showEstimatedHours: false,
    showAIBreakdown: true
  },
  project: {
    icon: FolderOpen,
    title: "Create Project",
    description: "A major component or phase within your goal",
    placeholder: "e.g., Venue Selection, Website Development, Marketing Campaign...",
    color: "text-orange-600",
    showTargetDate: true,
    showEstimatedHours: false,
    showAIBreakdown: true
  },
  task: {
    icon: CheckSquare,
    title: "Create Task",
    description: "A specific work item that contributes to your project",
    placeholder: "e.g., Research venues, Design homepage, Write blog posts...",
    color: "text-green-600",
    showTargetDate: true,
    showEstimatedHours: true,
    showAIBreakdown: true
  },
  subtask: {
    icon: ListTodo,
    title: "Create Subtask",
    description: "A small, actionable step to complete a task",
    placeholder: "e.g., Call 5 venues, Create wireframe, Schedule social media posts...",
    color: "text-purple-600",
    showTargetDate: true,
    showEstimatedHours: true,
    showAIBreakdown: false
  }
};

export function HierarchicalInputForm({ onSubmit, isLoading, error }: HierarchicalInputFormProps) {
  const [selectedLevel, setSelectedLevel] = useState<HierarchyLevel>('goal');
  
  const form = useForm<HierarchyFormData>({
    resolver: zodResolver(hierarchyFormSchema),
    defaultValues: {
      level: 'goal',
      title: "",
      description: "",
      targetDate: "",
      estimatedHours: undefined,
      parentId: undefined,
    },
  });

  // Reset parent selection when level changes
  useEffect(() => {
    form.setValue('parentId', undefined);
  }, [selectedLevel, form]);

  // Fetch available parents based on selected level
  const { data: availableParents = [], isLoading: parentsLoading } = useQuery({
    queryKey: ['/api/goals'],
    enabled: selectedLevel !== 'goal'
  });

  // Get goals with projects for project/task/subtask selection
  const { data: goalHierarchy = [], isLoading: hierarchyLoading } = useQuery({
    queryKey: ['/api/goals/hierarchy'],
    enabled: selectedLevel === 'task' || selectedLevel === 'subtask'
  });

  const config = levelConfig[selectedLevel];
  const IconComponent = config.icon;

  const handleLevelChange = (level: HierarchyLevel) => {
    setSelectedLevel(level);
    form.setValue('level', level);
  };

  const handleSubmit = (data: HierarchyFormData) => {
    const submitData = {
      ...data,
      level: selectedLevel,
      estimatedHours: data.estimatedHours || undefined,
    };
    onSubmit(submitData);
  };

  const renderParentSelection = () => {
    if (selectedLevel === 'goal') return null;

    const parentType = selectedLevel === 'project' ? 'goal' : 
                      selectedLevel === 'task' ? 'project' : 'task';
    
    if (parentsLoading || hierarchyLoading) {
      return (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          <span className="text-sm text-gray-600">Loading {parentType}s...</span>
        </div>
      );
    }

    return (
      <FormField
        control={form.control}
        name="parentId"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-base font-medium">
              Select {parentType === 'goal' ? 'Goal' : parentType === 'project' ? 'Project' : 'Task'}
            </FormLabel>
            <Select 
              onValueChange={(value) => field.onChange(parseInt(value))}
              value={field.value?.toString()}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={`Choose a ${parentType}...`} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {selectedLevel === 'project' && availableParents.map((goal: any) => (
                  <SelectItem key={goal.id} value={goal.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Target className="w-3 h-3 text-blue-600" />
                      {goal.title}
                    </div>
                  </SelectItem>
                ))}
                
                {selectedLevel === 'task' && goalHierarchy.map((goal: any) => 
                  goal.projects?.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-3 h-3 text-orange-600" />
                        {project.title}
                        <span className="text-xs text-gray-500">({goal.title})</span>
                      </div>
                    </SelectItem>
                  ))
                )}
                
                {selectedLevel === 'subtask' && goalHierarchy.map((goal: any) => 
                  goal.projects?.map((project: any) => 
                    project.tasks?.map((task: any) => (
                      <SelectItem key={task.id} value={task.id.toString()}>
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-3 h-3 text-green-600" />
                          {task.title}
                          <span className="text-xs text-gray-500">({project.title})</span>
                        </div>
                      </SelectItem>
                    ))
                  )
                )}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <IconComponent className={`w-6 h-6 ${config.color}`} />
          {config.title}
        </CardTitle>
        <CardDescription>
          {config.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Level Selection */}
            <div className="space-y-3">
              <label className="text-base font-medium">What would you like to create?</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(levelConfig).map(([level, config]) => {
                  const LevelIcon = config.icon;
                  return (
                    <Button
                      key={level}
                      type="button"
                      variant={selectedLevel === level ? "default" : "outline"}
                      className="flex items-center gap-2 h-auto p-3"
                      onClick={() => handleLevelChange(level as HierarchyLevel)}
                    >
                      <LevelIcon className={`w-4 h-4 ${config.color}`} />
                      <span className="capitalize">{level}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Parent Selection */}
            {renderParentSelection()}
            
            {/* Title Input */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    {selectedLevel === 'goal' ? 'What would you like to accomplish?' : 
                     `${config.title.replace('Create ', '')} Title`}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={config.placeholder}
                      className="min-h-[80px] text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description Input */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Additional Details (optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional context, requirements, or notes..."
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Target Date */}
            {config.showTargetDate && (
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
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Estimated Hours */}
            {config.showEstimatedHours && (
              <FormField
                control={form.control}
                name="estimatedHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Estimated hours (optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 2"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
            
            <Button 
              type="submit" 
              className={`w-full py-3 text-base ${config.color.replace('text-', 'bg-').replace('-600', '-600')} hover:${config.color.replace('text-', 'bg-').replace('-600', '-700')} text-white`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {config.showAIBreakdown ? 'Creating breakdown...' : 'Creating...'}
                </>
              ) : (
                config.showAIBreakdown ? 
                  `Create ${selectedLevel === 'goal' ? 'Goal' : config.title.replace('Create ', '')} with AI Breakdown` :
                  `Create ${config.title.replace('Create ', '')}`
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}