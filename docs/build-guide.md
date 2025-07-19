# Build Guide - really.lol

This guide provides comprehensive instructions for setting up the development environment, building, and deploying the really.lol Hugo-based personal blog and book tracking website.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Environment Setup](#development-environment-setup)
3. [Building the Site](#building-the-site)
4. [Development Workflow](#development-workflow)
5. [Content Management](#content-management)
6. [Data Updates](#data-updates)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Before setting up the development environment, ensure you have the following installed:

### Required Dependencies

- **Hugo** (static site generator)
  ```bash
  # macOS
  brew install hugo
  
  # Debian/Ubuntu
  sudo apt-get install hugo
  
  # Other platforms: https://gohugo.io/installation/
  ```

- **Git** (for version control)
  ```bash
  # Usually pre-installed on macOS and Linux
  git --version
  ```

### Optional Dependencies for Content Management

- **exiftool** (for photo metadata extraction)
  ```bash
  # macOS
  brew install exiftool
  
  # Debian/Ubuntu
  sudo apt-get install libimage-exiftool-perl
  ```

- **ImageMagick** (for image processing)
  ```bash
  # macOS
  brew install imagemagick
  
  # Debian/Ubuntu
  sudo apt-get install imagemagick
  ```

- **SQLite3** (for film data processing)
  ```bash
  # macOS (usually pre-installed)
  brew install sqlite3
  
  # Debian/Ubuntu
  sudo apt-get install sqlite3
  ```

- **jq** (for JSON processing)
  ```bash
  # macOS
  brew install jq
  
  # Debian/Ubuntu
  sudo apt-get install jq
  ```

### Special Dependencies for Book Management

- **Go** (for building cover CLI)
  ```bash
  # macOS
  brew install go
  
  # Other platforms: https://golang.org/doc/install
  ```

- **Cover CLI** (for book data from Hardcover)
  ```bash
  git clone https://github.com/jackreid/cover.git
  cd cover
  go build -o cover
  # Move binary to PATH or use ./cover directly
  mv cover /usr/local/bin/  # or add to PATH
  ```

### AI Content Tagging Dependencies

- **Python 3.13+** with **uv** package manager
  ```bash
  # Install uv (Python package manager)
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```

## Development Environment Setup

### 1. Clone the Repository

```bash
git clone [repository-url]
cd reallylol
```

### 2. Verify Hugo Installation

```bash
hugo version
# Should display Hugo version information
```

### 3. Test Basic Build

```bash
# Build the site
hugo

# Start development server
hugo server
```

The development server will be available at `http://localhost:1313`

### 4. Set Up Environment Variables

#### For Book Management (Optional)

1. Create a Hardcover account at [hardcover.app](https://hardcover.app)
2. Get your API key from account settings
3. Set the environment variable:
   ```bash
   export HARDCOVER_API_KEY="your-api-key-here"
   
   # Add to your shell profile for persistence
   echo 'export HARDCOVER_API_KEY="your-api-key-here"' >> ~/.bashrc
   # or ~/.zshrc for zsh
   ```

#### For AI Content Tagging (Optional)

```bash
export GEMINI_API_KEY="your-gemini-api-key-here"
```

### 5. Set Up Python Environment for Content Tagging

```bash
cd scripts/tag-content-env
uv sync
cd ../..
```

## Building the Site

### Development Build

```bash
# Build the site for development
hugo

# Output will be in ./public/ directory
```

### Production Build

```bash
# Build for production (minified, optimized)
hugo --minify

# Build with specific base URL
hugo --baseURL="https://your-domain.com" --minify
```

### Development Server

```bash
# Start development server with live reload
hugo server

# Start server on custom port
hugo server --port 8080

# Start server accessible from external devices
hugo server --bind=0.0.0.0

# Start server with drafts enabled
hugo server --buildDrafts
```

## Development Workflow

### Project Structure

```
reallylol/
├── config.toml           # Hugo configuration
├── content/              # Site content
│   ├── highlight/        # Article highlights
│   ├── note/            # Personal notes
│   ├── photo/           # Photo posts
│   ├── media/           # Reading/watching lists
│   └── about/           # About pages
├── themes/              # Hugo themes
├── static/              # Static assets
├── assets/              # Source assets
├── data/                # Data files (JSON)
├── scripts/             # Utility scripts
└── docs/                # Documentation
```

### Configuration Overview

The site is configured via `config.toml`:

```toml
baseURL = "https://really.lol"
languageCode = "en-gb"
title = "really.lol"
theme = "reallylol"
buildFuture = true
timeout = 999999

[pagination]
pagerSize = 10

[markup]
[markup.highlight]
style = "dracula"

[markup.goldmark.renderer]
unsafe = true
```

Key configuration features:
- **Theme**: Custom `reallylol` theme
- **Language**: English (GB)
- **Syntax highlighting**: Dracula theme
- **Pagination**: 10 items per page
- **Build future posts**: Enabled
- **Unsafe HTML**: Enabled for content flexibility

## Content Management

### Content Types

The site uses custom Hugo archetypes for different content types:

- **highlight** - Article highlights and commentary
- **note** - Quick personal notes and thoughts
- **photo** - Photo posts with metadata
- **post** - Standard blog posts

### Creating New Content

#### New Blog Post
```bash
./scripts/new-post.sh
# Prompts for slug and title, creates file and opens in vim
```

#### New Note
```bash
./scripts/new-note.sh
# Prompts for note content, creates timestamped file
```

#### New Photo Post
```bash
./scripts/new-photo.sh path/to/photo.jpg
# Extracts EXIF data, prompts for metadata, processes image
```

#### Content Tagging
```bash
# Tag text content
./scripts/tag-content.sh text "Your content here"

# Tag a markdown file
./scripts/tag-content.sh file path/to/content.md

# Tag an image
./scripts/tag-content.sh image path/to/image.jpg
```

### Manual Content Creation

You can also create content manually by creating markdown files in the appropriate directories:

```markdown
---
title: "Your Title"
date: 2025-07-19T10:00:00
tags: ["tag1", "tag2"]
---

Your content here.
```

## Data Updates

### Updating Book Data

```bash
# Update all book lists (requires cover CLI and API key)
./scripts/update-books.sh
```

This updates:
- `data/books/toread.json`
- `data/books/reading.json`
- `data/books/read.json`

### Updating Film Data

```bash
# Update from Letterboxd export
./scripts/update-film.sh path/to/letterboxd-export/
```

Requires Letterboxd data export from https://letterboxd.com/settings/data/

### Photo Management

```bash
# Batch process all photos
./scripts/date-photo.sh
```

## Deployment

### Static Site Deployment

The site generates static files in the `public/` directory after running `hugo build`. These can be deployed to any static hosting service:

#### Manual Deployment

1. Build the site:
   ```bash
   hugo --minify
   ```

2. Upload the `public/` directory to your hosting service

#### Common Hosting Platforms

**Netlify:**
- Connect your Git repository
- Set build command: `hugo --minify`
- Set publish directory: `public`

**Vercel:**
- Connect your Git repository
- Framework preset: Hugo
- Build command: `hugo --minify`
- Output directory: `public`

**GitHub Pages:**
- Use GitHub Actions with Hugo workflow
- Deploy from `public/` directory

**Cloudflare Pages:**
- Connect your Git repository
- Build command: `hugo --minify`
- Build output directory: `public`

### Environment Variables for Production

Ensure these environment variables are set in your hosting platform:

```bash
HARDCOVER_API_KEY=your-api-key-here  # For book updates
GEMINI_API_KEY=your-gemini-key-here  # For AI tagging
```

### Build Settings for Hosting Platforms

**Hugo Version:** Check your Hugo version with `hugo version` and specify it in your hosting platform's environment variables:

```bash
HUGO_VERSION=0.xxx.x
```

## Troubleshooting

### Common Issues

#### Hugo Build Fails

1. **Check Hugo version:**
   ```bash
   hugo version
   ```

2. **Verify config syntax:**
   ```bash
   hugo config
   ```

3. **Check for missing theme:**
   ```bash
   ls themes/
   # Should contain 'reallylol' directory
   ```

#### Content Not Appearing

1. **Check front matter:**
   - Ensure proper YAML format
   - Check date format: `2025-07-19T10:00:00`

2. **Check file location:**
   - Ensure files are in correct `content/` subdirectory

3. **Check drafts:**
   ```bash
   # Include drafts in development
   hugo server --buildDrafts
   ```

#### Scripts Not Working

1. **Check permissions:**
   ```bash
   chmod +x scripts/*.sh
   ```

2. **Check dependencies:**
   ```bash
   # For photo scripts
   which exiftool
   which convert  # ImageMagick
   
   # For book updates
   which cover
   echo $HARDCOVER_API_KEY
   
   # For film updates
   which sqlite3
   which jq
   ```

3. **Run from project root:**
   ```bash
   # Ensure you're in the correct directory
   pwd  # Should show path ending in 'reallylol'
   ```

#### Image Processing Issues

1. **Check ImageMagick installation:**
   ```bash
   convert -version
   ```

2. **Check file permissions:**
   ```bash
   ls -la static/img/
   ```

3. **Check EXIF data:**
   ```bash
   exiftool path/to/image.jpg
   ```

### Performance Optimization

#### Build Performance

1. **Use Hugo's built-in performance tools:**
   ```bash
   hugo --templateMetrics
   hugo --templateMetricsHints
   ```

2. **Enable caching:**
   ```bash
   hugo --enableGitInfo
   ```

#### Image Optimization

1. **Use WebP format for photos when possible**
2. **Optimize images before adding:**
   ```bash
   # Using ImageMagick
   convert input.jpg -quality 85 -resize 1200x1200> output.jpg
   ```

### Getting Help

1. **Check Hugo documentation:** https://gohugo.io/documentation/
2. **Review existing content:** Look at existing files in `content/` for examples
3. **Check script documentation:** See `scripts/README.md` for detailed script information
4. **Validate configuration:** Use `hugo config` to check settings

## Development Best Practices

1. **Always run from project root directory**
2. **Test builds locally before deploying**
3. **Use version control for all changes**
4. **Keep dependencies up to date**
5. **Backup data files before running update scripts**
6. **Use descriptive commit messages**
7. **Test scripts in a staging environment first**

---

This build guide covers the complete development, build, and deployment workflow for the really.lol website. For additional help or questions about specific components, refer to the individual script documentation in `scripts/README.md` or the Hugo official documentation.