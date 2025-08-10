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
  getDoc,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import {
  ListFilter,
  Plus,
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
  AlertOctagon,
  TrendingUp,
  Repeat,
  Zap,
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
import type { Task, FirestoreTask, Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isToday, isTomorrow, startOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { suggestTasks, SuggestTasksOutput } from '@/ai/flows/suggest-tasks';
import { suggestTaskCategory } from '@/ai/flows/suggest-task-category';
import { findTaskLocation } from '@/ai/flows/find-task-location';
import { suggestLocations } from '@/ai/flows/suggest-locations';
import { suggestRescheduleTime } from '@/ai/flows/suggest-reschedule-time';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from 'use-debounce';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { requestNotificationPermission, showNotification } from '@/lib/notifications';
import { LocationPicker } from '@/components/LocationPicker';
import PlaceAutocomplete from '@/components/PlaceAutocomplete';
import styles from '@/styles/futuristic.module.css';


// Haversine formula to calculate distance between two lat/lon points
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
}

function TaskItem({ task, onUpdateTask, onDeleteTask, onEditTask, userLocation }: { task: Task, onUpdateTask: (id: string, updates: Partial<FirestoreTask>) => void, onDeleteTask: (id: string) => void, onEditTask: (task: Task) => void, userLocation: string | null }) {
  const statusVariant = {
    pending: 'secondary',
    today: 'default',
    tomorrow: 'accent',
    completed: 'outline',
    missed: 'destructive',
  } as const;

  const priorityColor = {
    low: 'border-l-4 border-green-500',
    medium: 'border-l-4 border-yellow-500',
    high: 'border-l-4 border-red-500',
  }

  const { toast } = useToast();
  const [isNavigating, setIsNavigating] = React.useState(false);
  const [isRescheduling, setIsRescheduling] = React.useState(false);
  const router = useRouter();


  const handleMarkAsDone = () => {
    onUpdateTask(task.id, { status: 'completed', completedAt: Timestamp.now() });
     toast({
      title: "Task Completed!",
      description: `"${task.title}" has been moved to completed.`,
      duration: 3000,
    });
  };
  
  const handleStartNavigation = async () => {
    setIsNavigating(true);

    if (!userLocation) {
        toast({ title: "Location Error", description: "Could not determine your current location. Please wait a moment and try again.", variant: "destructive", duration: 3000 });
        setIsNavigating(false);
        return;
    }

    let destination = task.store;
    let destinationName = task.storeName;

    // If the task doesn't have a location, find one.
    if (!destination) {
        toast({ title: "Finding location...", description: `Searching for a place for "${task.title}"...`, duration: 3000 });
        try {
            const locationResult = await findTaskLocation({ taskTitle: task.title, userLocation });
            if (locationResult?.latlon) {
                destination = locationResult.latlon;
                destinationName = locationResult.name;
                // Save this found location to the task for future use
                onUpdateTask(task.id, { store: destination, storeName: destinationName });
            } else {
                 toast({ title: "Location Not Found", description: "Could not find a suitable nearby location for this task.", variant: "destructive", duration: 3000 });
                 setIsNavigating(false);
                 return;
            }
        } catch(error) {
            console.error("Error finding location:", error);
            toast({ title: "Error", description: "Failed to find a location.", variant: "destructive", duration: 3000 });
            setIsNavigating(false);
            return;
        }
    }
    
    // Navigate to the map page with the correct origin and destination
    const params = new URLSearchParams();
    params.set('origin', userLocation);
    params.set('destination', destination);
    router.push(`/map?${params.toString()}`);

    setIsNavigating(false);
  };

  const handleReschedule = async () => {
    setIsRescheduling(true);
    try {
      const result = await suggestRescheduleTime({
        taskTitle: task.title,
        originalDueDate: task.dueDate,
        userSchedule: "User is generally free on weekday evenings and weekends."
      });
      
      const newDueDate = new Date(result.suggestedRescheduleTime);
      
      let newStatus: Task['status'] = 'pending';
      const today = startOfDay(new Date());
      if (isToday(newDueDate)) {
          newStatus = 'today';
      } else if (isTomorrow(newDueDate)) {
          newStatus = 'tomorrow';
      }
      
      onUpdateTask(task.id, { dueDate: Timestamp.fromDate(newDueDate), status: newStatus });
      
      toast({
        title: "Task Rescheduled!",
        description: `Task moved to a new date. Reasoning: ${result.reasoning}`,
        duration: 12000,
      });

    } catch (error) {
        console.error("Error rescheduling task:", error);
        toast({ title: "Reschedule Failed", description: "The AI could not suggest a new time.", variant: "destructive", duration: 3000 });
    } finally {
        setIsRescheduling(false);
    }
  };
  
  const displayLocation = task.storeName || task.store;

  return (
    <Card className={cn("flex flex-col", task.priority && priorityColor[task.priority])}>
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg flex items-center gap-2">
            {task.title}
          </CardTitle>
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
        <div className="flex gap-2 items-center flex-wrap">
            <Badge variant={statusVariant[task.status]} className="w-fit capitalize">{task.status}</Badge>
            <Badge variant="outline" className="w-fit">{task.category}</Badge>
            {task.recurring && <Badge variant="secondary" className="w-fit"><Repeat className="w-3 h-3 mr-1"/> {task.recurring}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        <div className="text-sm text-muted-foreground space-y-1">
           <p className="flex items-center gap-2"><Clock className="w-4 h-4"/> Due: {format(parseISO(task.dueDate), "PPP, p")}</p>
           {displayLocation && <p className="flex items-center gap-2"><MapPin className="w-4 h-4"/> {displayLocation}</p>}
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
        <CardFooter className="flex justify-end gap-2">
           {task.status === 'missed' && (
            <Button variant="outline" size="sm" onClick={handleReschedule} disabled={isRescheduling}>
              <Zap className="mr-2 h-4 w-4" />
              Reschedule
            </Button>
           )}
          <Button variant="outline" size="sm" onClick={handleStartNavigation} disabled={isNavigating}>
             {isNavigating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Navigation className="mr-2 h-4 w-4" />}
             {isNavigating ? 'Finding...' : 'Start'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

function NewTaskSheet({
  open,
  onOpenChange,
  onTaskSubmit,
  editingTask,
  userLocation,
  userName,
  categories,
  onFilterChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskSubmit: (
    task: Omit<FirestoreTask, 'userId' | 'completedAt'> & { id?: string }
  ) => void;
  editingTask: Task | null;
  userLocation: string | null;
  userName: string | null;
  categories: Category[];
  onFilterChange: (category: string, checked: boolean) => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [dueDate, setDueDate] = React.useState<Date | undefined>(new Date());
  const [priority, setPriority] = React.useState<Task['priority']>('medium');
  const [recurring, setRecurring] = React.useState<Task['recurring'] | 'none'>('none');
  
  const [hour, setHour] = React.useState('09');
  const [minute, setMinute] = React.useState('00');
  const [ampm, setAmpm] = React.useState('AM');
  
  const [location, setLocation] = React.useState(''); // this will hold lat,lng
  const [locationName, setLocationName] = React.useState(''); // this will hold readable name
  const [isLocationPickerOpen, setIsLocationPickerOpen] = React.useState(false);


  const [taskSuggestions, setTaskSuggestions] = React.useState<SuggestTasksOutput['suggestions']>([]);
  const [isSuggestingTasks, setIsSuggestingTasks] = React.useState(false);
  const [showTaskSuggestions, setShowTaskSuggestions] = React.useState(true);

  const [debouncedTitle] = useDebounce(title, 300);

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
        setLocationName(editingTask.storeName || '');
        setPriority(editingTask.priority || 'medium');
        setRecurring(editingTask.recurring || 'none');
      } else {
        setTitle('');
        setDescription('');
        const now = new Date();
        setDueDate(now);
        setHour(format(now, 'hh'));
        setMinute('00');
        setAmpm(format(now, 'aa').toUpperCase());
        setLocation('');
        setLocationName('');
        setPriority('medium');
        setRecurring('none');
      }
      setTaskSuggestions([]);
      setShowTaskSuggestions(true);
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
  
  const handleLocationSelect = (latLng: { lat: number; lng: number }) => {
    const latLonStr = `${latLng.lat},${latLng.lng}`;
    setLocation(latLonStr);
    setLocationName(`Custom location (${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)})`);
    setIsLocationPickerOpen(false);
  };
  
  const handlePlaceSelect = (place: { placeId?: string, description: string, lat?: number, lng?: number, name?: string}) => {
      if(place.lat && place.lng) {
          setLocation(`${place.lat},${place.lng}`);
      }
      setLocationName(place.name || place.description);
  }


  const handleSubmit = async () => {
    if (!title || !dueDate) {
      toast({
        title: 'Missing Information',
        description: 'Please fill out the title and due date.',
        variant: 'destructive',
        duration: 3000,
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

    let newStatus: Task['status'] = 'pending';
    if (isToday(combinedDueDate)) {
        newStatus = 'today';
    } else if (isTomorrow(combinedDueDate)) {
        newStatus = 'tomorrow';
    }

    let category = 'Uncategorized';
    if (editingTask?.category && title === editingTask.title) {
        category = editingTask.category;
    } else {
      try {
        const categoryResult = await suggestTaskCategory({
            taskTitle: title,
            pastCategories: categories.map(c => c.name)
        });
        category = categoryResult.suggestedCategory;
      } catch (error) {
          console.error("Failed to suggest category:", error);
          toast({ title: "AI Category Suggestion Failed", variant: "destructive", duration: 3000 });
      }
    }

    const taskData: Omit<FirestoreTask, 'userId' | 'completedAt'> & { id?: string } = {
        id: editingTask?.id,
        title,
        description,
        dueDate: Timestamp.fromDate(combinedDueDate),
        store: location,
        storeName: locationName,
        status: editingTask ? newStatus : newStatus,
        category: category,
        priority: priority,
        recurring: recurring === 'none' ? undefined : recurring,
    };
    
    // Auto-location assignment logic
    if (!taskData.store && taskData.title && userLocation) {
        try {
            const locationResult = await findTaskLocation({ taskTitle: taskData.title, userLocation });
            if (locationResult) {
                taskData.store = locationResult.latlon;
                taskData.storeName = locationResult.name;
            }
        } catch (err) {
            console.error('Auto-location fallback failed', err);
        }
    }
    
    if (taskData.recurring === undefined) {
      delete taskData.recurring;
    }

    onTaskSubmit(taskData);
    
    onFilterChange(category, true);

    onOpenChange(false);
  };

  const greeting = React.useMemo(() => {
    if(editingTask) return "Update the details of your task.";

    const firstName = userName?.split(' ')[0];
    if (firstName) {
        return `Hey, ${firstName}! What's on your mind today?`;
    }
    return 'Fill in the details below to add a new task to your list.';
  }, [editingTask, userName])

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <div className="flex justify-between items-center">
            <SheetTitle>
              {editingTask ? 'Edit Task' : 'Create a New Task'}
            </SheetTitle>
            <ThemeToggle />
          </div>
          <SheetDescription>
            {greeting}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto -mr-6 pr-6">
          <div className="grid gap-4 py-4">
            <div 
              className="grid gap-2 relative"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setShowTaskSuggestions(false);
                }
              }}
            >
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
                      onMouseDown={() => { // use onMouseDown to fire before onBlur
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
             <div className="grid gap-2 relative">
                <Label htmlFor="location">Location (Optional)</Label>
                 <div className="flex items-center gap-2">
                   <PlaceAutocomplete 
                      onSelect={handlePlaceSelect}
                      currentLocation={userLocation ? { lat: parseFloat(userLocation.split(',')[0]), lng: parseFloat(userLocation.split(',')[1]) } : null}
                      taskTitle={title}
                      placeholder="e.g., Downtown Mall"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => setIsLocationPickerOpen(true)}>
                      <MapPin className="h-4 w-4" />
                      <span className="sr-only">Find on map</span>
                  </Button>
                </div>
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
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="grid gap-2">
                     <Label>Priority</Label>
                      <Select value={priority} onValueChange={(v) => setPriority(v as Task['priority'])}>
                        <SelectTrigger>
                            <SelectValue placeholder="Set priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="grid gap-2">
                     <Label>Recurring</Label>
                      <Select value={recurring} onValueChange={(v) => setRecurring(v as Task['recurring'] | 'none')}>
                        <SelectTrigger>
                            <SelectValue placeholder="Set recurrence" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
            </div>
          </div>
        </div>
        <SheetFooter className="mt-auto">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} className={styles.futuristicButton}>
            {editingTask ? 'Save Changes' : 'Create Task'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
    {userLocation && (
        <LocationPicker
            isOpen={isLocationPickerOpen}
            onClose={() => setIsLocationPickerOpen(false)}
            onLocationSelect={handleLocationSelect}
            currentLocation={userLocation}
        />
    )}
    </>
  );
}


export default function TasksPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [userPreferences, setUserPreferences] = React.useState({ defaultReminder: '10' });
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterCategories, setFilterCategories] = React.useState<string[]>([]);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [userLocation, setUserLocation] = React.useState<string | null>(null);
  const [isNavigatingMultiple, setIsNavigatingMultiple] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('today');
  const notifiedTasksRef = React.useRef(new Set<string>());
  const visitedLocationsRef = React.useRef(new Set<string>());


  // Handle notification clicks
  React.useEffect(() => {
    const handleNotificationClick = async (event: any) => {
        event.preventDefault();
        event.notification.close();

        const task = tasks.find(t => t.id === event.notification.tag);
        if (!task || !task.store || !userLocation) return;
        
        if (event.action === 'yes') {
            await handleUpdateTask(task.id, { status: 'completed', completedAt: Timestamp.now() });
            toast({ title: 'Task Completed', description: `"${task.title}" marked as done.`, duration: 3000});
        } else if (event.action === 'no') {
            toast({ title: 'Re-routing...', description: `Finding a new location for "${task.title}".`, duration: 3000});
            
            const remainingTasks = tasks.filter(t => t.id !== task.id && t.status !== 'completed' && t.store);
            const remainingDestinations = remainingTasks.map(t => t.store!);

            const result = await findTaskLocation({
                taskTitle: task.title,
                userLocation: userLocation,
                locationsToExclude: [task.store]
            });

            if (result) {
                 await handleUpdateTask(task.id, { store: result.latlon, storeName: result.name });
                 toast({ title: 'New Location Found!', description: `Headed to ${result.name}.`, duration: 3000});
                 
                // Re-route to map
                const params = new URLSearchParams();
                params.set('origin', userLocation);
                params.set('destination', result.latlon);
                remainingDestinations.forEach(wp => params.append('waypoints', wp));
                router.push(`/map?${params.toString()}`);
            } else {
                toast({ title: 'No other locations found', variant: 'destructive', duration: 3000});
            }
        }
    };
    
    if (navigator.serviceWorker) {
        const sw = navigator.serviceWorker.controller;
        sw?.addEventListener('notificationclick', handleNotificationClick);
    }

    return () => {
       if (navigator.serviceWorker) {
            const sw = navigator.serviceWorker.controller;
            sw?.removeEventListener('notificationclick', handleNotificationClick);
        }
    };
  }, [tasks, userLocation, router, toast]); // Rerun when tasks or location change

  React.useEffect(() => {
    requestNotificationPermission().then(granted => {
        if (granted) {
            toast({ title: "Notifications enabled!", description: "You'll receive reminders for your tasks.", duration: 3000 });
        } else {
            toast({ title: "Notifications blocked", description: "You won't receive task reminders. You can enable them in your browser settings.", variant: "destructive", duration: 3000 });
        }
    });

    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation(`${latitude},${longitude}`);
        },
        (error) => {
          console.error("Error getting user location:", error.message);
           toast({
            title: "Could not get location",
            description: `Error: ${error.message}. Location features may be limited.`,
            variant: "destructive",
            duration: 5000,
           })
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    } else {
        toast({
            title: "Geolocation not supported",
            description: "Your browser does not support geolocation.",
            variant: "destructive",
            duration: 3000,
        });
    }
  }, [toast]);
  
  React.useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'categories'));
    const unsubscribeCats = onSnapshot(q, (snapshot) => {
        const userCategories = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        setCategories(userCategories);
        setFilterCategories(userCategories.map(c => c.name));
    });

    const prefsRef = doc(db, 'users', user.uid, 'preferences', 'settings');
    const unsubscribePrefs = onSnapshot(prefsRef, (doc) => {
        if (doc.exists()) {
            setUserPreferences(doc.data() as any);
        }
    });

    return () => {
        unsubscribeCats();
        unsubscribePrefs();
    }
  }, [user]);


  React.useEffect(() => {
    if (!user || !userLocation) {
      setTasks([]);
      return;
    };

    const q = query(collection(db, 'tasks'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasksData: Task[] = [];
      const batch = writeBatch(db);
      const today = startOfDay(new Date());
      let shouldUpdate = false;
      
      const reminderMinutes = parseInt(userPreferences.defaultReminder, 10);

      querySnapshot.forEach((taskDoc) => {
        const data = taskDoc.data() as FirestoreTask;
        const task = {
             id: taskDoc.id,
            ...data,
            dueDate: (data.dueDate as Timestamp)?.toDate().toISOString(),
            completedAt: (data.completedAt as Timestamp)?.toDate().toISOString(),
        } as Task;

        if (task.status !== 'completed') {
            const taskDueDate = parseISO(task.dueDate);
            const now = new Date();
            
            // 1. Time-based notification
            const timeUntilDue = taskDueDate.getTime() - now.getTime();
            const reminderTime = reminderMinutes * 60 * 1000;
            if (timeUntilDue > 0 && timeUntilDue < reminderTime && !notifiedTasksRef.current.has(task.id + '_time')) {
                showNotification(
                    `Reminder: ${task.title}`,
                    { 
                        body: `Due in ${reminderMinutes} minutes at ${format(taskDueDate, 'p')}.`, 
                        tag: task.id + '_time',
                        data: { taskId: task.id, type: 'time' },
                    },
                );
                notifiedTasksRef.current.add(task.id + '_time');
            }
            
            // 2. Location-based notification logic
            if (task.store && userLocation) {
                const [taskLat, taskLon] = task.store.split(',').map(Number);
                const [userLat, userLon] = userLocation.split(',').map(Number);
                const distance = getDistance(userLat, userLon, taskLat, taskLon);

                // Arrival Notification
                if (distance <= 100 && !notifiedTasksRef.current.has(task.id + '_arrival')) {
                     showNotification(
                        `Nearby Task: ${task.title}`,
                        { 
                            body: `You can do this at ${task.storeName || 'the destination'} just 100m away!`, 
                            tag: task.id, // Use task.id as tag for departure logic
                            data: { taskId: task.id, type: 'arrival' }
                        }
                     );
                     notifiedTasksRef.current.add(task.id + '_arrival');
                     visitedLocationsRef.current.add(task.id);
                }

                // Departure Notification
                if (distance > 100 && visitedLocationsRef.current.has(task.id) && !notifiedTasksRef.current.has(task.id + '_departure')) {
                    showNotification(
                        `Did you finish?`,
                        { 
                            body: `Did you complete "${task.title}" at ${task.storeName || 'the last location'}?`,
                            tag: task.id, // Use task.id to link to click handler
                            requireInteraction: true,
                            actions: [{ action: 'yes', title: 'Yes' }, { action: 'no', title: 'Not Yet' }]
                        }
                    );
                    notifiedTasksRef.current.add(task.id + '_departure');
                    visitedLocationsRef.current.delete(task.id); 
                }
            }

            let newStatus: Task['status'] = 'pending';
            if (taskDueDate < today) {
                newStatus = 'missed';
            } else if (isToday(taskDueDate)) {
                newStatus = 'today';
            } else if (isTomorrow(taskDueDate)) {
                newStatus = 'tomorrow';
            }

            if(newStatus !== task.status) {
                const taskRef = doc(db, 'tasks', taskDoc.id);
                batch.update(taskRef, { status: newStatus });
                shouldUpdate = true;
                task.status = newStatus;
            }
        }
        tasksData.push(task)
      });
      
      if(shouldUpdate) {
        batch.commit().catch(err => console.error("Error updating task statuses:", err));
      }

      setTasks(tasksData);
    });

    return () => unsubscribe();
  }, [user, userLocation, userPreferences.defaultReminder, toast]);

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
        if (id) {
            const taskRef = doc(db, 'tasks', id);
            await updateDoc(taskRef, data as any);
            toast({ title: "Task Updated", description: `"${data.title}" has been updated.`, duration: 3000 });
        } else { 
            await addDoc(collection(db, 'tasks'), {
                ...data,
                userId: user.uid,
            });
            toast({ title: "Task Created", description: `"${data.title}" has been added to your list.`, duration: 3000 });
        }
    } catch (error) {
        console.error("Error submitting task:", error);
        toast({ title: "Submission Error", description: "Could not save the task.", variant: "destructive", duration: 3000 });
    }
  };
  
  const handleUpdateTask = async (id: string, updatedTask: Partial<FirestoreTask>) => {
     try {
        const taskRef = doc(db, 'tasks', id);
        await updateDoc(taskRef, updatedTask as any);
     } catch (error) {
        console.error("Error updating task:", error);
        toast({ title: "Update Error", description: "Could not update the task.", variant: "destructive", duration: 3000 });
     }
  };
  
  const handleDeleteTask = async (id: string) => {
    try {
        const taskRef = doc(db, 'tasks', id);
        await deleteDoc(taskRef);
        toast({
            title: "Task Deleted",
            description: "The task has been permanently deleted.",
            duration: 3000,
        });
    } catch (error) {
        console.error("Error deleting task:", error);
        toast({ title: "Delete Error", description: "Could not delete the task.", variant: "destructive", duration: 3000 });
    }
  };

  const onFilterChange = (category: string, checked: boolean) => {
    setFilterCategories(prev =>
      checked ? [...new Set([...prev, category])] : prev.filter(c => c !== category)
    );
  };

  const filteredTasks = tasks
    .filter(task =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.store?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.storeName?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(task => filterCategories.includes(task.category));

  const pendingTasks = filteredTasks.filter((task) => task.status === 'pending' || task.status === 'missed');
  const todayTasks = filteredTasks.filter((task) => task.status === 'today');
  const tomorrowTasks = filteredTasks.filter((task) => task.status === 'tomorrow');

  const handleStartMultiStopNavigation = async () => {
    if (!userLocation) {
        toast({ title: "Location Error", description: "Could not determine your current location.", variant: "destructive", duration: 3000 });
        return;
    }

    setIsNavigatingMultiple(true);
    toast({ title: "Planning your route...", description: "Finding the best locations for your tasks.", duration: 3000 });
    
    let tasksToNavigate: Task[] = [];
    switch (activeTab) {
        case 'today':
            tasksToNavigate = todayTasks;
            break;
        case 'tomorrow':
            tasksToNavigate = tomorrowTasks;
            break;
        case 'pending':
            tasksToNavigate = pendingTasks;
            break;
    }

    try {
        const locationsToVisit: string[] = [];
        const unresolvedTasks: Task[] = [];

        // Sort by priority before resolving locations
        const sortedTasks = tasksToNavigate.sort((a,b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return (priorityOrder[a.priority || 'medium']) - (priorityOrder[b.priority || 'medium']);
        })

        for (const task of sortedTasks) {
            if (task.store) {
                locationsToVisit.push(task.store);
            } else {
                unresolvedTasks.push(task);
            }
        }
        
        for (const task of unresolvedTasks) {
            const locationResult = await findTaskLocation({ taskTitle: task.title, userLocation });
            if (locationResult) {
                const fullAddress = locationResult.latlon; // This is now lat,lon
                locationsToVisit.push(fullAddress);
                const taskRef = doc(db, 'tasks', task.id);
                await updateDoc(taskRef, { store: fullAddress, storeName: locationResult.name });
            } else {
                console.warn(`Could not find location for task: ${task.title}`);
            }
        }
        
        if (locationsToVisit.length > 0) {
            const params = new URLSearchParams();
            params.set('origin', userLocation);
            const destination = locationsToVisit.pop();
            if (destination) {
                params.set('destination', destination);
            }
            locationsToVisit.forEach(wp => params.append('waypoints', wp));
            router.push(`/map?${params.toString()}`);
        } else {
            toast({ title: "No locations found", description: "Could not find any locations for the current tasks.", variant: "destructive", duration: 3000 });
        }
    } catch (error) {
        console.error("Error during multi-stop navigation planning:", error);
        toast({ title: "Routing Error", description: "Failed to plan the multi-stop route.", variant: "destructive", duration: 3000 });
    } finally {
        setIsNavigatingMultiple(false);
    }
};

  const getActionableTaskCount = () => {
     switch (activeTab) {
        case 'today':
            return todayTasks.length;
        case 'tomorrow':
            return tomorrowTasks.length;
        case 'pending':
            return pendingTasks.length;
        default:
            return 0;
     }
  }

  const NoTasksMessage = ({ tabName }: { tabName: string }) => (
    <div className="text-center py-12">
        <p className="text-muted-foreground">No tasks for {tabName}.</p>
    </div>
  );

  return (
    <>
      <div className="grid flex-1 items-start gap-4 md:gap-8 relative">
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center">
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="tomorrow">Tomorrow</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
            </TabsList>
            <div className="ml-auto flex items-center gap-2">
              {getActionableTaskCount() >= 1 && (
                  <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handleStartMultiStopNavigation} disabled={isNavigatingMultiple}>
                    {isNavigatingMultiple ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      {isNavigatingMultiple ? 'Planning...' : 'Start'}
                    </span>
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
          <TabsContent value="pending">
             {pendingTasks.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
                  {pendingTasks.map((task) => (
                    <TaskItem key={task.id} task={task} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onEditTask={handleEditTask} userLocation={userLocation} />
                  ))}
                </div>
             ) : (
                <NoTasksMessage tabName="pending" />
             )}
          </TabsContent>
          <TabsContent value="today">
            {todayTasks.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
                {todayTasks.map((task) => (
                  <TaskItem key={task.id} task={task} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onEditTask={handleEditTask} userLocation={userLocation}/>
                ))}
              </div>
            ) : (
                <NoTasksMessage tabName="today" />
            )}
          </TabsContent>
          <TabsContent value="tomorrow">
            {tomorrowTasks.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
                {tomorrowTasks.map((task) => (
                    <TaskItem key={task.id} task={task} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onEditTask={handleEditTask} userLocation={userLocation}/>
                ))}
                </div>
            ) : (
                <NoTasksMessage tabName="tomorrow" />
            )}
          </TabsContent>
        </Tabs>

        <Button
          className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg"
          onClick={handleNewTaskClick}
        >
          <Plus className="h-8 w-8" />
          <span className="sr-only">New Task</span>
        </Button>

      </div>
      <NewTaskSheet 
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onTaskSubmit={handleTaskSubmit}
        editingTask={editingTask}
        userLocation={userLocation}
        userName={user?.displayName || null}
        categories={categories}
        onFilterChange={onFilterChange}
      />
    </>
  );
}
