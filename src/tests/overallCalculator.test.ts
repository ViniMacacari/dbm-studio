import assert from "node:assert/strict";
import { Fifa, Position } from "fifarating";
import {
    OverallCalculator,
    type OverallCalculatorConfig,
    type OverallCalculatorTransfermarktGateway
} from "../utils/overall-calculator/overall-calculator";
import { PotentialCalculator } from "../utils/overall-calculator/potential-calculator";
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

async function calculate(scenario: Scenario, config: Partial<OverallCalculatorConfig> = {}) {
    return new OverallCalculator(new MockTransfermarktGateway(scenario), config).generateFromTransfermarkt("1", {
        fifa: Fifa.Fifa23,
        referenceDate: new Date("2026-01-01T00:00:00.000Z")
    });
}

async function testMidTierCalibration(): Promise<void> {
    const midTierScenario: Scenario = {
        age: 33,
        marketValue: 1_300_000,
        clubMeanMarketValue: 2_100_000,
        leagueMeanMarketValue: 3_040_000,
        trophies: 3
    };
    const calibrated = await calculate(midTierScenario);
    const linear = await calculate(midTierScenario, { midTierOverallBoost: 0 });
    assert.ok(calibrated.rawOverall >= linear.rawOverall + 3);

    const eliteScenario: Scenario = {
        age: 27,
        marketValue: 180_000_000,
        clubMeanMarketValue: 20_000_000,
        leagueMeanMarketValue: 15_000_000,
        trophies: 10
    };
    const calibratedElite = await calculate(eliteScenario);
    const linearElite = await calculate(eliteScenario, { midTierOverallBoost: 0 });
    assert.ok(calibratedElite.rawOverall - linearElite.rawOverall <= 1);
}

async function testGoalkeeperLongevity(): Promise<void> {
    const veteran = await calculate({
        age: 36,
        marketValue: 400_000,
        clubMeanMarketValue: 2_100_000,
        leagueMeanMarketValue: 3_040_000,
        trophies: 7,
        position: "Goalkeeper"
    });
    const veteranWithoutPositionAdjustment = await calculate({
        age: 36,
        marketValue: 400_000,
        clubMeanMarketValue: 2_100_000,
        leagueMeanMarketValue: 3_040_000,
        trophies: 7,
        position: "Goalkeeper"
    }, { goalkeeperExperienceMaximumBoost: 0 });
    assert.ok(veteran.overall >= 76);
    assert.ok(veteran.rawOverall >= veteranWithoutPositionAdjustment.rawOverall + 4);
    assert.ok(veteran.breakdown.positionExperienceBoost > 0);

    const younger = await calculate({
        age: 29,
        marketValue: 1_500_000,
        clubMeanMarketValue: 2_100_000,
        leagueMeanMarketValue: 3_040_000,
        position: "Goalkeeper"
    });
    assert.equal(younger.breakdown.positionExperienceBoost, 0);
    assert.ok(younger.breakdown.positionAbilityAdjustment < 0);
    assert.ok(younger.overall <= 72);
}

async function testAgeCorrection(): Promise<void> {
    const young = await calculate({ age: 20, marketValue: 10_000_000, clubMeanMarketValue: 4_000_000, leagueMeanMarketValue: 5_000_000 });
    const veteran = await calculate({ age: 33, marketValue: 5_000_000, clubMeanMarketValue: 4_000_000, leagueMeanMarketValue: 5_000_000 });

    assert.ok(young.breakdown.ageMarketFactor > 1);
    assert.ok(veteran.breakdown.ageMarketFactor < 1);
    assert.ok(Math.abs(young.rawOverall - veteran.rawOverall) <= 2, "age correction should compare current ability, not raw resale value");
}

async function testLeagueAndClubCorrection(): Promise<void> {
    const weakerContext = await calculate({ age: 27, marketValue: 5_000_000, clubMeanMarketValue: 1_000_000, leagueMeanMarketValue: 1_000_000 });
    const strongerContext = await calculate({ age: 27, marketValue: 5_000_000, clubMeanMarketValue: 15_000_000, leagueMeanMarketValue: 12_000_000 });

    assert.ok(strongerContext.breakdown.contextAdjustedMarketValue > weakerContext.breakdown.contextAdjustedMarketValue);
    assert.ok(weakerContext.breakdown.leagueMarketFactor < 1);
    assert.ok(strongerContext.breakdown.leagueMarketFactor > 1);
    assert.ok(strongerContext.rawOverall > weakerContext.rawOverall);
    assert.equal(weakerContext.validation.team, true);
    assert.equal(weakerContext.validation.league, true);
}

async function testAchievementsAndReputation(): Promise<void> {
    const withoutTrophies = await calculate({ age: 27, marketValue: 8_000_000, clubMeanMarketValue: 4_000_000, leagueMeanMarketValue: 5_000_000 });
    const withTrophies = await calculate({ age: 27, marketValue: 8_000_000, clubMeanMarketValue: 4_000_000, leagueMeanMarketValue: 5_000_000, trophies: 10 });

    assert.ok(withTrophies.rawOverall >= withoutTrophies.rawOverall);
    assert.ok(withTrophies.reputation >= withoutTrophies.reputation);
    assert.equal(withTrophies.context.achievements, 10);
    assert.equal(withTrophies.confidence, 1);
}

function testPotentialCalculator(): void {
    const calculator = new PotentialCalculator();
    const veteran = calculator.calculate({
        overall: 78,
        age: 28,
        marketValue: 100_000_000,
        position: Position.ST
    });
    assert.equal(veteran.potential, 78);
    assert.equal(veteran.breakdown.growth, 0);

    const lateNormalMarket = calculator.calculate({
        overall: 78,
        age: 27,
        marketValue: 5_000_000,
        position: Position.CB
    });
    assert.equal(lateNormalMarket.potential, 78);

    const lateStrongMarket = calculator.calculate({
        overall: 78,
        age: 27,
        marketValue: 80_000_000,
        position: Position.CB
    });
    assert.ok(lateStrongMarket.potential > 78);

    const youngPremium = calculator.calculate({
        overall: 70,
        age: 20,
        marketValue: 25_000_000,
        position: Position.RW
    });
    assert.ok(youngPremium.potential >= 78);

    const developingMidfielder = calculator.calculate({
        overall: 76,
        age: 24,
        marketValue: 6_000_000,
        position: Position.CDM
    });
    assert.ok(developingMidfielder.potential >= 78);

    const centreBack = calculator.calculate({
        overall: 78,
        age: 26,
        marketValue: 70_000_000,
        position: Position.CB
    });
    const winger = calculator.calculate({
        overall: 78,
        age: 26,
        marketValue: 70_000_000,
        position: Position.LW
    });
    assert.ok(centreBack.potential > winger.potential);
}

async function testTransfermarktPotentialIntegration(): Promise<void> {
    const young = await calculate({
        age: 20,
        marketValue: 50_000_000,
        clubMeanMarketValue: 4_000_000,
        leagueMeanMarketValue: 5_000_000
    });
    assert.ok(young.potential >= young.overall);
    assert.equal(typeof young.potentialBreakdown.marketPremium, "number");

    const veteran = await calculate({
        age: 29,
        marketValue: 90_000_000,
        clubMeanMarketValue: 10_000_000,
        leagueMeanMarketValue: 12_000_000,
        position: "Centre-Back"
    });
    assert.equal(veteran.potential, veteran.overall);
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
    await testMidTierCalibration();
    await testGoalkeeperLongevity();
    testPotentialCalculator();
    await testTransfermarktPotentialIntegration();
    testPositionMapping();
    console.log("Overall calculator tests passed.");
}

void run();
