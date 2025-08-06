'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  writeBatch,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import type { Task } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCompletedTasks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid),
      where('status', '==', 'completed')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const tasksData: Task[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          tasksData.push({
            id: doc.id,
            ...data,
            // Safely convert Timestamps to ISO strings
            dueDate: data.dueDate instanceof Timestamp ? data.dueDate.toDate().toISOString() : data.dueDate,
            completedAt: data.completedAt instanceof Timestamp ? data.completedAt.toDate().toISOString() : data.completedAt,
          } as Task);
        });
        setCompletedTasks(tasksData.sort((a,b) => parseISO(b.completedAt!).getTime() - parseISO(a.completedAt!).getTime()));
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching task history:', error);
        toast({
          title: 'Error',
          description: 'Could not fetch task history.',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, toast]);

  const handleClearHistory = async () => {
    if (!user || completedTasks.length === 0) return;

    try {
      const batch = writeBatch(db);
      const q = query(
        collection(db, 'tasks'),
        where('userId', '==', user.uid),
        where('status', '==', 'completed')
      );
      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      toast({
        title: 'History Cleared',
        description: 'All completed tasks have been deleted.',
      });
    } catch (error) {
       toast({
        title: 'Error Clearing History',
        description: 'Could not clear task history.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Completed Tasks</CardTitle>
        <CardDescription>A log of all your completed tasks.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead className="hidden sm:table-cell">Category</TableHead>
              <TableHead className="text-right">Completed On</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow>
                <TableCell colSpan={3} className="text-center">
                  Loading history...
                </TableCell>
              </TableRow>
            ) : completedTasks.length > 0 ? (
              completedTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <div className="font-medium">{task.title}</div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline">{task.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {task.completedAt
                      ? format(parseISO(task.completedAt), 'PPP')
                      : 'N/A'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  No completed tasks yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <Button
          variant="destructive"
          onClick={handleClearHistory}
          disabled={completedTasks.length === 0 || isLoading}
        >
          Clear History
        </Button>
      </CardFooter>
    </Card>
  );
}
