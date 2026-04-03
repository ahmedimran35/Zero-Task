# TaskFlow Upgrade Plan: Teams & Sprint-First Workflow

---

## Overview

Restructure TaskFlow to be Sprint-first (no Sprint = no action) and implement a Teams system with role-based quotas for AI features.

---

## 1. Sprint-First Architecture

**Problem:** Currently, tasks can be created independently. User wants everything to require a Sprint.

### Changes Required:

**Backend (`server/routes/`):**
- Modify task creation to require `sprintId` - reject if no sprint
- Modify ALL endpoints that create/update tasks to check sprint exists
- Add sprint validation middleware

**Frontend:**
- Disable "New Task" button if no sprints exist
- Show onboarding wizard: Create Sprint → then create Tasks
- Views (Kanban, List, Calendar) show "Create a Sprint first" empty state if no sprints
- Auto-assign tasks to current active sprint when creating

---

## 2. Teams System

### Database Schema Changes:

```sql
-- Teams table
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT, -- super_admin user_id
  created_at TEXT DEFAULT (datetime('now'))
);

-- Team members (links users to teams with roles)
CREATE TABLE team_members (
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member', -- 'admin' or 'member'
  PRIMARY KEY (team_id, user_id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- AI quota allocation per team
CREATE TABLE team_ai_quotas (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'openrouter', 'openai', etc.
  daily_limit INTEGER DEFAULT 100,
  used_today INTEGER DEFAULT 0,
  reset_at TEXT, -- daily reset timestamp
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Individual user quota from team admin
CREATE TABLE user_ai_quotas (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  daily_limit INTEGER DEFAULT 10,
  used_today INTEGER DEFAULT 0,
  reset_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### User Flow:

1. **Super Admin** creates Teams in new "Teams" panel
2. Super Admin assigns one Admin per team
3. Super Admin assigns AI providers + daily quota to team (e.g., 100 requests/day)
4. **Team Admin** can:
   - Add members to their team
   - Divide quota among team members (e.g., 10 req/day each for 10 members)
   - View team usage stats
5. **Team Members** can use AI features up to their assigned quota

### API Endpoints Needed:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/teams` | GET | List all teams (super_admin) |
| `/api/teams` | POST | Create team (super_admin) |
| `/api/teams/:id` | GET | Get team details + members |
| `/api/teams/:id/members` | POST | Add member to team |
| `/api/teams/:id/quotas` | POST | Assign AI quota to team |
| `/api/teams/:id/quotas/user` | POST | Admin divides quota to user |
| `/api/users/:id/quota` | GET | Get user's personal quota |

---

## 3. Sidebar Fix

**Problem:** Two Settings buttons visible in sidebar.

**Root Cause:** Settings appears both in:
- Main navigation items (navItems array)
- Admin section items (adminItems array)

**Solution:** Remove Settings from ONE location (keep only in admin section).

---

## 4. Implementation Phases

### Phase 1: Sprint-First Foundation (Days 1-2)
- Add Teams, Team Members, Quota tables to DB
- Create Teams API routes
- Update task creation to require sprint
- Frontend: Sprint-first empty states

### Phase 2: Teams Management (Days 3-4)
- Super Admin: Teams panel to create teams, assign admin
- Team Admin: Manage members, divide quotas
- API: Quota tracking + daily reset logic

### Phase 3: AI Quota Integration (Days 5-6)
- Integrate quota checking into AI routes
- Track usage per user
- Block requests when quota exceeded
- Frontend: Show quota in AI settings

### Phase 4: UI Polish (Day 7)
- Fix sidebar duplicate Settings
- Add team switcher in header (switch between teams)
- Usage dashboards

---

## 5. Key Files to Modify

| File | Changes |
|------|---------|
| `server/db.cjs` | Add Teams tables, migration |
| `server/routes/teams.cjs` | New - Teams CRUD + quotas |
| `server/routes/tasks.cjs` | Require sprint validation |
| `server/routes/ai.cjs` | Add quota checking |
| `server/index.cjs` | Register teams routes |
| `src/types/index.ts` | Add Team, TeamMember, Quota types |
| `src/utils/api.ts` | Add teams API methods |
| `src/components/layout/Sidebar.tsx` | Fix duplicate Settings |
| `src/components/teams/TeamsView.tsx` | New - Teams management UI |
| `src/context/AppContext.ts` | Add currentTeam state |

---

## 6. Key Decisions Confirmed

- **Quota Reset:** Daily at UTC midnight
- **Existing Users:** Super Admin creates teams manually, assigns users to teams
- **Quota Exceeded:** Block request, show error message

## 7. Teams Hierarchy

```
Super Admin (global)
  └── Creates Teams
        └── Assigns Team Admin (per team)
              └── Adds Team Members
                    └── Uses AI within quota
```

## 8. Summary

This plan implements:
- Sprint-first workflow (everything requires a Sprint)
- Teams system with hierarchy (Super Admin → Team Admin → Members)
- AI quota management (Super Admin allocates to team, Team Admin allocates to members)
- Fixes duplicate sidebar Settings button

Ready for implementation?