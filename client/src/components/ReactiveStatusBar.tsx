// Subtle reactive status indicator for all pages
import { useAtomValue } from 'jotai';
import { goalsAtom, tasksAtom } from '@/store/atoms';
import { Badge } from '@/components/ui/badge';

export function ReactiveStatusBar() {
  const goals = useAtomValue(goalsAtom);
  const tasks = useAtomValue(tasksAtom);
  
  // Only show when data is loaded
  if (!goals.data || !tasks.data) return null;

  const completedTasks = tasks.data.filter(task => task.completed).length;
  const totalTasks = tasks.data.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Reactive system active" />
      <span>{goals.data.length} goals</span>
      <span>•</span>
      <span>{totalTasks} tasks</span>
      <span>•</span>
      <Badge variant="outline" className="text-xs">
        {completionRate}% complete
      </Badge>
    </div>
  );
}