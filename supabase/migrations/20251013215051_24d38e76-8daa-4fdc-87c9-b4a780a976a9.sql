-- Create request_messages table
CREATE TABLE public.request_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.tool_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_request_messages_request_id ON public.request_messages(request_id);
CREATE INDEX idx_request_messages_created_at ON public.request_messages(created_at);

-- Enable Row Level Security
ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: View messages for requests you're involved in
CREATE POLICY "Users can view messages for their requests"
  ON public.request_messages
  FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM public.tool_requests
      WHERE requester_id = auth.uid()
         OR tool_id IN (
           SELECT id FROM public.tools WHERE owner_id = auth.uid()
         )
    )
  );

-- RLS Policy: Send messages for requests you're involved in
CREATE POLICY "Users can send messages for their requests"
  ON public.request_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND request_id IN (
      SELECT id FROM public.tool_requests
      WHERE requester_id = auth.uid()
         OR tool_id IN (
           SELECT id FROM public.tools WHERE owner_id = auth.uid()
         )
    )
  );

-- RLS Policy: Update read status
CREATE POLICY "Users can mark messages as read"
  ON public.request_messages
  FOR UPDATE
  USING (
    request_id IN (
      SELECT id FROM public.tool_requests
      WHERE requester_id = auth.uid()
         OR tool_id IN (
           SELECT id FROM public.tools WHERE owner_id = auth.uid()
         )
    )
  );

-- Create notification trigger function
CREATE OR REPLACE FUNCTION public.handle_new_request_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  request_data RECORD;
  recipient_id UUID;
  tool_name TEXT;
  sender_name TEXT;
BEGIN
  -- Get request and tool information
  SELECT 
    tr.requester_id,
    t.owner_id,
    t.name as tool_name
  INTO request_data
  FROM tool_requests tr
  JOIN tools t ON t.id = tr.tool_id
  WHERE tr.id = NEW.request_id;
  
  -- Get sender name
  SELECT display_name INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;
  
  -- Determine recipient (if sender is owner, notify requester; otherwise notify owner)
  IF NEW.sender_id = request_data.owner_id THEN
    recipient_id := request_data.requester_id;
  ELSE
    recipient_id := request_data.owner_id;
  END IF;
  
  -- Create notification
  PERFORM create_notification(
    recipient_id,
    'request_message',
    'New Message',
    sender_name || ' sent you a message about ' || request_data.tool_name,
    jsonb_build_object('request_id', NEW.request_id, 'message_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new messages
CREATE TRIGGER on_request_message_created
  AFTER INSERT ON public.request_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_request_message();

-- Enable realtime for request_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.request_messages;