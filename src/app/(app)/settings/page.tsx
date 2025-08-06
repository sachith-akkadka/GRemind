'use client';
import { useRef, useState } from 'react';
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
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { signOut, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { User } from 'lucide-react';

export default function SettingsPage() {
    const { user, setUser } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [displayName, setDisplayName] = useState(user?.displayName || '');


    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        const names = name.split(' ');
        if (names.length > 1 && names[1]) {
            return names[0][0] + names[names.length - 1][0];
        }
        return name.substring(0, 2).toUpperCase();
    }
    
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
        if (!currentUser || displayName === currentUser.displayName) return;

        if (displayName.trim().split(' ').length < 2) {
            toast({
                title: "Full Name Required",
                description: "Please enter both your first and last name.",
                variant: "destructive",
            });
            return;
        }
        
        try {
            await updateProfile(currentUser, { displayName });
            // Manually update the user object in the auth context
            if (setUser) {
              // Create a new object to ensure re-render
              setUser({ ...currentUser, displayName });
            }
            toast({ title: "Profile updated successfully!" });
        } catch(error: any) {
            let description = "Could not update your profile.";
            if (error.code === 'auth/requires-recent-login') {
                description = "This action requires a recent sign-in. Please log out and log back in to update your profile.";
            } else {
                description = error.message;
            }
            toast({ 
                title: "Update Failed", 
                description: description,
                variant: "destructive" 
            });
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
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue={user?.email || ''} readOnly className="focus-visible:ring-0 focus-visible:ring-offset-0 bg-muted border-muted" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button onClick={handleSaveChanges}>Save Changes</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the app.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="theme">Theme</Label>
              <p className="text-sm text-muted-foreground">Select your preferred color scheme.</p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Data Management</CardTitle>
          <CardDescription>Manage your application data.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="flex items-center justify-between">
            <div>
              <Label>Clear Completed Tasks</Label>
              <p className="text-sm text-muted-foreground">Permanently delete all completed tasks.</p>
            </div>
            <Button variant="destructive" onClick={handleClearHistory}>Clear Data</Button>
          </div>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle className="font-headline">Account</CardTitle>
          <CardDescription>Log out of your account.</CardDescription>
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
    </div>
  );
}
