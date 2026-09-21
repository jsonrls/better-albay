# BetterAlbay Hero Cinematic Video Background

This directory holds the animated background video for the homepage hero section (`.home-hero-v2`).

## Target Files

- `assets/videos/mt-mayon-hero.webm` (WebM VP9 format, recommended for modern browsers)
- `assets/videos/mt-mayon-hero.mp4` (MP4 H.264 format, universal fallback)
- (Also mirrored in `react-app/public/assets/videos/`)

## Video Specifications

- **Duration**: 6 seconds (seamless loop)
- **Aspect Ratio**: 16:9 (1920×1080)
- **Source Image**: `assets/images/banners/mt-mayon-hero.webp`
- **File Size Target**: 1 MB – 3 MB for fast web loading
- **Framerate**: 24 fps or 30 fps
- **Audio**: None (muted)

## Generation Prompt Preset (for Kling AI / Runway Gen-3 / Luma Dream Machine / Hailuo)

```json
{
  "prompt": "Animate this photograph of Mount Mayon in Albay, Philippines into a realistic cinematic landscape video. Keep the camera completely static, like the scene was captured on a tripod, and preserve the original composition and natural perspective. Create gentle, natural cloud movement across the sky. The large white clouds should slowly drift from left to right, while the clouds surrounding the summit of Mount Mayon should softly move and flow around the peak in a realistic way. The motion must feel calm, subtle, and physically natural, like a peaceful breezy afternoon. Add very slight movement to the water, with soft ripples and subtle reflections, while keeping the mountain, coastline, buildings, docked ships, and foreground structures stable and unmoving. Preserve the photographic realism, daylight colors, atmospheric depth, and fine details of the original image. Avoid dramatic weather changes, unnatural cloud morphing, or exaggerated motion. The final result should feel like a real live landscape shot, with only the clouds and water gently moving.",
  "duration": "6 seconds",
  "camera_movement": "static / locked tripod shot",
  "motion_strength": "low",
  "style": "photorealistic cinematic",
  "aspect_ratio": "16:9",
  "negative_prompt": "camera shake, zoom, pan, tilt, mountain deformation, moving buildings, moving ships, flickering, fast clouds, unrealistic cloud morphing, volcanic eruption, smoke, dramatic lighting change, surreal effects, unstable background, distorted coastline, heavy water movement"
}
```

## How to generate & apply:

1. Upload `assets/images/banners/mt-mayon-hero.webp` into Kling AI 1.5, Runway Gen-3 Alpha, or Luma Dream Machine (Image-to-Video mode).
2. Paste the prompt and negative prompt above. Set motion strength to **low** and camera motion to **static / locked**.
3. Generate and export the 6-second video as MP4.
4. Save the file to `assets/videos/mt-mayon-hero.mp4` and `react-app/public/assets/videos/mt-mayon-hero.mp4`.
5. (Optional) Convert to WebM using ffmpeg:
   ```bash
   ffmpeg -i mt-mayon-hero.mp4 -c:v libvpx-vp9 -b:v 1M -an mt-mayon-hero.webm
   ```
6. The hero section automatically detects and plays the video seamlessly with progressive fade-in and poster fallback!
