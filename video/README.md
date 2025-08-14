# Tickker Promo Video

This directory contains the Remotion project for creating promotional videos for Tickker.

## Setup

1. Install dependencies:
```bash
npm install
```

## Development

1. Start the preview:
```bash
npm start
```

2. Open your browser to see the video preview and make edits in real-time.

## Rendering

1. Render the video as MP4:
```bash
npm run render
```

2. Render as GIF:
```bash
npm run render-gif
```

## Project Structure

- `src/compositions/` - Main video compositions
- `src/components/` - Reusable video components/scenes
- `public/` - Static assets (images, fonts, etc.)
- `out/` - Rendered video output (created after rendering)

## Video Structure

The promo video consists of three main scenes:

1. **Title Scene** (3 seconds) - Brand introduction with animated title
2. **Feature Showcase** (20 seconds) - Four key features, 5 seconds each
3. **Call to Action** (7 seconds) - Closing with website URL

Total duration: 30 seconds at 1920x1080 resolution, 30fps.

## Customization

Edit the props in `src/Root.tsx` to customize:
- Title text and colors
- Feature descriptions
- Scene timings
- Video dimensions and framerate