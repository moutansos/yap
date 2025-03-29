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
      env.TWITTER_API_KEY &&
      env.TWITTER_API_SECRET &&
      env.TWITTER_ACCESS_TOKEN &&
      env.TWITTER_ACCESS_SECRET
    ) {
      this.twitter = new TwitterApi({
        appKey: env.TWITTER_API_KEY,
        appSecret: env.TWITTER_API_SECRET,
        accessToken: env.TWITTER_ACCESS_TOKEN,
        accessSecret: env.TWITTER_ACCESS_SECRET,
      });
    }

    // Mastodon Auth
    if (env.MASTODON_INSTANCE && env.MASTODON_ACCESS_TOKEN) {
      this.mastodon = createRestAPIClient({
        url: env.MASTODON_INSTANCE,
        accessToken: env.MASTODON_ACCESS_TOKEN,
      });
    }

    // Bluesky Auth
    if (env.BLUESKY_EMAIL && env.BLUESKY_PASSWORD) {
      this.bluesky = new AtpAgent({
        service: "https://bsky.social",
      });
    }

    // Threads Auth
    // this.threads = new ThreadsAPI({
    //     username: env.THREADS_USERNAME,
    //     password: env.THREADS_PASSWORD,
    // });

    this.nostrKey = env.NOSTR_PRIVATE_KEY;
  }

  async init(): Promise<void> {
    if (this.bluesky) {
      await this.bluesky.login({
        identifier: env.BLUESKY_EMAIL,
        password: env.BLUESKY_PASSWORD,
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

// Usagek
async function main() {
  const poster = new SocialCrossPost();
  await poster.init();
  const results = await poster.crossPost(
    "it's yappening",
    {
      twitter: true,
      mastodon: true,
      threads: true,
      bluesky: true,
      nostr: true,
    },
  );
  console.log(results);
}

if (import.meta.main) {
  await main();
}
