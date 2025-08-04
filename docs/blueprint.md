# **App Name**: G-Remind

## Core Features:

- User Authentication & Profile Management: Supports email/password sign-up and login. Users must provide their name, email, and optional profile picture. Profile information is editable from the Settings screen.
- Prioritized Task Views: Clean, card-based task display with prioritized sections: Pending, Today’s Tasks, and Completed. Tasks show title, status badge, due time, and store (if available).
- Streamlined Task Input: Interactive interface for quick task creation, featuring title input, date/time picker, and location (store name or map pin). Also supports recurrence (daily/weekly).
- Smart Category Suggestion: AI-powered categorization based on task title and user's past category choices, aiding automatic organization without manual effort.
- Categorized Tasks: Ability to assign and filter tasks by category. Includes default categories and allows user-created categories for personal organization.
- Task Analytics Dashboard: Visual dashboard showing completion trends, category breakdown, and productivity streaks. Includes progress bars and pie/bar charts for easy insights.
- Location-Based Reminders: Background location tracking triggers push notifications when user is near a preferred store. Works even when app is in background. Also triggers reminders at due time if location isn’t specified.
- Time-Based Notifications: Scheduled notifications fire based on due date/time. If user misses the task, notification suggests rescheduling (“Remind me tomorrow at 9 AM”).
- Notification Actions: Push notifications include actionable buttons (Yes / Not Yet). "Yes" marks task as done, "Not Yet" postpones task or resets proximity flags.
- Offline Support: Tasks are saved locally if offline and auto-synced to Firestore when network returns. Ensures reliability in poor connectivity conditions.
- AI Smart Suggestions: App learns from user behavior and missed tasks. Suggests optimal times to reschedule and categories to auto-fill in the future.
- Subtasks / Checklist Support: Each task can include a list of subtasks with checkboxes, making it ideal for shopping lists or step-by-step goals.
- Recurring Tasks: Supports repeat schedules like “Every Monday” or “Daily at 7 PM”. Easily set from the task input screen.
- Smart Search & Filter: Built-in search bar allows filtering by task name, category, or date. Toggle views for better navigation.
- Progress Tracker: Displays task completion percentage visually in the header or dashboard — e.g., “3 out of 5 tasks done today”.
- Settings & Theme Control: Includes dark/light mode toggle, clear completed tasks button, and logout option. Settings screen allows users to view and edit profile info.

## Style Guidelines:

- Primary color: Soft lavender `#E6E6FA` — evokes calmness and focus.
- Background color: Light gray `#F5F5F5` — clean and non-distracting.
- Accent color: Muted teal `#80CBC4` — highlights key elements gently.
- Font: `'PT Sans', sans-serif` — modern and readable.
- Use outlined icons for categories (e.g., grocery, personal) and actions (e.g., complete, delete).
- Card-based task layout with: - Rounded corners - Subtle shadows - Clear spacing between sections
- Smooth transitions for: - Task addition - Status change (e.g., mark complete) - Task deletion
- Navigation: Bottom tab navigation with clear labels and icons for: - Tasks - Dashboard - History - Settings