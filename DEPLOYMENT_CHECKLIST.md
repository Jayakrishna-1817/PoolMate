# 🚀 Deployment Checklist

## Pre-Deployment
- [ ] All dependencies installed (`npm install`)
- [ ] Application tested locally (`npm start`)
- [ ] Environment variables configured in `.env`
- [ ] MongoDB Atlas connection tested
- [ ] Gmail app password configured
- [ ] All files committed to Git

## GitHub Setup
- [ ] Repository created on GitHub
- [ ] Local repository linked to GitHub
- [ ] Code pushed to main branch
- [ ] `.gitignore` file excludes `.env` and `node_modules`

## Render Configuration
- [ ] Render account created/logged in
- [ ] Web Service created from GitHub repo
- [ ] Build command set to: `npm install`
- [ ] Start command set to: `npm start`
- [ ] Environment variables added:
  - [ ] `NODE_ENV=production`
  - [ ] `MONGODB_URI=your_connection_string`
  - [ ] `SESSION_SECRET=your_secret_key`
  - [ ] `EMAIL_USER=your_email@gmail.com`
  - [ ] `EMAIL_PASS=your_app_password`

## MongoDB Atlas
- [ ] Network access configured (0.0.0.0/0 or specific IPs)
- [ ] Database user created with read/write permissions
- [ ] Connection string format verified

## Gmail Setup
- [ ] 2-Factor Authentication enabled
- [ ] App Password generated
- [ ] App password used in EMAIL_PASS (not regular password)

## Post-Deployment Testing
- [ ] Application loads at Render URL
- [ ] Rider registration works
- [ ] Driver registration works
- [ ] Email notifications sending
- [ ] Database connections successful
- [ ] Admin dashboard accessible
- [ ] Real-time features working

## Domain & SSL
- [ ] Custom domain configured (optional)
- [ ] SSL certificate verified (automatic on Render)

## Monitoring
- [ ] Render logs checked for errors
- [ ] Application performance monitored
- [ ] Error tracking configured

## Documentation
- [ ] README.md updated with deployment URL
- [ ] Environment variables documented
- [ ] API endpoints documented

---

## Quick Commands Reference

### Local Testing:
```bash
npm install
npm start
```

### Git Commands:
```bash
git init
git add .
git commit -m "Ready for deployment"
git remote add origin YOUR_GITHUB_URL
git push -u origin main
```

### Environment Variables Template:
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/poolmate
SESSION_SECRET=your-super-secret-key-here
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
```

---

## Troubleshooting Quick Fixes

**Build Failed:** Check package.json dependencies
**MongoDB Error:** Verify connection string and IP whitelist  
**Email Not Sending:** Use Gmail App Password, not regular password
**404 Errors:** Check file paths and static file serving
**Environment Variables:** Redeploy after changes on Render
