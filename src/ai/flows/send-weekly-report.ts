
'use server';
/**
 * @fileOverview This flow is designed to be run on a schedule (e.g., weekly cron job).
 * It finds users who have opted into the weekly report and sends them an email
 * with a summary of their task activity from the past week.
 *
 * This flow is a placeholder and requires a backend scheduler and an email service to be fully functional.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, collectionGroup, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';


const WeeklyReportInputSchema = z.object({
    userId: z.string(),
    userEmail: z.string(),
    tasksCompleted: z.number(),
    mostProductiveDay: z.string(),
    topCategory: z.string(),
});

const WeeklyReportOutputSchema = z.object({
  emailSubject: z.string(),
  emailBody: z.string(),
});


// This is the main function that would be called by a scheduler.
export const sendWeeklyReportFlow = ai.defineFlow(
  {
    name: 'sendWeeklyReportFlow',
    inputSchema: z.void(),
    outputSchema: z.void(),
  },
  async () => {
    console.log("Starting weekly report generation...");

    // 1. Find all users who have weekly reports enabled.
    const prefsQuery = query(
      collectionGroup(db, 'preferences'),
      where('weeklyReport', '==', true)
    );
    const prefsSnapshot = await getDocs(prefsQuery);

    const oneWeekAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const prefDoc of prefsSnapshot.docs) {
        const userId = prefDoc.ref.parent.parent!.id;
        const userEmail = `user-${userId}@example.com`; // Placeholder

        // 2. Get all tasks for the user from the last week.
        const tasksQuery = query(
            collection(db, 'tasks'),
            where('userId', '==', userId),
            where('completedAt', '>=', oneWeekAgo)
        );
        const tasksSnapshot = await getDocs(tasksQuery);

        if (tasksSnapshot.empty) {
            continue; // Skip users with no activity.
        }

        const tasks = tasksSnapshot.docs.map(doc => doc.data());
        const tasksCompleted = tasks.length;
        
        // 3. Calculate stats.
        const dayCounts = tasks.reduce((acc, task) => {
            const day = task.completedAt.toDate().toLocaleString('en-us', { weekday: 'long' });
            acc[day] = (acc[day] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const mostProductiveDay = Object.keys(dayCounts).reduce((a, b) => dayCounts[a] > dayCounts[b] ? a : b, 'N/A');

        const categoryCounts = tasks.reduce((acc, task) => {
            acc[task.category] = (acc[task.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const topCategory = Object.keys(categoryCounts).reduce((a, b) => categoryCounts[a] > categoryCounts[b] ? a : b, 'N/A');
        
        // 4. Generate the email content.
        const { output } = await weeklyReportPrompt({
            userId,
            userEmail,
            tasksCompleted,
            mostProductiveDay,
            topCategory
        });

        if (output) {
            // 5. Send the email (placeholder).
            console.log(`--- Sending Weekly Report to ${userEmail} ---`);
            console.log(`Subject: ${output.emailSubject}`);
            console.log(`Body: ${output.emailBody}`);
            console.log(`-----------------------------------------------`);
            // In a real implementation, you would integrate an email service here.
        }
    }
  }
);


const weeklyReportPrompt = ai.definePrompt({
    name: 'weeklyReportPrompt',
    input: { schema: WeeklyReportInputSchema },
    output: { schema: WeeklyReportOutputSchema },
    prompt: `You are a positive and motivating assistant for the G-Remind app.
    
    A user is getting their weekly productivity report. Your goal is to generate an encouraging summary email.

    User ID: {{{userId}}}
    User Email: {{{userEmail}}}

    Here are their stats for the past week:
    - Tasks Completed: {{{tasksCompleted}}}
    - Most Productive Day: {{{mostProductiveDay}}}
    - Top Category: {{{topCategory}}}

    Generate a subject line like "Your Weekly G-Remind Summary!" and a short, upbeat email body.
    Congratulate them on their progress and highlight their most productive day and top category.
    Keep it concise and positive!
    `,
});

