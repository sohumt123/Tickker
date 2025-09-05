# Supabase Migration Guide for Tickker

This guide explains how to migrate the Tickker Portfolio application from SQLite to Supabase.

## Prerequisites

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project credentials:
   - Project URL
   - Anon (public) key
   - Service role (secret) key

## Migration Steps

### 1. Set up Supabase Database

1. In your Supabase dashboard, go to the SQL Editor
2. Run the schema creation script: `supabase_schema.sql`
3. Run the RLS policies script: `supabase_rls_policies.sql`

### 2. Configure Environment Variables

**Backend (.env):**
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Enable Google OAuth (Optional)

1. In Supabase Dashboard → Authentication → Providers
2. Enable Google OAuth
3. Configure your Google Cloud Console:
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `https://your-project-ref.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret to Supabase

### 4. Start the Supabase Backend

```bash
cd backend
source venv/bin/activate
python supabase_main.py
```

### 5. Install Frontend Dependencies

```bash
cd frontend
npm install @supabase/supabase-js
npm run dev
```

## Key Changes Made

### Authentication
- **Before**: JWT-based auth with SQLite user storage
- **After**: Supabase Auth with Google OAuth support
- **Changes**: 
  - User sessions managed by Supabase
  - JWT tokens issued by Supabase
  - Profile data stored in `profiles` table

### Database
- **Before**: SQLite with SQLModel/SQLAlchemy
- **After**: PostgreSQL with Supabase client
- **Changes**:
  - All models converted to Supabase tables
  - Row Level Security (RLS) policies implemented
  - Real-time subscriptions available (not yet implemented)

### Frontend
- **Before**: `utils/api.ts` with axios
- **After**: `utils/supabase-api.ts` with Supabase client
- **Changes**:
  - Authentication context using Supabase Auth
  - API calls use Supabase client where possible
  - OAuth callback route for Google login

### Backend
- **Before**: `accurate_main.py` with SQLite
- **After**: `supabase_main.py` with Supabase
- **Changes**:
  - Authentication uses Supabase JWT verification
  - Database operations use Supabase client
  - Row Level Security enforces data access

## Testing the Migration

1. **Authentication**: Try logging in with email/password or Google OAuth
2. **CSV Upload**: Upload a portfolio CSV file
3. **Portfolio View**: Check that portfolio data displays correctly
4. **Groups**: Create and join investment groups
5. **Data Persistence**: Verify data persists across browser sessions

## Rollback Plan

If needed, you can rollback by:
1. Stopping the Supabase backend: `pkill -f supabase_main.py`
2. Starting the original backend: `python accurate_main.py`
3. The original frontend will work with the original backend

## Production Deployment

For production deployment:
1. Deploy the Supabase backend to your preferred hosting platform
2. Update the frontend environment variables to point to your production backend
3. Configure your production domain in Supabase Auth settings
4. Set up proper backup and monitoring for your Supabase project

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Check that SUPABASE_URL and keys are correctly set
   - Verify JWT token format and expiration
   - Check RLS policies are properly configured

2. **CORS Errors**
   - Ensure frontend URL is in backend CORS_ORIGINS
   - Check that Supabase project allows your domain

3. **Database Errors**
   - Verify schema was created successfully
   - Check RLS policies allow user access
   - Ensure user is properly authenticated

### Logs and Debugging

- Backend logs: Check console output from `python supabase_main.py`
- Frontend logs: Check browser developer console
- Supabase logs: Available in Supabase Dashboard → Logs

## Next Steps

After successful migration, consider:
1. Implementing real-time features using Supabase subscriptions
2. Adding file storage for screenshot uploads
3. Setting up email notifications
4. Implementing advanced analytics with Supabase Edge Functions