# Environment Variables Template

Copy this template to create your `.env` file. **Never commit `.env` files to version control.**

## Backend Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Server Configuration
PORT=5001
NODE_ENV=production

# Database
MONGODB_URI=mongodb://localhost:27017/photoapp

# JWT Secret (Generate a strong random string in production)
# Use: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
ACCESS_TOKEN_SECRET=your-super-secret-jwt-key-change-this-in-production

# Client/Frontend URL (Required for CORS and OAuth redirects)
# No trailing slash!
CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173

# Cloudinary Configuration (Required for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Google OAuth (Optional - only if using Google login)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback

# Email Configuration (Optional - for password reset, notifications)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Photo App

# Arcjet (Optional - for advanced security features)
ARCJET_KEY=your-arcjet-key
ARCJET_ENV=production
```

## Production Values

For production, update these values:

- `NODE_ENV=production`
- `CLIENT_URL=https://yourdomain.com` (your production domain)
- `MONGODB_URI=mongodb+srv://...` (your production MongoDB connection string)
- `GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback` (if using Google OAuth)
- Generate a strong `ACCESS_TOKEN_SECRET` (minimum 32 characters)

## Generating Strong Secrets

To generate a strong JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Or using OpenSSL:

```bash
openssl rand -hex 64
```

## Frontend Environment Variables (Optional)

If you need to configure the frontend API URL separately, create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:5001
```

In production, the frontend will use relative URLs (`/api`) by default, so this is usually not needed.

