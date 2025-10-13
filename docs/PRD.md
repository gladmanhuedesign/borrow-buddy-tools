# Product Requirements Document (PRD)
# BorrowBuddy - Tool Sharing Platform

## Executive Summary

BorrowBuddy is a community-based tool sharing platform that enables users to lend and borrow tools within private groups. The platform uses AI-powered tool recognition to simplify the listing process and provides a complete request/approval workflow for managing tool borrowing.

## Product Overview

### Vision
To create a trusted, community-driven platform where neighbors and groups can easily share tools, reducing waste and building stronger communities.

### Mission
Enable seamless tool sharing through intelligent automation, intuitive interfaces, and secure group management.

## Target Users

### Primary Users
1. **Tool Owners** - Individuals who own tools and want to share them with trusted groups
2. **Tool Borrowers** - People who need tools temporarily and prefer borrowing over buying
3. **Group Administrators** - Community leaders managing sharing groups

### User Personas

**Persona 1: The Generous Homeowner**
- Age: 35-55
- Owns various tools from home improvement projects
- Wants to help neighbors but needs accountability
- Values organization and tracking

**Persona 2: The Occasional DIYer**
- Age: 25-45
- Needs tools infrequently
- Prefers borrowing over purchasing expensive tools
- Values convenience and clear instructions

**Persona 3: The Community Organizer**
- Age: 30-60
- Manages neighborhood or organization groups
- Wants to facilitate resource sharing
- Values control and transparency

## Core Features

### 1. User Authentication & Profiles
**Priority: P0 (Critical)**

#### Requirements
- Email/password authentication
- Google OAuth integration
- User profile with display name and avatar
- Preference settings for notifications

#### Success Metrics
- Registration completion rate > 80%
- Login success rate > 95%

### 2. Group Management
**Priority: P0 (Critical)**

#### Requirements
- Create private/public groups
- Invite members via email
- Generate shareable invite links with expiration
- Role-based permissions (admin/member)
- View group member list
- Remove members (admin only)

#### User Stories
- As a user, I can create a private group for my neighborhood
- As an admin, I can invite new members via email
- As a user, I can join groups using an invite link
- As an admin, I can manage member permissions

#### Success Metrics
- Average members per group > 5
- Invite acceptance rate > 60%

### 3. Tool Management
**Priority: P0 (Critical)**

#### Requirements
- Add tools with photo upload
- AI-powered auto-fill (brand, category, condition, power source)
- Manual editing of all tool fields
- Tool categories: Power Tools, Hand Tools, Garden Tools, etc.
- Tool status: Available, Borrowed, Maintenance
- Hide tools from specific groups
- View tool borrowing history
- Edit and delete owned tools

#### Tool Fields
- Name (required)
- Description
- Category (required)
- Condition (Excellent, Good, Fair, Poor)
- Brand (optional)
- Power Source (Battery, Corded Electric, Gas, Manual)
- Instructions for use
- Photos
- Status

#### User Stories
- As a tool owner, I can quickly add a tool by uploading a photo
- As a tool owner, I can see who has borrowed my tools
- As a tool owner, I can provide usage instructions
- As a tool owner, I can hide certain tools from specific groups

#### Success Metrics
- Tools with photos > 90%
- AI auto-fill accuracy > 85%
- Average tools per user > 3

### 4. Tool Discovery & Search
**Priority: P0 (Critical)**

#### Requirements
- Browse all available tools in user's groups
- Filter by:
  - Category
  - Status (Available/Borrowed)
  - Group
  - Condition
  - Power source
- Search by tool name or description
- View tool details including owner info
- See tool availability status

#### User Stories
- As a borrower, I can search for "drill" across all my groups
- As a borrower, I can filter to see only available power tools
- As a borrower, I can view tool details before requesting

#### Success Metrics
- Search usage rate > 40% of sessions
- Filter usage > 30% of searches

### 5. Request Management
**Priority: P0 (Critical)**

#### Requirements

**For Borrowers:**
- Request a tool with date range
- Add optional message to owner
- Cancel pending requests
- Mark tool as picked up
- Request return initiation
- View request history

**For Owners:**
- View incoming requests
- Approve or deny requests
- See borrower information
- Confirm tool pickup
- Confirm tool return
- Add return notes (condition, issues)

**Request Statuses:**
- Pending - Awaiting owner approval
- Approved - Owner approved, awaiting pickup
- Picked Up - Tool in borrower's possession
- Return Pending - Borrower initiated return
- Returned - Complete transaction
- Denied - Owner declined request
- Canceled - Borrower canceled
- Overdue - Past return date

#### User Stories
- As a borrower, I can request a tool for specific dates
- As an owner, I can approve/deny requests with reasons
- As an owner, I can track tool location status
- As a borrower, I can view my borrowing history

#### Success Metrics
- Request approval rate > 70%
- Average response time < 24 hours
- Return completion rate > 95%

### 6. Notifications System
**Priority: P1 (High)**

#### Requirements
- In-app notifications
- Real-time notification updates
- Notification types:
  - New tool request
  - Request approved/denied
  - Tool pickup reminder
  - Return reminder
  - Overdue notification
  - Group invitation
- Mark notifications as read
- Notification preferences in settings

#### User Stories
- As a user, I receive notifications when my requests are approved
- As an owner, I'm notified immediately of new requests
- As a user, I can control which notifications I receive

#### Success Metrics
- Notification open rate > 60%
- Average response time after notification < 12 hours

### 7. Dashboard
**Priority: P1 (High)**

#### Requirements
- Quick actions (Add Tool, Browse Tools, Create Group)
- Active borrowing list (tools user has borrowed)
- Active lending list (tools user has lent out)
- Pending actions requiring user attention
- Recently added tools feed
- Activity summary

#### User Stories
- As a user, I see my active borrows and lends at a glance
- As a user, I can quickly access common actions
- As a user, I'm alerted to pending actions

#### Success Metrics
- Dashboard visit rate > 80% of sessions
- Quick action usage > 50%

### 8. AI Tool Recognition
**Priority: P1 (High)**

#### Requirements
- Analyze uploaded tool images
- Extract and suggest:
  - Tool name
  - Category
  - Brand
  - Condition assessment
  - Power source
- Confidence scoring
- User can accept or edit suggestions
- Batch analysis for existing tools

#### Technical Details
- Uses Lovable AI Gateway (Google Gemini)
- Supabase Edge Function: `analyze-tool-image`
- Batch processing: `batch-analyze-tools`

#### Success Metrics
- AI suggestion acceptance rate > 75%
- Time to add tool reduced by 50%

## Platform-Specific Features

### Native Mobile App (iOS/Android)
**Priority: P1 (High)**

#### Additional Requirements
- Camera integration for tool photos
- Push notifications
- Offline mode for viewing owned tools
- Native sharing for invite links
- Biometric authentication
- Photo gallery access
- Location services for local groups (future)

#### User Stories
- As a mobile user, I can take a photo directly to add a tool
- As a mobile user, I receive push notifications for requests
- As a mobile user, I can view my tools offline

### Web App
**Priority: P0 (Critical)**

#### Requirements
- Responsive design (mobile, tablet, desktop)
- File upload from device
- Desktop-optimized layouts
- Keyboard shortcuts for power users

## Non-Functional Requirements

### Performance
- Page load time < 2 seconds
- Image upload < 5 seconds
- AI analysis response < 10 seconds
- Real-time notification delivery < 1 second
- Support 1000+ concurrent users

### Security
- Row-level security on all database tables
- Secure file storage with access controls
- Authentication required for all operations
- Group-based data isolation
- HTTPS/SSL encryption
- Secure API key management

### Scalability
- Support 10,000+ users
- Handle 100,000+ tools
- Process 10,000+ requests per day
- Serverless architecture for auto-scaling

### Reliability
- 99.9% uptime
- Automated backups
- Error logging and monitoring
- Graceful error handling

### Usability
- Intuitive interface requiring no training
- Accessibility compliance (WCAG 2.1 AA)
- Multi-language support (future)
- Clear error messages and help text

## Technical Stack

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- React Router
- React Hook Form + Zod validation
- TanStack Query

### Backend
- Supabase
  - PostgreSQL database
  - Row-level security
  - Edge Functions (Deno)
  - Authentication
  - Storage
  - Real-time subscriptions

### AI/ML
- Lovable AI Gateway
- Google Gemini 2.5 Flash

### Mobile
- Capacitor 6
- Platform-specific integrations

## User Flows

### 1. New User Onboarding
1. User visits app
2. Clicks "Sign Up"
3. Enters email, password, display name
4. Receives welcome notification
5. Prompted to join or create first group
6. Sees dashboard with quick start guide

### 2. Adding a Tool
1. User clicks "Add Tool" from dashboard
2. Uploads photo of tool
3. AI analyzes and suggests details
4. User reviews and edits suggestions
5. Adds optional instructions
6. Selects which groups can see tool
7. Tool published to selected groups

### 3. Borrowing a Tool
1. User browses or searches for tool
2. Views tool details and availability
3. Clicks "Request to Borrow"
4. Selects date range
5. Adds optional message
6. Submits request
7. Receives notification when approved
8. Coordinates pickup with owner
9. Marks as picked up
10. Returns tool and requests return confirmation
11. Owner confirms return

### 4. Managing Requests (Owner)
1. Receives notification of new request
2. Reviews request details and borrower info
3. Checks dates and availability
4. Approves or denies with optional message
5. Coordinates pickup
6. Confirms pickup when tool collected
7. Receives return notification
8. Inspects tool condition
9. Confirms return with optional notes

### 5. Creating and Managing a Group
1. User clicks "Create Group"
2. Enters name, description
3. Sets privacy (private/public)
4. Creates group (becomes admin)
5. Generates invite link or sends email invites
6. Manages member list
7. Views group activity

## Success Metrics

### Engagement Metrics
- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Average session duration > 5 minutes
- Tools per active user > 3
- Requests per week per user > 1

### Transaction Metrics
- Request approval rate > 70%
- Successful returns rate > 95%
- Average tool utilization > 20%
- Repeat borrowing rate > 60%

### Growth Metrics
- User growth rate > 20% month-over-month
- Group formation rate
- Viral coefficient (invites per user)
- Retention rate > 60% after 30 days

### Quality Metrics
- AI accuracy > 85%
- User satisfaction score > 4.5/5
- Net Promoter Score > 50
- Support ticket rate < 5%

## Future Enhancements (Roadmap)

### Phase 2 (3-6 months)
- In-app messaging between borrowers/owners
- Calendar integration
- Tool maintenance tracking
- Rating and review system
- Insurance integration

### Phase 3 (6-12 months)
- Payment integration for tool rental
- Damage deposit system
- Location-based discovery
- Public tool libraries
- Business accounts for rental companies

### Phase 4 (12+ months)
- Marketplace for buying/selling tools
- Tool recommendation engine
- Community events and workshops
- Partner integrations (hardware stores)
- Advanced analytics for owners

## Constraints and Assumptions

### Constraints
- Must use Supabase for backend
- Must support web and native mobile
- Must maintain <$100/month operational costs initially
- Single developer/small team initially

### Assumptions
- Users are part of trusted communities
- Users have smartphones with cameras
- Users are motivated by community benefit
- Tools are returned in good condition
- Groups self-moderate behavior

## Risks and Mitigation

### Risk 1: Tool Damage/Loss
**Mitigation:** 
- Clear condition documentation with photos
- Return inspection process
- Future: Insurance integration

### Risk 2: Low Adoption
**Mitigation:**
- Focus on community groups first
- Viral invite mechanics
- Gamification and incentives

### Risk 3: Spam/Abuse
**Mitigation:**
- Private groups by default
- Admin moderation tools
- Reporting system
- Future: User reputation scores

### Risk 4: Scalability Costs
**Mitigation:**
- Serverless architecture
- Image optimization
- Efficient AI usage
- Usage monitoring

## Glossary

- **Tool Owner**: User who owns and lists tools
- **Borrower**: User requesting to borrow tools
- **Group**: Collection of users who can share tools
- **Request**: Formal request to borrow a tool
- **Admin**: Group member with management permissions
- **RLS**: Row-Level Security (database security model)
- **Edge Function**: Serverless backend function
- **AI Analysis**: Automated tool recognition from images

## Appendix

### Design Principles
1. **Trust First**: Build features that encourage trust
2. **Simplicity**: Make common actions one-click away
3. **Transparency**: Clear status and expectations
4. **Community**: Foster connections between users
5. **Reliability**: Ensure tools are returned

### References
- User research findings
- Competitor analysis
- Technical architecture docs
- Database schema documentation
