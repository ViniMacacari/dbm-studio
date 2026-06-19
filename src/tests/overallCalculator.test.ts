import assert from "node:assert/strict";
import { Fifa, Position } from "fifarating";
import {
    OverallCalculator,
    type OverallCalculatorTransfermarktGateway
} from "../utils/overall-calculator/overall-calculator";
import { transfermarktPositionToFifaPosition } from "../utils/position-mapper/position-mapper";
import type {
    ClubProfileResponse,
    CompetitionSearchResponse,
    PlayerAchievementsResponse,
    PlayerMarketValueResponse,
    PlayerProfileResponse
} from "../utils/transfermarkt-services/transfermarkt";

interface Scenario {
    age: number;
    marketValue: number;
    clubMeanMarketValue?: number;
    leagueMeanMarketValue?: number;
    trophies?: number;
    position?: string;
}

class MockTransfermarktGateway implements OverallCalculatorTransfermarktGateway {
    constructor(private readonly scenario: Scenario) {}

    async getPlayers(): Promise<PlayerProfileResponse> {
        return {
            id: "1",
            name: "Test Player",
            fullName: "Test Player",
            age: this.scenario.age,
            position: { main: this.scenario.position ?? "Centre-Forward", other: [] },
            club: { id: "10", name: "Test Club" },
            marketValue: this.scenario.marketValue
        } as unknown as PlayerProfileResponse;
    }

    async getPlayerAchievements(): Promise<PlayerAchievementsResponse> {
        const trophies = this.scenario.trophies ?? 0;
        return {
            id: "1",
            achievements: trophies > 0 ? [{
                title: "Competition winner",
                count: trophies,
                details: Array.from({ length: trophies }, () => ({ season: { id: "2025", name: "2025" } }))
            }] : [],
            updatedAt: "2026-01-01T00:00:00.000Z"
        };
    }

    async getPlayerMarketValue(): Promise<PlayerMarketValueResponse> {
        return {
            id: "1",
            marketValue: this.scenario.marketValue,
            marketValueHistory: [],
            ranking: {},
            updatedAt: "2026-01-01T00:00:00.000Z"
        };
    }

    async getClubProfile(): Promise<ClubProfileResponse> {
        const squadSize = 25;
        return {
            id: "10",
            name: "Test Club",
            currentMarketValue: this.scenario.clubMeanMarketValue === undefined
                ? null
                : this.scenario.clubMeanMarketValue * squadSize,
            squad: { size: String(squadSize) },
            league: {
                id: "L1",
                name: "Test League",
                countryId: "1",
                countryName: "Test Country",
                tier: "1"
            }
        } as ClubProfileResponse;
    }

    async searchCompetitions(): Promise<CompetitionSearchResponse> {
        return {
            query: "Test League",
            pageNumber: 1,
            lastPageNumber: 1,
            results: [{
                id: "L1",
                name: "Test League",
                country: "Test Country",
                clubs: 20,
                players: 500,
                totalMarketValue: this.scenario.leagueMeanMarketValue === undefined
                    ? null
                    : this.scenario.leagueMeanMarketValue * 500,
                meanMarketValue: this.scenario.leagueMeanMarketValue ?? null,
                continent: "Test"
            }],
            updatedAt: "2026-01-01T00:00:00.000Z"
        };
    }
}

async function calculate(scenario: Scenario) {
    return new OverallCalculator(new MockTransfermarktGateway(scenario)).generateFromTransfermarkt("1", {
        fifa: Fifa.Fifa23,
        referenceDate: new Date("2026-01-01T00:00:00.000Z")
    });
}

async function testAgeCorrection(): Promise<void> {
    const young = await calculate({ age: 20, marketValue: 10_000_000, clubMeanMarketValue: 4_000_000, leagueMeanMarketValue: 5_000_000 });
    const veteran = await calculate({ age: 33, marketValue: 5_000_000, clubMeanMarketValue: 4_000_000, leagueMeanMarketValue: 5_000_000 });

    assert.ok(young.breakdown.ageMarketFactor > 1);
    assert.ok(veteran.breakdown.ageMarketFactor < 1);
    assert.ok(Math.abs(young.rawOverall - veteran.rawOverall) <= 2, "age correction should compare current ability, not raw resale value");
}

async function testLeagueAndClubCorrection(): Promise<void> {
    const discountedMarket = await calculate({ age: 27, marketValue: 5_000_000, clubMeanMarketValue: 1_000_000, leagueMeanMarketValue: 1_000_000 });
    const expensiveMarket = await calculate({ age: 27, marketValue: 5_000_000, clubMeanMarketValue: 15_000_000, leagueMeanMarketValue: 12_000_000 });

    assert.ok(discountedMarket.breakdown.contextAdjustedMarketValue > expensiveMarket.breakdown.contextAdjustedMarketValue);
    assert.ok(discountedMarket.breakdown.leagueMarketFactor > 1);
    assert.ok(expensiveMarket.breakdown.leagueMarketFactor < 1);
    assert.equal(discountedMarket.validation.team, true);
    assert.equal(discountedMarket.validation.league, true);
}

async function testAchievementsAndReputation(): Promise<void> {
    const withoutTrophies = await calculate({ age: 27, marketValue: 8_000_000, clubMeanMarketValue: 4_000_000, leagueMeanMarketValue: 5_000_000 });
    const withTrophies = await calculate({ age: 27, marketValue: 8_000_000, clubMeanMarketValue: 4_000_000, leagueMeanMarketValue: 5_000_000, trophies: 10 });

    assert.ok(withTrophies.rawOverall >= withoutTrophies.rawOverall);
    assert.ok(withTrophies.reputation >= withoutTrophies.reputation);
    assert.equal(withTrophies.context.achievements, 10);
    assert.equal(withTrophies.confidence, 1);
}

function testPositionMapping(): void {
    assert.equal(transfermarktPositionToFifaPosition("Goalkeeper"), Position.GK);
    assert.equal(transfermarktPositionToFifaPosition("Defensive Midfield"), Position.CDM);
    assert.equal(transfermarktPositionToFifaPosition("Centre-Forward"), Position.CF);
    assert.equal(transfermarktPositionToFifaPosition("Right Winger"), Position.RW);
}

async function run(): Promise<void> {
    await assert.rejects(() => new OverallCalculator(new MockTransfermarktGateway({ age: 20, marketValue: 1 })).generateFromTransfermarkt("invalid"));
    await testAgeCorrection();
    await testLeagueAndClubCorrection();
    await testAchievementsAndReputation();
    testPositionMapping();
    console.log("Overall calculator tests passed.");
}

void run();
