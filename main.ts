// deps.ts
import { TwitterApi } from "twitter-api-v2";
import { createRestAPIClient } from "masto";
import { AtpAgent } from "@atproto/api";
import { finalizeEvent } from "nostr-tools/pure";
import { Relay } from "nostr-tools/relay";
// import { ThreadsAPI } from "threads-api";
import { config } from "https://deno.land/x/dotenv@v3.2.2/mod.ts";
import { nip19 } from "nostr-tools";


const env = config();

function getEnv(name: string): string | undefined {
  return env[name] || Deno.env.get(name);
}

const twitterApiKey = getEnv("TWITTER_API_KEY");
const twitterApiSecret = getEnv("TWITTER_API_SECRET");
const twitterApiAccessToken = getEnv("TWITTER_ACCESS_TOKEN");
const twitterApiAccessSecret = getEnv("TWITTER_ACCESS_SECRET");

const mastodonInstance = getEnv("MASTODON_INSTANCE");
const mastodonAccessToken = getEnv("MASTODON_ACCESS_TOKEN");

const blueskyEmail = getEnv("BLUESKY_EMAIL");
const blueskyPassword = getEnv("BLUESKY_PASSWORD");

const nosterPrivateKey = getEnv("NOSTR_PRIVATE_KEY");

interface PostResult {
  twitter: boolean;
  mastodon: boolean;
  threads: boolean;
  bluesky: boolean;
  nostr: boolean;
}

class SocialCrossPost {
  private twitter?: TwitterApi;
  private mastodon?: ReturnType<typeof createRestAPIClient>;
  private bluesky?: AtpAgent;
  // private threads: ThreadsAPI;
  private nostrKey?: string;

  constructor() {
    // Twitter Auth
    if (
      twitterApiKey &&
      twitterApiSecret &&
      twitterApiAccessToken &&
      twitterApiAccessSecret
    ) {
      this.twitter = new TwitterApi({
        appKey: twitterApiKey,
        appSecret: twitterApiSecret,
        accessToken: twitterApiAccessToken,
        accessSecret: twitterApiAccessSecret,
      });
    }

    // Mastodon Auth
    if (mastodonInstance && mastodonAccessToken) {
      this.mastodon = createRestAPIClient({
        url: mastodonInstance,
        accessToken: mastodonAccessToken,
      });
    }

    // Bluesky Auth
    if (blueskyEmail && blueskyPassword) {
      this.bluesky = new AtpAgent({
        service: "https://bsky.social",
      });
    }

    // Threads Auth
    // this.threads = new ThreadsAPI({
    //     username: env.THREADS_USERNAME,
    //     password: env.THREADS_PASSWORD,
    // });

    this.nostrKey = nosterPrivateKey;
  }

  async init(): Promise<void> {
    if (this.bluesky && blueskyEmail && blueskyPassword) {
      await this.bluesky.login({
        identifier: blueskyEmail,
        password: blueskyPassword,
      });
    }
  }

  private async postTwitter(text: string): Promise<boolean> {
    if (!this.twitter) return false;

    try {
      await this.twitter.v2.tweet(text);
      return true;
    } catch (e) {
      console.error(`Twitter posting failed: ${e}`);
      return false;
    }
  }

  private async postMastodon(text: string): Promise<boolean> {
    if (!this.mastodon) return false;

    try {
      await this.mastodon.v1.statuses.create({
        status: text,
        visibility: "public",
      });
      return true;
    } catch (e) {
      console.error(`Mastodon posting failed: ${e}`);
      return false;
    }
  }

  private async postThreads(text: string): Promise<boolean> {
    try {
      // await this.threads.publish({
      //     text,
      // });
      // return true;
      return false;
    } catch (e) {
      console.error(`Threads posting failed: ${e}`);
      return false;
    }
  }

  private async postBluesky(text: string): Promise<boolean> {
    if (!this.bluesky) return false;

    try {
      await this.bluesky.post({
        text,
        createdAt: new Date().toISOString(),
      });
      return true;
    } catch (e) {
      console.error(`Bluesky posting failed: ${e}`);
      return false;
    }
  }

  private async postNostr(text: string): Promise<boolean> {
    if (!this.nostrKey) return false;

    try {
      // deno-lint-ignore no-explicit-any
      const sk: any = nip19.decode(this.nostrKey).data;
      // console.log(`SK Lenght: ${sk.length}`);
      const event = finalizeEvent(
        {
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: text,
        },
        sk,
      );

      const relay = await Relay.connect("wss://relay.nostr.band/");
      await relay.publish(event);
      relay.close();
      return true;
    } catch (e) {
      console.error(`Nostr posting failed: ${e}`);
      return false;
    }
  }

  async crossPost(text: string, flags: PostResult): Promise<PostResult> {
    const results = await Promise.all([
      flags.twitter ? this.postTwitter(text) : false,
      flags.mastodon ? this.postMastodon(text) : false,
      flags.threads ? this.postThreads(text) : false,
      flags.bluesky ? this.postBluesky(text) : false,
      flags.nostr ? this.postNostr(text) : false,
    ]);

    return {
      twitter: results[0],
      mastodon: results[1],
      threads: results[2],
      bluesky: results[3],
      nostr: results[4],
    };
  }
}

function parseFlags(): { twitter: boolean; mastodon: boolean; threads: boolean; bluesky: boolean; nostr: boolean } {
  const args = Deno.args;
  let flags = {
    twitter: false,
    mastodon: false,
    threads: false,
    bluesky: false,
    nostr: false,
  };

  if (args.includes("-all")) {
    flags = { twitter: true, mastodon: true, threads: true, bluesky: true, nostr: true };
  } else {
    if (args.includes("-twitter")) {
      flags.twitter = true;
    }
    if (args.includes("-mastodon")) {
      flags.mastodon = true;
    }
    if (args.includes("-threads")) {
      flags.threads = true;
    }
    if (args.includes("-bluesky")) {
      flags.bluesky = true;
    }
    if (args.includes("-noster")) {
      flags.nostr = true;
    }
  }

  if (!flags.twitter && !flags.mastodon && !flags.threads && !flags.bluesky && !flags.nostr) {
    console.error("At least one flag is required: -twitter, -mastodon, -threads, -bluesky, -noster, or -all");
    Deno.exit(1);
  }
  return flags;
}

async function main() {
  const flags = parseFlags();
  const posArgs = Deno.args.filter(arg => !["-all", "-twitter", "-mastodon", "-threads", "-bluesky", "-noster"].includes(arg));
  if (posArgs.length === 0) {
    console.error("Please provide a message to post in quotes.");
    Deno.exit(1);
  }
  const message = posArgs.join(" ");
  const poster = new SocialCrossPost();
  await poster.init();
  const results = await poster.crossPost(message, flags);
  console.log(results);
}

if (import.meta.main) {
  await main();
}
