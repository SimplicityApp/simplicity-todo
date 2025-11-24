# Simplicity Todo - Landing Page

A clean, modern landing page for the Simplicity todo app with iOS and Android download sections.

## Features

- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **App Store Links**: iOS App Store and Google Play Store download sections
- **QR Codes**: Automatically generated QR codes for easy mobile downloads
- **Email Signup**: Collect early access emails from interested users
- **Smooth Animations**: Fade-in effects and smooth scrolling
- **Modern UI**: Clean design with your app's branding colors
- **Why Page**: Dedicated page explaining the philosophy and target audience

## Pages

### index.html (Main Landing Page)
The main landing page with hero section, features, download links, and app mockup.

### why.html ("Why Another Todo List?")
A comprehensive explanation page covering:
- **The Problem**: Why traditional todo apps fail (overwhelm, concentration issues, procrastination, complexity)
- **The Insight**: Focus over productivity, 2-task maximum philosophy
- **The Solution**: How Simplicity's constraints help users succeed
- **Target Audience**: Who this app is for (ADHD, analysis paralysis, procrastinators, simplicity seekers)
- **What It's NOT**: Clear boundaries about what the app doesn't do
- **Philosophy**: The "less is more" principle

This page helps potential users self-identify whether Simplicity is right for them.

## Getting Started

### Option 1: Open Locally

Simply open `index.html` in your web browser:

```bash
cd landing-page
open index.html  # macOS
# or
start index.html  # Windows
# or
xdg-open index.html  # Linux
```

### Option 2: Local Server

For better performance and to avoid CORS issues, use a local server:

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js (npx)
npx serve

# Using PHP
php -S localhost:8000
```

Then visit `http://localhost:8000` in your browser.

## Customization

### Update App Store Links

When your app is published, update the following in `index.html`:

**iOS App Store Link** (lines ~103 and ~107):
```html
<!-- Replace with your actual App Store URL -->
<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=YOUR_IOS_APP_STORE_URL">
<a href="YOUR_IOS_APP_STORE_URL" class="store-button" target="_blank">
```

**Google Play Store Link** (lines ~117 and ~121):
```html
<!-- Replace with your actual Play Store URL -->
<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=YOUR_PLAY_STORE_URL">
<a href="YOUR_PLAY_STORE_URL" class="store-button" target="_blank">
```

### Remove "Coming Soon" Badge

Once published, remove these lines:
```html
<p class="coming-soon">Coming Soon</p>
```

### Update Email Signup

To connect the email signup to your backend:

1. Open `script.js`
2. Find the `saveEmail()` function
3. Replace the localStorage code with your API call:

```javascript
function saveEmail(email) {
    // Replace with your API endpoint
    fetch('https://your-api.com/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    })
    .then(response => response.json())
    .then(data => console.log('Success:', data))
    .catch(error => console.error('Error:', error));
}
```

### Customize Colors

Edit `styles.css` root variables:

```css
:root {
    --primary-color: #D84315;     /* Your primary brand color */
    --secondary-color: #FF6E40;   /* Your secondary color */
    --text-dark: #1a1a1a;
    --text-light: #666;
    /* ... */
}
```

### Add Real App Screenshots

Replace the phone mockup section in `index.html` with actual screenshots:

```html
<div class="phone-mockup">
    <img src="path/to/your/screenshot.png" alt="App Screenshot">
</div>
```

## Deployment

### Deploy to Vercel (Recommended)

```bash
cd landing-page
vercel
```

### Deploy to Netlify

1. Create `netlify.toml` in the landing-page directory:
```toml
[build]
  publish = "."
```

2. Deploy:
```bash
netlify deploy --prod
```

### Deploy to GitHub Pages

1. Create a new repository or use existing
2. Push the landing-page folder
3. Go to Settings > Pages
4. Select your branch and folder
5. Save

### Deploy to Any Static Host

The landing page is just HTML/CSS/JS, so you can deploy to:
- AWS S3 + CloudFront
- Firebase Hosting
- Cloudflare Pages
- Any web host with FTP access

## Files Structure

```
landing-page/
├── index.html        # Main landing page
├── why.html          # "Why another todo list?" explanation page
├── styles.css        # Main styling (shared across pages)
├── why-styles.css    # Additional styling for Why page
├── script.js         # Interactive features
└── README.md         # This file
```

## Email Collection

Currently, emails are stored in localStorage. For production:

1. Set up a backend API (Firebase, Supabase, or custom)
2. Update `script.js` to send emails to your API
3. Consider adding a privacy policy link
4. Add GDPR compliance if targeting EU users

## QR Codes

QR codes are generated using the free API: `https://api.qrserver.com/`

To use custom QR codes:
1. Generate QR codes for your app store URLs
2. Save them as images
3. Replace the `<img src="">` URLs with your local images

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

Customize this section based on your licensing needs.

## Support

For questions or issues, contact: hello@simple-tech.com
