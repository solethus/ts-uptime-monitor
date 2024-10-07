import { api } from "encore.dev/api";
import {MonitorDB} from "./check";

interface SiteStatus {
    id: number,
    up: boolean,
    checkedAt: string,
}

// StatusResponse is the response type from the status endpoint
interface StatusResponse {
    // Sites contains the current status of all sites.
    // keyed by the site ID.
    sites: SiteStatus[];
}

// status checks the current up/down status of all monitored sites.
export const status = api(
    {expose: true, path: "/status", method: "POST"},
    async ():Promise<StatusResponse>  => {
        const rows = MonitorDB.query`
            SELECT DISTINCT
            ON (site_id) site_id, up, checkedAt
            FROM checks
            ORDER BY site_id, checked_at DESC
        `;

        const results: SiteStatus[] = [];
        for await (const row of rows) {
            results.push({
                id: row.site_id,
                up: row.up,
                checkedAt: row.checkedAt,
            })
        }
        return {sites: results};
    }

);