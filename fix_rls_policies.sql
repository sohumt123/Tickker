-- Fix circular RLS policy issues
-- Drop the problematic policy and recreate it without circular reference

-- Drop the existing policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view group members for groups they belong to" ON group_members;

-- Create new policy without circular reference
CREATE POLICY "Users can view group members for groups they belong to" ON group_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM groups 
            WHERE id = group_members.group_id AND (owner_id = auth.uid() OR is_public = true)
        )
    );

-- Also simplify the groups policy to avoid potential issues
DROP POLICY IF EXISTS "Users can view groups they are members of" ON groups;

CREATE POLICY "Users can view groups they are members of" ON groups
    FOR SELECT USING (
        is_public = true OR 
        owner_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = groups.id AND user_id = auth.uid()
        )
    );