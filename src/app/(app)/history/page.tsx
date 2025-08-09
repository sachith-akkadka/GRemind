
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp, writeBatch, getDocs } from 'firebase/firestore';
import type { Task } from '@/lib/types';
import { subDays, format, isToday, startOfDay, differenceInCalendarDays, parseISO, endOfDay } from 'date-fns';

import { Bar, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, PieChart as RechartsPieChart } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltipContent, ChartTooltip, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ChartConfig } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import { BrainCircuit } from 'lucide-react';

const barChartConfig = {
	completed: {
		label: "Tasks Completed",
		color: "hsl(var(--primary))",
	},
} satisfies ChartConfig

const pieChartConfig = {
  tasks: {
    label: "Tasks",
  },
} satisfies ChartConfig

export default function HistoryPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [insights, setInsights] = useState("No insights generated yet. Complete more tasks to see your trends!");

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            setTasks([]);
            return;
        }

        setIsLoading(true);
        const q = query(collection(db, 'tasks'), where('userId', '==', user.uid));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const tasksData: Task[] = querySnapshot.docs.map(doc => {
                 const data = doc.data();
                 return {
                    id: doc.id,
                    ...data,
                    dueDate: data.dueDate instanceof Timestamp ? data.dueDate.toDate().toISOString() : data.dueDate,
                    completedAt: data.completedAt instanceof Timestamp ? data.completedAt.toDate().toISOString() : data.completedAt,
                 } as Task
            });
            setTasks(tasksData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching tasks for dashboard:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Placeholder for AI insights generation
    useEffect(() => {
        if (tasks.length > 5) {
            // In a real scenario, you would call your AI flow here
            // const insight = await generateInsightsFlow({tasks});
            // setInsights(insight.summary);
            const completedCount = tasks.filter(t => t.status === 'completed').length;
            const mostCommonCategory = Object.entries(tasks.reduce((acc, task) => {
                acc[task.category] = (acc[task.category] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)).sort((a,b) => b[1] - a[1])[0]?.[0];

            if (mostCommonCategory) {
              setInsights(`You've completed ${completedCount} tasks! Your most frequent category is "${mostCommonCategory}". Keep up the great work.`);
            }
        }
    }, [tasks]);

    // Calculate stats
    const today = startOfDay(new Date());

    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(today, i)).reverse();

    const completionData = last7Days.map(day => {
        const completedOnDay = tasks.filter(task => 
            task.status === 'completed' && task.completedAt && startOfDay(parseISO(task.completedAt)).getTime() === day.getTime()
        ).length;
        return {
            day: format(day, 'E'),
            completed: completedOnDay,
        };
    });
    
    const categoryCounts = tasks.reduce((acc, task) => {
        if (task.status !== 'completed') {
            acc[task.category] = (acc[task.category] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const categoryData = Object.entries(categoryCounts).map(([name, value], index) => ({
        name,
        value,
        fill: `hsl(var(--chart-${(index % 5) + 1}))`,
    }));
    
    const tasksDueToday = tasks.filter(task => task.dueDate && isToday(parseISO(task.dueDate)));
    const completedToday = tasksDueToday.filter(task => task.status === 'completed').length;
    const totalToday = tasksDueToday.length;
    const completionPercentage = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;
    
    const calculateStreak = () => {
        if (tasks.length === 0) return 0;

        const completedDates = tasks
            .filter(t => t.status === 'completed' && t.completedAt)
            .map(t => startOfDay(parseISO(t.completedAt!)))
            .sort((a, b) => b.getTime() - a.getTime());
        
        if (completedDates.length === 0) return 0;
        
        const uniqueDates = [...new Set(completedDates.map(d => d.getTime()))].map(t => new Date(t));

        let streak = 0;
        let currentDate = endOfDay(new Date());
        
        if(differenceInCalendarDays(currentDate, uniqueDates[0]) > 1) {
            return 0;
        }
        
        if(differenceInCalendarDays(currentDate, uniqueDates[0]) <= 1){
            streak = 1;
            let lastDate = uniqueDates[0];
            for (let i = 1; i < uniqueDates.length; i++) {
                if (differenceInCalendarDays(lastDate, uniqueDates[i]) === 1) {
                    streak++;
                    lastDate = uniqueDates[i];
                } else if(differenceInCalendarDays(lastDate, uniqueDates[i]) > 1) {
                    break; 
                }
            }
        }
        
        return streak;
    };
    const productivityStreak = calculateStreak();

    const completedTasks = tasks.filter(t => t.status === 'completed').sort((a,b) => parseISO(b.completedAt!).getTime() - parseISO(a.completedAt!).getTime());

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
          duration: 3000,
        });
      } catch (error) {
        toast({
          title: 'Error Clearing History',
          description: 'Could not clear task history.',
          variant: 'destructive',
          duration: 3000,
        });
      }
    };

  if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
            <p>Loading analytics...</p>
        </div>
      )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>This Week's Completion Trend</CardTitle>
            <CardDescription>Tasks completed over the last 7 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barChartConfig} className="h-64">
              {completionData.length > 0 && completionData.some(d => d.completed > 0) ? (
              <BarChart accessibilityLayer data={completionData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="completed" fill="var(--color-completed)" radius={4} />
              </BarChart>
              ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      No task data for this week yet.
                  </div>
              )}
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Task Breakdown</CardTitle>
            <CardDescription>How your pending tasks are distributed.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
              <ChartContainer config={pieChartConfig} className="h-64">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                        <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={50}>
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                    </RechartsPieChart>
                </ResponsiveContainer>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      No active tasks to display.
                  </div>
                )}
              </ChartContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Today's Progress</CardTitle>
            <CardDescription>
              You've completed {completedToday} out of {totalToday} tasks today.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Progress value={completionPercentage} aria-label={`${completionPercentage}% of tasks completed`} />
              <p className="text-sm text-muted-foreground text-right font-medium">
                {Math.round(completionPercentage)}%
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Productivity Streak</CardTitle>
            <CardDescription>Keep it going!</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-2">
              <span className="text-6xl font-bold text-primary">{productivityStreak}</span>
              <span className="text-xl text-muted-foreground">days</span>
            </div>
          </CardContent>
        </Card>

         <Card className="xl:col-span-1">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BrainCircuit className="w-6 h-6 text-primary" />
                    Weekly Insights
                </CardTitle>
                <CardDescription>An AI-powered summary of your week.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground italic">
                   {insights}
                </p>
            </CardContent>
        </Card>
      </div>
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
    </div>
  );
}
