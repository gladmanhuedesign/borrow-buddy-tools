-- Fix the tool status update trigger to always mark tools as borrowed when overdue
CREATE OR REPLACE FUNCTION public.handle_tool_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- When a request becomes overdue, always keep it as borrowed
  IF NEW.status = 'overdue' AND OLD.status != 'overdue' THEN
    UPDATE public.tools 
    SET status = 'borrowed' 
    WHERE id = NEW.tool_id;
  END IF;
  
  -- When a request is marked for return, tool stays borrowed until confirmed
  IF NEW.status = 'return_pending' AND OLD.status IN ('picked_up', 'overdue') THEN
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
  IF NEW.status = 'canceled' AND OLD.status IN ('approved', 'picked_up', 'overdue') THEN
    UPDATE public.tools 
    SET status = 'available' 
    WHERE id = NEW.tool_id;
  END IF;
  
  RETURN NEW;
END;
$function$;