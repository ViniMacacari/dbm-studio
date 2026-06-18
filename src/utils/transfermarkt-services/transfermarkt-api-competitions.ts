import { TransfermarktApiBase } from "./transfermarkt-api-base";
import { CompetitionsXPaths } from "./transfermarkt-api-xpath";
import {
    trim,
    extractFromUrl,
    parseMarketValue
} from "./transfermarkt-api-utils";

export class TransfermarktApiCompetitionClubs extends TransfermarktApiBase {
    private competitionId: string;
    private seasonId?: string;

    constructor(competitionId: string, seasonId?: string) {
        const url = `https://www.transfermarkt.com/-/startseite/wettbewerb/${competitionId}/plus/?saison_id=${seasonId || ""}`;
        super(url);
        this.competitionId = competitionId;
        this.seasonId = seasonId;
    }

    async init(): Promise<void> {
        await this.initializePage();
        this.raiseExceptionIfNotFound(CompetitionsXPaths.Profile.NAME);
    }

    private parseCompetitionClubs(): any[] {
        const urls = this.get_list_by_xpath(CompetitionsXPaths.Clubs.URLS);
        const names = this.get_list_by_xpath(CompetitionsXPaths.Clubs.NAMES);
        const ids = urls.map(url => extractFromUrl(url));

        const minLen = Math.min(ids.length, names.length);
        const clubs: any[] = [];
        for (let i = 0; i < minLen; i++) {
            clubs.push({
                id: ids[i],
                name: names[i]
            });
        }
        return clubs;
    }

    getCompetitionClubs(): any {
        this.response["id"] = this.competitionId;
        this.response["name"] = this.get_text_by_xpath(CompetitionsXPaths.Profile.NAME);
        this.response["seasonId"] = extractFromUrl(
            this.get_text_by_xpath(CompetitionsXPaths.Profile.URL),
            "season_id"
        );
        this.response["clubs"] = this.parseCompetitionClubs();
        this.response["updatedAt"] = new Date().toISOString();
        return this.response;
    }
}

export class TransfermarktApiCompetitionSearch extends TransfermarktApiBase {
    private query: string;
    private pageNumber: number;

    constructor(query: string, pageNumber: number = 1) {
        const url = `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(query)}&Wettbewerb_page=${pageNumber}`;
        super(url);
        this.query = query;
        this.pageNumber = pageNumber;
    }

    async init(): Promise<void> {
        await this.initializePage();
    }

    private parseSearchResults(): any[] {
        const idx = this.get_list_by_xpath(CompetitionsXPaths.Search.URLS).map(url => extractFromUrl(url));
        const name = this.get_list_by_xpath(CompetitionsXPaths.Search.NAMES);
        const country = this.get_list_by_xpath(CompetitionsXPaths.Search.COUNTRIES);
        const clubs = this.get_list_by_xpath(CompetitionsXPaths.Search.CLUBS).map(c => parseInt(c.replace(/\D/g, ""), 10) || null);
        const players = this.get_list_by_xpath(CompetitionsXPaths.Search.PLAYERS).map(p => parseInt(p.replace(/\D/g, ""), 10) || null);
        const totalMarketValue = this.get_list_by_xpath(CompetitionsXPaths.Search.TOTAL_MARKET_VALUES).map(mv => parseMarketValue(mv));
        const meanMarketValue = this.get_list_by_xpath(CompetitionsXPaths.Search.MEAN_MARKET_VALUES).map(mv => parseMarketValue(mv));
        const continent = this.get_list_by_xpath(CompetitionsXPaths.Search.CONTINENTS);

        const minLen = Math.min(
            idx.length,
            name.length,
            country.length,
            clubs.length,
            players.length,
            totalMarketValue.length,
            meanMarketValue.length,
            continent.length
        );

        const results: any[] = [];
        for (let i = 0; i < minLen; i++) {
            results.push({
                id: idx[i],
                name: name[i],
                country: country[i],
                clubs: clubs[i],
                players: players[i],
                totalMarketValue: totalMarketValue[i],
                meanMarketValue: meanMarketValue[i],
                continent: continent[i]
            });
        }
        return results;
    }

    searchCompetitions(): any {
        this.response["query"] = this.query;
        this.response["pageNumber"] = this.pageNumber;
        this.response["lastPageNumber"] = this.get_last_page_number(CompetitionsXPaths.Search.BASE);
        this.response["results"] = this.parseSearchResults();
        this.response["updatedAt"] = new Date().toISOString();
        return this.response;
    }
}
