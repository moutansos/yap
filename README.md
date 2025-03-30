# yap - Yet Another Posting Tool

> NOTE: Threads integration is planned but not yet working

`yap` is a command-line tool for posting messages to various text-based social media platforms simultaneously.

## Features

- Post to Twitter, Mastodon, Bluesky, Nostr, and Threads (Threads support is currently commented out).
- Control platforms via command-line flags:
  - `-twitter`: Post to Twitter.
  - `-mastodon`: Post to Mastodon.
  - `-threads`: Post to Threads.
  - `-bluesky`: Post to Bluesky.
  - `-noster`: Post to Nostr.
  - `-all`: Post to all platforms.
- Specify the message to post as a command-line argument.

## Environment Variables

The following environment variables configure authentication and endpoints:

- **Twitter**
  - `TWITTER_API_KEY`: Your Twitter API key.
  - `TWITTER_API_SECRET`: Your Twitter API secret.
  - `TWITTER_ACCESS_TOKEN`: Your Twitter access token.
  - `TWITTER_ACCESS_SECRET`: Your Twitter access token secret.

- **Mastodon**
  - `MASTODON_INSTANCE`: URL of your Mastodon instance (e.g., `https://mastodon.social`).
  - `MASTODON_ACCESS_TOKEN`: Your Mastodon access token.

- **Bluesky**
  - `BLUESKY_EMAIL`: Your Bluesky account email.
  - `BLUESKY_PASSWORD`: Your Bluesky account password.

- **Nostr**
  - `NOSTR_PRIVATE_KEY`: Your Nostr private key in nip19 format.

Refer to the included `.env.example` for a template of the environment variables.

## Installation

Install `yap` with Deno's standard installation method:

```bash
git clone https://github.com/moutansos/yap
deno install -A -f --name yap --global ./main.ts --confg deno.json
```

## Usage

For example, to post "Hello, world!" to Twitter and Mastodon:

```bash
yap -twitter -mastodon "Hello, world!"
```

To post to all supported platforms:

```bash
yap -all "Your message here"
```

## License

This project is licensed under the MIT License.
