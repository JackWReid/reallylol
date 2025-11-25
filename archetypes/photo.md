---
title: "{{ replace .Name "-" " " | title }}"
date: {{ .Date }}
image: "/img/photo/{{ .Name }}.jpg"
location: ""
tags: []
---

![Alt text](/img/photo/{{ .Name }}.jpg)
