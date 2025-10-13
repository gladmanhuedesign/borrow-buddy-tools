-- Fix 1: Add SET search_path = public to all SECURITY DEFINER functions to prevent search path manipulation attacks

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_group_role(group_id uuid, user_id uuid)
RETURNS text
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT role FROM public.group_members 
  WHERE group_members.group_id = $1 AND group_members.user_id = $2
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.is_group_member(group_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.group_members 
    WHERE group_members.group_id = $1 
    AND group_members.user_id = auth.uid()
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_group_member_safe(group_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.group_members 
    WHERE group_members.group_id = $1 
    AND group_members.user_id = $2
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_overdue_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.tool_requests
  SET status = 'overdue'
  WHERE status IN ('approved', 'picked_up')
    AND end_date < CURRENT_DATE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_group_creator(group_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = $1 AND creator_id = $2
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_group_admin(group_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.group_members 
    WHERE group_members.group_id = $1 
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'admin'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_insert_group_member(group_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Allow if user is adding themselves as a member
  IF user_id = auth.uid() THEN
    RETURN TRUE;
  END IF;
  
  -- Allow if user is the group creator (even if not yet a member)
  IF EXISTS (
    SELECT 1 
    FROM public.groups 
    WHERE id = $1 
    AND creator_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Allow if user is an admin of the group
  RETURN EXISTS (
    SELECT 1 
    FROM public.group_members 
    WHERE group_members.group_id = $1 
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'admin'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_notification(target_user_id uuid, notification_type text, notification_title text, notification_message text, notification_data jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (target_user_id, notification_type, notification_title, notification_message, notification_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_or_create_user_preferences(target_user_id uuid)
RETURNS user_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_prefs public.user_preferences;
BEGIN
  -- Try to get existing preferences
  SELECT * INTO user_prefs 
  FROM public.user_preferences 
  WHERE user_id = target_user_id;
  
  -- If no preferences exist, create them with defaults
  IF user_prefs.id IS NULL THEN
    INSERT INTO public.user_preferences (user_id)
    VALUES (target_user_id)
    RETURNING * INTO user_prefs;
  END IF;
  
  RETURN user_prefs;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_group_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  group_name TEXT;
  inviter_name TEXT;
  invited_user_id UUID;
BEGIN
  -- Get group name
  SELECT name INTO group_name
  FROM public.groups
  WHERE id = NEW.group_id;
  
  -- Get inviter name
  SELECT display_name INTO inviter_name
  FROM public.profiles
  WHERE id = NEW.created_by;
  
  -- Get invited user ID from email (if they have an account)
  SELECT id INTO invited_user_id
  FROM public.profiles
  WHERE id IN (
    SELECT id FROM auth.users WHERE email = NEW.email
  );
  
  -- Only create notification if user exists
  IF invited_user_id IS NOT NULL THEN
    PERFORM public.create_notification(
      invited_user_id,
      'group_invite',
      'Group Invitation',
      inviter_name || ' has invited you to join ' || group_name,
      jsonb_build_object('invite_id', NEW.id, 'group_id', NEW.group_id)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_tool_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  tool_owner_id UUID;
  tool_name TEXT;
  requester_name TEXT;
BEGIN
  -- Get tool owner and name
  SELECT owner_id, name INTO tool_owner_id, tool_name
  FROM public.tools
  WHERE id = NEW.tool_id;
  
  -- Get requester name
  SELECT display_name INTO requester_name
  FROM public.profiles
  WHERE id = NEW.requester_id;
  
  -- Create notification for tool owner
  PERFORM public.create_notification(
    tool_owner_id,
    'tool_request',
    'New Tool Request',
    requester_name || ' has requested to borrow your ' || tool_name,
    jsonb_build_object('request_id', NEW.id, 'tool_id', NEW.tool_id)
  );
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_tool_request_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  tool_name TEXT;
  owner_name TEXT;
BEGIN
  -- Only notify on status changes, not on creation
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get tool name
  SELECT name INTO tool_name
  FROM public.tools
  WHERE id = NEW.tool_id;
  
  -- Get owner name for approved/denied notifications
  SELECT display_name INTO owner_name
  FROM public.profiles p
  JOIN public.tools t ON t.owner_id = p.id
  WHERE t.id = NEW.tool_id;
  
  -- Create notification for requester based on status
  IF NEW.status = 'approved' THEN
    PERFORM public.create_notification(
      NEW.requester_id,
      'request_approved',
      'Request Approved',
      'Your request for ' || tool_name || ' has been approved by ' || owner_name,
      jsonb_build_object('request_id', NEW.id, 'tool_id', NEW.tool_id)
    );
  ELSIF NEW.status = 'denied' THEN
    PERFORM public.create_notification(
      NEW.requester_id,
      'request_denied',
      'Request Denied',
      'Your request for ' || tool_name || ' has been denied by ' || owner_name,
      jsonb_build_object('request_id', NEW.id, 'tool_id', NEW.tool_id)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_tool_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- When a request is approved, keep tool as available until picked up
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    NULL;
  END IF;
  
  -- When a request is picked up, mark the tool as borrowed
  IF NEW.status = 'picked_up' AND OLD.status = 'approved' THEN
    UPDATE public.tools 
    SET status = 'borrowed' 
    WHERE id = NEW.tool_id;
    
    NEW.picked_up_at = now();
  END IF;
  
  -- When a request is marked for return, tool stays borrowed until confirmed
  IF NEW.status = 'return_pending' AND OLD.status = 'picked_up' THEN
    NULL;
  END IF;
  
  -- When a request is returned or denied, mark the tool as available
  IF NEW.status IN ('returned', 'denied') THEN
    UPDATE public.tools 
    SET status = 'available' 
    WHERE id = NEW.tool_id;
    
    IF NEW.status = 'returned' THEN
      NEW.returned_at = now();
    END IF;
  END IF;
  
  -- When a request is canceled, mark the tool as available if it was borrowed
  IF NEW.status = 'canceled' AND OLD.status IN ('approved', 'picked_up') THEN
    UPDATE public.tools 
    SET status = 'available' 
    WHERE id = NEW.tool_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_tool_request_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  tool_owner_id UUID;
  action_performer UUID;
BEGIN
  -- Get tool owner
  SELECT owner_id INTO tool_owner_id
  FROM public.tools
  WHERE id = NEW.tool_id;
  
  -- Determine who performed the action based on status
  action_performer := CASE 
    WHEN NEW.status = 'pending' THEN NEW.requester_id
    WHEN NEW.status IN ('approved', 'denied') THEN tool_owner_id
    WHEN NEW.status = 'picked_up' THEN NEW.requester_id
    WHEN NEW.status = 'return_pending' THEN NEW.requester_id
    WHEN NEW.status = 'returned' THEN tool_owner_id
    WHEN NEW.status = 'canceled' THEN NEW.requester_id
    ELSE auth.uid()
  END;
  
  -- Log the history entry
  INSERT INTO public.tool_history (
    tool_id,
    request_id,
    borrower_id,
    owner_id,
    action_type,
    action_by,
    start_date,
    end_date,
    actual_pickup_date,
    actual_return_date,
    notes
  ) VALUES (
    NEW.tool_id,
    NEW.id,
    NEW.requester_id,
    tool_owner_id,
    NEW.status,
    action_performer,
    NEW.start_date,
    NEW.end_date,
    NEW.picked_up_at,
    NEW.returned_at,
    CASE 
      WHEN NEW.status = 'pending' THEN NEW.message
      WHEN NEW.status = 'returned' THEN NEW.return_notes
      ELSE NULL
    END
  );
  
  RETURN NEW;
END;
$function$;

-- Fix 2: Replace overly permissive tool_history INSERT policy with proper authorization
DROP POLICY IF EXISTS "System can insert tool history" ON public.tool_history;

CREATE POLICY "Only triggers can insert tool history"
ON public.tool_history
FOR INSERT
WITH CHECK (false);

-- Fix 3: Add INSERT policy to notifications table to prevent direct user inserts
CREATE POLICY "Only system can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (false);