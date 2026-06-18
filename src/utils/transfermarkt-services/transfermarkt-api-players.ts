import { TransfermarktApiBase } from "./transfermarkt-api-base";
import { PlayersXPaths } from "./transfermarkt-api-xpath";
import {
    trim,
    extractFromUrl,
    safeRegex,
    safeSplit,
    removeStr,
    toCamelCase,
    zipListsIntoDict,
    parseDate,
    parseMarketValue,
    parseHeight,
    parseDays,
    REGEX_CHART_CLUB_ID,
    REGEX_DOB_AGE,
    REGEX_DOB
} from "./transfermarkt-api-utils";

export class TransfermarktApiPlayerSearch extends TransfermarktApiBase {
    private query: string;
    private pageNumber: number;

    constructor(query: string, pageNumber: number = 1) {
        const url = `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(query)}&Spieler_page=${pageNumber}`;
        super(url);
        this.query = query;
        this.pageNumber = pageNumber;
    }

    async init(): Promise<void> {
        await this.initializePage();
        this.raiseExceptionIfNotFound(PlayersXPaths.Search.FOUND);
    }

    private parseSearchResults(): any[] {
        const searchResults = this.evaluateXPath(PlayersXPaths.Search.RESULTS);
        const results: any[] = [];

        for (const result of searchResults) {
            const idUrl = this.get_text_by_xpath(PlayersXPaths.Search.ID, {}, result);
            const idx = extractFromUrl(idUrl);
            const name = this.get_text_by_xpath(PlayersXPaths.Search.NAME, {}, result);
            const position = this.get_text_by_xpath(PlayersXPaths.Search.POSITION, {}, result);
            const clubName = this.get_text_by_xpath(PlayersXPaths.Search.CLUB_NAME, {}, result);
            const clubImage = this.get_text_by_xpath(PlayersXPaths.Search.CLUB_IMAGE, {}, result);
            const clubId = safeRegex(clubImage, REGEX_CHART_CLUB_ID, "club_id");
            const age = this.get_text_by_xpath(PlayersXPaths.Search.AGE, {}, result);
            const nationalities = this.get_list_by_xpath(PlayersXPaths.Search.NATIONALITIES, true, result);
            const marketValueStr = this.get_text_by_xpath(PlayersXPaths.Search.MARKET_VALUE, {}, result);

            results.push({
                id: idx,
                name: name,
                position: position,
                club: {
                    name: clubName,
                    id: clubId,
                },
                age: age ? parseInt(age, 10) : null,
                nationalities: nationalities,
                marketValue: parseMarketValue(marketValueStr),
            });
        }

        return results;
    }

    searchPlayers(): any {
        this.response["query"] = this.query;
        this.response["pageNumber"] = this.pageNumber;
        this.response["lastPageNumber"] = this.get_last_page_number(PlayersXPaths.Search.BASE);
        this.response["results"] = this.parseSearchResults();
        this.response["updatedAt"] = new Date().toISOString();
        return this.response;
    }
}

export class TransfermarktApiPlayerProfile extends TransfermarktApiBase {
    private playerId: string;

    constructor(playerId: string) {
        const url = `https://www.transfermarkt.com/-/profil/spieler/${playerId}`;
        super(url);
        this.playerId = playerId;
    }

    async init(): Promise<void> {
        await this.initializePage();
        this.raiseExceptionIfNotFound(PlayersXPaths.Profile.URL);
    }

    private parsePlayerRelatives(): any[] {
        const relatives = this.evaluateXPath(PlayersXPaths.Profile.RELATIVES);
        const result: any[] = [];
        for (const relative of relatives) {
            const url = this.get_text_by_xpath(PlayersXPaths.Profile.RELATIVE_URL, {}, relative);
            const name = this.get_text_by_xpath(PlayersXPaths.Profile.RELATIVE_NAME, {}, relative);
            if (url && name) {
                result.push({
                    id: extractFromUrl(url),
                    url: url,
                    name: name,
                    profileType: url.includes("spieler") ? "player" : "trainer",
                });
            }
        }
        return result;
    }

    getPlayerProfile(): any {
        const dateOfBirthAge = this.get_text_by_xpath(PlayersXPaths.Profile.DATE_OF_BIRTH_AGE);
        this.response["id"] = this.get_text_by_xpath(PlayersXPaths.Profile.ID);
        this.response["url"] = this.get_text_by_xpath(PlayersXPaths.Profile.URL);
        this.response["name"] = this.get_text_by_xpath(PlayersXPaths.Profile.NAME, { joinStr: " " });
        this.response["description"] = this.get_text_by_xpath(PlayersXPaths.Profile.DESCRIPTION);
        this.response["fullName"] = this.get_text_by_xpath(PlayersXPaths.Profile.FULL_NAME);
        this.response["nameInHomeCountry"] = this.get_text_by_xpath(PlayersXPaths.Profile.NAME_IN_HOME_COUNTRY);
        this.response["imageUrl"] = this.get_text_by_xpath(PlayersXPaths.Profile.IMAGE_URL);
        this.response["dateOfBirth"] = parseDate(safeRegex(dateOfBirthAge, REGEX_DOB, "dob"));
        this.response["placeOfBirth"] = {
            city: this.get_text_by_xpath(PlayersXPaths.Profile.PLACE_OF_BIRTH_CITY),
            country: this.get_text_by_xpath(PlayersXPaths.Profile.PLACE_OF_BIRTH_COUNTRY),
        };
        const ageStr = safeRegex(dateOfBirthAge, REGEX_DOB, "age");
        this.response["age"] = ageStr ? parseInt(ageStr, 10) : null;
        this.response["height"] = parseHeight(this.get_text_by_xpath(PlayersXPaths.Profile.HEIGHT));
        this.response["citizenship"] = this.get_list_by_xpath(PlayersXPaths.Profile.CITIZENSHIP);
        this.response["isRetired"] = this.get_text_by_xpath(PlayersXPaths.Profile.RETIRED_SINCE_DATE) !== null;
        this.response["retiredSince"] = parseDate(this.get_text_by_xpath(PlayersXPaths.Profile.RETIRED_SINCE_DATE));
        this.response["position"] = {
            main: this.get_text_by_xpath(PlayersXPaths.Profile.POSITION_MAIN),
            other: this.get_list_by_xpath(PlayersXPaths.Profile.POSITION_OTHER),
        };
        this.response["foot"] = this.get_text_by_xpath(PlayersXPaths.Profile.FOOT);
        this.response["shirtNumber"] = this.get_text_by_xpath(PlayersXPaths.Profile.SHIRT_NUMBER);
        this.response["club"] = {
            id: extractFromUrl(this.get_text_by_xpath(PlayersXPaths.Profile.CURRENT_CLUB_URL)),
            name: this.get_text_by_xpath(PlayersXPaths.Profile.CURRENT_CLUB_NAME),
            joined: parseDate(this.get_text_by_xpath(PlayersXPaths.Profile.CURRENT_CLUB_JOINED)),
            contractExpires: parseDate(this.get_text_by_xpath(PlayersXPaths.Profile.CURRENT_CLUB_CONTRACT_EXPIRES)),
            contractOption: this.get_text_by_xpath(PlayersXPaths.Profile.CURRENT_CLUB_CONTRACT_OPTION),
            lastClubId: extractFromUrl(this.get_text_by_xpath(PlayersXPaths.Profile.LAST_CLUB_URL)),
            lastClubName: this.get_text_by_xpath(PlayersXPaths.Profile.LAST_CLUB_NAME),
            mostGamesFor: this.get_text_by_xpath(PlayersXPaths.Profile.MOST_GAMES_FOR_CLUB_NAME),
        };
        this.response["marketValue"] = parseMarketValue(this.get_text_by_xpath(PlayersXPaths.Profile.MARKET_VALUE, { ilocTo: 3, joinStr: "" }));
        this.response["agent"] = {
            name: this.get_text_by_xpath(PlayersXPaths.Profile.AGENT_NAME),
            url: this.get_text_by_xpath(PlayersXPaths.Profile.AGENT_URL),
        };
        this.response["outfitter"] = this.get_text_by_xpath(PlayersXPaths.Profile.OUTFITTER);
        this.response["socialMedia"] = this.get_list_by_xpath(PlayersXPaths.Profile.SOCIAL_MEDIA);
        this.response["trainerProfile"] = {
            id: extractFromUrl(this.get_text_by_xpath(PlayersXPaths.Profile.TRAINER_PROFILE_URL)),
            url: this.get_text_by_xpath(PlayersXPaths.Profile.TRAINER_PROFILE_URL),
            position: this.get_text_by_xpath(PlayersXPaths.Profile.TRAINER_PROFILE_POSITION),
        };
        this.response["relatives"] = this.parsePlayerRelatives();
        this.response["updatedAt"] = new Date().toISOString();

        return this.response;
    }
}

export class TransfermarktApiPlayerAchievements extends TransfermarktApiBase {
    private playerId: string;

    constructor(playerId: string) {
        const url = `https://www.transfermarkt.com/-/erfolge/spieler/${playerId}`;
        super(url);
        this.playerId = playerId;
    }

    async init(): Promise<void> {
        await this.initializePage();
        this.raiseExceptionIfNotFound(PlayersXPaths.Profile.URL);
    }

    private parsePlayerAchievements(): any[] {
        const achievements = this.evaluateXPath(PlayersXPaths.Achievements.ACHIEVEMENTS);
        const playerAchievements: any[] = [];

        for (const achievement of achievements) {
            const rawTitle = this.get_text_by_xpath(PlayersXPaths.Achievements.TITLE, {}, achievement) || "";
            const titleParts = rawTitle.split(" ");
            const title = titleParts.slice(1).join(" ");
            const details = this.evaluateXPath(PlayersXPaths.Achievements.DETAILS, achievement);

            const achievementDetails: any[] = [];
            for (const detail of details) {
                const competitionName = this.get_text_by_xpath(PlayersXPaths.Achievements.COMPETITION_NAME, {}, detail);
                const competitionUrl = this.get_text_by_xpath(PlayersXPaths.Achievements.COMPETITION_URL, {}, detail);
                const competitionId = extractFromUrl(competitionUrl);
                const seasonName = this.get_text_by_xpath(PlayersXPaths.Achievements.SEASON, {}, detail);
                const clubName = this.get_text_by_xpath(PlayersXPaths.Achievements.CLUB_NAME, {}, detail);
                const clubUrl = this.get_text_by_xpath(PlayersXPaths.Achievements.CLUB_URL, {}, detail);
                const clubId = extractFromUrl(clubUrl);

                const seasonId = extractFromUrl(clubUrl, "season_id") || extractFromUrl(competitionUrl, "season_id");

                const achievementDetail: any = {
                    season: {
                        id: seasonId,
                        name: seasonName,
                    },
                };

                if (clubId || clubName) {
                    achievementDetail["club"] = {
                        id: clubId,
                        name: clubName,
                    };
                }

                if (competitionId || competitionName) {
                    achievementDetail["competition"] = {
                        id: competitionId,
                        name: competitionName || null,
                    };
                }

                achievementDetails.push(achievementDetail);
            }

            playerAchievements.push({
                title: title || rawTitle,
                count: details.length,
                details: achievementDetails,
            });
        }

        return playerAchievements;
    }

    getPlayerAchievements(): any {
        this.response["id"] = this.playerId;
        this.response["achievements"] = this.parsePlayerAchievements();
        this.response["updatedAt"] = new Date().toISOString();
        return this.response;
    }
}

export class TransfermarktApiPlayerInjuries extends TransfermarktApiBase {
    private playerId: string;
    private pageNumber: number;

    constructor(playerId: string, pageNumber: number = 1) {
        const url = `https://www.transfermarkt.com/player/verletzungen/spieler/${playerId}/plus/1/page/${pageNumber}`;
        super(url);
        this.playerId = playerId;
        this.pageNumber = pageNumber;
    }

    async init(): Promise<void> {
        await this.initializePage();
        this.raiseExceptionIfNotFound(PlayersXPaths.Profile.URL);
    }

    private parsePlayerInjuries(): any[] {
        const injuries = this.evaluateXPath(PlayersXPaths.Injuries.RESULTS);
        const playerInjuries: any[] = [];

        for (const injury of injuries) {
            const season = this.get_text_by_xpath(PlayersXPaths.Injuries.SEASONS, {}, injury);
            const injuryType = this.get_text_by_xpath(PlayersXPaths.Injuries.INJURY, {}, injury);
            const dateFrom = parseDate(this.get_text_by_xpath(PlayersXPaths.Injuries.FROM, {}, injury));
            const dateUntil = parseDate(this.get_text_by_xpath(PlayersXPaths.Injuries.UNTIL, {}, injury));
            const days = parseDays(this.get_text_by_xpath(PlayersXPaths.Injuries.DAYS, {}, injury));
            const gamesMissed = parseDays(this.get_text_by_xpath(PlayersXPaths.Injuries.GAMES_MISSED, {}, injury));
            const gamesMissedClubsUrls = this.get_list_by_xpath(PlayersXPaths.Injuries.GAMES_MISSED_CLUBS_URLS, true, injury);
            const gamesMissedClubsIds = gamesMissedClubsUrls.map(url => extractFromUrl(url));

            playerInjuries.push({
                season: season,
                injury: injuryType,
                fromDate: dateFrom,
                untilDate: dateUntil,
                days: days,
                gamesMissed: gamesMissed,
                gamesMissedClubs: gamesMissedClubsIds,
            });
        }

        return playerInjuries;
    }

    getPlayerInjuries(): any {
        this.response["id"] = this.playerId;
        this.response["pageNumber"] = this.pageNumber;
        this.response["lastPageNumber"] = this.get_last_page_number();
        this.response["injuries"] = this.parsePlayerInjuries();
        this.response["updatedAt"] = new Date().toISOString();
        return this.response;
    }
}

export class TransfermarktApiPlayerJerseyNumbers extends TransfermarktApiBase {
    private playerId: string;

    constructor(playerId: string) {
        const url = `https://www.transfermarkt.com/-/rueckennummern/spieler/${playerId}`;
        super(url);
        this.playerId = playerId;
    }

    async init(): Promise<void> {
        await this.initializePage();
        this.raiseExceptionIfNotFound(PlayersXPaths.Profile.URL);
    }

    private parsePlayerJerseyNumbers(): any[] {
        const headers = toCamelCase(
            ["Season", "Club", "Jersey number"].concat(this.get_list_by_xpath(PlayersXPaths.JerseyNumbers.HEADERS)),
        );

        const seasons = this.get_list_by_xpath(PlayersXPaths.JerseyNumbers.SEASONS);
        const clubsUrls = this.get_list_by_xpath(PlayersXPaths.JerseyNumbers.CLUBS_URLS);
        const clubsIds = clubsUrls.map(url => extractFromUrl(url));
        const jerseyNumbers = this.get_list_by_xpath(PlayersXPaths.JerseyNumbers.DATA);

        const data: any[][] = [];
        const minLen = Math.min(seasons.length, clubsIds.length, jerseyNumbers.length);
        for (let i = 0; i < minLen; i++) {
            data.push([seasons[i], clubsIds[i], jerseyNumbers[i]]);
        }

        return data.map(stat => zipListsIntoDict(headers, stat));
    }

    getPlayerJerseyNumbers(): any {
        this.response["id"] = this.playerId;
        this.response["jerseyNumbers"] = this.parsePlayerJerseyNumbers();
        this.response["updatedAt"] = new Date().toISOString();
        return this.response;
    }
}

export class TransfermarktApiPlayerMarketValue extends TransfermarktApiBase {
    private playerId: string;
    private marketValueChartJson: any;

    constructor(playerId: string) {
        const url = `https://www.transfermarkt.com/-/marktwertverlauf/spieler/${playerId}`;
        super(url);
        this.playerId = playerId;
    }

    async init(): Promise<void> {
        await this.initializePage();
        this.raiseExceptionIfNotFound(PlayersXPaths.Profile.NAME);

        const chartUrl = `https://www.transfermarkt.com/ceapi/marketValueDevelopment/graph/${this.playerId}`;
        this.marketValueChartJson = await this.makeRequestJson(chartUrl);
    }

    private parseMarketValueHistory(): any[] {
        const data = this.marketValueChartJson?.list || [];
        const result: any[] = [];
        let clubImage: string | null = null;

        for (const entry of data) {
            const date = parseDate(entry.datum_mw);
            const age = entry.age ? parseInt(entry.age, 10) : null;
            const clubName = entry.verein;
            const rawMarketValue = entry.mw;

            if (!entry.wappen) {
                entry.wappen = clubImage;
            } else {
                clubImage = entry.wappen;
            }

            const clubId = safeRegex(entry.wappen, REGEX_CHART_CLUB_ID, "club_id");

            result.push({
                date: date,
                age: age,
                clubId: clubId,
                clubName: clubName,
                marketValue: parseMarketValue(rawMarketValue),
            });
        }

        return result;
    }

    getPlayerMarketValue(): any {
        this.response["id"] = this.playerId;
        this.response["marketValue"] = parseMarketValue(this.get_text_by_xpath(PlayersXPaths.MarketValue.CURRENT, { joinStr: "" }));
        this.response["marketValueHistory"] = this.parseMarketValueHistory();
        this.response["ranking"] = zipListsIntoDict(
            this.get_list_by_xpath(PlayersXPaths.MarketValue.RANKINGS_NAMES),
            this.get_list_by_xpath(PlayersXPaths.MarketValue.RANKINGS_POSITIONS),
        );
        this.response["updatedAt"] = new Date().toISOString();

        return this.response;
    }
}

export class TransfermarktApiPlayerStats extends TransfermarktApiBase {
    private playerId: string;

    constructor(playerId: string) {
        const url = `https://www.transfermarkt.com/-/leistungsdatendetails/spieler/${playerId}`;
        super(url);
        this.playerId = playerId;
    }

    async init(): Promise<void> {
        await this.initializePage();
        this.raiseExceptionIfNotFound(PlayersXPaths.Profile.URL);
    }

    private parsePlayerStats(): any[] {
        const rows = this.evaluateXPath(PlayersXPaths.Stats.ROWS);
        const headers = toCamelCase(
            ["Competition id", "Club id", "Season id", "Competition name"].concat(
                this.get_list_by_xpath(PlayersXPaths.Stats.HEADERS),
            ),
        );

        const competitionsUrls = this.get_list_by_xpath(PlayersXPaths.Stats.COMPETITIONS_URLS);
        const clubsUrls = this.get_list_by_xpath(PlayersXPaths.Stats.CLUBS_URLS);
        const competitionsIds = competitionsUrls.map(url => extractFromUrl(url));
        const clubsIds = clubsUrls.map(url => extractFromUrl(url));

        const stats: any[][] = [];
        for (const row of rows) {
            const rawTexts = this.evaluateXPath(PlayersXPaths.Stats.DATA, row);
            const rowStats: any[] = [];
            for (const text of rawTexts) {
                if (text !== "\xa0" && text !== "\u00a0") {
                    const parts = text.split(/\xa0\/\xa0|\u00a0\/\u00a0/);
                    rowStats.push(...parts.map((p: any) => trim(p)));
                }
            }
            stats.push(rowStats.slice(1));
        }

        const data: any[][] = [];
        const minLen = Math.min(competitionsIds.length, clubsIds.length, stats.length);
        for (let i = 0; i < minLen; i++) {
            data.push([competitionsIds[i], clubsIds[i]].concat(stats[i]));
        }

        return data.map(stat => zipListsIntoDict(headers, stat));
    }

    getPlayerStats(): any {
        this.response["id"] = this.playerId;
        this.response["stats"] = this.parsePlayerStats();
        this.response["updatedAt"] = new Date().toISOString();
        return this.response;
    }
}

export class TransfermarktApiPlayerTransfers extends TransfermarktApiBase {
    private playerId: string;
    private transfersJson: any;

    constructor(playerId: string) {
        const url = `https://www.transfermarkt.com/-/transfers/spieler/${playerId}`;
        super(url);
        this.playerId = playerId;
    }

    async init(): Promise<void> {
        await this.initializePage();
        this.raiseExceptionIfNotFound(PlayersXPaths.Profile.NAME);

        const transfersUrl = `https://www.transfermarkt.com/ceapi/transferHistory/list/${this.playerId}`;
        this.transfersJson = await this.makeRequestJson(transfersUrl);
    }

    private parsePlayerTransferHistory(): any[] {
        const transfers = this.transfersJson?.transfers || [];
        return transfers.map((transfer: any) => {
            return {
                id: extractFromUrl(transfer.url, "transfer_id"),
                clubFrom: {
                    id: extractFromUrl(transfer.from?.href),
                    name: transfer.from?.clubName,
                },
                clubTo: {
                    id: extractFromUrl(transfer.to?.href),
                    name: transfer.to?.clubName,
                },
                date: parseDate(transfer.date),
                upcoming: transfer.upcoming,
                season: transfer.season,
                marketValue: parseMarketValue(transfer.marketValue),
                fee: parseMarketValue(transfer.fee), // parseMarketValue works perfectly for parsing fee like '€1.50m' or '-' to null/number
            };
        });
    }

    getPlayerTransfers(): any {
        this.response["id"] = this.playerId;
        this.response["transfers"] = this.parsePlayerTransferHistory();
        this.response["youthClubs"] = safeSplit(this.get_text_by_xpath(PlayersXPaths.Transfers.YOUTH_CLUBS), ",");
        this.response["updatedAt"] = new Date().toISOString();
        return this.response;
    }
}
