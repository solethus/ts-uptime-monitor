import {api} from "encore.dev/api";
import {SQLDatabase} from "encore.dev/storage/sqldb";
import knex from "knex";


// Site describes a monitored site.
export interface Site {
    // ID is a unique ID for the site.
    id: number;
    // URL os the site's URL.
    url: string;
}

// AddParams are the parameters for adding a site to be monitored.
export interface AddParams {
    // URL is the URL of the site. If it doesn't contain a scheme
    // (like "http:" or "https:") it defaults to "https:".
    url: string;
}

// Add a new site to the list of monitored websites.
export const add = api(
    {expose: true, method: "POST", path: "/site"},
    async (params: AddParams): Promise<Site>=> {
        return (await Sites().insert({url: params.url}, "*"))[0];
    }
);


// Get a site by id
export const get = api(
    {expose: true, method:"GET", path:"/site/:id", auth: false},
    async ({id}: {id: number}):Promise<Site> => {
        const site = await Sites().where({id: id}).first();
        return site ?? await Promise.reject(new Error(`Site with ID:${id} not found.`));
    },
);

// Delete a site by id
export const del = api(
    {expose: true, method:"DELETE", path: "/site/:id"},
    async ({id}: {id: number}):Promise<void> => {
        await Sites().where({id: id}).delete();
    }
)

export interface ListResponse{
    // Sites is the list of monitored sites
    sites: Site[];
}

// List the monitored sites
export const list = api(
    {expose: true, method:"GET", path:"/site"},
    async ():Promise<ListResponse> => {
        const sites =  await Sites().select();
        return {sites};
    }
);


// Define a database named 'site', using database migrations
// in the "./migrations" folder. Encore automatically provisions,
// migrates, and connects to the database.
const SiteDB = new SQLDatabase("site", {
    migrations: "./migrations",
});

const orm = knex({
    client: "pg",
    connection: SiteDB.connectionString,
})

const Sites = () => orm<Site>("site");