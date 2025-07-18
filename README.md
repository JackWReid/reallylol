# really.lol

A Hugo-based personal blog and book tracking website.

## Dependencies

### Cover CLI
The `scripts/update-books.sh` script uses the [cover CLI](https://github.com/jackreid/cover) to fetch book data from Hardcover. 

#### Installation
```bash
# Install cover CLI (requires Go)
git clone https://github.com/jackreid/cover.git
cd cover
go build -o cover
# Move binary to PATH or use ./cover directly
```

#### Setup
1. Create a Hardcover account at [hardcover.app](https://hardcover.app)
2. Get your API key from account settings
3. Set the environment variable:
   ```bash
   export HARDCOVER_API_KEY="your-api-key-here"
   ```

#### Usage
```bash
# Update all book data
./scripts/update-books.sh
```

## Development

### Building the Site
```bash
# Start development server
hugo server

# Build for production
hugo build
```

### Creating Content
```bash
# Create new note
./scripts/new-note.sh

# Create new photo post
./scripts/new-photo.sh

# Create new blog post
./scripts/new-post.sh

# Tag existing content
./scripts/tag-content.sh
```

### Updating Media
```bash
# Update film data
./scripts/update-films.sh

# Update book data (requires cover CLI and API key)
./scripts/update-books.sh
```

## Content Types
The site uses custom Hugo archetypes for different content types:
- **highlight** - Article highlights and commentary
- **note** - Quick personal notes and thoughts
- **photo** - Photo posts with metadata
- **post** - Standard blog posts

## Configuration
- Theme: `reallylol` (custom theme)
- Language: English (GB)
- Syntax highlighting: Dracula theme
- Pagination: 10 items per page
- Build future posts: enabled
