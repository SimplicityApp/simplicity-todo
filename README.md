# Simplicity - Minimal Todo App

A radical simplicity-focused todo app that enforces time constraints and task limits to help you focus on what truly matters.

## Core Philosophy

This app exists to combat feature bloat and procrastination in traditional todo apps by enforcing:

- **Maximum 2 tasks at a time** - Focus on what's truly important
- **6-hour deadline** - Create urgency and prevent distant-future planning
- **Automatic expiration** - Tasks automatically archive after deadline + 30min buffer
- **Minimal UI** - Paper and ink aesthetic, zero distractions

## Features

### Task Management
- Create up to 2 tasks at a time
- 6-hour deadline during day (4am-9pm)
- 16-hour deadline for night planning (9pm-4am)
- Automatic archiving of expired tasks
- 30-minute buffer period after deadline

### Archive System
- Separate "Finished" and "Unfinished" sections
- Re-enable unfinished tasks (creates new instance)
- Track reactivation count for recurring tasks

### Analytics
- View completion stats by day/week/month
- Completion rate percentage
- Track behavioral patterns
- Minimal, text-based insights

### Design
- Paper & ink aesthetic (warm white background, black text)
- Red-orange accents for urgency indicators
- Clean typography, generous spacing
- Smooth animations and haptic feedback

## Tech Stack

- **Framework**: React Native with Expo
- **Database**: SQLite (local-first with expo-sqlite)
- **State Management**: Zustand
- **Notifications**: Expo Notifications
- **Language**: TypeScript

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── TaskItem.tsx
│   └── TabBar.tsx
├── screens/          # Main app screens
│   ├── TodayScreen.tsx
│   ├── CreateTaskScreen.tsx
│   ├── ArchiveScreen.tsx
│   └── SummaryScreen.tsx
├── database/         # SQLite database setup
│   └── db.ts
├── stores/           # Zustand state management
│   └── taskStore.ts
├── services/         # Background services
│   ├── expirationService.ts
│   └── notificationService.ts
├── utils/            # Utility functions
│   └── timeUtils.ts
├── constants/        # App constants and theme
│   └── theme.ts
└── types/            # TypeScript type definitions
    └── index.ts
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (Mac) or Android Emulator

### Installation

1. Navigate to the project directory:
```bash
cd simplicity-todo
```

2. Install dependencies:
```bash
npm install
```

### Running the App

Start the development server:

```bash
npm start
```

Then choose your platform:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app on your phone

### Build Commands

```bash
npm run android  # Run on Android
npm run ios      # Run on iOS
npm run web      # Run in web browser (limited functionality)
```

## Development Phase

This is the **MVP (Phase 1)** implementation with:

- ✅ Local SQLite database only
- ✅ No backend or user accounts
- ✅ All data stored on device
- ✅ Core task management features
- ✅ Automatic expiration logic
- ✅ Archive and re-enable functionality
- ✅ Basic analytics/summary
- ✅ Local notifications
- ✅ Minimal paper-and-ink UI

### Future (Phase 2)

- Supabase backend for sync
- User authentication
- Cross-device synchronization
- Enhanced analytics
- Data export
- Sentry error tracking

## Key Implementation Details

### Time Windows

- **Day Mode** (4am-9pm): Tasks can be created for next 6 hours
- **Night Mode** (9pm-4am): Tasks can be created for next 16 hours (next-day planning)

### Task Lifecycle

1. **Active**: Task is within its deadline
2. **Buffer Period**: Task passed deadline, 30min to mark complete
3. **Archived**:
   - **Finished**: Marked complete before expiration
   - **Unfinished**: Expired without completion

### Database Schema

```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  deadline TEXT NOT NULL,
  status TEXT CHECK(status IN ('active', 'completed', 'expired_unfinished')),
  completed_at TEXT,
  reactivation_count INTEGER DEFAULT 0,
  original_task_id INTEGER REFERENCES tasks(id)
);
```

### Background Services

- **Expiration Checker**: Runs every minute to check and expire tasks
- **Notifications**: Scheduled at deadline + buffer for task expiration reminders

## Design Colors

- Background: `#FDFDF8` (warm white)
- Text: `#1A1A1A` (near black)
- Accent: `#D84315` (red-orange for urgency)
- Divider: `#E0E0E0` (subtle gray)

## License

MIT

## Contact

For issues and feature requests, please create an issue in the repository.
