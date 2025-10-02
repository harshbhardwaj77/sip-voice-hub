-- Add sip_password column to profiles table
ALTER TABLE public.profiles
ADD COLUMN sip_password TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.sip_password IS 'SIP password for Asterisk authentication';