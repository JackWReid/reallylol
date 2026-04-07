# Plan: Take it back to static but with R2 for photos

This is a human-written prompt for Claude Code documenting a decision and requirements after talking through the options.

## Problem statement

This is a personal website and the CMS required to run it. Like most personal blogs it's been through myriad rebuilds. I'm really happy with where I got the design of it this weekend, but unsurprisingly I'm skeptical about the kind of overcomplicated architecture.

Here's how we got here. The site breaks down into three kinds of content of very different levels of scale.

First there's the blog posts, the highlights, the pages. These are generally handwritten markdown entries and they're at a manageable scale. A good amount of those posts have content images and audio in them.
* 150 blog posts
* 111 microblog style notes
* 149 highlights
* 9 pages

Second there's the "library", which is where I'm tracking my media consumption using data from other services (Letterboxd, Hardcover, Raindrop). The scale is bigger here, and I have these great pages now to display that information based on synced static data. There's also sometimes a blog post about a particular piece of media in the library that I try and loosely connect to the library data somehow.
* 1410 books
* 1050 films
* 116 links

Finally, and most troublesome is photos. I like to take photos and I've taken a lot of them for a long time. I have 2642 photo posts. When this was a Hugo site, it got crazy in build time and the Git repo got huge. That incited all this change.

Tying this all together are the collections pages like "blog", "highlight", "photos" - each of which list all the posts of that type and include fun decorative images in the presentation of that category. Finally I tag pages that show content cutting across all types including photos.

If it weren't for the photos I think this would be a Hugo or Eleventy SSG-style site. As it is I conceded and went to a custom CMS solution that uses Cloudflare D1 and R2 to manage a media library and while I was at it, I thought why not handroll a CMS for the rest of the content too. And it's nice! But Astro's combined rendering and prebuilding model is kind of annoying, multiple linked services feels over the top and complicated. I don't want that smoke really.

So, what are the options? I could have a CMS just for the photos section I guess and have the rest be totally SSG, but I want photos to feel like a totally native content type just like everything else. Also, I don't want to change anything much about the design now I'm happy with it.

With AI agents though, migration is cheap so don't stress there. Think about the best final solution.

## Solution

We're getting rid of the CMS and we're stripping back to make this the most simple Astro site possible, representing all native content types (posts, highlights, notes, **photos**) as markdown with frontmatter. There will be a big build step just like before with thousands of pages to build.

However, photo image files themselves will still be kept in the `media.really.lol` R2 bucket. The markdown files for photo posts would contain references to where the image files live. Everything else would be committed to GitHub. Deployment would be a push of the repo to main triggering a Cloudflare Pages Worker with absolutely basic configuration to build everything ahead of runtime. There would be no D1 database.

Audio files and other images and so on that are included inline in posts would also be in the R2 bucket probably.

All of this puts a lot of burden on the workflow for making photo posts, uploading media and embedding it in posts. That would need to be handled by the cli, which would make sure media was uploaded to the right place and referenced in the committed code. It should also look after orphaned media, sync library datasources like Hardcover, Letterboxd, and Raindrop.

A lot of that CLI capability has been present before, so you could go look for it in repo history. It's important that we get that right because a lot of the editorial workflow will depend on it being slick.

### Project structure

I want this to be a cleaner, simpler state than we started, trying to lean into the simplest Astro implementation possible. Use the framework's features and idioms. Don't fight them. At the same time, **blow away the unneccessary**. Get rid of old wrangler, cms, shared, test-results, tmp, dev.vars, absolutely anything extraneous.

#### R2 Bucket

```
photos/
  [slug].jpg
posts/
  [post_slug]-[image_slug].jpg
  [post_slug]-[audio_slug].m4a
static/
  cv.pdf
  random-hosted-file.zip
```

#### Repo

```
cli/
  lib/
  library.ts
  content.ts
  r2.ts
  index.ts
creds/
  letterboxd-cookies.txt
  raindrop-token
docs/
site/
  .astro/
  src/
    blog/
      [slug].md
    note/
      [slug].md
    photo/
      [slug].md
    pages/
      library/
        read.astro
        toread.astro
        reading.astro
        watched.astro
        towatch.astro
      tags/
        [tag].astro
      blogroll.md
      index.astro
      links.astro
      now.md
      uses.md
    images/
      favicon.png
      notes-hero.jpg
    components/
    content/
    
  astro.config.ts
```

## Migration

You're going to use the existing cli for crawling the data of the CMS to generate the content files in this git repo, and you're going to rearrange the R2 bucket contents to the structure described without breaking anything, because there's no backup right now.
