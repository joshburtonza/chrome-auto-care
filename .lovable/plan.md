
# Complete Implementation Plan: Lead Management System & Team Protocols

## Executive Summary
This plan implements all features previously discussed but not yet built, with robust full functionality:

1. **Lead Management System** - Complete CRM-style lead tracking with pipeline views
2. **Team Protocols & Responsibilities** - Display operational rules and role assignments
3. **Staff Role Enhancements** - New business-specific roles with permissions
4. **Dynamic Booking Stage Creation** - Use service-linked templates instead of static stages
5. **Workflow Notifications** - Lead alerts and follow-up reminders

---

## Phase 1: Database Schema Updates

### 1.1 Add New Staff Roles to Enum
Extend `staff_role` enum to include business-specific roles:
- `lead_manager` - Primary lead management
- `sales` - Pricing and conversions
- `admin_support` - Invoices, deposits, booking confirmations
- `reception` - First response, capture details

### 1.2 Enhance `staff_profiles` Table
Add new columns:
- `responsibilities` (TEXT[]) - Array of role-specific responsibilities
- `is_primary_contact` (BOOLEAN) - Whether this person is a primary contact
- `can_approve_pricing` (BOOLEAN) - Permission to approve pricing changes
- `can_collect_deposits` (BOOLEAN) - Permission to collect deposits
- `phone_number` (TEXT) - Direct phone for notifications

### 1.3 Create `leads` Table
Complete lead tracking table:
```
leads
├── id (UUID, PK)
├── name (TEXT) - Contact name
├── phone (TEXT) - Contact phone
├── email (TEXT) - Contact email
├── source (TEXT) - whatsapp, email, phone, walk_in, referral
├── vehicle_make (TEXT)
├── vehicle_model (TEXT)
├── vehicle_year (TEXT)
├── vehicle_color (TEXT)
├── service_interest (TEXT[]) - Array of service categories
├── notes (TEXT) - General notes
├── status (TEXT) - new, contacted, quoted, follow_up, deposit_paid, booked, lost
├── priority (TEXT) - normal, high, urgent
├── assigned_to (UUID) - FK to auth.users
├── created_by (UUID) - FK to auth.users
├── quoted_amount (NUMERIC)
├── deposit_amount (NUMERIC)
├── deposit_paid_at (TIMESTAMPTZ)
├── last_contact_at (TIMESTAMPTZ)
├── next_follow_up_at (TIMESTAMPTZ)
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
├── converted_to_booking_id (UUID) - FK to bookings
```

### 1.4 Create `lead_activities` Table
Activity log for all touchpoints:
```
lead_activities
├── id (UUID, PK)
├── lead_id (UUID) - FK to leads
├── activity_type (TEXT) - call, whatsapp, email, quote_sent, follow_up, note, status_change
├── description (TEXT)
├── created_by (UUID) - FK to auth.users
├── created_at (TIMESTAMPTZ)
├── metadata (JSONB) - Additional data like previous/new status
```

### 1.5 Update `create_booking_stages` Trigger
Replace static 10-stage creation with dynamic template-based stages:
1. Get service_id from booking
2. Find process_template linked to service
3. If found, copy stages from process_template_stages
4. If not found, fall back to default template
5. Each stage created with stage_name and stage_order from template

### 1.6 RLS Policies for New Tables
- Staff/Admin can view and manage all leads
- Leads table restricted to staff/admin only
- Lead activities tied to lead access

---

## Phase 2: Staff Leads Page (`/staff/leads`)

### 2.1 Lead Pipeline View (Kanban)
Columns representing lead status:
- **New** (blue) - Fresh enquiries
- **Contacted** (yellow) - Initial response made
- **Quoted** (orange) - Price sent, awaiting response
- **Follow Up** (purple) - Requires additional touchpoint
- **Deposit Paid** (green) - Committed, ready for booking
- **Booked** (teal) - Converted to booking

Features:
- Drag-and-drop between columns
- Lead cards show: name, phone, vehicle info, assigned staff, last activity timestamp
- Priority badges (urgent = red, high = orange)
- Click card to open detail view

### 2.2 Lead List View
Table with sortable columns:
- Name, Phone, Vehicle, Status, Assigned To, Last Contact, Next Follow-up, Quoted Amount
- Quick filters: My Leads, Unassigned, Needs Follow-up Today, Overdue
- Search by name, phone, or vehicle

### 2.3 Lead Detail Dialog
Full lead management interface:
- Contact info (editable)
- Vehicle details (editable)
- Status selector with automatic activity logging
- Activity timeline showing all touchpoints
- Add note/activity form
- Quote amount input
- Deposit recording
- **Convert to Booking** button (when deposit paid)
- Assign to staff dropdown

### 2.4 Lead Metrics Dashboard
Stats cards at top of page:
- New leads this week
- Conversion rate (deposit paid / total closed)
- Average time to close
- Leads by source (pie chart)
- Unassigned lead count (alert if > 0)

### 2.5 Add New Lead Form
Capture:
- Name (required)
- Phone (required)
- Email
- Source (dropdown)
- Vehicle Make/Model/Year/Color
- Service Interest (multi-select from categories)
- Notes
- Assign To (optional, defaults to current user)

---

## Phase 3: Team Protocols Display

### 3.1 Enhance StaffTeam Page
Add new section at top: **Team Protocols**

Protocol cards showing operational rules:
1. "All enquiries through official WhatsApp/Email only"
2. "Shared responsibility - see a lead, respond to it"
3. "Every lead must be tracked until closed"
4. "No booking without a deposit"
5. "App handover is mandatory - technicians work only from app"
6. "One team. One system. One standard."

### 3.2 Role Responsibilities Section
Display each team member's defined responsibilities with visual cards:

| Name | Role | Responsibilities | Permissions |
|------|------|------------------|-------------|
| Ridwaan | Lead Manager | Primary lead management, Daily follow-ups, Quote tracking | - |
| Farhaan | Senior Tech | Technical input, Scope accuracy, Support lead manager | - |
| Jerry | Sales | Pricing discussions, Push conversions, Quote follow-ups | Can Approve Pricing |
| Fatima | Admin Support | Invoices, Deposits, Booking confirmations, Status updates | Can Collect Deposits |
| Rebecca | Reception | First response, Capture details, Escalate to Jerry/Ridwaan | - |

### 3.3 Permission Badges
Visual indicators on staff cards:
- 💰 "Can Approve Pricing" badge
- 📥 "Can Collect Deposits" badge
- ⭐ "Primary Contact" badge

---

## Phase 4: Navigation Updates

### 4.1 Add Leads to Staff Navigation
Desktop nav (StaffNav.tsx):
- Add "Leads" link with Target icon after Dashboard
- Badge showing unassigned lead count

Mobile nav (StaffBottomNav.tsx):
- Add "Leads" to bottom nav (replace or add)
- Badge indicator for pending leads

More menu (MobileStaffNav.tsx):
- Add "Leads" to the sheet menu

### 4.2 Add Process Templates Link (Admin Only)
Currently not in nav - add to admin menu:
- Desktop: Add to nav items after Services
- Mobile: Add to more menu

---

## Phase 5: Dynamic Booking Stage Creation

### 5.1 Update Database Trigger
Replace `create_booking_stages` function:

```sql
CREATE OR REPLACE FUNCTION public.create_booking_stages()
RETURNS trigger AS $$
DECLARE
  template_record RECORD;
  stage_record RECORD;
  stage_enum stage_type;
BEGIN
  -- Find template linked to this service
  SELECT pt.id INTO template_record
  FROM process_templates pt
  WHERE pt.service_id = NEW.service_id
    AND pt.is_active = true
  LIMIT 1;
  
  -- If no service-specific template, use default
  IF template_record.id IS NULL THEN
    SELECT pt.id INTO template_record
    FROM process_templates pt
    WHERE pt.is_default = true
      AND pt.is_active = true
    LIMIT 1;
  END IF;
  
  -- If template found, copy its stages
  IF template_record.id IS NOT NULL THEN
    FOR stage_record IN
      SELECT stage_name, stage_order, description, requires_photo, estimated_duration_minutes
      FROM process_template_stages
      WHERE template_id = template_record.id
      ORDER BY stage_order
    LOOP
      -- Use 'vehicle_checkin' as default stage enum (will be displayed as stage_name)
      INSERT INTO booking_stages (
        booking_id, 
        stage, 
        stage_order, 
        completed,
        notes
      )
      VALUES (
        NEW.id,
        'vehicle_checkin', -- Using enum, actual name comes from stage_record
        stage_record.stage_order,
        false,
        stage_record.description
      );
    END LOOP;
    
    -- Store template_id on booking
    UPDATE bookings SET template_id = template_record.id WHERE id = NEW.id;
  ELSE
    -- Fallback: create default 10 stages
    INSERT INTO booking_stages (booking_id, stage, stage_order, completed)
    VALUES
      (NEW.id, 'vehicle_checkin', 1, false),
      (NEW.id, 'stripping', 2, false),
      (NEW.id, 'surface_prep', 3, false),
      (NEW.id, 'paint_correction', 4, false),
      (NEW.id, 'ppf_installation', 5, false),
      (NEW.id, 'reassembly', 6, false),
      (NEW.id, 'qc1', 7, false),
      (NEW.id, 'final_detail', 8, false),
      (NEW.id, 'qc2', 9, false),
      (NEW.id, 'delivery_prep', 10, false);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5.2 Add `stage_name` Column to `booking_stages`
New column to store the actual stage name from template (not just enum):
- `stage_name` (TEXT) - Display name like "Check-in + inspection"

### 5.3 Update Stage Display
In StaffWorkQueue and JobTracking pages:
- Display `stage_name` if available, otherwise use STAGE_LABELS mapping

---

## Phase 6: Notifications & Alerts

### 6.1 Lead Notification Triggers
Database triggers for:
- **New lead** → Notify assigned staff (or all lead managers if unassigned)
- **Lead unassigned > 1 hour** → Alert lead managers
- **Follow-up due today** → Reminder notification
- **Quote not followed up > 48 hours** → Escalation alert

### 6.2 Notification Functions
Create `notify_staff_new_lead` trigger function:
- Insert notification for assigned staff
- If unassigned, notify all staff with `lead_manager` role

### 6.3 Cron Job for Follow-up Reminders
Edge function `send-lead-reminders`:
- Query leads where next_follow_up_at <= today
- Send in-app notifications to assigned staff
- Optionally send push notifications

---

## Phase 7: Lead-to-Booking Conversion

### 7.1 Conversion Flow
When "Convert to Booking" clicked:
1. Validate deposit_paid_at is set
2. Create vehicle record if not exists
3. Create booking with:
   - user_id from lead's customer (or create profile)
   - service_id from lead's primary service interest
   - vehicle_id from created/found vehicle
   - status = 'confirmed'
   - payment_status = 'deposit_paid'
   - notes referencing lead
4. Update lead: status = 'booked', converted_to_booking_id
5. Log activity: "Converted to booking"
6. Navigate to booking page

### 7.2 Customer Linking
- If lead has email matching existing profile → link
- Otherwise, send invitation to customer portal
- Store temporary customer info in booking notes

---

## Implementation Files

### New Files to Create:
| File | Description |
|------|-------------|
| `src/pages/staff/StaffLeads.tsx` | Lead management page with pipeline/list views |
| `src/components/leads/LeadPipeline.tsx` | Kanban-style pipeline component |
| `src/components/leads/LeadCard.tsx` | Individual lead card in pipeline |
| `src/components/leads/LeadDetailDialog.tsx` | Full lead detail/edit modal |
| `src/components/leads/LeadMetrics.tsx` | Dashboard metrics cards |
| `src/components/leads/AddLeadDialog.tsx` | New lead form dialog |
| `src/components/leads/LeadActivityTimeline.tsx` | Activity log display |
| `src/components/team/TeamProtocols.tsx` | Team protocols display component |
| `src/components/team/RoleResponsibilities.tsx` | Role responsibilities cards |
| `src/hooks/useLeads.ts` | Lead CRUD operations hook |
| `supabase/functions/send-lead-reminders/index.ts` | Follow-up reminder edge function |

### Files to Modify:
| File | Changes |
|------|---------|
| `src/App.tsx` | Add StaffLeads route |
| `src/components/staff/StaffNav.tsx` | Add Leads and Process Templates links |
| `src/components/staff/MobileStaffNav.tsx` | Add Leads to more menu |
| `src/components/staff/StaffBottomNav.tsx` | Add Leads to bottom nav |
| `src/pages/staff/StaffTeam.tsx` | Add protocols and responsibilities sections |
| `src/pages/staff/StaffWorkQueue.tsx` | Use stage_name for display |
| `src/pages/JobTracking.tsx` | Use stage_name for display |
| `supabase/config.toml` | Add send-lead-reminders function |

### Database Migrations:
1. Add new staff_role enum values
2. Add columns to staff_profiles
3. Create leads table with RLS
4. Create lead_activities table with RLS
5. Add stage_name column to booking_stages
6. Update create_booking_stages trigger
7. Create lead notification triggers

---

## Summary

| Feature | Complexity | Priority |
|---------|------------|----------|
| Leads table + RLS | Medium | High |
| Lead activities table | Low | High |
| Staff profile enhancements | Low | Medium |
| StaffLeads page (pipeline) | High | High |
| StaffLeads page (list view) | Medium | High |
| Lead detail dialog | High | High |
| Team protocols display | Low | Medium |
| Role responsibilities | Low | Medium |
| Navigation updates | Low | High |
| Dynamic stage creation | Medium | High |
| Lead notifications | Medium | Medium |
| Lead-to-booking conversion | High | High |
| Follow-up reminders | Medium | Low |

**Total Estimated Components:** 13 new files, 9 modified files, 7 database migrations
