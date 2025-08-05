'use client';

import * as React from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
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
  Clock,
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
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { Task, FirestoreTask } from '@/lib/types';
import { categories } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { suggestTaskTitle } from '@/ai/flows/suggest-task-title';
import { suggestLocations, SuggestLocationsOutput } from '@/ai/flows/suggest-locations';
import { suggestTaskLocation } from '@/ai/flows/suggest-task-location';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

function TaskItem({ task, onUpdateTask, onDeleteTask, onEditTask }: { task: Task, onUpdateTask: (id: string, updates: Partial<FirestoreTask>) => void, onDeleteTask: (id: string) => void, onEditTask: (task: Task) => void }) {
  const statusVariant = {
    pending: 'secondary',
    today: 'default',
    completed: 'outline',
    missed: 'destructive',
  } as const;
  const { toast } = useToast();

  const handleMarkAsDone = () => {
    onUpdateTask(task.id, { status: 'completed', completedAt: Timestamp.now() });
     toast({
      title: "Task Completed!",
      description: `"${task.title}" has been moved to completed.`,
    });
  };
  
  const handleStartNavigation = async () => {
    let destination = task.store;
    if (!destination) {
      try {
        toast({ title: "Finding a location..." });
        const result = await suggestTaskLocation({ taskTitle: task.title });
        if (result.suggestedLocation) {
          destination = result.suggestedLocation;
           onUpdateTask(task.id, { store: destination });
          toast({
            title: "No location set!",
            description: `We've suggested a destination for you: ${destination}. Starting navigation.`,
          });
        } else {
           toast({ title: "Navigation Failed", description: "Could not suggest a location for this task.", variant: "destructive" });
           return;
        }
      } catch (error) {
        toast({ title: "Navigation Failed", description: "Could not suggest a location for this task.", variant: "destructive" });
        return;
      }
    }
    const query = encodeURIComponent(destination);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
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
              <DropdownMenuItem onClick={() => onEditTask(task)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {task.status !== 'completed' && (
                <DropdownMenuItem onClick={handleMarkAsDone}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Done
                </DropdownMenuItem>
              )}
               <AlertDialogTrigger asChild>
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Badge variant={statusVariant[task.status]} className="w-fit capitalize">{task.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-1">
           <p className="flex items-center gap-2"><Clock className="w-4 h-4"/> Due: {format(parseISO(task.dueDate), "PPP, p")}</p>
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
        <CardFooter className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleStartNavigation}>
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

function NewTaskSheet({ open, onOpenChange, onTaskSubmit, editingTask }: { open: boolean, onOpenChange: (open: boolean) => void, onTaskSubmit: (task: Omit<FirestoreTask, 'userId' | 'completedAt'> & { id?: string }) => void, editingTask: Task | null }) {
  const { toast } = useToast();
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [dueDate, setDueDate] = React.useState<Date | undefined>(new Date());
  
  const [hour, setHour] = React.useState('09');
  const [minute, setMinute] = React.useState('00');
  const [ampm, setAmpm] = React.useState('AM');

  const [location, setLocation] = React.useState('');
  const [locationSuggestions, setLocationSuggestions] = React.useState<SuggestLocationsOutput['suggestions']>([]);
  const [isSuggestingTitle, setIsSuggestingTitle] = React.useState(false);
  const [isSuggestingLocation, setIsSuggestingLocation] = React.useState(false);
  const [debouncedLocation, setDebouncedLocation] = React.useState(location);


  React.useEffect(() => {
    if (open) { 
        if (editingTask) {
            setTitle(editingTask.title);
            setDescription(editingTask.description || '');
            const taskDueDate = parseISO(editingTask.dueDate);
            setDueDate(taskDueDate);
            const formattedHour = format(taskDueDate, 'hh');
            const formattedMinute = format(taskDueDate, 'mm');
            const formattedAmPm = format(taskDueDate, 'aa');
            setHour(formattedHour);
            setMinute(formattedMinute);
            setAmpm(formattedAmPm.toUpperCase());
            setLocation(editingTask.store || '');
        } else {
            setTitle('');
            setDescription('');
            const now = new Date();
            setDueDate(now);
            setHour(format(now, 'hh'));
            setMinute('00'); 
            setAmpm(format(now, 'aa').toUpperCase());
            setLocation('');
        }
        setLocationSuggestions([]);
    }
  }, [open, editingTask]);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedLocation(location);
    }, 500); // 500ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [location]);

  React.useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedLocation.length > 2) {
        setIsSuggestingLocation(true);
        try {
          const result = await suggestLocations({ query: debouncedLocation });
          setLocationSuggestions(result.suggestions);
        } catch (error) {
          console.error("Location suggestion failed", error);
          setLocationSuggestions([]);
          if (error instanceof Error && error.message.includes('429')) {
             toast({
                title: 'Rate Limit Exceeded',
                description: 'You are making too many requests. Please wait a moment and try again.',
                variant: 'destructive',
            });
          }
        } finally {
          setIsSuggestingLocation(false);
        }
      } else {
        setLocationSuggestions([]);
      }
    };
    fetchSuggestions();
  }, [debouncedLocation, toast]);


  const handleSuggestTitle = async () => {
    setIsSuggestingTitle(true);
    try {
      const result = await suggestTaskTitle({});
      if (result.suggestedTitle) {
        setTitle(result.suggestedTitle);
        toast({
          title: 'Title Suggested!',
          description: `We've suggested a title for you.`,
        });
      }
    } catch (error) {
      toast({
        title: 'Suggestion Failed',
        description: 'We couldn\'t get a suggestion right now. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSuggestingTitle(false);
    }
  };
  
  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocation(e.target.value);
  };
  
  const handleSubmit = () => {
    if (!title || !dueDate) {
        toast({
            title: 'Missing Information',
            description: 'Please fill out the title and due date.',
            variant: 'destructive',
        });
        return;
    }
    
    let hours = parseInt(hour, 10);
    if (ampm === 'PM' && hours < 12) {
        hours += 12;
    }
    if (ampm === 'AM' && hours === 12) {
        hours = 0;
    }

    const combinedDueDate = new Date(dueDate);
    combinedDueDate.setHours(hours, parseInt(minute, 10), 0, 0);

    onTaskSubmit({
        id: editingTask?.id,
        title,
        description,
        dueDate: Timestamp.fromDate(combinedDueDate),
        store: location,
        status: editingTask?.status || 'pending',
        category: editingTask?.category || 'Personal',
    });
    
    onOpenChange(false);
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{editingTask ? 'Edit Task' : 'Create a New Task'}</SheetTitle>
          <SheetDescription>
            {editingTask ? 'Update the details of your task.' : 'Fill in the details below to add a new task to your list.'}
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Task Title</Label>
             <div className="flex items-center gap-2">
                <Input id="title" placeholder="e.g., Buy groceries" value={title} onChange={(e) => setTitle(e.target.value)} />
                 <Button variant="outline" size="icon" onClick={handleSuggestTitle} disabled={isSuggestingTitle}>
                    <Wand2 className={cn("h-4 w-4", isSuggestingTitle && "animate-pulse")} />
                </Button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" placeholder="Add any extra details here..." value={description} onChange={e => setDescription(e.target.value)} />
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
                <Label>Time</Label>
                 <div className="flex items-center gap-2">
                    <Select value={hour} onValueChange={setHour}>
                        <SelectTrigger className="w-1/3"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString().padStart(2, '0')}>{(i + 1).toString().padStart(2, '0')}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={minute} onValueChange={setMinute}>
                        <SelectTrigger className="w-1/3"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {['00', '15', '30', '45'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select value={ampm} onValueChange={setAmpm}>
                        <SelectTrigger className="w-1/3"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location">Location (Optional)</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="location" placeholder="e.g., Downtown Mall" className="pl-8" value={location} onChange={handleLocationChange} />
              {isSuggestingLocation && <div className="p-2 text-sm text-center text-muted-foreground">Finding nearby places...</div>}
              {locationSuggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-card border rounded-md mt-1 shadow-lg max-h-48 overflow-y-auto">
                  {locationSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-3 hover:bg-muted cursor-pointer border-b"
                      onClick={() => {
                        setLocation(`${suggestion.name}, ${suggestion.address}`);
                        setLocationSuggestions([]);
                      }}
                    >
                      <p className="font-semibold">{suggestion.name}</p>
                      <p className="text-sm text-muted-foreground">{suggestion.address}</p>
                      <p className="text-xs text-primary font-medium">{suggestion.eta} away</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <SheetFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" onClick={handleSubmit}>{editingTask ? 'Save Changes' : 'Create Task'}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterCategories, setFilterCategories] = React.useState<string[]>(
    categories.map(c => c.name)
  );
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);

  React.useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    };

    const q = query(collection(db, 'tasks'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasksData: Task[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        tasksData.push({
          id: doc.id,
          ...data,
          dueDate: (data.dueDate as Timestamp).toDate().toISOString(),
          completedAt: (data.completedAt as Timestamp)?.toDate().toISOString(),
        } as Task);
      });
      setTasks(tasksData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsSheetOpen(true);
  };
  
  const handleNewTaskClick = () => {
    setEditingTask(null);
    setIsSheetOpen(true);
  };

  const handleTaskSubmit = async (taskData: Omit<FirestoreTask, 'userId' | 'completedAt'> & { id?: string }) => {
    if (!user) return;
    
    const { id, ...data } = taskData;
    
    if (id) { // Editing
        const taskRef = doc(db, 'tasks', id);
        await updateDoc(taskRef, data);
    } else { // Adding
        await addDoc(collection(db, 'tasks'), {
            ...data,
            userId: user.uid,
        });
    }
  };
  
  const handleUpdateTask = async (id: string, updatedTask: Partial<FirestoreTask>) => {
     const taskRef = doc(db, 'tasks', id);
     await updateDoc(taskRef, updatedTask);
  };
  
  const handleDeleteTask = async (id: string) => {
    const taskRef = doc(db, 'tasks', id);
    await deleteDoc(taskRef);
  };

  const onFilterChange = (category: string, checked: boolean) => {
    setFilterCategories(prev =>
      checked ? [...prev, category] : prev.filter(c => c !== category)
    );
  };
  
  const handleStartMultiStopNavigation = () => {
    const pendingTasksWithLocations = tasks.filter(task => (task.status === 'pending' || task.status === 'today') && task.store);
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
  
  const actionableTasksWithLocationCount = tasks.filter(t => (t.status === 'pending' || t.status === 'today') && t.store).length;

  return (
    <AlertDialog>
    <div className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 relative">
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
            {actionableTasksWithLocationCount >= 2 && (
                <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handleStartMultiStopNavigation}>
                  <Navigation className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Multi-Stop</span>
                </Button>
            )}
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
              <TaskItem key={task.id} task={task} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onEditTask={handleEditTask} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="pending">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
            {pendingTasks.map((task) => (
              <TaskItem key={task.id} task={task} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onEditTask={handleEditTask} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="today">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
            {todayTasks.map((task) => (
              <TaskItem key={task.id} task={task} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onEditTask={handleEditTask} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="completed">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
            {completedTasks.map((task) => (
              <TaskItem key={task.id} task={task} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onEditTask={handleEditTask} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Button
        size="icon"
        className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-lg"
        onClick={handleNewTaskClick}
      >
        <PlusCircle className="h-10 w-10" />
        <span className="sr-only">New Task</span>
      </Button>

    </div>
     <NewTaskSheet 
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onTaskSubmit={handleTaskSubmit}
        editingTask={editingTask}
      />
    </AlertDialog>
  );
}
