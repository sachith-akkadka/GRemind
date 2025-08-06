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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { signOut, updateProfile } from 'firebase/auth';
import { auth, db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { User } from 'lucide-react';

export default function SettingsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [displayName, setDisplayName] = useState(user?.displayName || '');


    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        const names = name.split(' ');
        if (names.length > 1) {
            return names[0][0] + names[names.length - 1][0];
        }
        return name.substring(0, 2);
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

    const handleAvatarClick = () => {
      fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0 || !user) {
            return;
        }

        const file = event.target.files[0];
        setIsUploading(true);
        toast({ title: "Uploading photo..." });

        try {
            const storageRef = ref(storage, `avatars/${user.uid}/${file.name}`);
            await uploadBytes(storageRef, file);
            const photoURL = await getDownloadURL(storageRef);

            await updateProfile(user, { photoURL });
            
            // This will trigger a re-render in components that use useAuth
            // Since the user object is part of the auth state, this should propagate.
            // We might need a manual way to refresh the user object if not.
            toast({ title: "Profile photo updated successfully!" });
        } catch (error) {
            console.error("Error uploading photo:", error);
            toast({ title: "Upload Failed", description: "Could not upload your photo. Please try again.", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleSaveChanges = async () => {
        if (!user || displayName === user.displayName) return;
        
        try {
            await updateProfile(user, { displayName });
            toast({ title: "Profile updated successfully!" });
        } catch(error) {
            toast({ title: "Update Failed", description: "Could not update your profile.", variant: "destructive" });
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
                <AvatarImage src={user?.photoURL || ''} />
                <AvatarFallback>
                    <User className="h-8 w-8 text-muted-foreground" />
                </AvatarFallback>
            </Avatar>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange}
                className="hidden" 
                accept="image/*"
            />
            <Button variant="outline" onClick={handleAvatarClick} disabled={isUploading}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isUploading ? 'Uploading...' : 'Change Photo'}
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue={user?.email || ''} readOnly className="focus-visible:ring-0 focus-visible:ring-offset-0" />
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
