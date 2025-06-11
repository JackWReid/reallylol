# Image Storage Cleanup Summary

## Changes Made

### 1. Consolidated Image Storage
- Moved all images from `/assets/img/` to `/static/img/`
- This includes subdirectories:
  - `posters-2023/` (from assets/img to static/img)
  - `posters-2024/` (from assets/img to static/img)
- Removed the now-empty `/assets/img/` folder

### 2. Updated Photo Shortcode
- Modified `themes/reallylol/layouts/shortcodes/photo.html`
- Changed from using `resources.GetMatch` (which looks in `/assets/`) to directly using the provided path
- This makes the `photo` shortcode consistent with the `figure` shortcode

### 3. Current Image Organization
All images are now consistently stored in `/static/img/` with the following structure:
```
/static/img/
├── layout/          # Layout-specific images
├── photo/           # Photo gallery images
├── posters-2023/    # 2023 poster collection
├── posters-2024/    # 2024 poster collection
└── [various individual images]
```

## Benefits
1. **Consistency**: All images are now in one location (`/static/img/`)
2. **Simplicity**: Both `figure` and `photo` shortcodes now work the same way
3. **Maintainability**: Easier to manage images when they're all in one place
4. **No Breaking Changes**: All existing image references in posts continue to work

## Notes
- All existing posts using either `{{< figure >}}` or `{{<photo>}}` shortcodes will continue to work without modification
- Image paths in posts remain as `/img/...` which correctly maps to `/static/img/...` in Hugo
- The simplified photo shortcode no longer performs image resizing, but this can be added back if needed