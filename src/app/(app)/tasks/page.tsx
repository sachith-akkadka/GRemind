
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
  MoreVertical,
  Trash2,
  Edit,
  Navigation,
  CheckCircle,
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { suggestLocations } from '@/ai/flows/suggest-locations';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

function TaskItem({ task, onUpdateTask, onDeleteTask }: { task: Task, onUpdateTask: (task: Task) => void, onDeleteTask: (id: string) => void }) {
  const statusVariant = {
    pending: 'secondary',
    today: 'default',
    completed: 'outline',
    missed: 'destructive',
  } as const;

  const handleMarkAsDone = () => {
    onUpdateTask({ ...task, status: 'completed', completedAt: new Date().toISOString() });
  };
  
  const handleStartNavigation = () => {
    if (task.store) {
      const query = encodeURIComponent(task.store);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{task.title}</CardTitle>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
               <AlertDialogTrigger asChild>
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Badge variant={statusVariant[task.status]} className="w-fit">{task.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-1">
           <p>Due: {format(new Date(task.dueDate), "PPP, p")}</p>
           {task.store && <p className="flex items-center gap-2"><MapPin className="w-4 h-4"/> {task.store}</p>}
        </div>
        {task.subtasks && task.subtasks.length > 0 && (
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
        )}
      </CardContent>
      {task.status !== 'completed' && (
        <CardFooter className="flex justify-between">
          <Button variant="secondary" size="sm" onClick={handleMarkAsDone}>
            <CheckCircle className="mr-2 h-4 w-4" /> Mark as Done
          </Button>
          <Button variant="outline" size="sm" onClick={handleStartNavigation} disabled={!task.store}>
            <Navigation className="mr-2 h-4 w-4" /> Start Navigation
          </Button>
        </CardFooter>
      )}
       <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this task.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            onClick={() => onDeleteTask(task.id)}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </Card>
  );
}

function NewTaskSheet({ onAddTask }: { onAddTask: (task: Omit<Task, 'id' | 'status' | 'completedAt'>) => void }) {
  const { toast } = useToast();
  const [taskTitle, setTaskTitle] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [dueDate, setDueDate] = React.useState<Date | undefined>(new Date());
  const [locationSuggestions, setLocationSuggestions] = React.useState<string[]>([]);
  const [isSuggestingCategory, setIsSuggestingCategory] = React.useState(false);
  const [isSuggestingLocation, setIsSuggestingLocation] = React.useState(false);

  const handleSuggestCategory = async () => {
    if (!taskTitle) {
      toast({
        title: 'Uh oh!',
        description: 'Please enter a task title first to get a suggestion.',
        variant: 'destructive',
      });
      return;
    }
    setIsSuggestingCategory(true);
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
      setIsSuggestingCategory(false);
    }
  };
  
  const handleLocationChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setLocation(query);
    if (query.length > 2) {
      setIsSuggestingLocation(true);
      try {
        const result = await suggestLocations({ query });
        setLocationSuggestions(result.suggestions);
      } catch (error) {
        // Silently fail
        console.error("Location suggestion failed", error);
        setLocationSuggestions([]);
      } finally {
        setIsSuggestingLocation(false);
      }
    } else {
      setLocationSuggestions([]);
    }
  };
  
  const handleAddTask = () => {
    if (!taskTitle || !category || !dueDate) {
        toast({
            title: 'Missing Information',
            description: 'Please fill out the title, category, and due date.',
            variant: 'destructive',
        });
        return;
    }
    
    onAddTask({
        title: taskTitle,
        dueDate: dueDate.toISOString(),
        category,
        store: location,
    });
    
    setTaskTitle('');
    setCategory('');
    setLocation('');
    setDueDate(new Date());
    setLocationSuggestions([]);
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
          <SheetTitle>Create a New Task</SheetTitle>
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
                      !dueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
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
                  <Button variant="outline" size="icon" onClick={handleSuggestCategory} disabled={isSuggestingCategory}>
                    <Wand2 className={cn("h-4 w-4", isSuggestingCategory && "animate-pulse")} />
                  </Button>
                </div>
              </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location">Location (Optional)</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="location" placeholder="e.g., Downtown Mall" className="pl-8" value={location} onChange={handleLocationChange} />
              {isSuggestingLocation && <div className="p-2 text-sm">Loading...</div>}
              {locationSuggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-card border rounded-md mt-1 shadow-lg">
                  {locationSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-2 hover:bg-muted cursor-pointer"
                      onClick={() => {
                        setLocation(suggestion);
                        setLocationSuggestions([]);
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
            <Button type="submit" onClick={handleAddTask}>Create Task</Button>
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

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === updatedTask.id ? updatedTask : task
      )
    );
  };
  
  const handleDeleteTask = (id: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
  };
  
  const handleAddTask = (newTaskData: Omit<Task, 'id' | 'status' | 'completedAt'>) => {
    const newTask: Task = {
        id: `task-${Date.now()}`,
        status: 'pending',
        ...newTaskData,
    };
    setTasks(prevTasks => [newTask, ...prevTasks]);
  };

  const onFilterChange = (category: string, checked: boolean) => {
    setFilterCategories(prev =>
      checked ? [...prev, category] : prev.filter(c => c !== category)
    );
  };
  
  const handleStartMultiStopNavigation = () => {
    const pendingTasksWithLocations = tasks.filter(task => task.status === 'pending' && task.store);
    if (pendingTasksWithLocations.length > 1) {
      const waypoints = pendingTasksWithLocations.slice(0, -1).map(task => encodeURIComponent(task.store!)).join('|');
      const destination = encodeURIComponent(pendingTasksWithLocations[pendingTasksWithLocations.length - 1].store!);
      const origin = "My Location"; // Or get user's current location
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}`, '_blank');
    }
  };
  
  const filteredTasks = tasks
    .filter(task =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.store?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(task => filterCategories.includes(task.category));

  const pendingTasks = filteredTasks.filter((task) => task.status === 'pending');
  const todayTasks = filteredTasks.filter((task) => task.status === 'today');
  const completedTasks = filteredTasks.filter((task) => task.status === 'completed');

  return (
    <AlertDialog>
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
            <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handleStartMultiStopNavigation} disabled={pendingTasks.filter(t => t.store).length < 2}>
              <Navigation className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Multi-Stop</span>
            </Button>
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
            <NewTaskSheet onAddTask={handleAddTask} />
          </div>
        </div>
        <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search tasks or locations..." 
              className="pl-8" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
        <TabsContent value="all">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
            {filteredTasks.map((task) => (
              <TaskItem key={task.id} task={task} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask}/>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="pending">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
            {pendingTasks.map((task) => (
              <TaskItem key={task.id} task={task} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="today">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
            {todayTasks.map((task) => (
              <TaskItem key={task.id} task={task} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="completed">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
            {completedTasks.map((task) => (
              <TaskItem key={task.id} task={task} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
    </AlertDialog>
  );
}
