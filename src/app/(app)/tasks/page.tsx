
'use client';

import * as React from 'react';
import {
  ListFilter,
  PlusCircle,
  Search,
  Wand2,
  Calendar as CalendarIcon,
  MapPin,
  ListTodo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { Task } from '@/lib/types';
import { tasks as initialTasks, categories } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { suggestTaskCategory } from '@/ai/flows/suggest-task-category';

function TaskItem({ task, onMarkAsDone }: { task: Task, onMarkAsDone: (id: string) => void }) {
  const statusVariant = {
    pending: 'secondary',
    today: 'default',
    completed: 'outline',
    missed: 'destructive',
  } as const;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-headline">{task.title}</CardTitle>
          <Badge variant={statusVariant[task.status]}>{task.status}</Badge>
        </div>
        <CardDescription>
          Due: {format(new Date(task.dueDate), "PPP, p")}
          {task.store && ` at ${task.store}`}
        </CardDescription>
      </CardHeader>
      {task.subtasks && task.subtasks.length > 0 && (
        <CardContent>
          <div className="flex flex-col gap-2">
            <h4 className="font-semibold flex items-center gap-2"><ListTodo className="w-4 h-4"/> Subtasks</h4>
            {task.subtasks.map((subtask) => (
              <div key={subtask.id} className="flex items-center space-x-2">
                <Checkbox id={subtask.id} checked={subtask.completed} />
                <label
                  htmlFor={subtask.id}
                  className={cn(
                    "text-sm font-medium leading-none",
                    subtask.completed && "line-through text-muted-foreground"
                  )}
                >
                  {subtask.title}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      )}
      {task.status !== 'completed' && (
        <CardFooter>
          <Button variant="secondary" size="sm" onClick={() => onMarkAsDone(task.id)}>
            Mark as Done
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

function NewTaskSheet() {
  const { toast } = useToast();
  const [taskTitle, setTaskTitle] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [isSuggesting, setIsSuggesting] = React.useState(false);

  const handleSuggestCategory = async () => {
    if (!taskTitle) {
      toast({
        title: 'Uh oh!',
        description: 'Please enter a task title first to get a suggestion.',
        variant: 'destructive',
      });
      return;
    }
    setIsSuggesting(true);
    try {
      const result = await suggestTaskCategory({
        taskTitle,
        pastCategories: categories.map(c => c.name),
      });
      if (result.suggestedCategory) {
        setCategory(result.suggestedCategory);
        toast({
          title: 'Category Suggested!',
          description: `We've set the category to "${result.suggestedCategory}".`,
        });
      }
    } catch (error) {
      toast({
        title: 'Suggestion Failed',
        description: 'We couldn\'t get a suggestion right now. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" className="h-8 gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">New Task</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-headline">Create a New Task</SheetTitle>
          <SheetDescription>
            Fill in the details below to add a new task to your list.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Task Title</Label>
            <Input id="title" placeholder="e.g., Buy groceries" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" placeholder="Add any extra details here..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'justify-start text-left font-normal',
                      !Date.now() && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(new Date(), 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" initialFocus />
                </PopoverContent>
              </Popover>
            </div>
             <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <div className="flex items-center gap-2">
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={handleSuggestCategory} disabled={isSuggesting}>
                    <Wand2 className={cn("h-4 w-4", isSuggesting && "animate-pulse")} />
                  </Button>
                </div>
              </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location">Location (Optional)</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="location" placeholder="e.g., Downtown Mall" className="pl-8" />
            </div>
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <SheetClose asChild>
            <Button type="submit">Create Task</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = React.useState<Task[]>(initialTasks);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterCategories, setFilterCategories] = React.useState<string[]>(
    categories.map(c => c.name)
  );

  const handleMarkAsDone = (id: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === id
          ? { ...task, status: 'completed', completedAt: new Date().toISOString() }
          : task
      )
    );
  };

  const onFilterChange = (category: string, checked: boolean) => {
    setFilterCategories(prev =>
      checked ? [...prev, category] : prev.filter(c => c !== category)
    );
  };
  
  const filteredTasks = tasks
    .filter(task =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(task => filterCategories.includes(task.category));

  const pendingTasks = filteredTasks.filter((task) => task.status === 'pending');
  const todayTasks = filteredTasks.filter((task) => task.status === 'today');
  const completedTasks = filteredTasks.filter((task) => task.status === 'completed');

  return (
    <div className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
      <Tabs defaultValue="all">
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="completed" className="hidden sm:flex">
              Completed
            </TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <ListFilter className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Filter</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {categories.map(category => (
                  <DropdownMenuCheckboxItem
                    key={category.id}
                    checked={filterCategories.includes(category.name)}
                    onCheckedChange={(checked) => onFilterChange(category.name, checked)}
                  >
                    {category.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <NewTaskSheet />
          </div>
        </div>
        <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search tasks..." 
              className="pl-8" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
        <TabsContent value="all">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
            {filteredTasks.map((task) => (
              <TaskItem key={task.id} task={task} onMarkAsDone={handleMarkAsDone} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="pending">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
            {pendingTasks.map((task) => (
              <TaskItem key={task.id} task={task} onMarkAsDone={handleMarkAsDone} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="today">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
            {todayTasks.map((task) => (
              <TaskItem key={task.id} task={task} onMarkAsDone={handleMarkAsDone} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="completed">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
            {completedTasks.map((task) => (
              <TaskItem key={task.id} task={task} onMarkAsDone={handleMarkAsDone} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
