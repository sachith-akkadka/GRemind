'use client';

import { BarChart, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltipContent, ChartTooltip, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';

const completionData: any[] = [
  // Example structure, will be empty
  // { day: 'Mon', completed: 0 },
];

const barChartConfig = {
	completed: {
		label: "Tasks Completed",
		color: "hsl(var(--primary))",
	},
} satisfies ChartConfig

const categoryData: any[] = [
    // Example structure, will be empty
    // { name: 'Work', value: 0, fill: 'hsl(var(--chart-1))' },
];
const pieChartConfig = {
  tasks: {
    label: "Tasks",
  },
} satisfies ChartConfig

export default function DashboardPage() {
  const completedToday = 0;
  const totalToday = 0;
  const completionPercentage = 0;

  return (
    <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>This Week's Completion Trend</CardTitle>
          <CardDescription>Tasks completed over the last 7 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={barChartConfig} className="h-64">
            {completionData.length > 0 ? (
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
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>How your tasks are distributed.</CardDescription>
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
                    No categories to display.
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
            <span className="text-6xl font-bold text-primary">0</span>
            <span className="text-xl text-muted-foreground">days</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
