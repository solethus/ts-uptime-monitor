import {api} from "encore.dev/api";
import {secret} from "encore.dev/config";
import log from "encore.dev/log";
import {Subscription} from "encore.dev/pubsub";
import {TransactionTopic} from "../monitor/check";

export interface NotifyParams {
    // the Slack message to send
    text: string;
}

// Sends a Slack message to a pre-configured channel using a
// Slack Incoming Webhook
export const notify = api<NotifyParams>(
    {},
    async ({text}) => {
        const url = webhookURL();
        log.info("url", url);
        if (!url) {
            log.info("no slack webhook URL, skipping notification");
            return;
        }

        const resp = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({text}),
        })
        if (resp.status >= 400) {
            const body = await resp.text();
            throw new Error(`slack notification failed: ${resp.status}: ${body}`);
        }
    }
);


const _ = new Subscription(TransactionTopic, "slack-notification", {
    handler: async (event) => {
        const text = `*${event.site.url} is ${event.up ? "back up." : "down!"}*`;
        await notify({text});
    },
});

// SlackWebhookURL defines the Slack webhook URL to send the uptime notifications to.
const webhookURL = secret("SlackWebhookURL");