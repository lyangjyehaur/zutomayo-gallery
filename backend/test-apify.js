import 'dotenv/config';
import { ApifyClient } from 'apify-client';
async function test() {
    const client = new ApifyClient({
        token: process.env.APIFY_API_TOKEN,
    });
    const input = {
        searchTerms: [`from:zutomayo_art`],
        maxItems: 5
    };
    const run = await client.actor("kaitoeasyapi/twitter-x-data-tweet-scraper-pay-per-result-cheapest").call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    console.log(JSON.stringify(items[0], null, 2));
}
test().catch(console.error);
