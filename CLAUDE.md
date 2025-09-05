# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status Overview

### **Current Project: Tickker Portfolio Tracker**
A full-stack portfolio tracking application that was **successfully migrated from SQLite to Supabase** (PostgreSQL with authentication).

## Migration Progress Summary

### ✅ **COMPLETED MIGRATIONS**
1. **Database Migration**: SQLite → Supabase PostgreSQL
2. **Authentication System**: JWT → Supabase Auth with Google OAuth  
3. **Backend API**: SQLModel/SQLAlchemy → Supabase client with FastAPI
4. **Frontend API Integration**: All 11 components updated to use `@/utils/supabase-api`
5. **Data Structure Fixes**: Fixed field naming mismatches (portfolio/spy vs portfolio_value/spy_value)
6. **Error Handling**: Added null/undefined checks to formatting functions
7. **CSV Upload**: Working with date correction (2025→2024) and user profile creation

### 🟡 **PARTIALLY WORKING**
1. **Charts**: Performance and SPY comparison charts are loading and displaying data correctly
2. **Portfolio Features**: Weights, recent trades, dividends all functional
3. **CSV Processing**: Upload works with automatic date correction for Yahoo Finance compatibility

### ❌ **CURRENT ISSUES**
1. **Groups Functionality**: 
   - **Root Cause**: Supabase Row Level Security (RLS) policies causing "infinite recursion" errors
   - **Status**: Backend bypass implemented but needs testing
   - **Error**: `infinite recursion detected in policy for relation "group_member"`

## Technical Architecture

### **Backend (FastAPI)**
- **File**: `backend/supabase_main.py` (primary backend)
- **Database**: Supabase PostgreSQL with RLS policies
- **Authentication**: Supabase JWT tokens
- **Key Endpoints**:
  - `/api/upload` - CSV processing ✅
  - `/api/performance` - Performance metrics ✅
  - `/api/comparison/spy` - SPY comparison data ✅  
  - `/api/groups` - Group operations ❌ (RLS issues)

### **Frontend (Next.js 14)**
- **API Layer**: `frontend/utils/supabase-api.ts` (unified API client)
- **Authentication**: `frontend/contexts/AuthContext.tsx` (Supabase Auth)
- **Key Components**:
  - `GrowthChart.tsx` - Portfolio vs SPY comparison ✅
  - `PerformanceMetrics.tsx` - Performance dashboard ✅
  - `GroupsBar.tsx` - Group management ❌ (dependent on backend groups API)

## Database Schema

### **Core Tables** (in Supabase)
```sql
- profiles (user data)
- transactions (portfolio transactions) ✅
- portfolio_history (calculated portfolio values) ✅
- groups (investment groups) ❌ RLS issues
- group_members (group memberships) ❌ RLS issues
```

### **RLS Policy Issues**
The `groups` and `group_members` tables have circular reference policies causing infinite recursion:
- `group_members` policy checks `group_members` table (self-reference)
- `groups` policy references `group_members`, creating circular dependency

**Files with policy fixes**:
- `supabase_rls_policies.sql` - Updated with corrected policies
- `fix_rls_policies.sql` - Standalone fix script

## Development Commands

### Backend (FastAPI)
```bash
cd /Users/sohumtrivedi/Downloads/VSCode/Tickker/Tickker
./run-backend.sh           # Starts on http://localhost:8000
```

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev                # Starts on http://localhost:3000
```

## Immediate Next Steps for New Claude Session

### **Priority 1: Fix Groups Functionality**
1. **Test current backend bypass**: The backend now uses admin client to bypass RLS
2. **If still failing**: Apply the SQL fixes directly to Supabase database:
   ```sql
   -- Run in Supabase SQL Editor
   DROP POLICY IF EXISTS "Users can view group members for groups they belong to" ON group_members;
   CREATE POLICY "Users can view group members for groups they belong to" ON group_members
       FOR SELECT USING (user_id = auth.uid());
   ```
3. **Alternative**: Temporarily disable RLS entirely on groups tables for testing

### **Priority 2: Verification & Testing**
1. Test group creation and listing workflow
2. Verify CSV upload still works after changes
3. Test all chart functionality (Growth Chart, Performance Metrics)
4. Ensure authentication flows work properly

### **Priority 3: Code Quality**
1. Remove debug console.log statements from production code
2. Add proper error boundaries for failed API calls
3. Improve loading states and user feedback

## Key Files Reference

### **Configuration**
- `frontend/lib/supabase.ts` - Supabase client configuration
- `backend/supabase_client.py` - Backend Supabase client setup
- `.env` files needed for Supabase credentials

### **API Integration**
- `frontend/utils/supabase-api.ts` - **Primary API client** (all components use this)
- `frontend/utils/api.ts` - **DEPRECATED** (old API, should not be used)

### **Database**
- `supabase_schema.sql` - Complete database schema
- `supabase_rls_policies.sql` - Row Level Security policies (has circular reference issues)
- `fix_rls_policies.sql` - Corrected policies to resolve infinite recursion

## Common Issues & Solutions

### **"infinite recursion detected in policy"**
- **Cause**: Circular references in RLS policies
- **Solution**: Apply `fix_rls_policies.sql` in Supabase dashboard
- **Workaround**: Backend bypass implemented using admin client

### **"Cannot read properties of undefined (reading 'toFixed')"**
- **Cause**: API returning undefined values to formatting functions
- **Solution**: Added null checks in `frontend/utils/format.ts` ✅

### **Charts showing "NaN%" values**
- **Cause**: Data structure mismatch between backend and frontend
- **Solution**: Fixed backend to return `portfolio`/`spy` instead of `portfolio_value`/`spy_value` ✅

## Migration History

### **Major Milestones**
1. **Initial Setup** - Supabase project created, schema deployed
2. **Backend Migration** - FastAPI updated to use Supabase client
3. **Frontend Migration** - All 11 components updated from `@/utils/api` to `@/utils/supabase-api`
4. **Data Structure Alignment** - Fixed field naming between backend/frontend
5. **RLS Policy Issues Identified** - Groups functionality blocked by circular policies
6. **Backend Bypass Implementation** - Admin client bypass for groups operations

### **Working Features** ✅
- User authentication (email/password + Google OAuth)
- CSV portfolio upload with automatic processing
- Portfolio performance tracking and visualization
- SPY comparison charts with time-weighted returns
- Portfolio weights and recent trades display
- Dividend tracking and analysis

### **Blocked Features** ❌
- Investment groups creation and management
- Group leaderboards and member comparisons
- Social features (notes, recommendations)

## Notes for Future Development

1. **Supabase MCP Integration**: Consider setting up Supabase MCP for direct database access
2. **RLS Simplification**: The current RLS policies are overly complex - consider simpler, non-circular policies
3. **Error Handling**: Add more robust error boundaries and user feedback
4. **Performance**: Consider caching strategies for frequently accessed data
5. **Security**: Review and audit all RLS policies once groups functionality is restored

## Environment Setup Required

### **Supabase Configuration**
- Project URL and anon key in frontend `.env`
- Service role key in backend `.env`
- Database schema and RLS policies applied

### **External Dependencies**
- Yahoo Finance API (for stock price data)
- Chart.js (for portfolio visualizations)
- Tailwind CSS (for styling)

---

**Last Updated**: September 2025 by Claude Code
**Status**: Groups functionality blocked by RLS policy issues, all other features operational