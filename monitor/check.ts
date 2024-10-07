import {api} from "encore.dev/api";
import {SQLDatabase} from "encore.dev/storage/sqldb";
import {CronJob} from "encore.dev/cron";
import {Topic} from "encore.dev/pubsub";
import {site} from "~encore/clients";
import {ping} from "./ping";
import {Site} from "../site/site";


// Check checks a single site.
export const check = api(
    {expose: true, method: "POST", path: "/check/:siteID"},
    async (p: { siteID: number }): Promise<{ up: boolean }> => {
        const s = await site.get({id: p.siteID});
        return doCheck(s)
    }
);

// CheckAll checks all sites.
export const checkAll = api(
    {expose: true, method: "POST", path: "/check-all"},
    async (): Promise<void> => {
        const sites = await site.list();
        await Promise.all(sites.sites.map(doCheck));
    }
)

// getPreviousMeasurement reporst whether the give site was
// Up or Down in the previous measurement
async function getPreviousMeasurement(siteID: number): Promise<boolean> {
    const row = await MonitorDB.queryRow`
        SELECT up
        FROM checks
        WHERE site_id = ${siteID}
        ORDER BY checked_at DESC
        LIMIT 1
    `;
    return row?.up ?? true;
}


async function doCheck(site: Site): Promise<{ up: boolean }> {
    const {up} = await ping({url: site.url});

    // Publish a Pub/Sub message if the site transitions
    // from up->down or from down->up
    const wasUp = await getPreviousMeasurement(site.id);
    if (up !== wasUp) {
        await TransactionTopic.publish({site, up});
    }
    await MonitorDB.exec`
        INSERT INTO checks (site_id, up, checked_at)
        VALUES (${site.id}, ${up}, NOW())
    `;
    return {up: up}
}

// TransactionEvent describes a transaction of a monitored site
// from up->down or from down->up.
export interface TransactionEvent {
    // Site is the monitored site in question
    site: Site;
    // Up specifies whether the site is up or down (the new value).
    up: boolean;
}

// TransactionTopic is the pubsub topic with the transaction events for when a monitored site
// transitions from up->down or from down->up.
export const TransactionTopic = new Topic<TransactionEvent>("uptime-transaction", {
    deliveryGuarantee: "at-least-once",
})


// Check all tracked sites every 1 hour.
const cronJob = new CronJob("check-all", {
    title: "Check all sites",
    every: "1h",
    endpoint: checkAll,
});

// Define a database named 'monitor' using database migrations
// in the "./migrations" folder. Encore automatically provisions,
// migrates, and connects to the database
export const MonitorDB = new SQLDatabase("monitor", {
    migrations: "./migrations",
});