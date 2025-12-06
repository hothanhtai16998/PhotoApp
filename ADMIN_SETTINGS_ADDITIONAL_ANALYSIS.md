# Admin Settings - Additional Settings Analysis

## 📊 Current State Analysis

### ✅ Already Implemented

- General Settings (site name, description, logo, favicon, language, timezone, contact email, social links)
- Upload & Media Settings (image quality, watermark, auto-resize, video settings, batch upload limit)
- System Settings (maintenance mode, max upload size, allowed file types)
- Notifications Settings (system announcements)

### ❌ Removed (Non-functional)

- Thumbnail Sizes (removed - backend uses hardcoded sizes)

---

## 🎯 Recommended Additional Settings (Prioritized)

### 🔴 High Priority - Security & User Management

#### 1. **Registration Control** ⭐⭐⭐

**Why**: Control who can sign up

- **Registration Status**: Open / Closed / Invite-only
- **Require Email Verification**: Enable/disable email verification requirement
- **Require Admin Approval**: New users need admin approval before access
- **Default User Role**: Set default role for new users (user/moderator)
- **Auto-approve OAuth Users**: Auto-approve Google OAuth signups

**Implementation**:

- Backend: Add middleware to check registration status before signup
- Frontend: Show appropriate message when registration is closed
- Database: Add to Settings model

**Impact**: High - Security and user management

---

#### 2. **Password Policy** ⭐⭐⭐

**Why**: Currently hardcoded, should be configurable

- **Minimum Length**: 6-20 characters (currently 8)
- **Require Uppercase**: Enable/disable
- **Require Lowercase**: Enable/disable
- **Require Number**: Enable/disable
- **Require Special Character**: Enable/disable
- **Password Expiration**: Days until password expires (0 = never)

**Current State**:

- Backend: Hardcoded in `validationMiddleware.js` (min 8, uppercase, lowercase, number)
- Frontend: Shows requirements in signup form

**Implementation**:

- Backend: Make validation dynamic based on settings
- Frontend: Update validation rules dynamically

**Impact**: High - Security compliance

---

#### 3. **Session Management** ⭐⭐

**Why**: Currently hardcoded token expiration

- **Access Token Expiry**: 15m / 30m / 1h / 2h / 4h / 8h / 24h (currently 30m)
- **Refresh Token Expiry**: 7 days / 14 days / 30 days / 90 days (currently 14 days)
- **Max Concurrent Sessions**: Limit number of active sessions per user (0 = unlimited)
- **Force Logout on Password Change**: Enable/disable

**Current State**:

- Backend: Hardcoded in `constants.js` (30m access, 14 days refresh)

**Implementation**:

- Backend: Use settings for token TTL
- Frontend: Show session info in user profile

**Impact**: Medium - Security and user experience

---

### 🟡 Medium Priority - Content & Moderation

#### 4. **Content Moderation** ⭐⭐

**Why**: Control content quality

- **Auto-moderate Uploads**: Enable/disable automatic moderation
- **Require Moderation**: All uploads need approval before public
- **Report Threshold**: Auto-flag after X reports
- **Auto-delete After Reports**: Auto-delete after X reports
- **NSFW Detection**: Enable/disable NSFW content detection
- **Profanity Filter**: Enable/disable profanity filtering

**Current State**:

- Backend: Has moderation status field in Image model
- Frontend: Admin can moderate images

**Implementation**:

- Backend: Add moderation workflow
- Frontend: Show moderation queue

**Impact**: Medium - Content quality

---

#### 5. **Upload Restrictions** ⭐⭐

**Why**: More granular upload control

- **Max Images Per User**: Maximum images a user can upload (0 = unlimited)
- **Max Images Per Day**: Daily upload limit per user
- **Require Title**: Force users to provide image title
- **Require Category**: Force users to select category
- **Require Location**: Force users to provide location
- **Require Tags**: Minimum number of tags required

**Current State**:

- Backend: Has maxUploadSize and allowedFileTypes
- Frontend: Title and category are optional

**Implementation**:

- Backend: Add validation checks
- Frontend: Make fields required based on settings

**Impact**: Medium - Content quality and organization

---

### 🟢 Low Priority - Analytics & Performance

#### 6. **Analytics & Tracking** ⭐

**Why**: Track site usage

- **Google Analytics ID**: GA4 tracking ID
- **Google Tag Manager ID**: GTM container ID
- **Facebook Pixel ID**: Facebook tracking pixel
- **Privacy Mode**: Disable all tracking (GDPR compliance)
- **Event Tracking**: Which events to track (views, downloads, favorites, etc.)

**Current State**:

- No analytics integration

**Implementation**:

- Frontend: Inject tracking scripts based on settings
- Backend: Store tracking IDs

**Impact**: Low - Business intelligence

---

#### 7. **Performance Settings** ⭐

**Why**: Optimize site performance

- **Enable Caching**: Enable/disable response caching
- **Cache Duration**: Cache TTL in seconds
- **Enable Image CDN**: Use CDN for images (already using R2)
- **Lazy Loading**: Enable/disable lazy loading (already enabled)
- **Image Optimization**: Enable/disable automatic optimization (already enabled)
- **Compression**: Enable/disable gzip/brotli compression

**Current State**:

- Image optimization and lazy loading already implemented
- Using Cloudflare R2 (CDN-like)

**Implementation**:

- Backend: Add caching middleware
- Frontend: Already optimized

**Impact**: Low - Performance (already good)

---

### 🔵 Nice to Have - Advanced Features

#### 8. **Email Settings** ⭐

**Why**: Configure email behavior

- **Email Provider**: Resend / SMTP / SendGrid / Mailgun
- **SMTP Settings**: Host, port, username, password (if using SMTP)
- **From Name**: Default sender name
- **From Email**: Default sender email
- **Welcome Email**: Enable/disable welcome emails
- **Email Templates**: Customize email templates

**Current State**:

- Using Resend (configured via env vars)
- No admin control

**Implementation**:

- Backend: Make email provider configurable
- Frontend: Email template editor

**Impact**: Low - Email customization

---

#### 9. **API & Integration** ⭐

**Why**: External integrations

- **API Rate Limiting**: Requests per minute/hour
- **API Key Management**: Generate/manage API keys
- **Webhook URLs**: Configure webhooks for events
- **OAuth Providers**: Enable/disable Google OAuth (already implemented)
- **Third-party Integrations**: Connect external services

**Current State**:

- Google OAuth implemented
- No API key system

**Implementation**:

- Backend: API key generation and management
- Frontend: API key UI

**Impact**: Low - Developer features

---

#### 10. **Appearance & Branding** ⭐

**Why**: Customize site appearance

- **Primary Color**: Site primary color
- **Secondary Color**: Site secondary color
- **Accent Color**: Site accent color
- **Dark Mode**: Enable/disable dark mode
- **Default Theme**: Light / Dark / Auto
- **Custom CSS**: Inject custom CSS
- **Custom JavaScript**: Inject custom JS (advanced)

**Current State**:

- No theme customization
- No dark mode

**Implementation**:

- Frontend: Theme system
- Backend: Store theme settings

**Impact**: Low - Branding

---

## 📋 Implementation Priority Summary

### Phase 1 (High Priority - Security)

1. ✅ Registration Control
2. ✅ Password Policy
3. ✅ Session Management

### Phase 2 (Medium Priority - Content)

4. ✅ Content Moderation
5. ✅ Upload Restrictions

### Phase 3 (Low Priority - Analytics)

6. ✅ Analytics & Tracking
7. ✅ Performance Settings

### Phase 4 (Nice to Have)

8. ✅ Email Settings
9. ✅ API & Integration
10. ✅ Appearance & Branding

---

## 🎯 Recommended Next Steps

**Immediate (Next Implementation)**:

1. **Registration Control** - Most impactful for security
2. **Password Policy** - Easy to implement, high security value
3. **Session Management** - Good security practice

**Why These First?**

- Security-focused (most important)
- Relatively easy to implement
- High user/admin value
- No external dependencies

---

## 💡 Additional Considerations

### Settings That Might Conflict

- **Thumbnail Sizes**: Removed (backend hardcoded)
- **Storage Provider**: Removed (using R2 only)
- **CDN URL**: Removed (using R2 public URL)

### Settings That Need Backend Changes

- All security settings (password, session, registration)
- Content moderation
- Upload restrictions
- Email settings

### Settings That Are Frontend Only

- Analytics (just inject scripts)
- Appearance/Branding (CSS/theme)
- Custom CSS/JS

---

## 📝 Notes

- **Backend Compatibility**: Ensure all new settings are backward compatible
- **Validation**: All settings need proper validation
- **Default Values**: Set sensible defaults for all new settings
- **Migration**: May need migration script for existing installations
- **Documentation**: Update admin docs when adding new settings

---

_Last Updated: 2024_
_Analysis Version: 1.0_
