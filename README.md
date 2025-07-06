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

## Todo
- [ ] Move content images to Cloudflare R2
- [ ] AJAX in reading and watching
- [ ] Script to create new image post and upload asset
- [ ] Create Impressum page
- [ ] Add new decorative images to repo
- [ ] Adapt v2 stylesheet to v1
