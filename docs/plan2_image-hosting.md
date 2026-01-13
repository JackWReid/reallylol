# Cloudflare Image Hosting Migration Plan

## Current Situation

**Repository Analysis:**
- **6,037 total images** across the repository
- **290MB total size** of image files
- **2,609+ markdown files** with image references
- Images stored in multiple locations:
  - `assets/img/photo/` - Photo posts processed via Hugo’s asset pipeline
  - `assets/img/` - Other processed assets
  - `static/img/` - Remaining general static images

**Key Issues:**
1. Repository is becoming unwieldy with hundreds of images
2. Clone times and repository size are increasing
3. Git history is cluttered with binary image files
4. No CDN optimization for end-user performance

## Migration Strategy

### Phase 1: Set Up Cloudflare Images

1. **Create Cloudflare Images Account**
   - Enable Cloudflare Images on your domain
   - Get API token with Images:Edit permissions
   - Note your account ID and delivery URL format

2. **Configure Image Delivery**
   - Set up custom domain for image delivery (e.g., `img.really.lol`)
   - Configure image variants for different use cases:
     - `thumbnail` - 400x400 for previews
     - `medium` - 800x800 for content
     - `large` - 1400x1400 for full-size viewing
     - `original` - Keep original dimensions

### Phase 2: Create Migration Scripts

1. **Upload Script** (`scripts/upload-to-cloudflare.sh`)
   ```bash
   #!/bin/bash
   # Upload images to Cloudflare Images
   # Generate mapping file for URL updates
   # Support batch operations with progress tracking
   ```

2. **Update References Script** (`scripts/update-image-references.sh`)
   ```bash
   #!/bin/bash
   # Update all markdown files to use Cloudflare URLs
   # Use mapping file from upload script
   # Backup original files before changes
   ```

3. **New Photo Script Updates**
   - Modify `scripts/new-photo.sh` to upload directly to Cloudflare
   - Update image processing pipeline
   - Generate Cloudflare-compatible URLs

### Phase 3: Gradual Migration

1. **Start with New Content**
   - Update `new-photo.sh` to upload to Cloudflare first
   - Test workflow with new photos
   - Ensure delivery and performance work as expected

2. **Migrate by Date Range**
   - Start with most recent images (2024-2025)
   - Work backwards through years
   - Allows for testing and rollback if needed

3. **Batch Process by Type**
   - Photos first (`/photo/` directory)
   - Highlights and assets second
   - Static images last

### Phase 4: Repository Cleanup

1. **Create Image Archive Branch**
   ```bash
   git checkout -b archive/images-pre-cloudflare
   git push origin archive/images-pre-cloudflare
   ```

2. **Remove Images from Main Branch**
   - Use `git filter-branch` or `git filter-repo` to remove images
   - Keep `.gitignore` entries for image directories
   - Maintain folder structure for any remaining local images

3. **Update Build Process**
   - Ensure Hugo builds work with external images
   - Test that image processing still works for any remaining local images

## Implementation Details

### Cloudflare Images API Integration

```bash
# Upload image example
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/images/v1" \
  -H "Authorization: Bearer $API_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "id=photo-2023-02-05-tempelhof-terminal"
```

### URL Pattern Migration

**Before:**
```markdown
{{< photo src="img/photo/2023-02-05-tempelhof-terminal.jpg" alt="Alt text" >}}
```

**After:**
```markdown
![Alt text](https://img.really.lol/photo-2023-02-05-tempelhof-terminal/medium)
```

### New Photo Script Updates

**Current workflow:**
1. Extract EXIF data
2. Copy to `assets/img/photo/`
3. Process with ImageMagick
4. Create markdown file using the `photo` shortcode

**New workflow:**
1. Extract EXIF data
2. Process with ImageMagick locally
3. Upload to Cloudflare Images
4. Create markdown file with Cloudflare URL
5. Delete local processed file

## Benefits

1. **Performance Improvements**
   - CDN delivery worldwide
   - Automatic image optimization
   - Responsive image variants
   - WebP/AVIF format support

2. **Repository Benefits**
   - Dramatically smaller repository size
   - Faster clones and pulls
   - Cleaner git history
   - Reduced storage costs

3. **Management Benefits**
   - Centralized image management
   - Automatic backups via Cloudflare
   - Better scaling for future growth
   - Professional image delivery

## Risks and Considerations

1. **Vendor Lock-in**
   - Dependency on Cloudflare service
   - Migration complexity if switching providers
   - **Mitigation:** Keep local backups, document process

2. **Cost Implications**
   - Cloudflare Images pricing per image and delivery
   - Bandwidth costs for high-traffic images
   - **Mitigation:** Monitor usage, optimize image variants

3. **Build Process Changes**
   - Hugo may need configuration updates
   - Local development workflow changes
   - **Mitigation:** Test thoroughly, document new processes

4. **SEO and Performance**
   - External image domain may affect SEO
   - Need to ensure proper image metadata
   - **Mitigation:** Use custom domain, proper alt text

## Timeline

- **Week 1:** Set up Cloudflare Images, create migration scripts
- **Week 2:** Test with new photos, refine workflow
- **Week 3:** Begin batch migration of recent images (2024-2025)
- **Week 4:** Continue migration, update build processes
- **Week 5:** Complete migration, clean up repository
- **Week 6:** Monitor performance, optimize as needed

## Success Metrics

- Repository size reduction (target: 80%+ reduction)
- Image load times (target: 50% improvement)
- Build time improvements
- Successful migration of all 6,000+ images
- No broken image links in production

## GitHub Actions Integration

Consider adding workflow automation:
```yaml
name: Upload New Images to Cloudflare
on:
  push:
    paths:
      - 'static/img/**'
      - 'assets/img/**'
jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Upload to Cloudflare Images
        run: ./scripts/upload-to-cloudflare.sh
```

This plan provides a structured approach to migrating your 6,000+ images to Cloudflare while maintaining website functionality and improving performance.
