
'use client';

import { useState } from 'react';
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
import { tasks as initialTasks } from '@/lib/data';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import type { Task } from '@/lib/types';

export default function HistoryPage() {
  const [completedTasks, setCompletedTasks] = useState<Task[]>(
    initialTasks.filter((task) => task.status === 'completed')
  );

  const handleClearHistory = () => {
    setCompletedTasks([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Task History</CardTitle>
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
            {completedTasks.length > 0 ? (
              completedTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <div className="font-medium">{task.title}</div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline">{task.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {task.completedAt ? format(new Date(task.completedAt), 'PPP') : 'N/A'}
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
        <Button variant="destructive" onClick={handleClearHistory} disabled={completedTasks.length === 0}>
          Clear History
        </Button>
      </CardFooter>
    </Card>
  );
}
