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
  Calendar as CalendarIcon,
  MapPin,
  ListTodo,
  MoreVertical,
  Trash2,
  Edit,
  Navigation,
  CheckCircle,
  Clock,
  Loader2,
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
import { format, parseISO, isToday, startOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { suggestTasks, SuggestTasksOutput } from '@/ai/flows/suggest-tasks';
import { suggestLocations, SuggestLocationsOutput } from '@/ai/flows/suggest-locations';
import { findTaskLocation } from '@/ai/flows/find-task-location';
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
import { useDebounce } from 'use-debounce';

function TaskItem({ task, onUpdateTask, onDeleteTask, onEditTask }: { task: Task, onUpdateTask: (id: string, updates: Partial<FirestoreTask>) => void, onDeleteTask: (id: string) => void, onEditTask: (task: Task) => void }) {
  const statusVariant = {
    pending: 'secondary',
    today: 'default',
    completed: 'outline',
    missed: 'destructive',
  } as const;
  const { toast } = useToast();
  const [isNavigating, setIsNavigating] = React.useState(false);


  const handleMarkAsDone = () => {
    onUpdateTask(task.id, { status: 'completed', completedAt: Timestamp.now() });
     toast({
      title: "Task Completed!",
      description: `"${task.title}" has been moved to completed.`,
    });
  };
  
  const handleStartNavigation = async () => {
    setIsNavigating(true);
    let destination = task.store;

    if (!destination) {
        toast({ title: "Finding location...", description: `Searching for a place to complete "${task.title}"...` });
        try {
            const locationResult = await findTaskLocation({ taskTitle: task.title });
            if (locationResult) {
                destination = `${locationResult.name}, ${locationResult.address}`;
                // Optionally, update the task with the found location
                onUpdateTask(task.id, { store: destination });
            } else {
                 toast({ title: "Location Not Found", description: "Could not find a suitable nearby location for this task.", variant: "destructive" });
                 setIsNavigating(false);
                 return;
            }
        } catch(error) {
            console.error("Error finding location:", error);
            toast({ title: "Error", description: "Failed to find a location.", variant: "destructive" });
            setIsNavigating(false);
            return;
        }
    }

    const query = encodeURIComponent(destination);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    setIsNavigating(false);
  };

  return (
    <AlertDialog>
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
               <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => onDeleteTask(task.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
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
          <Button variant="outline" size="sm" onClick={handleStartNavigation} disabled={isNavigating}>
             {isNavigating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Navigation className="mr-2 h-4 w-4" />}
             {isNavigating ? 'Finding...' : 'Start Navigation'}
          </Button>
        </CardFooter>
      )}
    </Card>
    </AlertDialog>
  );
}

function NewTaskSheet({
  open,
  onOpenChange,
  onTaskSubmit,
  editingTask,
  userLocation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskSubmit: (
    task: Omit<FirestoreTask, 'userId' | 'completedAt'> & { id?: string }
  ) => void;
  editingTask: Task | null;
  userLocation: string | null;
}) {
  const { toast } = useToast();
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [dueDate, setDueDate] = React.useState<Date | undefined>(new Date());
  
  const [hour, setHour] = React.useState('09');
  const [minute, setMinute] = React.useState('00');
  const [ampm, setAmpm] = React.useState('AM');

  const [location, setLocation] = React.useState('');
  const [locationSuggestions, setLocationSuggestions] = React.useState<SuggestLocationsOutput['suggestions']>([]);
  const [isSuggestingLocations, setIsSuggestingLocations] = React.useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = React.useState(true);

  const [taskSuggestions, setTaskSuggestions] = React.useState<SuggestTasksOutput['suggestions']>([]);
  const [isSuggestingTasks, setIsSuggestingTasks] = React.useState(false);
  const [showTaskSuggestions, setShowTaskSuggestions] = React.useState(true);

  const [debouncedTitle] = useDebounce(title, 300);
  const [debouncedLocation] = useDebounce(location, 300);


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
      setTaskSuggestions([]);
      setShowTaskSuggestions(true);
      setShowLocationSuggestions(true);
    }
  }, [open, editingTask]);

  const fetchTaskSuggestions = React.useCallback(async (query: string) => {
    if (query.length < 3 || !showTaskSuggestions) {
      setTaskSuggestions([]);
      return;
    }
    setIsSuggestingTasks(true);
    try {
      const result = await suggestTasks({ query });
      setTaskSuggestions(result.suggestions);
    } catch (error) {
      console.error("Failed to fetch task suggestions:", error);
      setTaskSuggestions([]);
    } finally {
      setIsSuggestingTasks(false);
    }
  }, [showTaskSuggestions]);

  React.useEffect(() => {
    fetchTaskSuggestions(debouncedTitle);
  }, [debouncedTitle, fetchTaskSuggestions]);
  
  const fetchLocationSuggestions = React.useCallback(async (query: string) => {
    if (query.length < 2 || !showLocationSuggestions || !userLocation) {
      setLocationSuggestions([]);
      return;
    }
    setIsSuggestingLocations(true);
    try {
      const result = await suggestLocations({ query, userLocation });
      setLocationSuggestions(result.suggestions);
    } catch (error) {
      console.error("Failed to fetch location suggestions:", error);
      setLocationSuggestions([]);
    } finally {
      setIsSuggestingLocations(false);
    }
  }, [showLocationSuggestions, userLocation]);

  React.useEffect(() => {
    if (debouncedLocation) {
      fetchLocationSuggestions(debouncedLocation);
    }
  }, [debouncedLocation, fetchLocationSuggestions]);

  const handleLocationFocus = React.useCallback(async () => {
    if (title && !location && userLocation) {
        setIsSuggestingLocations(true);
        try {
            const result = await suggestLocations({ query: title, userLocation });
            setLocationSuggestions(result.suggestions);
        } catch (error) {
            console.error("Failed to fetch contextual location suggestions:", error);
        } finally {
            setIsSuggestingLocations(false);
        }
    }
  }, [title, location, userLocation]);

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

    const newStatus = isToday(combinedDueDate) ? 'today' : 'pending';

    onTaskSubmit({
      id: editingTask?.id,
      title,
      description,
      dueDate: Timestamp.fromDate(combinedDueDate),
      store: location,
      status: editingTask
        ? isToday(combinedDueDate)
          ? 'today'
          : editingTask.status
        : newStatus,
      category: editingTask?.category || 'Personal',
    });

    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {editingTask ? 'Edit Task' : 'Create a New Task'}
          </SheetTitle>
          <SheetDescription>
            {editingTask
              ? 'Update the details of your task.'
              : 'Fill in the details below to add a new task to your list.'}
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2 relative">
            <Label htmlFor="title">Task Title</Label>
              <div className="relative">
                <Input
                  id="title"
                  placeholder="e.g., Buy groceries"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!showTaskSuggestions) setShowTaskSuggestions(true);
                  }}
                  autoComplete="off"
                />
                {isSuggestingTasks && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
              </div>
            {taskSuggestions.length > 0 && showTaskSuggestions && (
              <div className="absolute z-20 w-full bg-card border rounded-md shadow-lg mt-1 top-full">
                {taskSuggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                        setTitle(s);
                        setShowTaskSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add any extra details here..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label>Time</Label>
              <div className="flex items-center gap-2">
                <Select value={hour} onValueChange={setHour}>
                  <SelectTrigger className="w-1/3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem
                        key={i + 1}
                        value={(i + 1).toString().padStart(2, '0')}
                      >
                        {(i + 1).toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={minute} onValueChange={setMinute}>
                  <SelectTrigger className="w-1/3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['00', '15', '30', '45'].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={ampm} onValueChange={setAmpm}>
                  <SelectTrigger className="w-1/3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="grid gap-2 relative">
            <Label htmlFor="location">Location (Optional)</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                placeholder="e.g., Downtown Mall"
                className="pl-8"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  if (!showLocationSuggestions) setShowLocationSuggestions(true);
                }}
                onFocus={handleLocationFocus}
                autoComplete="off"
              />
              {isSuggestingLocations && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
            </div>
              {locationSuggestions.length > 0 && showLocationSuggestions && (
                <div className="absolute z-10 w-full bg-card border rounded-md shadow-lg mt-1 top-full max-h-48 overflow-y-auto">
                  {locationSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-3 hover:bg-muted cursor-pointer border-b"
                      onClick={() => {
                        setLocation(
                          `${suggestion.name}, ${suggestion.address}`
                        );
                        setShowLocationSuggestions(false);
                      }}
                    >
                      <p className="font-semibold">{suggestion.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {suggestion.address}
                      </p>
                      <p className="text-xs text-primary font-medium">
                        {suggestion.eta} away
                      </p>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit}>
            {editingTask ? 'Save Changes' : 'Create Task'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}


export default function TasksPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterCategories, setFilterCategories] = React.useState<string[]>(
    categories.map(c => c.name)
  );
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [userLocation, setUserLocation] = React.useState<string | null>(null);


  React.useEffect(() => {
    // We mock the user's location for the prototype.
    // In a real app, you'd use navigator.geolocation.getCurrentPosition
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation(`${latitude},${longitude}`);
        },
        (error) => {
          console.error("Error getting user location:", error);
           toast({
            title: "Could not get location",
            description: "Location suggestions may not be accurate. Using a default location.",
            variant: "destructive"
           })
           // Fallback to a default location if GPS fails
           setUserLocation("Mountain View, CA");
        }
      );
    } else {
        // Fallback for browsers that don't support geolocation
        setUserLocation("Mountain View, CA");
    }
  }, [toast]);


  React.useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    };

    const q = query(collection(db, 'tasks'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasksData: Task[] = [];
      const batch = writeBatch(db);
      const today = startOfDay(new Date());

      querySnapshot.forEach((taskDoc) => {
        const data = taskDoc.data() as FirestoreTask;
        if (data.status !== 'completed') {
            const taskDueDate = (data.dueDate as Timestamp).toDate();
            let currentStatus = data.status;

            if (currentStatus === 'pending' && isToday(taskDueDate)) {
                currentStatus = 'today';
                const taskRef = doc(db, 'tasks', taskDoc.id);
                batch.update(taskRef, { status: 'today' });
            } else if (currentStatus === 'today' && !isToday(taskDueDate) && taskDueDate < today) {
                currentStatus = 'missed';
                const taskRef = doc(db, 'tasks', taskDoc.id);
                batch.update(taskRef, { status: 'missed' });
            }


            tasksData.push({
                id: taskDoc.id,
                ...data,
                status: currentStatus,
                dueDate: taskDueDate.toISOString(),
                completedAt: (data.completedAt as Timestamp)?.toDate().toISOString(),
            } as Task);
        }
      });
      
      batch.commit().catch(err => console.error("Error updating task statuses:", err));

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
    
    try {
        if (id) { // Editing
            const taskRef = doc(db, 'tasks', id);
            await updateDoc(taskRef, data);
            toast({ title: "Task Updated", description: `"${data.title}" has been updated.` });
        } else { // Adding
            await addDoc(collection(db, 'tasks'), {
                ...data,
                userId: user.uid,
            });
            toast({ title: "Task Created", description: `"${data.title}" has been added to your list.` });
        }
    } catch (error) {
        console.error("Error submitting task:", error);
        toast({ title: "Submission Error", description: "Could not save the task.", variant: "destructive" });
    }
  };
  
  const handleUpdateTask = async (id: string, updatedTask: Partial<FirestoreTask>) => {
     try {
        const taskRef = doc(db, 'tasks', id);
        await updateDoc(taskRef, updatedTask);
     } catch (error) {
        console.error("Error updating task:", error);
        toast({ title: "Update Error", description: "Could not update the task.", variant: "destructive" });
     }
  };
  
  const handleDeleteTask = async (id: string) => {
    try {
        const taskRef = doc(db, 'tasks', id);
        await deleteDoc(taskRef);
        toast({
            title: "Task Deleted",
            description: "The task has been permanently deleted.",
        });
    } catch (error) {
        console.error("Error deleting task:", error);
        toast({ title: "Delete Error", description: "Could not delete the task.", variant: "destructive" });
    }
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
      const origin = userLocation || "My Location"; // Or get user's current location
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
  
  const actionableTasksWithLocationCount = tasks.filter(t => (t.status === 'pending' || t.status === 'today') && t.store).length;

  return (
    <>
    <div className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 relative">
      <Tabs defaultValue="today">
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
            {actionableTasksWithLocationCount >= 2 && (
                <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handleStartMultiStopNavigation}>
                  <Navigation className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Start</span>
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
        userLocation={userLocation}
      />
    </>
  );
}
