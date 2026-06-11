# Quick Integration Guide - Improved Tasks

## 🚀 Quick Start

### Step 1: Update Your Routes
In your main routing file (likely in `App.tsx`), update the Tasks route:

```typescript
// OLD:
import AllTasks from '@/pages/AllTasks'

// NEW:
import AllTasksImproved from '@/pages/AllTasksImproved'

// In your route configuration:
{
  path: '/tasks',
  element: <AllTasksImproved />
}
```

### Step 2: Ensure You Have Required UI Components
Make sure these components exist in your `ui/` folder:
- ✅ `textarea.tsx` - For description field
- ✅ `dialog.tsx` - For edit modal
- ✅ Other standard components (button, input, select, form)

If missing, you can create a basic Textarea:

```typescript
// src/components/ui/textarea.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
)
Textarea.displayName = "Textarea"

export { Textarea }
```

### Step 3: Optional - Update Timer Component  
If you use a separate Timer component, update it to handle the new fields:

```typescript
// In your Timer component
interface TimerProps {
  taskId: number;
  initialTime: number;
  estimated?: number;  // NEW: estimated time in minutes
}
```

## 📦 API Compatibility

The new API is **100% backward compatible**. No breaking changes!

### Old Task Response Still Works
```json
{
  "id": 1,
  "title": "Task",
  "priority": "high",
  "status": "todo",
  "time_spent": 1200
}
```

### New Fields Are Optional
```json
{
  "id": 1,
  "title": "Task",
  "description": "Optional",
  "priority": "high",
  "status": "todo",
  "time_spent": 1200,
  "time_estimate": 3600,
  "completed_at": null,
  "tags": [],
  "recurrence": null,
  "subtasks": []
}
```

## 🎨 Styling Notes

The components use Tailwind CSS with your existing design tokens:
- `bg-card`, `text-card-foreground` - Task backgrounds
- `text-muted-foreground` - Secondary text
- `bg-primary`, `text-primary` - Action buttons
- `border-border` - Borders
- Color scale: `rose-500` (high), `amber-400` (medium), `emerald-500` (low)

## 🔄 Migrating Your Existing Components

If you have custom TaskCard or AllTasks implementations, you can:

**Option A: Keep using old components** (they still work)
**Option B: Gradually migrate** (both can coexist)
**Option C: Replace completely** (use new components everywhere)

### Side-by-side Usage:
```typescript
// In the same page/view:
import AllTasks from '@/pages/AllTasks'
import AllTasksImproved from '@/pages/AllTasksImproved'

// Route to improved version:
<Route path="/tasks/new" element={<AllTasksImproved />} />
<Route path="/tasks/old" element={<AllTasks />} />
```

## 📊 Working with Time Data

### Time is stored in seconds on frontend, minutes in UI:

```typescript
// Backend sends time_spent in seconds
const timeSeconds = task.time_spent  // 3600

// Frontend displays in minutes/hours
const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

// When creating task, time_estimate is in minutes
const createTaskPayload = {
  title: "Task",
  time_estimate: 60  // 60 minutes
}
```

## 🧪 Testing the New Features

### 1. Test Time Tracking
- Create a task with 60 minute estimate
- Start the timer
- Wait a few seconds
- Stop the timer
- Verify time_spent increased

### 2. Test Completion Tracking
- Create task
- Move to "done" status
- Check that completed_at is set
- Move back to "todo"
- Check that completed_at is cleared

### 3. Test Expandable Details
- Click on a task card
- Verify it expands
- Check description displays
- Check subtasks/tags show (if present)
- Click again to collapse

### 4. Test View Modes
- Toggle between Board and List views
- Verify tasks appear correctly in both
- Test filtering with each view

## 🐛 Troubleshooting

### Issue: "TaskCardImproved component not found"
**Solution:** Make sure the file is at `/artifacts/meridian/src/components/TaskCardImproved.tsx`

### Issue: "Textarea component not found"  
**Solution:** Create it (see Step 2 above) or import from shadcn/ui

### Issue: Tasks not showing description
**Solution:** Ensure your API is returning the description field (check backend serializer)

### Issue: Time tracking not updating
**Solution:** Check that timer_running is being set correctly in the API response

## 📝 API Endpoint Reference

### Create Task (with new fields)
```bash
POST /api/tasks
{
  "title": "Build feature",
  "description": "Implement the new dashboard",
  "priority": "high",
  "time_estimate": 120,
  "tags": ["frontend", "feature"],
  "recurrence": "daily"
}
```

### Update Task
```bash
PUT /api/tasks/{taskId}
{
  "title": "Updated title",
  "description": "Updated description",
  "time_estimate": 180
}
```

### Mark Task Complete
```bash
PATCH /api/tasks/{taskId}/status
{
  "status": "done"
}
```

The backend automatically sets `completed_at` timestamp!

## 🎯 Next: Calendar Improvements

Once tasks are working well, we'll move to:
1. ✅ **Tasks** - DONE!
2. ⏳ **Calendar** - Next (Outlook-like UI)
3. ⏳ **Habits** - New component
4. ⏳ **Notes** - OneNote-like replacement
5. ⏳ **Production** - Windows/Linux ready

---

**Questions?** Check the full TASK_MANAGEMENT_GUIDE.md for detailed information.
