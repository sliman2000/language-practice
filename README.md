# Language Practice

A private language-learning app for your organization: admins write levelled courses, members work through short lessons, review vocabulary on a spaced schedule, keep a study plan and correct each other's writing and speaking.

Inspired by busuu.com

Built with [oss.new](https://oss.new) for [EveryApp](https://github.com/every-app/every-app).

## Features

- Admins write courses (A1 to C1) of units, lessons, exercises and vocabulary, and publish them when ready.
- Members browse courses by language and level, enrol, and play lessons with instant feedback and progress.
- Words from finished lessons come back for spaced-repetition review, grouped weak, medium and strong.
- Each member keeps one study plan with a weekly target, a streak and an estimated finish date.
- Members send writing and speaking answers for correction by members who know the language, and rate the corrections.

Left out: accounts and sign-in, which your Gateway handles; mobile apps and offline use; paid plans; AI conversation and pronunciation scoring; certificates; business reporting; a ready-made course catalogue.

## Setup

```sh
pnpm install
pnpm dev          # run locally behind the local Gateway
pnpm test         # unit tests
pnpm run deploy   # deploy to your Cloudflare account through your Gateway
```

The app uses a D1 database and an R2 bucket for voice recordings; the deploy creates both. R2 must be enabled on the Cloudflare account once. There are no secrets or settings to fill in.

Organization owners and admins can author courses; everyone else learns.

## Limitations

- Days, weeks and streaks are counted in UTC.
- Recording a speaking answer needs a browser with microphone access; clips are limited to 5 MB.
- Speaking answers are corrected in writing; there is no automatic pronunciation check.
