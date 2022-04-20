---
title: "Taking down Goodreads"
date: 2022-04-12
tags:
 - books
 - web
 - indieweb
 - dev
---

**TL;DR** I'm switching from Goodreads to Oku. [Sign up here][11] (referral code).

I got rid of most of my social media accounts. The remaining ones are really services I use to track something I do myself that I share with others: Strava (running and cycling), Duolingo (learning languages), and Goodreads (reading). Of these, the one that I have always been dying to replace is [Goodreads][1]. The website and the native app are both terrible, it's owned by Amazon, and the means to get your reading data out of it and into something else are being made increasingly difficult. But for a long time, Goodreads has dominated. I think the main reason is social inertia: people are on Goodreads because other people are on Goodreads. If you really want to see what your friends are reading, and most people are on Goodreads, you had better be on Goodreads too. For that reason, any challenger to Goodreads had better be a *lot* better, not just a little.

I've been tracking challengers to Goodreads for a while. The alternatives fall into two main camps. First you have the startups. They're side projects that the founder probably hopes to grow into a sustainable business one day if they gain enough traction. They tend to be pretty slickly designed, not overloaded with features, and at a "beta" phase advertising more features to come.

Second you have the open web enthusiast projects. These people are close to my heart. They tend to be aligned to the IndieWeb movement, which aims to move power away from centralised platforms that can use and abuse users' data and attention as they see fee and instead empower people to own their own data. The technical problems you have to overcome to facilitate a social netowork where everybody has total data sovereignty are myriad, but the IndieWeb people are making noble progress.

Free (as in libre, not gratis) books and cataloguing information around them are not new, in fact some of the biggest archive projects on the internet address books. The Internet Archive has a project called [The Open Library][9] that technically ticks all the boxes. You can sign up for an account, make lists of books based on their definitive catalogue, mark what you're reading and what you want to read and share those things with others. The Open Library is developed by volunteers and suffers a bit from a lack of visual and user experience polish, it's a little chocked full of features, and it lacks a dedicated native application.

[LibraryThing][2] is, funnily enough, a tool for managing the catalogue and inventory of small and medium sized lending libraries. They also support and encourage use for personal libraries, which is how you can use it for similar purposes as Goodreads. It gets good egg points for being a totally ad and cost free service for one of the only universal goods in the world (libraries), and is supported by revenue from their TinyCat product which provides user-facing tools for libraries at a still very small cost. However, it's not *really* meant for using as a social tool like Goodreads.

I mentioned the IndieWeb people earlier. Some of them got together and had [a workshop][12] addressing some of these questions:

> We'll focus discussion on personal libraries on one's site and how they can interact with each other. How can we pool data and resources for the common good? How can we provide Goodreads-like functionality in a decentralized manner?

I think they're asking all the right questions but I can't help but think 99% of the people in my life aren't going to bother with the work required to implement solutions that keep things totally free from centralised control and therefore abuse. For example, [here's a service][6] that uses federated posts and a protocol called Micropub to share updates about what you're readng with other people who have implemented those things on their personal websites. The feature payoff for the amount of work the user puts in is low.

A couple of who are into both into reading and into personal websites as curated experiences to be tinkered with by the creator, like Mac Wright's [bookshelves on his website][7]. Maggie Appleton did a great [post about the workshop][8] and made some proposals about how existing exchange formats like JSON and RSS could underpin a lot of the essential functionality. I'm doing some of what she's talking about to keep my own store of what I'm reading in a sharing-place agnostic format, but I'm the freak, nobody else is doing that.

So we're left with the services that aim to do the bulk of the work for users, providing them with an easy and centralised experience, in exchange for money. [The Story Graph][3] is a great early contender that explicitly aims to replace Goodreads and replace it with something people can use that isn't owned by Amazon. They charge for a premium version instead of running ads, which is great. They give you some statistics about what you read, and aim to provide you with smart recommendations. Similar in terms of ideology but maybe a little less mature is [BookWyrm][10], which seems to allow the same central set of features but with a smaller user base.

Ultimately, how many people are on a new challenger is only important as a signal about whether the thing will stick around long enough to be worth investing in. The only people I *actually* care about are *my* people, the friends whose books I want to see. So I've been hanging on and watching these new services to see if any reach the "I'll know it when I see it" threshold of maturity to start pestering my innocent friends to shift all their collections over. A couple of services were in contention.

[Booqsi][4] launched with a pretty good user experience off the bat, but it's still quite limited in terms of features. For example, you can't mark yourself as reading more than one book at a time. You can't automatically move your collections over from Goodreads or anything else. It makes for a bit of a sparse experience.

[Oku][5] just launched their iOS app, but that's not the only reason I think they might be *the one*. They get the social networking element as a necessary part of the product; they're giving away a month of a premium plan for those who manage to refer their friends onto the network. The catalogs are pretty complete, you can easily make collections, mark multiple books as reading. They field feature requests and have a clear roadmap. Oku is the one I pestered a few key friends to join, and they did. I'll run it and Goodreads in parallel for a little while to see if it sticks, then I'm out.

[1]:https://www.goodreads.com
[2]:https://www.librarything.com
[3]:https://thestorygraph.com
[4]:https://booqsi.com
[5]:https://oku.club
[6]:https://indiebookclub.biz
[7]:https://macwright.com/2022/02/24/indie-bookshelves.html
[8]:https://maggieappleton.com/interoperable-libraries
[9]:https://openlibrary.org
[10]:https://joinbookwyrm.com
[11]:https://oku.club/join?invitedBy=jackreid&inviteCode=hzwdiJM
[12]:https://events.indieweb.org/2022/02/personal-libraries-pop-up-session-Wax8N17zQuY0
