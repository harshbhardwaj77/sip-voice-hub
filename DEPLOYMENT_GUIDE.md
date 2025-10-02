# Deployment Guide for GCP VM

## ✅ Pre-Deployment Checklist

Your SIP Calling App is **READY FOR DEPLOYMENT**! Here's what's been configured:

### ✅ Completed Setup
- [x] Supabase authentication with email/password
- [x] User profiles with SIP password storage
- [x] Real-time presence tracking
- [x] Call history tracking in database
- [x] SIP.js integration for WebRTC calls
- [x] Audio/video call support
- [x] Incoming call ringtone
- [x] Profile settings page
- [x] Domain configured in vite.config.ts (voip.techwithharsh.in)
- [x] All RLS policies properly configured

## 🚀 Deployment Steps

### 1. Build the Application

```bash
npm run build
```

This creates a production-ready `dist` folder.

### 2. Deploy to Your GCP VM

#### Option A: Direct Copy (Recommended for GCP)
```bash
# From your local machine
scp -r dist/* user@your-vm-ip:/var/www/voip.techwithharsh.in/
```

#### Option B: Using GitHub
```bash
# Push to GitHub first
git push origin main

# On your GCP VM
git pull origin main
npm ci
npm run build
```

### 3. Nginx Configuration ⚠️ IMPORTANT

**Your current Nginx config has a small issue.** Change this line:

```nginx
# ❌ WRONG - Double TLS encryption
proxy_pass https://127.0.0.1:8089/ws;

# ✅ CORRECT - Let Nginx handle TLS termination
proxy_pass http://127.0.0.1:8088/ws;
```

**Complete WebSocket location block should be:**

```nginx
location /ws {
    proxy_pass http://127.0.0.1:8088/ws;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
    proxy_set_header Origin $scheme://$host;
    proxy_read_timeout 86400;
    proxy_send_timeout 86400;
    proxy_buffering off;
}
```

After updating:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

**Why this change?**
- Asterisk http.conf shows both port 8088 (HTTP) and 8089 (HTTPS/TLS)
- Your Nginx already handles TLS for the domain
- Proxying to the non-TLS port (8088) avoids double encryption and is more efficient

### 4. Asterisk Configuration ✅ Already Correct

Your `http.conf` is already properly configured:
- ✅ HTTP on port 8088 (for Nginx proxy)
- ✅ HTTPS/WSS on port 8089 (backup)
- ✅ TLS certificates configured

Your `pjsip.conf` is also correct with WebRTC transport and 4 users configured.

### 5. Firewall Configuration

Ensure these ports are open on your GCP VM:
```bash
# HTTPS for web app
sudo ufw allow 443/tcp

# RTP ports for media (if not already open)
sudo ufw allow 10000:20000/udp
```

### 6. SSL Certificate (Let's Encrypt)

If not already set up:
```bash
sudo certbot --nginx -d voip.techwithharsh.in
```

## 📋 Post-Deployment Steps

### 1. User Setup Flow

Users need to:
1. Sign up at `https://voip.techwithharsh.in/auth`
2. Verify their email (check Supabase email settings)
3. Login to dashboard
4. Click settings icon (⚙️) in header
5. Set their SIP password (must match Asterisk user password)
6. Status will show "✓ Registered" when connected

### 2. Asterisk User Configuration

**Your existing users in pjsip.conf:**
- Username: `ram`, Password: `ram123`
- Username: `jitendra`, Password: `jitendra123`
- Username: `harsh`, Password: `harsh123`
- Username: `john`, Password: `john123`

**CRITICAL:** When users sign up in the app, they must:
1. Use their Asterisk username (e.g., "ram")
2. Set their SIP password in Profile Settings to match Asterisk (e.g., "ram123")

The app's `sip_password` field MUST match the password in pjsip.conf for authentication to work.

### 3. Testing

1. Create two test users
2. Set their SIP passwords in profile settings
3. Ensure both show "✓ Registered" status
4. Try making a call between them
5. Test both audio and video calls

## 🔧 Troubleshooting

### Users Can't Register
- Check if SIP password in profile matches Asterisk user password
- Verify WebSocket proxy is working: `wss://voip.techwithharsh.in/ws`
- Check Asterisk logs: `sudo asterisk -rvvv`

### No Audio/Video
- Ensure RTP ports are open (10000-20000/udp)
- Check browser permissions for microphone/camera
- Verify STUN/TURN servers if needed for NAT traversal

### Email Verification Issues
- Go to Supabase Dashboard → Authentication → Email Templates
- For testing, disable "Confirm email" in Supabase Auth settings

### WebSocket Connection Fails
- Test WebSocket: `wscat -c wss://voip.techwithharsh.in/ws`
- Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
- Verify Asterisk is listening: `sudo netstat -tlnp | grep 8089`

## 🔒 Security Checklist

- [x] SSL/TLS enabled (HTTPS only)
- [x] Supabase RLS policies configured
- [x] SIP passwords stored securely in database
- [x] WebSocket connection over WSS (secure)
- [x] No hardcoded credentials in frontend code
- [x] Authentication required for all features

## 📊 Monitoring

Monitor your deployment:
- Nginx access logs: `/var/log/nginx/access.log`
- Asterisk logs: `sudo asterisk -rvvv`
- Supabase Dashboard for user activity and database queries

## 🎉 You're Ready!

Your app is production-ready and can be deployed to your GCP VM with Asterisk backend. 

Key features:
✅ Full authentication system
✅ Real-time user presence
✅ Audio/video calling via WebRTC
✅ Call history tracking
✅ Profile management
✅ Secure SIP integration

Deploy and start making calls! 🚀📞
