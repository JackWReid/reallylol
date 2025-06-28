---
date: 2023-06-19
draft: true
tags:
- dev
- home
- london
- tech
title: Build a box
---

Despite being a dictionary-reading, computer geek, gap-tooth **nerd** as a child... and mostly into adulthood, I never did do any PC gaming or building. I think by the time I would have gotten into that I harboured illusions about myself as a creative, artistic person, who probably ought to use a Mac. Thus, I used a MacBook from a relatively early age and never messed around with building the things.

Recently though, I finished building a PC for the first time in my life.

I've been running a Plex server for a long time, and I've slowly been building up the infrastructure around that: applications that need lots of storage and a good VPN. For a while I had all of that running on a Mac Mini with an external 4TB USB drive. It was relatively unreliable. All the applications except Plex were running as Docker containers on Docker Desktop for Mac, which crashed every few days for reasons I could not figure out and decided to stop investigating. I didn't really trust the hard drive, even though it only had movies on it, nothing I would really mind losing after a drive failure.

I wanted to give building a simple server a try. Here's the full part list of the current box:
- Fractal Designs Node 304
- ASRock B550M-ITX motherboard
- AMD Ryzen 5 4600G
- BeQuiet Pure Rock 2 Black CPU cooler
- EVGA 500 W1 500W power supply
- 2 x Corsair 8GB RAM
- Critical 1TB M2 SSD
- 4 x Seagate Barracuda 4TB

There are a few cool compact NAS cases that I thought would be nice and un-invasive to have lying around. The one I really wanted was the Fractal Designs Node 304. It takes a mini-ITX motherboard and six hard drives in a box the size of a microwave. That's not the case I bought first time because they were sold out for the next three months and I'm impatient. Instead I bought a more standard ATX mini-tower, also from Fractal. I back ordered the 304 and have just rebuilt the whole thing into that so I can sit hidden in our bookshelves.

I decided to go AMD because I heard it was cheap and less difficult to cool. I have since learned that if you want accelerated Plex transcoding, there's a certain range of Intel processors with integrated graphics that Plex supports to do that. That's okay though, the CPU-bound transcoding on the AMD CPU hasn't really struggled. I then just chose a cheap but not the cheapest cooler on PC Part Picker and that's how I ended up with the BeQuiet. I now use the fan that came with the case, but the big heatsink from BeQuiet is still in use.

I'm still happy with the motherboard but I think I probably could have found one with six SATA connections to max out the case capacity. I've bought a PCIe to SATA expansion card for another two connectors, so it's fine. That PCIe lane is available because I'm not bothering with a GPU, by the way. The AMD chip with integrated graphics is fine. I threw a 1TB M2 drive on the board without really thinking about the fact that I should have probably used that high speed storage for some more capacity, but never mind.

Onto the actual storage. What I've learned is that making ZFS pool and RAID configuration decisions is really annoying. I think I made the right call for now. I have a RAID Z1 pool of those four 4TB drives for about 10TB usable storage and it's currently about 40% full. What's annoying though is how hard it is to expand that. I'm not smart enough to know the reason for this, but if I buy two more 4TB for those other two slots in the case, I can't just widen the vdev to be six drives. I have to make a new vdev, at which point I may as well just make a new pool. The other upgrade path is to replace the 4TB drives in the current pool with something bigger one-by-one. Once you have all matching capacity the pool magically just increases its capacity.

Anyway, a problem for future Jack. For now, I need to be careful not to start hoarding data to fill up those 10TB just because I can.

The main problem here is that I seem to have taken up a part time sysadmin hobby while I get all of this working. I haven't spoken about the software. The operating system is TrueNAS. I've made lots of attempts to have the server be available for file syncing and admin outside of my home network, and I've ended up with a patchwork that just about works. I can access the TrueNAS dashboard through a DynDNS domain and a forwarded port. A few of the applications are exposed through a Cloudflare tunnel, which is a kind of cool but the auth is terrible.