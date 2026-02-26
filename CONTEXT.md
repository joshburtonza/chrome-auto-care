# Race Technik — chrome-auto-care Context

## Business Overview
Race Technik is a premium automotive care business in Cape Town, South Africa.
Services: paint protection film (PPF), vinyl wrapping, ceramic coating, paint correction, window tinting, full detailing.
Clientele: car enthusiasts, luxury and performance vehicle owners, fleet operators, new car buyers.
Revenue model: bookings paid online via Yoco checkout or in-shop card machine.

## Key People
- Yaseen — business owner, strategic decisions (Telegram: 520957631)
- Farhaan — operations manager, day-to-day contact (Telegram: 1173308443)
- Josh (Amalfi AI) — platform builder and AI system developer

## Platform: chrome-auto-care
Stack: Vite + React + TypeScript + Supabase (PostgreSQL) + Tailwind CSS
Deployment: Vercel (frontend) + Supabase (backend/auth/DB)
Payments: Yoco (webhook-confirmed). DO NOT touch payment logic without full test cycle.
PWA: vite-plugin-pwa. Test service worker after any UI changes.
Auth: Supabase RLS with roles — admin / staff / client
Active branch: slop-fixes (all current work commits go here)

## Key Tables
- bookings: booking_date, booking_time, status (pending/confirmed/in_progress/completed/cancelled), payment_amount, payment_status, current_stage
- booking_stages: step-by-step workflow per booking (stage, completed, notes, photos via booking_stage_images)
- booking_services: line items (service_id, price) per booking
- services: service catalogue with price_from, duration, category, features
- vehicles: client cars (make, model, year, colour, vin, user_id)
- profiles: client profiles (full_name, phone, address) keyed by auth user_id
- leads: CRM prospects (name, phone, email, service_interest[], status, next_follow_up_at, quoted_amount, vehicle_make, vehicle_model)
- staff_profiles: staff (roles: technician/senior_technician/team_lead/supervisor/manager/director)
- inventory: stock levels with categories (ppf_film, vinyl, adhesives, cleaning_supplies, polishing_compounds, tools, equipment), quantity, min_stock_level, unit
- loyalty_points: client points balance and tier (points, lifetime_points, tier)
- reviews: client ratings (rating 1-5, content, is_featured, is_public)
- addon_requests: upsell requests during active jobs needing approval (status: pending/approved/rejected)
- notifications: in-app and push notifications per user

## Development Workflow
1. Make changes in the repo at ~/.amalfiai/workspace/clients/chrome-auto-care/
2. Run: npm run build (from repo root) to check for TypeScript errors
3. Commit and push to slop-fixes: git add -p && git commit -m "..." && git push origin slop-fixes
4. Vercel auto-deploys on push

## Current Context (Feb 2026)
Focus areas:
- Bug fixes and UX polish on slop-fixes branch
- Staff work queue improvements
- Lead management CRM enhancements
- Inventory tracking accuracy
- PWA reliability

Farhaan monitors the staff dashboard daily. Yaseen reviews weekly reports.
