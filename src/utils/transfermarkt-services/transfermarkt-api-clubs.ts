import { TransfermarktApiBase } from "./transfermarkt-api-base";
import { ClubsXPaths } from "./transfermarkt-api-xpath";
import {
    trim,
    extractFromUrl,
    safeRegex,
    safeSplit,
    removeStr,
    parseDate,
    parseMarketValue,
    parseHeight,
    REGEX_MEMBERS_DATE,
    REGEX_BG_COLOR,
    REGEX_COUNTRY_ID,
    REGEX_DOB
} from "./transfermarkt-api-utils";

export class TransfermarktApiClubProfile extends TransfermarktApiBase {
    private clubId: string;

    constructor(clubId: string) {
        const url = `https://www.transfermarkt.us/-/datenfakten/verein/${clubId}`;
        super(url);
        this.clubId = clubId;
    }

    async init(): Promise<void> {
        await this.initializePage();
        this.raiseExceptionIfNotFound(ClubsXPaths.Profile.URL);
    }

    getClubProfile(): any {
        this.response["id"] = this.clubId;
        this.response["url"] = this.get_text_by_xpath(ClubsXPaths.Profile.URL);
        this.response["name"] = this.get_text_by_xpath(ClubsXPaths.Profile.NAME);
        this.response["officialName"] = this.get_text_by_xpath(ClubsXPaths.Profile.NAME_OFFICIAL);
        
        const rawImage = this.get_text_by_xpath(ClubsXPaths.Profile.IMAGE);
        this.response["image"] = rawImage ? safeSplit(rawImage, "?")?.[0] : null;
        
        this.response["legalForm"] = this.get_text_by_xpath(ClubsXPaths.Profile.LEGAL_FORM);
        this.response["addressLine1"] = this.get_text_by_xpath(ClubsXPaths.Profile.ADDRESS_LINE_1);
        this.response["addressLine2"] = this.get_text_by_xpath(ClubsXPaths.Profile.ADDRESS_LINE_2);
        this.response["addressLine3"] = this.get_text_by_xpath(ClubsXPaths.Profile.ADDRESS_LINE_3);
        this.response["tel"] = this.get_text_by_xpath(ClubsXPaths.Profile.TEL);
        this.response["fax"] = this.get_text_by_xpath(ClubsXPaths.Profile.FAX);
        this.response["website"] = this.get_text_by_xpath(ClubsXPaths.Profile.WEBSITE);
        this.response["foundedOn"] = parseDate(this.get_text_by_xpath(ClubsXPaths.Profile.FOUNDED_ON));
        
        const rawMembers = this.get_text_by_xpath(ClubsXPaths.Profile.MEMBERS);
        this.response["members"] = rawMembers ? parseInt(rawMembers.replace(/\D/g, ""), 10) : null;
        
        this.response["membersDate"] = parseDate(
            safeRegex(
                this.get_text_by_xpath(ClubsXPaths.Profile.MEMBERS_DATE),
                REGEX_MEMBERS_DATE,
                "date"
            )
        );
        this.response["otherSports"] = safeSplit(this.get_text_by_xpath(ClubsXPaths.Profile.OTHER_SPORTS), ",");
        
        const colorsList = this.get_list_by_xpath(ClubsXPaths.Profile.COLORS);
        this.response["colors"] = colorsList
            .map(color => safeRegex(color, REGEX_BG_COLOR, "color"))
            .filter(color => color && color.includes("#"));

        this.response["stadiumName"] = this.get_text_by_xpath(ClubsXPaths.Profile.STADIUM_NAME);
        
        const stadiumSeatsStr = this.get_text_by_xpath(ClubsXPaths.Profile.STADIUM_SEATS);
        const cleanedSeats = removeStr(stadiumSeatsStr, ["Seats", "."]);
        this.response["stadiumSeats"] = cleanedSeats ? parseInt(cleanedSeats.replace(/\D/g, ""), 10) : null;
        
        this.response["currentTransferRecord"] = parseMarketValue(this.get_text_by_xpath(ClubsXPaths.Profile.TRANSFER_RECORD));
        this.response["currentMarketValue"] = parseMarketValue(
            this.get_text_by_xpath(ClubsXPaths.Profile.MARKET_VALUE, { ilocTo: 3, joinStr: "" })
        );
        this.response["confederation"] = this.get_text_by_xpath(ClubsXPaths.Profile.CONFEDERATION);
        
        const rawRanking = this.get_text_by_xpath(ClubsXPaths.Profile.RANKING);
        const cleanedRanking = removeStr(rawRanking, "Pos");
        this.response["fifaWorldRanking"] = cleanedRanking ? parseInt(cleanedRanking, 10) : null;

        this.response["squad"] = {
            size: this.get_text_by_xpath(ClubsXPaths.Profile.SQUAD_SIZE),
            averageAge: this.get_text_by_xpath(ClubsXPaths.Profile.SQUAD_AVG_AGE),
            foreigners: this.get_text_by_xpath(ClubsXPaths.Profile.SQUAD_FOREIGNERS),
            nationalTeamPlayers: this.get_text_by_xpath(ClubsXPaths.Profile.SQUAD_NATIONAL_PLAYERS),
        };

        this.response["league"] = {
            id: extractFromUrl(this.get_text_by_xpath(ClubsXPaths.Profile.LEAGUE_ID)),
            name: this.get_text_by_xpath(ClubsXPaths.Profile.LEAGUE_NAME),
            countryId: safeRegex(this.get_text_by_xpath(ClubsXPaths.Profile.LEAGUE_COUNTRY_ID), REGEX_COUNTRY_ID, "id"),
            countryName: this.get_text_by_xpath(ClubsXPaths.Profile.LEAGUE_COUNTRY_NAME),
            tier: this.get_text_by_xpath(ClubsXPaths.Profile.LEAGUE_TIER),
        };

        const crests = this.get_list_by_xpath(ClubsXPaths.Profile.CRESTS_HISTORICAL);
        this.response["historicalCrests"] = crests.map(crest => safeSplit(crest, "?")?.[0]).filter(Boolean);
        this.response["updatedAt"] = new Date().toISOString();

        return this.response;
    }
}

export class TransfermarktApiClubPlayers extends TransfermarktApiBase {
    private clubId: string;
    private seasonId?: string;
    private past: boolean = false;

    constructor(clubId: string, seasonId?: string) {
        // Build placeholder URL. We resolve seasonId later.
        const url = `https://www.transfermarkt.com/-/kader/verein/${clubId}/saison_id/${seasonId || ""}/plus/1`;
        super(url);
        this.clubId = clubId;
        this.seasonId = seasonId;
    }

    async init(): Promise<void> {
        await this.initializePage();
        this.raiseExceptionIfNotFound(ClubsXPaths.Players.CLUB_NAME);

        if (!this.seasonId) {
            const clubUrlText = this.get_text_by_xpath(ClubsXPaths.Players.CLUB_URL);
            const extSeasonId = extractFromUrl(clubUrlText, "season_id");
            if (extSeasonId) {
                this.seasonId = extSeasonId;
            }
        }

        const pastFlagList = this.get_list_by_xpath(ClubsXPaths.Players.PAST_FLAG);
        this.past = pastFlagList.join(" ").includes("Current club");
    }

    private parseClubPlayers(): any[] {
        const pageNationalities = this.evaluateXPath(ClubsXPaths.Players.PAGE_NATIONALITIES);
        const pagePlayersInfos = this.evaluateXPath(ClubsXPaths.Players.PAGE_INFOS);
        const pagePlayersSignedFrom = this.evaluateXPath(
            this.past ? ClubsXPaths.Players.Past.PAGE_SIGNED_FROM : ClubsXPaths.Players.Present.PAGE_SIGNED_FROM
        );
        const pagePlayersJoinedOn = this.evaluateXPath(
            this.past ? ClubsXPaths.Players.Past.PAGE_JOINED_ON : ClubsXPaths.Players.Present.PAGE_JOINED_ON
        );

        const playerIds = this.get_list_by_xpath(ClubsXPaths.Players.URLS).map(url => extractFromUrl(url));
        const playerNames = this.get_list_by_xpath(ClubsXPaths.Players.NAMES);
        const playerPositions = this.get_list_by_xpath(ClubsXPaths.Players.POSITIONS);
        
        const dobAgeList = this.get_list_by_xpath(ClubsXPaths.Players.DOB_AGE);
        const playerDobs = dobAgeList.map(dobAge => parseDate(safeRegex(dobAge, REGEX_DOB, "dob")));
        const playerAges = dobAgeList.map(dobAge => {
            const ageStr = safeRegex(dobAge, REGEX_DOB, "age");
            return ageStr ? parseInt(ageStr, 10) : null;
        });

        const playerNationalities = pageNationalities.map(nat => {
            return this.get_list_by_xpath(ClubsXPaths.Players.NATIONALITIES, true, nat);
        });

        const playerCurrentClub = this.past
            ? this.get_list_by_xpath(ClubsXPaths.Players.Past.CURRENT_CLUB)
            : Array(playerIds.length).fill(null);

        const playerHeights = this.get_list_by_xpath(
            this.past ? ClubsXPaths.Players.Past.HEIGHTS : ClubsXPaths.Players.Present.HEIGHTS
        ).map(h => parseHeight(h));

        const playerFoots = this.get_list_by_xpath(
            this.past ? ClubsXPaths.Players.Past.FOOTS : ClubsXPaths.Players.Present.FOOTS,
            false
        );

        const playerJoinedOn = pagePlayersJoinedOn.map(e => {
            return this.get_list_by_xpath(ClubsXPaths.Players.JOINED_ON, true, e).join("; ");
        });

        const playerJoined = pagePlayersInfos.map(e => {
            return this.get_list_by_xpath(ClubsXPaths.Players.JOINED, true, e).join("; ");
        });

        const playerSignedFrom = pagePlayersSignedFrom.map(e => {
            return this.get_list_by_xpath(ClubsXPaths.Players.SIGNED_FROM, true, e).join("; ");
        });

        const playerContracts = this.past
            ? Array(playerIds.length).fill(null)
            : this.get_list_by_xpath(ClubsXPaths.Players.Present.CONTRACTS);

        const playerMarketValues = this.get_list_by_xpath(ClubsXPaths.Players.MARKET_VALUES).map(mv => parseMarketValue(mv));

        const playerStatuses = pagePlayersInfos.map(e => {
            return e ? this.get_list_by_xpath(ClubsXPaths.Players.STATUSES, true, e).join("; ") : "";
        });

        const listResult: any[] = [];
        const minLen = Math.min(
            playerIds.length,
            playerNames.length,
            playerPositions.length
        );

        for (let i = 0; i < minLen; i++) {
            listResult.push({
                id: playerIds[i],
                name: playerNames[i],
                position: playerPositions[i],
                dateOfBirth: playerDobs[i],
                age: playerAges[i],
                nationality: playerNationalities[i] || [],
                currentClub: playerCurrentClub[i],
                height: playerHeights[i],
                foot: playerFoots[i],
                joinedOn: parseDate(playerJoinedOn[i]),
                joined: parseDate(playerJoined[i]),
                signedFrom: playerSignedFrom[i],
                contract: parseDate(playerContracts[i]),
                marketValue: playerMarketValues[i],
                status: playerStatuses[i] || null,
            });
        }

        return listResult;
    }

    getClubPlayers(): any {
        this.response["id"] = this.clubId;
        this.response["players"] = this.parseClubPlayers();
        this.response["updatedAt"] = new Date().toISOString();
        return this.response;
    }
}

export class TransfermarktApiClubSearch extends TransfermarktApiBase {
    private query: string;
    private pageNumber: number;

    constructor(query: string, pageNumber: number = 1) {
        const url = `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(query)}&Verein_page=${pageNumber}`;
        super(url);
        this.query = query;
        this.pageNumber = pageNumber;
    }

    async init(): Promise<void> {
        await this.initializePage();
    }

    private parseSearchResults(): any[] {
        const clubsNames = this.get_list_by_xpath(ClubsXPaths.Search.NAMES);
        const clubsUrls = this.get_list_by_xpath(ClubsXPaths.Search.URLS);
        const clubsCountries = this.get_list_by_xpath(ClubsXPaths.Search.COUNTRIES);
        const clubsSquads = this.get_list_by_xpath(ClubsXPaths.Search.SQUADS);
        const clubsMarketValues = this.get_list_by_xpath(ClubsXPaths.Search.MARKET_VALUES).map(mv => parseMarketValue(mv));
        const clubsIds = clubsUrls.map(url => extractFromUrl(url));

        const minLen = Math.min(
            clubsIds.length,
            clubsUrls.length,
            clubsNames.length,
            clubsCountries.length,
            clubsSquads.length,
            clubsMarketValues.length
        );

        const results: any[] = [];
        for (let i = 0; i < minLen; i++) {
            results.push({
                id: clubsIds[i],
                url: clubsUrls[i],
                name: clubsNames[i],
                country: clubsCountries[i],
                squad: clubsSquads[i] ? parseInt(clubsSquads[i].replace(/\D/g, ""), 10) : null,
                marketValue: clubsMarketValues[i],
            });
        }
        return results;
    }

    searchClubs(): any {
        this.response["query"] = this.query;
        this.response["pageNumber"] = this.pageNumber;
        this.response["lastPageNumber"] = this.get_last_page_number(ClubsXPaths.Search.BASE);
        this.response["results"] = this.parseSearchResults();
        this.response["updatedAt"] = new Date().toISOString();
        return this.response;
    }
}
