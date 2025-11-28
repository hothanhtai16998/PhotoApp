# AboutPage Component Explanation

## What is AboutPage?

`AboutPage` is a **simple informational page** that displays contact information, bio, and social media links. It uses data from the `authorInfo` config file.

## Component Structure

```typescript
function AboutPage() {
  return (
    <div className="about-page">
      <Header />
      <div className="about-container">
        <div className="about-content">
          <h1>Về chúng tôi</h1>
          {/* Contact info, bio, social links */}
        </div>
      </div>
    </div>
  );
}
```

## Key Features

### 1. **Contact Information**
- Email (mailto link)
- Phone (tel link)
- Address (text)
- Website (external link)

### 2. **Bio Section**
- Displays author bio from config
- Simple text display

### 3. **Social Media Links**
- LinkedIn
- GitHub
- Facebook
- TikTok
- All open in new tabs

## Step-by-Step Breakdown

### Contact Information

```typescript
<div className="contact-item">
  <div className="contact-icon">
    <Mail size={20} />
  </div>
  <div className="contact-details">
    <span className="contact-label">Email</span>
    <a href={`mailto:${authorInfo.email}`} className="contact-value">
      {authorInfo.email}
    </a>
  </div>
</div>
```

**What this does:**
- Displays contact info with icons
- Uses `mailto:` and `tel:` links
- Data comes from `authorInfo` config

### Bio Display

```typescript
<div className="about-card">
  <h2 className="card-title">Giới thiệu</h2>
  <p className="bio-text">{authorInfo.bio}</p>
</div>
```

**What this does:**
- Shows author bio
- Simple paragraph display
- Content from config

### Social Media Links

```typescript
{authorInfo.social.linkedin && (
  <a
    href={authorInfo.social.linkedin}
    target="_blank"
    rel="noopener noreferrer"
    className="social-link"
    aria-label="LinkedIn"
  >
    <Linkedin size={24} />
    <span>LinkedIn</span>
  </a>
)}
```

**What this does:**
- Conditionally renders if link exists
- Opens in new tab (`target="_blank"`)
- Security: `rel="noopener noreferrer"`
- Accessible: `aria-label`
- Shows icon and text

## Data Source

All data comes from `@/config/authorInfo`:

```typescript
export const authorInfo = {
  name: "PhotoApp Team",
  email: "contact@photoapp.com",
  phone: "+1 (555) 123-4567",
  address: "123 Photography Street...",
  website: "https://photoapp.com",
  bio: "...",
  social: {
    linkedin: "...",
    github: "...",
    facebook: "...",
    tiktok: "..."
  }
} as const;
```

**Benefits:**
- Easy to update (single config file)
- Type-safe
- Centralized data

## Summary

**AboutPage** is a simple informational page that:
1. ✅ Displays contact information
2. ✅ Shows author bio
3. ✅ Links to social media
4. ✅ Uses config file for data
5. ✅ Accessible and secure links

It's the "about us" page - providing essential contact and information!

