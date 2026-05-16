CREATE TABLE public.user_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_chat_messages_sender_recipient_check CHECK (sender_id <> recipient_id),
  CONSTRAINT user_chat_messages_content_check CHECK (char_length(trim(content)) BETWEEN 1 AND 2000)
);

CREATE INDEX user_chat_messages_created_at_idx
  ON public.user_chat_messages (created_at DESC);

CREATE INDEX user_chat_messages_sender_id_idx
  ON public.user_chat_messages (sender_id);

CREATE INDEX user_chat_messages_recipient_id_idx
  ON public.user_chat_messages (recipient_id);

CREATE INDEX user_chat_messages_pair_created_at_idx
  ON public.user_chat_messages (
    LEAST(sender_id, recipient_id),
    GREATEST(sender_id, recipient_id),
    created_at DESC
  );

ALTER TABLE public.user_chat_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.user_chat_messages FROM anon;
REVOKE ALL ON TABLE public.user_chat_messages FROM authenticated;

GRANT SELECT, INSERT ON TABLE public.user_chat_messages TO service_role;

CREATE POLICY "Service role can insert user chat messages"
  ON public.user_chat_messages
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can read user chat messages"
  ON public.user_chat_messages
  FOR SELECT
  TO service_role
  USING (true);
