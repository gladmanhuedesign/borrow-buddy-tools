# Database Schema Documentation
# BorrowBuddy Tool Sharing Platform

## Overview

BorrowBuddy uses PostgreSQL via Supabase with Row-Level Security (RLS) enabled on all tables. The schema supports multi-tenant architecture through group-based access control.

## Schema Diagram

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   profiles  │◄────────│    groups    │────────►│group_members│
└─────────────┘         └──────────────┘         └─────────────┘
       ▲                        ▲                        │
       │                        │                        │
       │                        │                        ▼
       │                 ┌──────────────┐         ┌─────────────┐
       │                 │group_invites │         │    tools    │
       │                 └──────────────┘         └─────────────┘
       │                                                 │
       │                                                 │
       └─────────────┬───────────────┬──────────────────┘
                     │               │
              ┌──────▼──────┐  ┌─────▼────────┐
              │tool_requests│  │ tool_history │
              └─────────────┘  └──────────────┘
                     │
                     ▼
              ┌──────────────┐
              │notifications │
              └──────────────┘
```

## Core Tables

### 1. profiles

**Purpose:** Stores user profile information. Created automatically when a user signs up.

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | - | Primary key, references auth.users |
| display_name | text | NO | - | User's display name |
| created_at | timestamptz | NO | now() | Profile creation timestamp |
| updated_at | timestamptz | NO | now() | Last update timestamp |

**Relationships:**
- `id` references `auth.users(id)` ON DELETE CASCADE

**RLS Policies:**
- ✅ Anyone can view profiles (SELECT: true)
- ✅ Users can update their own profile (UPDATE: auth.uid() = id)
- ✅ Allow viewing profiles for group invitations (SELECT: special case)
- ❌ Users cannot delete profiles
- ❌ Users cannot insert profiles (created by trigger)

**Indexes:**
- Primary key on `id`

**Triggers:**
- `handle_new_user` - Automatically creates profile when user signs up

---

### 2. groups

**Purpose:** Represents sharing communities where users can share tools.

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Group name |
| description | text | YES | - | Group description |
| is_private | boolean | NO | true | Privacy setting |
| creator_id | uuid | NO | - | User who created the group |
| created_at | timestamptz | NO | now() | Creation timestamp |
| updated_at | timestamptz | NO | now() | Last update timestamp |

**Relationships:**
- `creator_id` references `profiles(id)`

**RLS Policies:**
- ✅ Users can view groups they created (SELECT: creator_id = auth.uid())
- ✅ Users can view groups they are members of (SELECT: via group_members)
- ✅ Users can view groups for pending invitations (SELECT: via group_invites)
- ✅ Authenticated users can create groups (INSERT: auth.uid() = creator_id)
- ✅ Group creators can update their groups (UPDATE: creator_id = auth.uid())
- ✅ Group creators can delete their groups (DELETE: creator_id = auth.uid())

**Indexes:**
- Primary key on `id`
- Index on `creator_id`

**Triggers:**
- `update_updated_at` - Updates timestamp on modification

---

### 3. group_members

**Purpose:** Junction table managing group membership and roles.

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| group_id | uuid | NO | - | Reference to group |
| user_id | uuid | NO | - | Reference to user |
| role | text | NO | 'member' | Role: 'admin' or 'member' |
| created_at | timestamptz | NO | now() | Join timestamp |

**Relationships:**
- `group_id` references `groups(id)` ON DELETE CASCADE
- `user_id` references `profiles(id)` ON DELETE CASCADE

**RLS Policies:**
- ✅ Users can view memberships they're part of (SELECT: user_id = auth.uid() OR is_group_member)
- ✅ Group creators and admins can add members (INSERT: is_group_creator OR is_group_admin OR user_id = auth.uid())
- ✅ Users can join via invitation (INSERT: has valid invitation)
- ✅ Group creators and admins can update members (UPDATE: is_group_creator OR is_group_admin)
- ✅ Creators, admins, and self can remove members (DELETE: is_group_creator OR is_group_admin OR user_id = auth.uid())

**Indexes:**
- Primary key on `id`
- Composite index on `(group_id, user_id)` - UNIQUE
- Index on `user_id`

**Business Rules:**
- One role per user per group
- Group creator is automatically made admin member

---

### 4. group_invites

**Purpose:** Manages email invitations to join groups.

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| group_id | uuid | NO | - | Reference to group |
| email | text | NO | - | Invitee's email address |
| invite_code | text | NO | - | Unique invitation code |
| created_by | uuid | NO | - | User who sent invite |
| created_at | timestamptz | NO | now() | Creation timestamp |
| expires_at | timestamptz | NO | now() + 7 days | Expiration timestamp |

**Relationships:**
- `group_id` references `groups(id)` ON DELETE CASCADE
- `created_by` references `profiles(id)`

**RLS Policies:**
- ✅ Group creators and admins can create invitations (INSERT: is_group_creator OR is_group_admin)
- ✅ Users can view invitations sent to their email (SELECT: email = auth.email())
- ✅ Creators can view their invitations (SELECT: created_by = auth.uid())
- ✅ Users and creators can delete invitations (DELETE: email = auth.email() OR created_by = auth.uid())
- ❌ Cannot update invitations

**Indexes:**
- Primary key on `id`
- Unique index on `invite_code`
- Index on `email`
- Index on `group_id`

**Triggers:**
- `handle_new_group_invite` - Creates notification when invite is sent

**Business Rules:**
- Invites expire after 7 days
- Invite codes must be unique
- Used invites should be deleted after acceptance

---

### 5. tool_categories

**Purpose:** Predefined categories for organizing tools.

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Category name |
| created_at | timestamptz | NO | now() | Creation timestamp |

**RLS Policies:**
- ✅ Anyone (including anonymous) can view categories (SELECT: true)
- ❌ Cannot insert/update/delete (managed by admins)

**Indexes:**
- Primary key on `id`
- Unique index on `name`

**Predefined Categories:**
- Power Tools
- Hand Tools
- Garden Tools
- Ladders & Scaffolding
- Painting Equipment
- Plumbing Tools
- Automotive Tools
- Measuring Tools
- Cleaning Equipment
- Other

---

### 6. tools

**Purpose:** Stores information about tools available for sharing.

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Tool name |
| description | text | YES | - | Detailed description |
| category_id | uuid | YES | - | Reference to category |
| owner_id | uuid | NO | - | Tool owner |
| status | text | NO | 'available' | 'available', 'borrowed', 'maintenance' |
| image_url | text | YES | - | Photo URL from storage |
| brand | text | YES | - | Manufacturer/brand |
| power_source | text | YES | - | 'Battery', 'Corded Electric', 'Gas', 'Manual' |
| created_at | timestamptz | NO | now() | Creation timestamp |
| updated_at | timestamptz | NO | now() | Last update timestamp |

**Relationships:**
- `owner_id` references `profiles(id)` ON DELETE CASCADE
- `category_id` references `tool_categories(id)` ON DELETE SET NULL

**RLS Policies:**
- ✅ Tool owners can do everything (ALL: auth.uid() = owner_id)
- ✅ Group members can view tools (SELECT: owner is in same group)

**Indexes:**
- Primary key on `id`
- Index on `owner_id`
- Index on `category_id`
- Index on `status`

**Triggers:**
- `update_updated_at` - Updates timestamp on modification

**Storage Integration:**
- Images stored in `tool-images` bucket (public)
- Image URLs reference Supabase storage

---

### 7. tool_group_visibility

**Purpose:** Allows hiding specific tools from certain groups.

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| tool_id | uuid | NO | - | Reference to tool |
| group_id | uuid | NO | - | Reference to group |
| is_hidden | boolean | NO | false | Hide from this group |
| created_at | timestamptz | NO | now() | Creation timestamp |

**Relationships:**
- `tool_id` references `tools(id)` ON DELETE CASCADE
- `group_id` references `groups(id)` ON DELETE CASCADE

**RLS Policies:**
- ✅ Users can view their visibility settings (SELECT: owns tool)
- ✅ Users can create visibility settings (INSERT: owns tool)
- ✅ Users can update visibility settings (UPDATE: owns tool)
- ✅ Users can delete visibility settings (DELETE: owns tool)

**Indexes:**
- Primary key on `id`
- Composite index on `(tool_id, group_id)` - UNIQUE

**Business Rules:**
- By default, tools are visible to all groups the owner is in
- Creating a record with is_hidden=true hides tool from that group

---

### 8. tool_requests

**Purpose:** Manages borrowing requests and their lifecycle.

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| tool_id | uuid | NO | - | Reference to tool |
| requester_id | uuid | NO | - | User requesting to borrow |
| status | text | NO | 'pending' | Request status (see below) |
| start_date | date | NO | - | Requested start date |
| end_date | date | NO | - | Requested return date |
| message | text | YES | - | Optional message to owner |
| picked_up_at | timestamptz | YES | - | Actual pickup timestamp |
| returned_at | timestamptz | YES | - | Actual return timestamp |
| return_notes | text | YES | - | Owner's notes on return |
| created_at | timestamptz | NO | now() | Request creation time |
| updated_at | timestamptz | NO | now() | Last update time |

**Status Values:**
- `pending` - Awaiting owner approval
- `approved` - Owner approved, awaiting pickup
- `denied` - Owner declined request
- `picked_up` - Tool in borrower's possession
- `return_pending` - Borrower initiated return
- `returned` - Complete transaction
- `canceled` - Borrower canceled request
- `overdue` - Past return date

**Relationships:**
- `tool_id` references `tools(id)` ON DELETE CASCADE
- `requester_id` references `profiles(id)` ON DELETE CASCADE

**RLS Policies:**
- ✅ Tool requesters can manage their requests (ALL: requester_id = auth.uid())
- ✅ Tool owners can view and manage requests for their tools (ALL: owns tool)

**Indexes:**
- Primary key on `id`
- Index on `tool_id`
- Index on `requester_id`
- Index on `status`
- Composite index on `(tool_id, status)`

**Triggers:**
- `handle_tool_status_update` - Updates tool status based on request
- `handle_new_tool_request` - Creates notification for owner
- `handle_tool_request_status_change` - Creates notification on status change
- `log_tool_request_history` - Logs action to history table
- `update_updated_at` - Updates timestamp on modification

**Business Rules:**
- Only one active request per tool at a time
- Status transitions must follow workflow
- Tool status updates automatically based on request status

---

### 9. tool_history

**Purpose:** Immutable audit log of all tool request actions.

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| tool_id | uuid | NO | - | Reference to tool |
| request_id | uuid | NO | - | Reference to request |
| borrower_id | uuid | NO | - | User who borrowed |
| owner_id | uuid | NO | - | Tool owner |
| action_type | text | NO | - | Type of action |
| action_by | uuid | NO | - | User who performed action |
| start_date | date | YES | - | Requested start |
| end_date | date | YES | - | Requested end |
| actual_pickup_date | timestamptz | YES | - | Actual pickup time |
| actual_return_date | timestamptz | YES | - | Actual return time |
| notes | text | YES | - | Action notes |
| created_at | timestamptz | NO | now() | Log timestamp |

**Relationships:**
- `tool_id` references `tools(id)`
- `request_id` references `tool_requests(id)`
- `borrower_id` references `profiles(id)`
- `owner_id` references `profiles(id)`
- `action_by` references `profiles(id)`

**RLS Policies:**
- ✅ Users can view history for their tools or requests (SELECT: owner OR borrower OR action_by)
- ❌ Only triggers can insert (INSERT: false)
- ❌ Cannot update or delete (immutable log)

**Indexes:**
- Primary key on `id`
- Index on `tool_id`
- Index on `request_id`
- Index on `created_at` (for time-based queries)

---

### 10. notifications

**Purpose:** In-app notification system.

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | - | Recipient user |
| type | text | NO | - | Notification type |
| title | text | NO | - | Notification title |
| message | text | NO | - | Notification message |
| data | jsonb | YES | {} | Additional data payload |
| read | boolean | NO | false | Read status |
| created_at | timestamptz | NO | now() | Creation timestamp |
| updated_at | timestamptz | NO | now() | Last update timestamp |

**Notification Types:**
- `tool_request` - New borrowing request
- `request_approved` - Request was approved
- `request_denied` - Request was denied
- `group_invite` - Group invitation
- `return_reminder` - Upcoming return date
- `overdue_reminder` - Tool is overdue

**Relationships:**
- `user_id` references `profiles(id)` ON DELETE CASCADE

**RLS Policies:**
- ✅ Users can view their own notifications (SELECT: auth.uid() = user_id)
- ✅ Users can update their own notifications (UPDATE: auth.uid() = user_id)
- ❌ Only system can create notifications (INSERT: false)
- ❌ Cannot delete notifications

**Indexes:**
- Primary key on `id`
- Index on `user_id`
- Index on `read`
- Composite index on `(user_id, created_at DESC)`

**Triggers:**
- `update_updated_at` - Updates timestamp on modification

---

### 11. user_preferences

**Purpose:** Stores user notification and app preferences.

**Columns:**
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | - | Reference to user |
| email_notifications | boolean | NO | true | Enable email notifications |
| push_notifications | boolean | NO | true | Enable push notifications |
| tool_request_notifications | boolean | NO | true | Notify on tool requests |
| group_invite_notifications | boolean | NO | true | Notify on group invites |
| created_at | timestamptz | NO | now() | Creation timestamp |
| updated_at | timestamptz | NO | now() | Last update timestamp |

**Relationships:**
- `user_id` references `profiles(id)` ON DELETE CASCADE

**RLS Policies:**
- ✅ Users can view their own preferences (SELECT: auth.uid() = user_id)
- ✅ Users can insert their own preferences (INSERT: auth.uid() = user_id)
- ✅ Users can update their own preferences (UPDATE: auth.uid() = user_id)
- ❌ Cannot delete preferences

**Indexes:**
- Primary key on `id`
- Unique index on `user_id`

**Triggers:**
- `update_updated_at` - Updates timestamp on modification

---

## Database Functions

### Security Definer Functions

These functions bypass RLS for specific security-checked operations:

#### `is_group_member(group_id uuid) → boolean`
Checks if current user is a member of the group.

#### `is_group_member_safe(group_id uuid, user_id uuid) → boolean`
Checks if specified user is a member of the group.

#### `is_group_admin(group_id uuid) → boolean`
Checks if current user is an admin of the group.

#### `is_group_creator(group_id uuid, user_id uuid) → boolean`
Checks if specified user created the group.

#### `can_insert_group_member(group_id uuid, user_id uuid) → boolean`
Determines if current user can add members to the group.

#### `get_user_group_role(group_id uuid, user_id uuid) → text`
Returns the role of a user in a group.

#### `create_notification(user_id uuid, type text, title text, message text, data jsonb) → uuid`
Creates a system notification, returns notification ID.

#### `get_or_create_user_preferences(user_id uuid) → user_preferences`
Gets or creates default preferences for a user.

### Utility Functions

#### `handle_new_user() → trigger`
Automatically creates profile when user signs up.

#### `update_updated_at_column() → trigger`
Updates the `updated_at` column to current timestamp.

#### `mark_overdue_requests() → void`
Marks requests as overdue (called by scheduled job).

### Request Workflow Functions

#### `handle_tool_status_update() → trigger`
Updates tool status based on request status changes.

#### `handle_new_tool_request() → trigger`
Creates notification when new request is made.

#### `handle_tool_request_status_change() → trigger`
Creates notifications on request status changes.

#### `log_tool_request_history() → trigger`
Logs all request actions to history table.

### Group Functions

#### `handle_new_group_invite() → trigger`
Creates notification when group invite is sent.

---

## Storage Buckets

### tool-images (Public)

**Purpose:** Stores tool photos uploaded by users.

**Configuration:**
- Public: Yes
- File Size Limit: 5MB
- Allowed MIME Types: image/jpeg, image/png, image/webp
- Folder Structure: `{user_id}/{tool_id}/{filename}`

**RLS Policies:**
- ✅ Anyone can view images (SELECT: true)
- ✅ Users can upload to their own folder (INSERT: path matches user_id)
- ✅ Users can update their own images (UPDATE: path matches user_id)
- ✅ Users can delete their own images (DELETE: path matches user_id)

---

## Enums and Types

While not using native PostgreSQL enums, the following values are enforced:

### Tool Status
- `available`
- `borrowed`
- `maintenance`

### Request Status
- `pending`
- `approved`
- `denied`
- `picked_up`
- `return_pending`
- `returned`
- `canceled`
- `overdue`

### Group Member Role
- `admin`
- `member`

### Power Source
- `Battery`
- `Corded Electric`
- `Gas`
- `Manual`

### Tool Condition
- `Excellent`
- `Good`
- `Fair`
- `Poor`

---

## Migration Strategy

### Initial Setup
All tables created via Supabase migrations in sequential order to handle dependencies.

### Adding New Columns
Use ALTER TABLE migrations, always provide defaults for non-nullable columns.

### Data Integrity
- Use triggers instead of CHECK constraints for time-based validations
- Never modify Supabase reserved schemas (auth, storage, realtime)
- Always test migrations on staging before production

---

## Backup and Recovery

### Automated Backups
- Supabase provides daily automated backups
- Point-in-time recovery available
- Retention: 7 days on free tier, 30+ days on paid

### Manual Backups
Export schema and data using pg_dump for critical deployments.

---

## Performance Considerations

### Indexing Strategy
- Primary keys on all tables
- Foreign keys indexed automatically
- Composite indexes for common query patterns
- Consider partial indexes for status columns

### Query Optimization
- Use RLS policies efficiently
- Avoid N+1 queries with proper joins
- Use `select()` to limit returned columns
- Implement pagination for large result sets

### Scaling Considerations
- Connection pooling via Supabase
- Consider read replicas for heavy read workloads
- Monitor slow query logs
- Use database functions for complex queries

---

## Security Best Practices

### Row-Level Security
- Enabled on all tables
- Policies enforce group-based access
- Never trust client-side data
- Use security definer functions to avoid recursion

### Data Validation
- Schema validation in application layer
- Database constraints for critical rules
- Sanitize user inputs
- Validate file uploads

### Access Control
- Group-based multi-tenancy
- Role-based permissions
- Audit logs via tool_history
- Secure function execution

---

## Testing Data

### Seed Data Required
- Tool categories (10 predefined)
- Test users with profiles
- Sample groups
- Sample tools with images
- Test requests in various states

---

## Monitoring and Maintenance

### Key Metrics
- Active users per day
- Tools created per day
- Requests created/completed per day
- Storage usage
- Database size

### Regular Tasks
- Monitor for overdue requests (automated)
- Archive old completed requests (future)
- Clean up expired invites (future)
- Optimize indexes based on query patterns
- Review slow query logs

---

## Version History

- **v1.0** - Initial schema with core functionality
- **v1.1** - Added tool_group_visibility
- **v1.2** - Added user_preferences
- **v1.3** - Enhanced notifications system
