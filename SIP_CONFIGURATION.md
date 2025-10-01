# SIP Configuration Guide

## Overview
This application now has both Phase 1 (Core Backend Integration) and Phase 2 (Supabase Features) implemented.

## What's Been Implemented

### Phase 1: Core Backend Integration ✅
- **SIP.js Integration**: Added `sip.js` library for SIP signaling
- **SIP Service Hook**: Created `useSIP` hook in `src/hooks/useSIP.ts` for managing SIP connections
- **WebRTC Support**: Audio and video calling capabilities using WebRTC

### Phase 2: Supabase Features ✅
- **Authentication**: Real Supabase authentication with signup/login at `/auth`
- **Database Tables**:
  - `profiles`: User profile information
  - `user_status`: Real-time online/offline status
  - `call_history`: Call logs with caller, receiver, type, duration
- **Real-time Presence**: `usePresence` hook tracks online users in real-time
- **Automatic User Creation**: New users automatically get profile and status entries

## Next Steps: Configure Your Asterisk SIP Server

### 1. Asterisk WebSocket Configuration
Your Asterisk server needs to be configured for WebSocket connections. In your `http.conf`:

\`\`\`ini
[general]
enabled=yes
bindaddr=0.0.0.0
bindport=8088

[websocket]
enabled=yes
\`\`\`

### 2. Update Dashboard with SIP Credentials
In `src/pages/Dashboard.tsx`, find the TODO comment (around line 52) and update with your SIP credentials:

\`\`\`typescript
// TODO: Fetch SIP credentials for this user
setSipConfig({
  server: "wss://voip.techwithharsh.in:8089/ws",  // Your Asterisk WebSocket URL
  username: data.username,  // Will use Supabase username
  password: "user_sip_password",  // You'll need to manage SIP passwords
  domain: "voip.techwithharsh.in"  // Your SIP domain
});
\`\`\`

### 3. SIP User Management Options

**Option A: Store SIP Passwords in Supabase (Recommended)**
Add a `sip_password` column to the profiles table:

\`\`\`sql
ALTER TABLE public.profiles ADD COLUMN sip_password TEXT;
\`\`\`

Then update the Dashboard to fetch it:

\`\`\`typescript
setSipConfig({
  server: "wss://voip.techwithharsh.in:8089/ws",
  username: data.username,
  password: data.sip_password,  // From database
  domain: "voip.techwithharsh.in"
});
\`\`\`

**Option B: Use Asterisk Realtime (Advanced)**
Configure Asterisk to use your Supabase database for SIP user authentication directly.

### 4. Asterisk SIP.conf Configuration
Make sure your Asterisk `sip.conf` or `pjsip.conf` is configured to:
- Allow WebSocket transport
- Match usernames with your Supabase usernames
- Allow appropriate codecs (ulaw, alaw, opus, etc.)

Example for `pjsip.conf`:

\`\`\`ini
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089
cert_file=/path/to/cert.pem
priv_key_file=/path/to/key.pem
\`\`\`

### 5. Test the Configuration
1. Sign up a new user at `/auth`
2. Once logged in, check if "✓ Registered" appears in the header
3. Create another user in a different browser
4. Try calling between users

## Security Considerations

### Production Deployment
1. **SSL/TLS**: Use secure WebSocket (wss://) with valid certificates
2. **CORS**: Configure Asterisk to allow requests from your domain
3. **Firewall**: Open necessary ports (8089 for WSS, 10000-20000 for RTP)
4. **RTP Encryption**: Enable SRTP in Asterisk for encrypted media

### Environment Variables
Create a `.env.local` file:

\`\`\`env
VITE_SIP_SERVER=wss://voip.techwithharsh.in:8089/ws
VITE_SIP_DOMAIN=voip.techwithharsh.in
\`\`\`

Then use them in your code:

\`\`\`typescript
setSipConfig({
  server: import.meta.env.VITE_SIP_SERVER,
  username: data.username,
  password: data.sip_password,
  domain: import.meta.env.VITE_SIP_DOMAIN
});
\`\`\`

## Features Working Now
- ✅ User signup and login
- ✅ Real-time online/offline status
- ✅ User list with status indicators
- ✅ Call history stored in database
- ✅ Teams-style call notifications
- ⏳ SIP calling (needs your server config)
- ⏳ Audio/Video calls (needs SIP config)

## Troubleshooting

### "SIP not configured" Warning
This appears when SIP credentials aren't set. Update the `setSipConfig` in Dashboard.tsx with your Asterisk details.

### Connection Issues
1. Check Asterisk WebSocket is running: `asterisk -rx "http show status"`
2. Verify SSL certificates are valid
3. Check browser console for SIP.js errors
4. Ensure firewall allows WebSocket connections

### Audio/Video Not Working
1. Check browser permissions for microphone/camera
2. Verify WebRTC is enabled in browser
3. Check Asterisk codec configuration
4. Review RTP port range configuration

## Need Help?
Provide the following information:
- Asterisk version
- Your domain setup
- Any error messages from browser console
- Asterisk CLI output during connection attempts
