# Zero-Task

A full-featured, world-class task management application built with React, TypeScript, Express, and SQLite. Designed to compete with tools like ClickUp, Asana, Monday.com, and Linear.

![TaskFlow Banner](https://img.shields.io/badge/Stack-React%20%2B%20TypeScript%20%2B%20Express%20%2B%20SQLite-blue) ![License](https://img.shields.io/badge/License-MIT-green) ![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)

---

## Features

### 14 Views
| View | Description |
|------|-------------|
| **Dashboard** | Stats overview, progress charts, priority distribution, due-today panel, recent activity |
| **Kanban Board** | Drag-and-drop columns (To Do → In Progress → Review → Done) with sorting |
| **Task List** | Sortable/filterable table with bulk selection and inline actions |
| **Calendar** | Month and week view with task previews on dates |
| **Gantt Timeline** | Horizontal timeline with task bars, dependencies, today line |
| **Goals & OKRs** | Set objectives with measurable key results and progress tracking |
| **Sprints** | Agile sprint management with burndown charts |
| **Projects** | Organize tasks into color-coded projects |
| **Workload** | Per-user task distribution heatmap (admin) |
| **Automations** | Rule builder: "When status → done, set priority urgent" |
| **Integrations** | Webhooks, Slack, GitHub, Google Calendar support |
| **Support Tickets** | User↔admin ticket system with threaded messages |
| **Admin Panel** | User management with view-as impersonation |

### Task Management
- Full CRUD with rich metadata
- Subtasks with progress tracking
- Tags and categories with colors
- Priority levels (Low, Medium, High, Urgent)
- Status workflow (To Do → In Progress → Review → Done)
- Due dates with overdue detection
- Task duplication
- Recurring tasks (daily/weekly/monthly)
- Task dependencies (blocked by)
- File attachments (up to 10MB)
- Custom fields (text, number, select, date, URL, email, checkbox)
- Story points and time estimates
- Natural language input ("Buy milk tomorrow p1")

### Collaboration
- Comments with @mentions
- Activity log per task
- Support tickets with threaded messages
- Real-time notifications
- Unread badge on ticket messages

### Productivity
- Timer start/stop per task
- Quick Add (Ctrl+K) with natural language parsing
- Keyboard shortcuts (D/B/L/C/G for views)
- Task templates (Bug Report, Feature Request, Weekly Review, etc.)
- Export/Import (JSON)
- Saved filter views
- Bulk operations (status change, delete, category change)

### Security
- bcrypt password hashing
- Role-based access (admin/user)
- Session-based authentication
- Admin user management (create, edit, delete, reset password, toggle active)
- View-as-user impersonation

---

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite 8** for blazing-fast builds
- **Tailwind CSS v4** for styling
- **Framer Motion** for animations
- **@hello-pangea/dnd** for drag-and-drop
- **date-fns** for date handling
- **Lucide React** for icons
- **marked** for markdown rendering

### Backend
- **Express.js** REST API (port 3001)
- **better-sqlite3** for database
- **bcrypt** for password hashing
- **multer** for file uploads
- **PM2** for process management

### Infrastructure
- **Nginx** reverse proxy
- **SQLite** database (single file)
- **PM2** for auto-restart and boot persistence

---

## Step-by-Step Installation

### Prerequisites
- Node.js 18+ installed
- npm installed
- Git installed

### Step 1: Clone the Repository

```bash
git clone https://github.com/ahmedimran35/Zero-Task.git
cd Zero-Task
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs all frontend and backend dependencies including:
- React, TypeScript, Vite (frontend)
- Express, better-sqlite3, bcrypt, multer (backend)

### Step 3: Create Server Data Directory

```bash
mkdir -p server/data server/uploads
```

### Step 4: Build the Frontend

```bash
npm run build
```

This creates a production build in the `dist/` folder.

### Step 5: Start the Backend Server

**Option A: Using PM2 (Recommended for production)**

```bash
# Install PM2 globally (if not already installed)
npm install -g pm2

# Start the server
pm2 start server/index.cjs --name taskflow-api

# Save PM2 config and set up auto-start on boot
pm2 save
pm2 startup
```

**Option B: Using Node directly (for development)**

```bash
node server/index.cjs
```

The server starts on port **3001**.

### Step 6: Configure Nginx (Production)

Create or update your Nginx config at `/etc/nginx/sites-enabled/default`:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /path/to/Zero-Task/dist;
    index index.html;

    server_name _;

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    # File uploads proxy
    location /uploads/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_read_timeout 30s;
        client_max_body_size 10M;
    }

    # SPA routing (all other routes go to index.html)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static asset caching
    location ~* \.(?:css|js|woff2?|ttf|eot|ico|svg|png|jpg|jpeg|gif|webp|avif)$ {
        expires 1M;
        add_header Cache-Control "public, immutable";
    }
}
```

Then reload Nginx:

```bash
sudo nginx -t
sudo nginx -s reload
```

### Step 7: Open Your Browser

Navigate to `http://localhost` (or your server's IP/domain).

### Step 8: Login with Default Admin

| Field | Value |
|-------|-------|
| Email | `admin@taskflow.com` |
| Password | `admin123` |

**Change this password immediately after first login.**

---

## Usage Guide

### Creating Your First Task

1. Click the **"+ Add Task"** button in the header (or press `N`)
2. Fill in the task details:
   - Title and description
   - Priority and status
   - Category and due date
   - Subtasks, tags, assignee
3. Click **"Create Task"**

### Using Natural Language Quick Add

Press `Ctrl+K` and type naturally:

```
Fix login bug tomorrow p1
```

This automatically creates a task with:
- Title: "Fix login bug"
- Due date: Tomorrow
- Priority: Urgent (p1)

More examples:
```
Review PR friday #code
Meeting with team in 3 days p2 #work
Buy groceries today #personal
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | New task |
| `Ctrl+K` | Quick Add |
| `D` | Dashboard |
| `B` | Kanban Board |
| `L` | Task List |
| `C` | Calendar |
| `G` | Gantt |
| `O` | Goals |
| `P` | Sprints |
| `H` | Support |
| `Esc` | Close any modal/panel |

### Creating Users (Admin)

1. Login as admin
2. Go to **Admin Panel** (sidebar)
3. Click **"Create User"**
4. Fill in name, email, password
5. The user can now login with those credentials

### Setting Up Automations

1. Go to **Automations** in the sidebar
2. Click **"New Rule"**
3. Choose a trigger (e.g., "Status changes to Done")
4. Choose an action (e.g., "Set priority to Low")
5. Save the rule

Example automation:
- **When**: Status changes to "done"
- **Then**: Set priority to "low"

### Configuring Webhooks

1. Go to **Integrations** in the sidebar
2. Under "Custom Webhooks", click **"Add Webhook"**
3. Enter a name, URL, and select events
4. Click **"Test"** to verify the connection

Supported events:
- `task.created`, `task.updated`, `task.completed`, `task.deleted`
- `comment.added`
- `sprint.started`, `sprint.completed`

---

## Project Structure

```
Zero-Task/
├── server/                    # Backend
│   ├── index.cjs              # Express server entry point
│   ├── db.cjs                 # SQLite connection + schema
│   ├── data/                  # SQLite database files
│   ├── uploads/               # File attachments
│   ├── middleware/
│   │   └── auth.cjs           # Auth middleware
│   └── routes/
│       ├── auth.cjs           # Login/session
│       ├── users.cjs          # User CRUD
│       ├── tasks.cjs          # Task CRUD + duplicates
│       ├── categories.cjs     # Category CRUD
│       ├── templates.cjs      # Template CRUD
│       ├── notifications.cjs  # Notifications
│       ├── tickets.cjs        # Support tickets
│       ├── goals.cjs          # Goals + key results
│       ├── sprints.cjs        # Sprint management
│       ├── saved-views.cjs    # Saved filter views
│       ├── projects.cjs       # Project management
│       ├── automations.cjs    # Rule engine
│       ├── custom-fields.cjs  # Custom field CRUD
│       ├── attachments.cjs    # File uploads
│       └── webhooks.cjs       # Webhook management
├── src/                       # Frontend
│   ├── App.tsx                # Root component + auth
│   ├── main.tsx               # Entry point
│   ├── index.css              # Global styles + Tailwind
│   ├── types/
│   │   ├── index.ts           # All type definitions
│   │   └── auth.ts            # Auth types
│   ├── context/
│   │   ├── AppContext.ts       # App state context
│   │   ├── AuthContext.ts      # Auth context
│   │   ├── AuthProvider.tsx    # Auth provider + API
│   │   └── reducer.ts         # State reducer + API calls
│   ├── hooks/
│   │   └── useTimer.ts        # Timer hook
│   ├── utils/
│   │   ├── api.ts             # API client (fetch wrappers)
│   │   ├── taskUtils.ts       # Task filtering/sorting
│   │   ├── markdown.ts        # Markdown parser
│   │   └── naturalLanguage.ts # NL input parser
│   ├── data/
│   │   └── defaults.ts        # Default categories/templates
│   └── components/
│       ├── layout/
│       │   ├── Layout.tsx      # Main layout + view router
│       │   ├── Sidebar.tsx     # Navigation sidebar
│       │   └── Header.tsx      # Top header bar
│       ├── dashboard/
│       │   └── Dashboard.tsx   # Stats overview
│       ├── kanban/
│       │   └── KanbanBoard.tsx # Drag-and-drop board
│       ├── list/
│       │   └── TaskList.tsx    # Sortable table
│       ├── calendar/
│       │   └── CalendarView.tsx # Month/week calendar
│       ├── gantt/
│       │   └── GanttView.tsx   # Timeline view
│       ├── goals/
│       │   └── GoalsView.tsx   # OKR tracking
│       ├── sprints/
│       │   ├── SprintView.tsx  # Sprint management
│       │   └── BurndownChart.tsx # SVG burndown
│       ├── projects/
│       │   └── ProjectsView.tsx # Project management
│       ├── workload/
│       │   └── WorkloadView.tsx # Team heatmap
│       ├── automations/
│       │   └── AutomationsView.tsx # Rule builder
│       ├── integrations/
│       │   └── IntegrationsView.tsx # Webhooks UI
│       ├── tickets/
│       │   ├── TicketList.tsx  # Ticket list
│       │   ├── TicketDetail.tsx # Ticket conversation
│       │   └── CreateTicketModal.tsx # New ticket form
│       ├── admin/
│       │   ├── AdminPanel.tsx  # User management
│       │   └── CreateUserModal.tsx # New user form
│       ├── auth/
│       │   └── LoginPage.tsx   # Login form
│       ├── modals/
│       │   ├── TaskModal.tsx   # Create/edit task
│       │   ├── QuickAdd.tsx    # Fast task creation
│       │   ├── CategoryManager.tsx # Category CRUD
│       │   ├── ConfirmDialog.tsx # Confirmation modal
│       │   └── ExportImport.tsx # JSON export/import
│       ├── detail/
│       │   └── TaskDetailPanel.tsx # Task detail slide-over
│       └── ui/
│           ├── Toast.tsx       # Toast notifications
│           ├── Notifications.tsx # Notification dropdown
│           └── EmptyState.tsx  # Empty state component
├── package.json
├── vite.config.ts
├── tsconfig.json
└── .gitignore
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with email/password |
| GET | `/api/auth/session` | Check current session |

### Users (Admin Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create new user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |
| PUT | `/api/users/:id/password` | Reset password |
| PUT | `/api/users/:id/toggle` | Toggle active status |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (filter by userId) |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/duplicate` | Duplicate task |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List categories |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete category |

### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | List templates |
| POST | `/api/templates` | Create template |
| DELETE | `/api/templates/:id` | Delete template |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | List notifications |
| PUT | `/api/notifications/:id/read` | Mark as read |
| DELETE | `/api/notifications` | Clear all |

### Support Tickets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tickets` | List tickets |
| GET | `/api/tickets/unread-count` | Unread count |
| GET | `/api/tickets/:id` | Get ticket + messages |
| POST | `/api/tickets` | Create ticket |
| PUT | `/api/tickets/:id` | Update ticket (admin) |
| POST | `/api/tickets/:id/messages` | Add message |
| DELETE | `/api/tickets/:id` | Delete ticket (admin) |

### Goals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/goals` | List goals |
| POST | `/api/goals` | Create goal |
| PUT | `/api/goals/:id` | Update goal |
| PUT | `/api/goals/:goalId/key-results/:krId` | Update key result |
| DELETE | `/api/goals/:id` | Delete goal |

### Sprints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sprints` | List sprints |
| GET | `/api/sprints/:id` | Get sprint + tasks |
| POST | `/api/sprints` | Create sprint |
| PUT | `/api/sprints/:id` | Update sprint |
| POST | `/api/sprints/:id/tasks` | Add task to sprint |
| DELETE | `/api/sprints/:id/tasks/:taskId` | Remove task |
| DELETE | `/api/sprints/:id` | Delete sprint |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

### Automations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/automations` | List automations |
| POST | `/api/automations` | Create automation |
| PUT | `/api/automations/:id` | Update automation |
| DELETE | `/api/automations/:id` | Delete automation |

### Custom Fields
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/custom-fields` | List fields |
| POST | `/api/custom-fields` | Create field |
| DELETE | `/api/custom-fields/:id` | Delete field |
| GET | `/api/custom-fields/values/:taskId` | Get field values |
| PUT | `/api/custom-fields/values/:taskId/:fieldId` | Set field value |

### Attachments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/attachments/:taskId` | List attachments |
| POST | `/api/attachments/:taskId` | Upload file |
| DELETE | `/api/attachments/:id` | Delete attachment |

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/webhooks` | List webhooks |
| POST | `/api/webhooks` | Create webhook |
| PUT | `/api/webhooks/:id` | Update webhook |
| DELETE | `/api/webhooks/:id` | Delete webhook |
| POST | `/api/webhooks/test/:id` | Test webhook |

### Saved Views
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/saved-views` | List saved views |
| POST | `/api/saved-views` | Create saved view |
| DELETE | `/api/saved-views/:id` | Delete saved view |

---

## Database Schema

The SQLite database (`server/data/taskflow.db`) contains these tables:

| Table | Description |
|-------|-------------|
| `users` | User accounts with bcrypt passwords |
| `tasks` | All tasks with full metadata |
| `subtasks` | Subtask checklist items |
| `task_tags` | Task tag associations |
| `comments` | Task comments with @mentions |
| `time_logs` | Timer entries per task |
| `activity_log` | Audit trail per task |
| `categories` | Color-coded categories |
| `templates` | Reusable task templates |
| `notifications` | In-app notifications |
| `support_tickets` | Help desk tickets |
| `ticket_messages` | Ticket conversation threads |
| `goals` | OKR objectives |
| `goal_key_results` | Measurable key results |
| `sprints` | Sprint definitions |
| `sprint_tasks` | Sprint-task associations |
| `projects` | Project groupings |
| `custom_fields` | User-defined task fields |
| `custom_field_values` | Custom field data per task |
| `task_attachments` | File attachment metadata |
| `automations` | Rule-based automations |
| `saved_views` | Saved filter combinations |
| `webhooks` | Webhook configurations |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Express server port |

---

## PM2 Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs taskflow-api

# Restart server
pm2 restart taskflow-api

# Stop server
pm2 stop taskflow-api

# Delete from PM2
pm2 delete taskflow-api
```

---

## Troubleshooting

### Port 3001 already in use
```bash
lsof -i :3001
kill -9 <PID>
pm2 restart taskflow-api
```

### Database locked
```bash
pm2 restart taskflow-api
```

### Permission denied on uploads
```bash
chmod 755 server/uploads
```

### Nginx 502 Bad Gateway
```bash
pm2 status  # Check if server is running
pm2 restart taskflow-api
nginx -s reload
```

### Clear browser data
If you see old cached data after updates:
```bash
# In browser console
localStorage.clear()
# Then hard refresh: Ctrl+Shift+R
```

---

## License

MIT License

---

## Built With

- [React](https://react.dev/) - UI framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Express](https://expressjs.com/) - Backend framework
- [SQLite](https://www.sqlite.org/) - Database
- [Framer Motion](https://www.framer.com/motion/) - Animations
- [Lucide](https://lucide.dev/) - Icons
