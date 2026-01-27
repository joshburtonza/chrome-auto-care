
# Complete Services Catalog Overhaul

## Overview
Replace the current 17+ service catalog with 29 new productized services, each with unique process templates and phases for task tracking. This update affects both client-facing and staff-side interfaces.

---

## Phase 1: Database Schema Enhancement

### 1.1 Add New Columns to `services` Table
The current schema lacks fields for the new service structure. We need to add:

```sql
ALTER TABLE services ADD COLUMN IF NOT EXISTS notes TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS add_ons TEXT[];
```

**Existing columns we'll use:**
- `title` → Service name (e.g., "RT Fresh Wash")
- `description` → Outcome text (e.g., "Fast, safe maintenance clean — inside and out.")
- `category` → Category (Detailing, Paint Correction, Ceramic, PPF, PPS, Tint, Restoration, Accessories)
- `duration` → Typical turnaround
- `features` → "What you get" / Includes array
- `price_from` → Price (will need to be set per service)
- `color` → Category color coding

---

## Phase 2: Database Data Population

### 2.1 Clean Existing Data
- Deactivate or delete all existing services
- Delete all existing process templates and their stages

### 2.2 Insert 29 New Services

| # | Service Name | Category | Duration |
|---|-------------|----------|----------|
| 1 | RT Fresh Wash | Detailing | Same day |
| 2 | RT Decon + Gloss | Detailing | Same day / next day |
| 3 | RT Cabin Reset | Detailing | Same day / next day |
| 4 | RT Full Reset Detail | Detailing | 1–2 days |
| 5 | RT Cabin Restore (Custom) | Restoration | Quoted after inspection |
| 6 | RT Paint Assist (Partnered) | Restoration | Typically 1–2 days |
| 7 | RT Gloss Boost (Stage 1) | Paint Correction | ~2 days |
| 8 | RT Mirror Finish (Stage 2) | Paint Correction | ~3–4 days |
| 9 | RT Show Car Finish (Stage 3) | Paint Correction | ~4–5 days |
| 10 | RT Concours Finish (Stage 4) | Paint Correction | ~1–2 weeks |
| 11 | RT Ceramic Shield — 3/5/7 | Ceramic | ~1 day |
| 12 | RT Ceramic Film Shield | Ceramic | Quoted |
| 13 | RT Cabin Shield | Ceramic | ~½ day |
| 14 | RT Wheel Shield | Ceramic | ~½ day |
| 15 | RT StoneGuard Front | PPF | ~3–4 days |
| 16 | RT StoneGuard Full | PPF | Quoted / multi-day |
| 17 | RT StoneGuard Repair | PPF | ~1–3 days |
| 18 | RT LightSmoke Film | PPF | ~1–2 days |
| 19 | RT ColorGuard Wrap | PPF | ~1–1.5 weeks |
| 20 | RT CarbonGuard Trim | PPF | ~1–3 days |
| 21 | RT SprayShield Front | PPS | ~2–4 days |
| 22 | RT SprayShield Full | PPS | ~1–1.5 weeks |
| 23 | RT StealthShield (Matte) | PPS | ~1–1.5 weeks |
| 24 | RT SprayWrap Color | PPS | ~1–1.5 weeks |
| 25 | RT SprayShield Add-Ons | PPS | ~2–3 days |
| 26 | RT ShadeLine Windows | Tint | ~2 hours |
| 27 | RT ShadeLine Windscreen | Tint | ~1–1.5 hours |
| 28 | RT WindGuard Film | Tint | ~1.5 hours |
| 29 | RT PlatePro Holder | Accessories | ~30 minutes |

### 2.3 Create 29 Process Templates with Phases

Each service gets a linked process template with the exact phases specified. Example:

**RT Fresh Wash (4 phases):**
1. Check-in + inspection
2. Exterior clean (wheels + safe wash)
3. Dry + cabin refresh (wipe + vacuum)
4. Final check + handover

**RT StoneGuard Front (4 phases):**
1. Book-in + inspection + prep wash
2. Paint correction + re-wash
3. PPF install (pre-cut)
4. Cure + final QC + handover

---

## Phase 3: Client-Side Services Page Updates

### 3.1 Enhanced Services Index Page (`src/pages/Services.tsx`)

**New UI Components:**
- **Category Filter Chips**: Horizontal scrollable chips for filtering by category (Detailing, Paint Correction, Ceramic, PPF, PPS, Tint, Restoration, Accessories)
- **Search Bar**: Filter services by name/keyword
- **Service Cards Grid**: Each card shows:
  - Service name
  - One-line outcome description
  - Category chip (color-coded)
  - Duration chip
  - Click to open detail modal

### 3.2 Service Detail Drawer/Modal

**Sections:**
1. **Hero**: Service name + short outcome sentence
2. **"What You Get"**: 2-5 bullet points from `features` array
3. **"Process"**: Show consolidated phases (3-5 steps from linked template)
4. **"Typical Turnaround"**: Duration string
5. **"Notes"**: Any dependencies/notes (e.g., "correction level depends on paint condition")
6. **"Add-ons"**: Optional add-on services if applicable
7. **CTA Button**: "Request Booking" (opens booking flow)

---

## Phase 4: Staff-Side Services Management Updates

### 4.1 Enhanced StaffServices Page (`src/pages/staff/StaffServices.tsx`)

**Updates:**
- Display all new service fields (notes, add-ons)
- Show linked process template with phase count
- Category filter/search functionality
- Edit dialog includes:
  - Title, Category, Description (outcome)
  - Duration, Price
  - Features (includes) editor
  - Notes editor
  - Add-ons editor
  - Color picker
  - Link to process template management

---

## Phase 5: Task Tracking Integration

### 5.1 Update Booking Creation Flow

When a booking is created:
1. Lookup the service's linked process template
2. If found, copy template stages to `booking_stages`
3. If not found, use default workflow

### 5.2 Process Templates Hook Update

The existing `useProcessTemplates.ts` hook already supports:
- Fetching templates with stages
- CRUD operations on templates and stages
- Service linking

**No changes needed** - just need to populate correct data.

---

## Implementation Order

1. **Database Migration**: Add `notes` and `add_ons` columns to services table
2. **Data Cleanup**: Deactivate existing services and templates
3. **Data Population**: Insert 29 services with all fields
4. **Template Creation**: Create 29 process templates linked to services
5. **Stage Population**: Add phases to each template
6. **Client Services Page**: Add category filters, search, and enhanced detail modal
7. **Staff Services Page**: Update form to handle all fields
8. **Testing**: Verify booking flow creates correct stages

---

## Technical Details

### Category Color Mapping
```text
Detailing:        #10b981 (Green)
Restoration:      #f59e0b (Amber)
Paint Correction: #8b5cf6 (Purple)
Ceramic:          #06b6d4 (Cyan)
PPF:              #3b82f6 (Blue)
PPS:              #ec4899 (Pink)
Tint:             #6366f1 (Indigo)
Accessories:      #6b7280 (Gray)
```

### Files to Create/Modify

| File | Action |
|------|--------|
| Database migration | Add `notes`, `add_ons` columns |
| `src/pages/Services.tsx` | Add filters, search, enhanced detail modal |
| `src/pages/staff/StaffServices.tsx` | Update form fields, show template info |
| `src/components/services/ServiceDetailModal.tsx` | New component for service details |
| `src/components/services/CategoryFilter.tsx` | New component for category filtering |

### Service Data Summary
- **29 total services** across 8 categories
- **Each with 3-4 process phases** for task tracking
- **Simplified, client-friendly phase names** (no granular detailing steps)

---

## Estimated Work

- Database changes: 1 migration
- Data population: 29 services + 29 templates + ~100 stages
- Client UI updates: Services page enhancements
- Staff UI updates: StaffServices form expansion
- Total estimated development: Medium complexity
