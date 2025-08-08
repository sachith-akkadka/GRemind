
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { signOut, updateProfile, deleteUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { writeBatch, collection, query, where, getDocs, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CategoryManager } from '@/components/category-manager';
import type { Category } from '@/lib/types';


export default function SettingsPage() {
    const { user, setUser } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [bio, setBio] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingPrefs, setIsSavingPrefs] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    
    // New states for settings
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [defaultReminder, setDefaultReminder] = useState('10'); // Default to 10 minutes
    const [aiReschedule, setAiReschedule] = useState(true);
    const [weeklyReport, setWeeklyReport] = useState(false);
    const [taskSort, setTaskSort] = useState('dueDate');
    
    useEffect(() => {
        if (!user) return;
        
        // Fetch user categories
        const catQuery = query(collection(db, 'users', user.uid, 'categories'));
        const unsubscribeCategories = onSnapshot(catQuery, (snapshot) => {
            if (snapshot.empty) {
                const defaultCategories = [
                  { id: 'cat1', name: 'Groceries' },
                  { id: 'cat2', name: 'Work' },
                  { id: 'cat3', name: 'Personal' },
                  { id: 'cat4', name: 'Health' },
                  { id: 'cat5', name: 'Home' },
                ];
                const batch = writeBatch(db);
                defaultCategories.forEach(cat => {
                    const docRef = doc(db, 'users', user.uid, 'categories', cat.id);
                    batch.set(docRef, { name: cat.name });
                });
                batch.commit();
            } else {
                setCategories(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
            }
        });

        // Fetch user preferences
        const userPrefsRef = doc(db, 'users', user.uid, 'preferences', 'settings');
        const unsubscribePrefs = onSnapshot(userPrefsRef, (docSnap) => {
            if (docSnap.exists()) {
                const prefs = docSnap.data();
                setDefaultReminder(prefs.defaultReminder || '10');
                setTaskSort(prefs.taskSort || 'dueDate');
                setEmailNotifications(prefs.emailNotifications !== false);
                setAiReschedule(prefs.aiReschedule !== false);
                setWeeklyReport(prefs.weeklyReport === true);
            }
        });

        return () => {
            unsubscribeCategories();
            unsubscribePrefs();
        };
    }, [user]);


    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        const names = name.split(' ');
        if (names.length > 1 && names[1]) {
            return (names[0][0] + names[names.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

     const handleSavePreferences = async () => {
        if (!user) return;
        setIsSavingPrefs(true);
        try {
            const prefsRef = doc(db, 'users', user.uid, 'preferences', 'settings');
            await setDoc(prefsRef, {
                defaultReminder,
                taskSort,
                emailNotifications,
                aiReschedule,
                weeklyReport
            }, { merge: true });
            toast({ title: "Preferences Saved", description: "Your settings have been updated." });
        } catch (error) {
            toast({ title: "Error Saving Preferences", variant: "destructive" });
        } finally {
            setIsSavingPrefs(false);
        }
    };
    
    const handleClearHistory = async () => {
        if (!user) return;
        try {
            const batch = writeBatch(db);
            const q = query(collection(db, 'tasks'), where('userId', '==', user.uid), where('status', '==', 'completed'));
            const snapshot = await getDocs(q);
            if(snapshot.empty) {
                toast({ title: "No completed tasks to clear."});
                return;
            }
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            toast({ title: "History Cleared", description: "All completed tasks have been deleted." });
        } catch (error) {
            toast({ title: "Error Clearing History", description: "Could not clear task history.", variant: "destructive" });
        }
    };
    
    const handleExportData = async () => {
        if (!user) return;
        try {
            const q = query(collection(db, 'tasks'), where('userId', '==', user.uid));
            const snapshot = await getDocs(q);
            const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            if(tasks.length === 0) {
                toast({ title: "No Data to Export", description: "You don't have any tasks to export." });
                return;
            }

            const dataStr = JSON.stringify({ tasks }, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = `g-remind-export-${new Date().toISOString().slice(0,10)}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            toast({ title: "Export Successful", description: "Your data has been exported." });

        } catch (error) {
            toast({ title: "Error Exporting Data", description: "Could not export your tasks.", variant: "destructive" });
        }
    };
    
    const handleDeleteAccount = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        
        try {
            const batch = writeBatch(db);
            
            const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', currentUser.uid));
            const tasksSnapshot = await getDocs(tasksQuery);
            tasksSnapshot.forEach((doc) => batch.delete(doc.ref));

            const categoriesQuery = query(collection(db, 'users', currentUser.uid, 'categories'));
            const categoriesSnapshot = await getDocs(categoriesQuery);
            categoriesSnapshot.forEach((doc) => batch.delete(doc.ref));

            const prefsRef = doc(db, 'users', currentUser.uid, 'preferences', 'settings');
            batch.delete(prefsRef);
            
            await batch.commit();
            
            await deleteUser(currentUser);
            
            toast({ title: "Account Deleted", description: "Your account and all associated data have been permanently deleted." });
            router.push('/login');
        } catch (error: any) {
            let description = "Could not delete your account.";
            if (error.code === 'auth/requires-recent-login') {
                description = "This action is sensitive and requires a recent sign-in. Please log out and log back in to delete your account.";
            }
            toast({ title: "Deletion Failed", description: description, variant: "destructive" });
        }
    };


    const handleLogout = async () => {
      try {
        await signOut(auth);
        toast({ title: "Logged out successfully." });
        router.push('/login');
      } catch (error) {
        toast({
          title: "Logout Failed",
          description: "An error occurred while logging out.",
          variant: "destructive",
        });
      }
    };
    
    const handleSaveChanges = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        
        if (displayName.trim().split(' ').length < 2) {
            toast({
                title: "Full Name Required",
                description: "Please enter both your first and last name.",
                variant: "destructive",
            });
            return;
        }

        if (displayName === currentUser.displayName) return;

        setIsSaving(true);
        try {
            await updateProfile(currentUser, { displayName });
            
            if (setUser) {
              const updatedUser = { ...currentUser, displayName, photoURL: currentUser.photoURL };
              setUser(updatedUser);
            }

            toast({ title: "Profile updated successfully!" });
        } catch(error: any) {
            let description = "Could not update your profile.";
            if (error.code === 'auth/requires-recent-login') {
                description = "This action requires a recent sign-in. Please log out and log back in to update your profile.";
            } else {
                console.error(error);
                description = `An unexpected error occurred: ${error.message}`;
            }
            toast({ 
                title: "Update Failed", 
                description: description,
                variant: "destructive" 
            });
        } finally {
            setIsSaving(false);
        }
    };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Profile</CardTitle>
          <CardDescription>Manage your personal information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
             <Avatar className="h-16 w-16">
                <AvatarFallback>
                    <span className="text-2xl font-bold">{getInitials(user?.displayName)}</span>
                </AvatarFallback>
            </Avatar>
             <div className="space-y-2 w-full">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" placeholder="Tell us a little about yourself." value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={user?.email || ''} readOnly className="focus-visible:ring-0 focus-visible:ring-offset-0 bg-muted border-muted" />
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle className="font-headline">Preferences</CardTitle>
          <CardDescription>Customize your application experience.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="flex items-center justify-between">
            <div>
              <Label>Theme</Label>
              <p className="text-sm text-muted-foreground">Select your preferred color scheme.</p>
            </div>
            <ThemeToggle />
          </div>
           <div className="flex items-center justify-between">
            <div>
              <Label>Task Sorting</Label>
              <p className="text-sm text-muted-foreground">Set the default sort order for your tasks.</p>
            </div>
             <Select value={taskSort} onValueChange={setTaskSort}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select order" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="dueDate">Due Date</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                </SelectContent>
            </Select>
          </div>
        </CardContent>
         <CardFooter className="border-t px-6 py-4">
            <Button onClick={handleSavePreferences} disabled={isSavingPrefs}>
                {isSavingPrefs ? 'Saving...' : 'Save Preferences'}
            </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Notifications</CardTitle>
          <CardDescription>Manage how you receive notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive emails for overdue tasks.</p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
           <div className="flex items-center justify-between">
            <div>
              <Label>Default Reminder</Label>
              <p className="text-sm text-muted-foreground">Set a default reminder time before a task is due.</p>
            </div>
             <Select value={defaultReminder} onValueChange={setDefaultReminder}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="5">5 minutes before</SelectItem>
                    <SelectItem value="10">10 minutes before</SelectItem>
                    <SelectItem value="15">15 minutes before</SelectItem>
                    <SelectItem value="30">30 minutes before</SelectItem>
                    <SelectItem value="60">1 hour before</SelectItem>
                </SelectContent>
            </Select>
          </div>
           <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="weekly-report">Weekly Summary Report</Label>
              <p className="text-sm text-muted-foreground">Get a weekly email with your task summary.</p>
            </div>
            <Switch
              id="weekly-report"
              checked={weeklyReport}
              onCheckedChange={setWeeklyReport}
            />
          </div>
        </CardContent>
         <CardFooter className="border-t px-6 py-4">
            <Button onClick={handleSavePreferences} disabled={isSavingPrefs}>
                {isSavingPrefs ? 'Saving...' : 'Save Preferences'}
            </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">AI Features</CardTitle>
          <CardDescription>Manage intelligent application features.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="ai-reschedule">AI Suggestions for Missed Tasks</Label>
              <p className="text-sm text-muted-foreground">Automatically get reschedule suggestions.</p>
            </div>
            <Switch
              id="ai-reschedule"
              checked={aiReschedule}
              onCheckedChange={setAiReschedule}
            />
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
            <Button onClick={handleSavePreferences} disabled={isSavingPrefs}>
                {isSavingPrefs ? 'Saving...' : 'Save Preferences'}
            </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Category Management</CardTitle>
          <CardDescription>Add, edit, or delete your custom task categories.</CardDescription>
        </CardHeader>
        <CardContent>
           <CategoryManager categories={categories} setCategories={setCategories} userId={user?.uid} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Data Management</CardTitle>
          <CardDescription>Manage your application data.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
           <div className="flex items-center justify-between">
            <div>
              <Label>Clear Completed Tasks</Label>
              <p className="text-sm text-muted-foreground">Permanently delete all completed tasks.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearHistory}>Clear</Button>
          </div>
           <div className="flex items-center justify-between">
            <div>
              <Label>Export Your Data</Label>
              <p className="text-sm text-muted-foreground">Download all your tasks as JSON.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportData}>Export</Button>
          </div>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle className="font-headline">Account</CardTitle>
          <CardDescription>Manage your account settings.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="flex items-center justify-between">
            <div>
              <Label>Log Out</Label>
              <p className="text-sm text-muted-foreground">You will be returned to the login screen.</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
                Log Out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive">
         <CardHeader>
          <CardTitle className="font-headline text-destructive">Danger Zone</CardTitle>
          <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    account and remove all your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90">
                    Yes, delete my account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

    
