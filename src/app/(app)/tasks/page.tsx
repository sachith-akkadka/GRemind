
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
import { suggestLocations, SuggestLocationsOutput } from '@/ai/flows/suggest-locations';
import { findTaskLocation } from '@/ai/flows/find-task-location';
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
import { requestNotificationPermission, scheduleNotification, showNotification } from '@/lib/notifications';

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
  const { toast } = useToast();
  const [isNavigating, setIsNavigating] = React.useState(false);
  const router = useRouter();


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

    if (!userLocation) {
        toast({ title: "Location Error", description: "Could not determine your current location.", variant: "destructive" });
        setIsNavigating(false);
        return;
    }

    if (!destination) {
        toast({ title: "Finding location...", description: `Searching for a place to complete "${task.title}"...` });
        try {
            const locationResult = await findTaskLocation({ taskTitle: task.title, userLocation });
            if (locationResult) {
                // The address from the tool is now a lat,lon string
                destination = `${locationResult.address}`; 
                onUpdateTask(task.id, { store: destination, storeName: locationResult.name });
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
    
    const params = new URLSearchParams();
    params.set('origin', userLocation);
    params.set('destination', destination);
    router.push(`/map?${params.toString()}`);

    setIsNavigating(false);
  };
  
  const displayLocation = task.storeName || task.store;

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
        <CardFooter className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleStartNavigation} disabled={isNavigating}>
             {isNavigating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Navigation className="mr-2 h-4 w-4" />}
             {isNavigating ? 'Finding...' : 'Start Navigation'}
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
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [dueDate, setDueDate] = React.useState<Date | undefined>(new Date());
  
  const [hour, setHour] = React.useState('09');
  const [minute, setMinute] = React.useState('00');
  const [ampm, setAmpm] = React.useState('AM');
  const [category, setCategory] = React.useState('Personal');

  const [location, setLocation] = React.useState('');
  const [locationName, setLocationName] = React.useState('');
  const [locationSuggestions, setLocationSuggestions] = React.useState<SuggestLocationsOutput['suggestions']>([]);
  const [isSuggestingLocations, setIsSuggestingLocations] = React.useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = React.useState(true);

  const [taskSuggestions, setTaskSuggestions] = React.useState<SuggestTasksOutput['suggestions']>([]);
  const [isSuggestingTasks, setIsSuggestingTasks] = React.useState(false);
  const [showTaskSuggestions, setShowTaskSuggestions] = React.useState(true);

  const [debouncedTitle] = useDebounce(title, 300);
  const [debouncedLocation] = useDebounce(locationName, 300);


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
        setCategory(editingTask.category);
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
        setCategory('Personal');
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

  const handleMapIconClick = () => {
    if (userLocation) {
      router.push('/map');
    } else {
      toast({
        title: "Location Needed",
        description: "Please enable location services to use this feature.",
        variant: "destructive"
      });
    }
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

    let newStatus: Task['status'] = 'pending';
    if (isToday(combinedDueDate)) {
        newStatus = 'today';
    } else if (isTomorrow(combinedDueDate)) {
        newStatus = 'tomorrow';
    }

    onTaskSubmit({
      id: editingTask?.id,
      title,
      description,
      dueDate: Timestamp.fromDate(combinedDueDate),
      store: location,
      storeName: locationName,
      status: editingTask
        ? newStatus
        : newStatus,
      category: category,
    });

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
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
           <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category">
                        <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
           <div className="grid gap-2 relative">
            <Label htmlFor="location">Location (Optional)</Label>
            <div className="flex items-center gap-2">
              <div className="relative w-full">
                <Input
                  id="location"
                  placeholder="e.g., Downtown Mall"
                  value={locationName}
                  onChange={(e) => {
                    setLocationName(e.target.value);
                    if (!showLocationSuggestions) setShowLocationSuggestions(true);
                  }}
                  onFocus={handleLocationFocus}
                  autoComplete="off"
                />
                {isSuggestingLocations && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
              </div>
               <Button type="button" variant="outline" size="icon" onClick={handleMapIconClick}>
                  <MapPin className="h-4 w-4" />
                  <span className="sr-only">Find on map</span>
                </Button>
            </div>
              {locationSuggestions.length > 0 && showLocationSuggestions && (
                <div className="absolute z-10 w-full bg-card border rounded-md shadow-lg mt-1 top-full max-h-48 overflow-y-auto">
                  {locationSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-3 hover:bg-muted cursor-pointer border-b"
                      onClick={() => {
                        setLocation(suggestion.address); // The lat,lon string
                        setLocationName(suggestion.name); // The readable name
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
  const notifiedTasksRef = React.useRef(new Set());
  const visitedLocationsRef = React.useRef(new Set());


  React.useEffect(() => {
    // Request notification permission on component mount
    requestNotificationPermission().then(granted => {
        if (granted) {
            toast({ title: "Notifications enabled!", description: "You'll receive reminders for your tasks." });
        } else {
            toast({ title: "Notifications blocked", description: "You won't receive task reminders. You can enable them in your browser settings.", variant: "destructive" });
        }
    });

    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation(`${latitude},${longitude}`);
        },
        (error) => {
          console.error("Error getting user location:", error);
           toast({
            title: "Could not get location",
            description: "Using a default location. Location suggestions may not be accurate.",
            variant: "destructive"
           })
           setUserLocation("12.9716,77.5946"); // Default to Bangalore as a fallback
        },
        { enableHighAccuracy: true }
      );
    } else {
        setUserLocation("12.9716,77.5946");
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
    if (!user) {
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
      const notificationDelay = reminderMinutes * 60 * 1000;

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
            const timeUntilDue = taskDueDate.getTime() - new Date().getTime();

            // 1. Time-based notification
            if (timeUntilDue > 0 && timeUntilDue < notificationDelay && !notifiedTasksRef.current.has(task.id + '_time')) {
                scheduleNotification(
                    `Reminder: ${task.title}`,
                    { body: `Due in ${reminderMinutes} minutes at ${format(taskDueDate, 'p')}.`, tag: task.id + '_time' },
                    timeUntilDue
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
                        { body: `You can do this at ${task.storeName || 'the destination'} just 100m away!`, tag: task.id + '_arrival' }
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
                            tag: task.id + '_departure',
                            requireInteraction: true,
                            actions: [{ action: 'yes', title: 'Yes' }, { action: 'no', title: 'Not Yet' }]
                        }
                    );
                    // This is for demonstration. Real actions require a service worker.
                    // For now, we'll assume 'Yes' if the notification is clicked.
                    // A more robust solution would listen for notification clicks.
                    const taskRef = doc(db, 'tasks', task.id);
                    updateDoc(taskRef, { status: 'completed', completedAt: Timestamp.now() });

                    notifiedTasksRef.current.add(task.id + '_departure');
                    visitedLocationsRef.current.delete(task.id); // Reset for next time
                }
            }

            let newStatus: Task['status'] = 'pending';
            if (isToday(taskDueDate)) {
                newStatus = 'today';
            } else if (isTomorrow(taskDueDate)) {
                newStatus = 'tomorrow';
            } else if (taskDueDate < today) {
                newStatus = 'missed';
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
  }, [user, userLocation, userPreferences.defaultReminder]);

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
            toast({ title: "Task Updated", description: `"${data.title}" has been updated.` });
        } else { 
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
        await updateDoc(taskRef, updatedTask as any);
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
        toast({ title: "Location Error", description: "Could not determine your current location.", variant: "destructive" });
        return;
    }

    setIsNavigatingMultiple(true);
    toast({ title: "Planning your route...", description: "Finding the best locations for your tasks." });
    
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

        for (const task of tasksToNavigate) {
            if (task.store) {
                locationsToVisit.push(task.store);
            } else {
                unresolvedTasks.push(task);
            }
        }
        
        for (const task of unresolvedTasks) {
            const locationResult = await findTaskLocation({ taskTitle: task.title, userLocation });
            if (locationResult) {
                const fullAddress = locationResult.address; // This is now lat,lon
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
            toast({ title: "No locations found", description: "Could not find any locations for the current tasks.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Error during multi-stop navigation planning:", error);
        toast({ title: "Routing Error", description: "Failed to plan the multi-stop route.", variant: "destructive" });
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
      />
    </>
  );
}

    