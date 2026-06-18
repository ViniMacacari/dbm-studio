// Player Search Types
export interface PlayerSearchResult {
    id: string | null;
    name: string | null;
    position: string | null;
    club: {
        name: string | null;
        id: string | null;
    };
    age: number | null;
    nationalities: string[];
    marketValue: number | null;
}

export interface PlayerSearchResponse {
    query: string;
    pageNumber: number;
    lastPageNumber: number;
    results: PlayerSearchResult[];
    updatedAt: string;
}

// Player Profile Types
export interface PlayerProfileResponse {
    id: string | null;
    url: string | null;
    name: string | null;
    description: string | null;
    fullName: string | null;
    nameInHomeCountry: string | null;
    imageUrl: string | null;
    dateOfBirth: string | null;
    placeOfBirth: {
        city: string | null;
        country: string | null;
    };
    age: number | null;
    height: number | null;
    citizenship: string[];
    isRetired: boolean;
    retiredSince: string | null;
    position: {
        main: string | null;
        other: string[];
    };
    foot: string | null;
    shirtNumber: string | null;
    club: {
        id: string | null;
        name: string | null;
        joined: string | null;
        contractExpires: string | null;
        contractOption: string | null;
        lastClubId: string | null;
        lastClubName: string | null;
        mostGamesFor: string | null;
    };
    marketValue: number | null;
    agent: {
        name: string | null;
        url: string | null;
    };
    outfitter: string | null;
    socialMedia: string[];
    trainerProfile: {
        id: string | null;
        url: string | null;
        position: string | null;
    };
    relatives: Array<{
        id: string | null;
        url: string;
        name: string;
        profileType: "player" | "trainer";
    }>;
    updatedAt: string;
}

// Player Achievements Types
export interface PlayerAchievementDetail {
    season: {
        id: string | null;
        name: string | null;
    };
    club?: {
        id: string | null;
        name: string | null;
    };
    competition?: {
        id: string | null;
        name: string | null;
    };
}

export interface PlayerAchievement {
    title: string;
    count: number;
    details: PlayerAchievementDetail[];
}

export interface PlayerAchievementsResponse {
    id: string;
    achievements: PlayerAchievement[];
    updatedAt: string;
}

// Player Injuries Types
export interface PlayerInjury {
    season: string | null;
    injury: string | null;
    fromDate: string | null;
    untilDate: string | null;
    days: number | null;
    gamesMissed: number | null;
    gamesMissedClubs: Array<string | null>;
}

export interface PlayerInjuriesResponse {
    id: string;
    pageNumber: number;
    lastPageNumber: number;
    injuries: PlayerInjury[];
    updatedAt: string;
}

// Player Jersey Numbers
export interface PlayerJerseyNumberResponse {
    id: string;
    jerseyNumbers: Array<Record<string, any>>;
    updatedAt: string;
}

// Player Market Value
export interface MarketValueHistoryPoint {
    date: string | null;
    age: number | null;
    clubId: string | null;
    clubName: string | null;
    marketValue: number | null;
}

export interface PlayerMarketValueResponse {
    id: string;
    marketValue: number | null;
    marketValueHistory: MarketValueHistoryPoint[];
    ranking: Record<string, string>;
    updatedAt: string;
}

// Player Stats
export interface PlayerStatsResponse {
    id: string;
    stats: Array<Record<string, any>>;
    updatedAt: string;
}

// Player Transfers
export interface PlayerTransfer {
    id: string | null;
    clubFrom: {
        id: string | null;
        name: string | null;
    };
    clubTo: {
        id: string | null;
        name: string | null;
    };
    date: string | null;
    upcoming: boolean;
    season: string;
    marketValue: number | null;
    fee: number | null;
}

export interface PlayerTransfersResponse {
    id: string;
    transfers: PlayerTransfer[];
    youthClubs: string[] | null;
    updatedAt: string;
}

// Club Profile Types
export interface ClubProfileResponse {
    id: string;
    url: string | null;
    name: string | null;
    officialName: string | null;
    image: string | null;
    legalForm: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    addressLine3: string | null;
    tel: string | null;
    fax: string | null;
    website: string | null;
    foundedOn: string | null;
    members: number | null;
    membersDate: string | null;
    otherSports: string[] | null;
    colors: string[];
    stadiumName: string | null;
    stadiumSeats: number | null;
    currentTransferRecord: number | null;
    currentMarketValue: number | null;
    confederation: string | null;
    fifaWorldRanking: number | null;
    squad: {
        size: string | null;
        averageAge: string | null;
        foreigners: string | null;
        nationalTeamPlayers: string | null;
    };
    league: {
        id: string | null;
        name: string | null;
        countryId: string | null;
        countryName: string | null;
        tier: string | null;
    };
    historicalCrests: string[];
    updatedAt: string;
}

// Club Players
export interface ClubPlayer {
    id: string | null;
    name: string | null;
    position: string | null;
    dateOfBirth: string | null;
    age: number | null;
    nationality: string[];
    currentClub: string | null;
    height: number | null;
    foot: string | null;
    joinedOn: string | null;
    joined: string | null;
    signedFrom: string | null;
    contract: string | null;
    marketValue: number | null;
    status: string | null;
}

export interface ClubPlayersResponse {
    id: string;
    players: ClubPlayer[];
    updatedAt: string;
}

// Club Search Types
export interface ClubSearchResult {
    id: string | null;
    url: string | null;
    name: string | null;
    country: string | null;
    squad: number | null;
    marketValue: number | null;
}

export interface ClubSearchResponse {
    query: string;
    pageNumber: number;
    lastPageNumber: number;
    results: ClubSearchResult[];
    updatedAt: string;
}

// Competition Clubs Types
export interface CompetitionClub {
    id: string | null;
    name: string | null;
}

export interface CompetitionClubsResponse {
    id: string;
    name: string | null;
    seasonId: string | null;
    clubs: CompetitionClub[];
    updatedAt: string;
}

// Competition Search Types
export interface CompetitionSearchResult {
    id: string | null;
    name: string | null;
    country: string | null;
    clubs: number | null;
    players: number | null;
    totalMarketValue: number | null;
    meanMarketValue: number | null;
    continent: string | null;
}

export interface CompetitionSearchResponse {
    query: string;
    pageNumber: number;
    lastPageNumber: number;
    results: CompetitionSearchResult[];
    updatedAt: string;
}
