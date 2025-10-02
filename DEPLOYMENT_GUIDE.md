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

### 3. Nginx Configuration

Your Nginx should already be configured for the domain, but ensure it has:

```nginx
server {
    listen 443 ssl http2;
    server_name voip.techwithharsh.in;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/voip.techwithharsh.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/voip.techwithharsh.in/privkey.pem;

    # Root directory for the built app
    root /var/www/voip.techwithharsh.in;
    index index.html;

    # SPA fallback - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # WebSocket proxy for Asterisk SIP
    location /ws {
        proxy_pass http://127.0.0.1:8089/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

After updating Nginx config:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Asterisk Configuration Verification

Ensure your Asterisk `http.conf` has:

```ini
[general]
enabled=yes
bindaddr=127.0.0.1
bindport=8089

[websocket]
enabled=yes
```

Restart Asterisk:
```bash
sudo systemctl restart asterisk
```

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

For each user, add to Asterisk `sip.conf` or `pjsip.conf`:

```ini
[username]
type=friend
secret=user_sip_password
host=dynamic
context=internal
transport=ws,wss
directmedia=no
nat=force_rport,comedia
allow=ulaw,alaw,opus
```

Or use Asterisk Realtime with MySQL/PostgreSQL.

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
