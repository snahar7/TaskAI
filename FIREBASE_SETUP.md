# Firebase Domain Authorization for Replit

## Current Issue
Your Firebase project doesn't recognize the Replit domain, causing Google sign-in to fail with "domain is not authorized" error.

## Your Current Replit Domain
```
6c3ab34f-d199-4fe4-938c-8a3f4f137227-00-1tqc9nbusbvfu.picard.replit.dev
```

## Steps to Fix in Firebase Console

1. Go to: https://console.firebase.google.com
2. Select your project: your own Firebase project
3. Navigate to: **Authentication → Sign-in method**
4. Scroll to: **Authorized domains** section
5. Click: **Add domain**
6. Add these domains:

```
6c3ab34f-d199-4fe4-938c-8a3f4f137227-00-1tqc9nbusbvfu.picard.replit.dev
*.picard.replit.dev
*.replit.dev
*.repl.co
```

## Quick Fix: Use Email/Password Sign-in
Until you add the domain, you can use the email/password authentication which works perfectly.

You can create a new account with any email or use the Quick Dev Login button (yellow button) in development mode.

This will let you access the app immediately while you configure Firebase domains.

## Why This Happens
- Replit generates unique domain URLs for each session
- Firebase requires these domains to be pre-authorized for security
- Email/password authentication doesn't have this restriction