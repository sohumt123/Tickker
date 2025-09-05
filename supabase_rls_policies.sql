-- Row Level Security (RLS) Policies for Tickker Portfolio Application
-- These policies ensure users can only access their own data and appropriate shared data

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE preference_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_notes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- User profiles policies
CREATE POLICY "Users can view their own user profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public user profiles" ON user_profiles
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can update their own user profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own user profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" ON transactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" ON transactions
    FOR DELETE USING (auth.uid() = user_id);

-- Portfolio history policies
CREATE POLICY "Users can view their own portfolio history" ON portfolio_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own portfolio history" ON portfolio_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolio history" ON portfolio_history
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolio history" ON portfolio_history
    FOR DELETE USING (auth.uid() = user_id);

-- Groups policies
CREATE POLICY "Users can view public groups" ON groups
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view groups they own" ON groups
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can view groups they are members of" ON groups
    FOR SELECT USING (
        is_public = true OR 
        owner_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = groups.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own groups" ON groups
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update groups they own" ON groups
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete groups they own" ON groups
    FOR DELETE USING (auth.uid() = owner_id);

-- Group members policies
CREATE POLICY "Users can view group members for groups they belong to" ON group_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM groups 
            WHERE id = group_members.group_id AND (owner_id = auth.uid() OR is_public = true)
        )
    );

CREATE POLICY "Users can join groups (insert membership)" ON group_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups (delete their own membership)" ON group_members
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Group owners can manage memberships" ON group_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM groups 
            WHERE id = group_members.group_id AND owner_id = auth.uid()
        )
    );

-- Stock list items policies
CREATE POLICY "Users can view their own stock lists" ON stock_list_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stock list items" ON stock_list_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stock list items" ON stock_list_items
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stock list items" ON stock_list_items
    FOR DELETE USING (auth.uid() = user_id);

-- Stock notes policies
CREATE POLICY "Users can view their own stock notes" ON stock_notes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stock notes" ON stock_notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stock notes" ON stock_notes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stock notes" ON stock_notes
    FOR DELETE USING (auth.uid() = user_id);

-- Preference votes policies
CREATE POLICY "Users can view their own preference votes" ON preference_votes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preference votes" ON preference_votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Social actions policies
CREATE POLICY "Users can view all social actions" ON social_actions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own social actions" ON social_actions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Streaks policies
CREATE POLICY "Users can view their own streaks" ON streaks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks" ON streaks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks" ON streaks
    FOR UPDATE USING (auth.uid() = user_id);

-- Group notes policies
CREATE POLICY "Users can view group notes for groups they belong to" ON group_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = group_notes.group_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert group notes for groups they belong to" ON group_notes
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = group_notes.group_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own group notes" ON group_notes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own group notes" ON group_notes
    FOR DELETE USING (auth.uid() = user_id);