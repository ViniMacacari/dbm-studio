import {
    TransfermarktApiPlayerSearch,
    TransfermarktApiPlayerProfile,
    TransfermarktApiPlayerAchievements,
    TransfermarktApiPlayerInjuries,
    TransfermarktApiPlayerJerseyNumbers,
    TransfermarktApiPlayerMarketValue,
    TransfermarktApiPlayerStats,
    TransfermarktApiPlayerTransfers
} from "./transfermarkt-api-players";
import {
    TransfermarktApiClubProfile,
    TransfermarktApiClubPlayers,
    TransfermarktApiClubSearch
} from "./transfermarkt-api-clubs";
import {
    TransfermarktApiCompetitionClubs,
    TransfermarktApiCompetitionSearch
} from "./transfermarkt-api-competitions";

import type {
    PlayerSearchResult,
    PlayerProfileResponse,
    PlayerAchievementsResponse,
    PlayerInjuriesResponse,
    PlayerJerseyNumberResponse,
    PlayerMarketValueResponse,
    PlayerStatsResponse,
    PlayerTransfersResponse,
    ClubProfileResponse,
    ClubPlayersResponse,
    ClubSearchResponse,
    CompetitionClubsResponse,
    CompetitionSearchResponse
} from "./transfermarkt";

export class CommonTransfermarktParser {
    /**
     * Retrieves players by name or by profile ID.
     * If an ID is provided, it returns the player profile.
     * If a name is provided, it returns a list of search results.
     */
    async getPlayers(filter: { name?: string; id?: string | number }): Promise<PlayerProfileResponse | PlayerSearchResult[]> {
        if (filter.id !== undefined && filter.id !== null) {
            const profile = new TransfermarktApiPlayerProfile(filter.id.toString());
            await profile.init();
            return profile.getPlayerProfile();
        }

        if (filter.name) {
            const search = new TransfermarktApiPlayerSearch(filter.name);
            await search.init();
            return search.searchPlayers().results;
        }

        return [];
    }

    async getPlayerAchievements(playerId: string | number): Promise<PlayerAchievementsResponse> {
        const service = new TransfermarktApiPlayerAchievements(playerId.toString());
        await service.init();
        return service.getPlayerAchievements();
    }

    async getPlayerInjuries(playerId: string | number, pageNumber: number = 1): Promise<PlayerInjuriesResponse> {
        const service = new TransfermarktApiPlayerInjuries(playerId.toString(), pageNumber);
        await service.init();
        return service.getPlayerInjuries();
    }

    async getPlayerJerseyNumbers(playerId: string | number): Promise<PlayerJerseyNumberResponse> {
        const service = new TransfermarktApiPlayerJerseyNumbers(playerId.toString());
        await service.init();
        return service.getPlayerJerseyNumbers();
    }

    async getPlayerMarketValue(playerId: string | number): Promise<PlayerMarketValueResponse> {
        const service = new TransfermarktApiPlayerMarketValue(playerId.toString());
        await service.init();
        return service.getPlayerMarketValue();
    }

    async getPlayerStats(playerId: string | number): Promise<PlayerStatsResponse> {
        const service = new TransfermarktApiPlayerStats(playerId.toString());
        await service.init();
        return service.getPlayerStats();
    }

    async getPlayerTransfers(playerId: string | number): Promise<PlayerTransfersResponse> {
        const service = new TransfermarktApiPlayerTransfers(playerId.toString());
        await service.init();
        return service.getPlayerTransfers();
    }

    async getClubProfile(clubId: string | number): Promise<ClubProfileResponse> {
        const service = new TransfermarktApiClubProfile(clubId.toString());
        await service.init();
        return service.getClubProfile();
    }

    async getClubPlayers(clubId: string | number, seasonId?: string): Promise<ClubPlayersResponse> {
        const service = new TransfermarktApiClubPlayers(clubId.toString(), seasonId);
        await service.init();
        return service.getClubPlayers();
    }

    async searchClubs(query: string, pageNumber: number = 1): Promise<ClubSearchResponse> {
        const service = new TransfermarktApiClubSearch(query, pageNumber);
        await service.init();
        return service.searchClubs();
    }

    async getCompetitionClubs(competitionId: string, seasonId?: string): Promise<CompetitionClubsResponse> {
        const service = new TransfermarktApiCompetitionClubs(competitionId, seasonId);
        await service.init();
        return service.getCompetitionClubs();
    }

    async searchCompetitions(query: string, pageNumber: number = 1): Promise<CompetitionSearchResponse> {
        const service = new TransfermarktApiCompetitionSearch(query, pageNumber);
        await service.init();
        return service.searchCompetitions();
    }
}

export * from "./transfermarkt-api-base";
export * from "./transfermarkt-api-utils";
export * from "./transfermarkt-api-xpath";
export * from "./transfermarkt-api-players";
export * from "./transfermarkt-api-clubs";
export * from "./transfermarkt-api-competitions";
export * from "./transfermarkt.d";
