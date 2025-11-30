# Favicon Setup Instructions

## Where to Place Your Favicon Files

Place your favicon files in the **`public`** folder at the root of the project:

```
/Users/louisc/Desktop/mbtichat2/public/
```

## Required Files

You should place these files in the `public` folder:

1. **favicon.ico** - Main favicon (16x16 or 32x32)
2. **favicon-16x16.png** - 16x16 PNG version
3. **favicon-32x32.png** - 32x32 PNG version
4. **apple-touch-icon.png** - 180x180 PNG for iOS devices (optional but recommended)

## Logo for Login Page

Place your logo file in the `public` folder as:

- **logo.png** - Main logo (recommended size: 200x200 or larger, will be scaled to 96x96)

## File Structure

After adding your files, your `public` folder should look like:

```
public/
  ├── favicon.ico
  ├── favicon-16x16.png
  ├── favicon-32x32.png
  ├── apple-touch-icon.png (optional)
  └── logo.png
```

## Notes

- All files in the `public` folder are served from the root path (`/`)
- The logo will be displayed on the login page
- If the logo file doesn't exist, it will be hidden gracefully
- After adding files, restart the dev server to see changes


