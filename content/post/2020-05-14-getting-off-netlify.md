---
date: 2020-05-14 13:00:00+00:00
slug: getting-off-of-netlify
subtitle: Self-hosting the website, logs, and analytics
tags:
- blog
- dev
- indieweb
- tech
- web
title: Getting off of Netlify
---

I wanted to quickly follow up to [my recent post](/post/how-this-site-works/) about personal infrastructure with some updates I made this week.

## Why the change
I got a warning last week that I was almost at the limit for my allocation of "build minutes" on Netlify. Upon investigation, I found that my personal website had been building too often and for too long on Netlify, and that soon they would start charging me for the overages. Looking at the logs and running the build locally I saw that the vast majority of the build time was down to preprocessing the many images in the "Photo" part of my site to compress and resize them. So, in the short term those have been removed; I wasn't really presenting them very well anyway.

Either way, this warning along with a vague irritation that I'm paying $9 a month made me want to look into how I could get off the freemium service. Netlify is great, don't get me wrong, but this was also a chance for me to try out some new problems for myself. After all, I'm paying $10 a month for a DigitalOcean VPS and the same again for a Postgres instance.

## Requirements
My site needed to come off of Netlify and still have the following features:

### Analytics
I needed analytics at least telling me how many hits the site is getting and what the top pages are. Also, knowing what the top 404s are helps me realise when I’ve broken a link. Netlify gave me all of this for $9 a month and I was confident I could do it for no additional cost.

### Recency
The Netlify site rebuilt every time I committed to the repository using a Git hook, so that would keep it up to date with new notes and posts etc. It also rebuilt every half an hour when the cron job I have to scrape my media tracking sources (Goodreads et al) ran and dumped new data into the site repo. I needed to match or improve on that to make sure new posts and readings/watchings appeared just as fast.

### CMS
If all else fails I can open up a text editor and commit a new post file to the repository to add content to the site. However, Netlify CMS was giving me a nice quick way to upload new notes and highlights without getting involved with Git. I needed some replacement for that.

### Speed
Netlify was obviously fast and globally distributed, but I have a sneaky feeling that serving a static site from the humble VPS I’m running will do just fine. I just need to be able to render any given page in under 500ms to call it done. The site doesn’t get any traffic really so haven’t had to worry about load yet.

## Solutions
I moved the Hugo site to the existing repository I use for my personal API and scraper scripts. I added it to the Compose file and made an application that uses a Dockerised Hugo image to build the site to a volume.

{{< highlight yaml >}}
site:
  image: jojomi/hugo:latest
  volumes:
    - ./site/:/src
    - ./site_output/:/output
  ports:
    - "1313:1313"
{{< /highlight >}}

### Recency
Now that the site was containerised like the rest of the infrastructure it could easily be controlled and wired up to the other services. The reverse proxy (Caddy) could use the same Docker volume that the site build app wrote to and serve the site as static files.

{{< highlight plain >}}
jackreid.xyz {
  encode gzip

  file_server * {
    root /usr/share/caddy/site
  }
}
{{< /highlight >}}

The same script that kicks off the scrapers can now kick off a build of the website. That solves the requirement to have the site rebuild frequently to stay recent. I can run that as frequently as I like on my own infrastructure without risking running out of “build minutes”.

{{< highlight bash >}}
# Download latest data from API
curl -Lk https://api.jackreid.xyz/books/reading?limit=5000 | jq . > $PWD/site/data/books/reading.json;
...
curl -Lk https://api.jackreid.xyz/analytics | jq . > $PWD/site/data/analytics.json

# Update git
if [ -z "$(git status --porcelain)" ]; then
  echo "[$(date)] No changes found"
else
  echo "[$(date)] Changes found"
  git add . && git commit -m "[$(date)] Updated media data files" && git push origin master;
fi

# Rebuild the site
/usr/local/bin/docker-compose up -d --build site
{{< /highlight >}}

So now I had a cron job pulling my site from GitHub every five minutes, `curl`ing my API to get the latest in my media consumption, building with Hugo, and being statically served by the Caddy reverse proxy.

### Analytics
Caddy has great log support, and spews out structured and details access logs to the `stdout` by default. You can also configure them to go to a file or to a network socket. I configured Caddy to write access logs to a directory in another Docker volume.

{{< highlight plain >}}
log {
  output file /etc/caddy/logs/server_log
}
{{< /highlight >}}

Then another job in the Docker Compose file can read those logs from Caddy, loop through them and `POST` the log lines one-by-one to a logs endpoint in the API. This is definitely an inefficient part of the workflow (I could insert all the lines from a loaded file at once, for example) but to be honest I wanted to put both the VPS and the database to some good use.

{{< highlight yaml >}}
log_upload:
  build:
    context: ./
    dockerfile: ./scripts/logs/Dockerfile
  volumes:
    - ./caddy/logs:/logs
{{< /highlight >}}

This means I have all of my server logs in their original form in a table in Postgres. I could query the database to my heart’s content to get insights about the traffic on the site, but I wanted to be able to glance at the top level statistics. I created an `/analytics` endpoint in the API that returned some basic information like the most requested pages, the total hits, the total misses — over the last hour, day, week, month, and year.

I added that endpoint to the list of data loaded into the site directory before Hugo runs:

{{< highlight bash >}}
curl -Lk https://api.jackreid.xyz/analytics | jq . > $PWD/site/data/analytics.json
{{< /highlight >}}

I now have [a statically generated analytics page](https://jackreid.xyz/analytics/day) giving me the latest stats that is updated every five minutes. Analytics sorted, and greatly improved from before.

### CMS
With access to Netlify’s CMS gone, I had to put some more effort into my homebrew posting workflow. I made some quality-of-life improvements. The “Share” pages I’ve created are simple forms that have fields for things like title, slug, and body. The final field is for a personal GitHub token that allows me to wrap up the form inputs and put them in a `PUT` request to the GitHub API, adding them as files in the `/content` directory of the Hugo site (to be scooped up, built, and deployed within five minutes by the cron job).

Previously the token was pasted in by my password manager. Now, it is placed in `localStorage` the first time it is successfully used, and prefills on that device ever after. That saves a lot of time. I’ve also added some more string sanitisation methods to the inputs; a stray emoji or non-ASCII character often threw a spanner in the works in a way I didn’t want to debug as I quickly posted from my phone.

Now I can post notes very easily, and I still have a browser extension for posting  web highlights (excerpts from good articles) that I stole from [Max Böck](https://mxb.dev/blog/indieweb-link-sharing/ "Max Böck"). For everything else, there’s still Markdown and GitHub.

### Speed
The site still gets a 99 on Lighthouse’s speed audit, and the VPS doesn’t seem to be under almost any load from serving the website (it’s all from my behind-the-scenes silliness), so we’ll just have to see how we go.

## Conclusion
In the end, this is all idle tinkering borne of idle hands in lockdown. Ethan Marcotte said “[let a website be a worry stone](https://ethanmarcotte.com/wrote/let-a-website-be-a-worry-stone/)” and that’s exactly what I’m doing. If you’re interested in learning more, email me at [hello@jackreid.xyz](mailto:hello@jackreid.xyz), or just [check out the repo](https://github.com/JackWReid/jackreidapi).

Next up, getting those photos back online in a form I can be happy with.