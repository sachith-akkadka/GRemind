
'use server';
/**
 * @fileOverview This flow is designed to be run on a schedule (e.g., daily cron job).
 * It finds users who have opted into email notifications and sends them a reminder
 * for any tasks that are currently in a 'missed' state.
 *
 * This flow is a placeholder and requires a backend scheduler and an email service to be fully functional.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collectionGroup, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const OverdueReminderInputSchema = z.object({
  userId: z.string(),
  userEmail: z.string(),
  missedTasks: z.array(z.object({
    title: z.string(),
    dueDate: z.string(),
  })),
});

const OverdueReminderOutputSchema = z.object({
  emailSubject: z.string(),
  emailBody: z.string(),
});


// This is the main function that would be called by a scheduler.
export const sendOverdueRemindersFlow = ai.defineFlow(
  {
    name: 'sendOverdueRemindersFlow',
    inputSchema: z.void(),
    outputSchema: z.void(),
  },
  async () => {
    console.log("Starting overdue reminders check...");

    // 1. Find all users who have email notifications enabled.
    const prefsQuery = query(
      collectionGroup(db, 'preferences'),
      where('emailNotifications', '==', true)
    );
    const prefsSnapshot = await getDocs(prefsQuery);

    for (const prefDoc of prefsSnapshot.docs) {
      const userId = prefDoc.ref.parent.parent!.id;
      // In a real implementation, you'd fetch the user's email from an auth service or user profile document.
      const userEmail = `user-${userId}@example.com`; // Placeholder

      // 2. For each user, find their missed tasks.
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('userId', '==', userId),
        where('status', '==', 'missed')
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      
      const missedTasks = tasksSnapshot.docs.map(doc => ({
        title: doc.data().title,
        dueDate: doc.data().dueDate.toDate().toLocaleDateString(),
      }));

      if (missedTasks.length > 0) {
        // 3. Generate the email content using an AI prompt.
        const { output } = await overdueReminderPrompt({
          userId,
          userEmail,
          missedTasks,
        });

        if (output) {
          // 4. Send the email (placeholder).
          console.log(`--- Sending Overdue Task Email to ${userEmail} ---`);
          console.log(`Subject: ${output.emailSubject}`);
          console.log(`Body: ${output.emailBody}`);
          console.log(`-------------------------------------------------`);
          // In a real implementation, you would integrate an email service here.
          // e.g., await sendEmail(userEmail, output.emailSubject, output.emailBody);
        }
      }
    }
  }
);


const overdueReminderPrompt = ai.definePrompt({
    name: 'overdueReminderPrompt',
    input: { schema: OverdueReminderInputSchema },
    output: { schema: OverdueReminderOutputSchema },
    prompt: `You are a friendly and helpful assistant for the G-Remind app.
    
    A user has some overdue tasks. Your goal is to generate a concise and friendly reminder email.

    User ID: {{{userId}}}
    User Email: {{{userEmail}}}

    Here are the tasks they missed:
    {{#each missedTasks}}
    - "{{title}}" (was due on {{dueDate}})
    {{/each}}

    Generate a subject line and a simple email body. The tone should be encouraging, not scolding.
    Suggest they open the app to reschedule them.
    `,
});
