import { AttributesUtils, CalculateUtils, Fifa, Position, type FifaRatingAttributes } from "fifarating";
import { transfermarktPositionToFifaPosition } from "../position-mapper/position-mapper";
import { CommonTransfermarktParser } from "../transfermarkt-services/transfermarkt-parser";
import type {
    ClubProfileResponse,
    CompetitionSearchResponse,
    CompetitionSearchResult,
    PlayerAchievementsResponse,
    PlayerMarketValueResponse,
    PlayerProfileResponse,
    PlayerSearchResult
} from "../transfermarkt-services/transfermarkt";

export interface OverallCalculatorTransfermarktGateway {
    getPlayers(filter: { name?: string; id?: string | number }): Promise<PlayerProfileResponse | PlayerSearchResult[]>;
    getPlayerAchievements(playerId: string | number): Promise<PlayerAchievementsResponse>;
    getPlayerMarketValue(playerId: string | number): Promise<PlayerMarketValueResponse>;
    getClubProfile(clubId: string | number): Promise<ClubProfileResponse>;
    searchCompetitions(query: string, pageNumber?: number): Promise<CompetitionSearchResponse>;
}

export interface OverallCalculatorConfig {
    minimumOverall: number;
    maximumRawOverall: number;
    midTierOverallBoost: number;
    goalkeeperExperienceStartAge: number;
    goalkeeperBaseAbilityAdjustment: number;
    goalkeeperExperienceMaximumBoost: number;
    goalkeeperExperienceRampYears: number;
    marketValueFloor: number;
    marketValueCeiling: number;
    primeAge: number;
    youthValuePremiumPerYear: number;
    veteranValueDiscountPerYear: number;
    leagueReferenceMeanMarketValue: number;
    clubReferenceMeanMarketValue: number;
    leagueCorrectionExponent: number;
    clubCorrectionExponent: number;
    minimumContextMultiplier: number;
    maximumContextMultiplier: number;
    marketWeight: number;
    teamRelativeWeight: number;
    leagueRelativeWeight: number;
    trophyWeight: number;
    leagueStrengthWeight: number;
    relativeValueSpread: number;
    trophyHalfLifeYears: number;
    trophySaturation: number;
    reputationMarketWeight: number;
    reputationTrophyWeight: number;
    reputationClubWeight: number;
    reputationLeagueWeight: number;
}

export const defaultOverallCalculatorConfig: Readonly<OverallCalculatorConfig> = {
    minimumOverall: 45,
    maximumRawOverall: 96,
    midTierOverallBoost: 0.08,
    goalkeeperExperienceStartAge: 31,
    goalkeeperBaseAbilityAdjustment: -0.02,
    goalkeeperExperienceMaximumBoost: 0.135,
    goalkeeperExperienceRampYears: 3,
    marketValueFloor: 50_000,
    marketValueCeiling: 180_000_000,
    primeAge: 27,
    youthValuePremiumPerYear: 0.05,
    veteranValueDiscountPerYear: 0.1,
    leagueReferenceMeanMarketValue: 5_000_000,
    clubReferenceMeanMarketValue: 4_000_000,
    leagueCorrectionExponent: 0.16,
    clubCorrectionExponent: 0.08,
    minimumContextMultiplier: 0.65,
    maximumContextMultiplier: 1.55,
    marketWeight: 0.48,
    teamRelativeWeight: 0.04,
    leagueRelativeWeight: 0.02,
    trophyWeight: 0.06,
    leagueStrengthWeight: 0.4,
    relativeValueSpread: 1.15,
    trophyHalfLifeYears: 6,
    trophySaturation: 8,
    reputationMarketWeight: 0.4,
    reputationTrophyWeight: 0.25,
    reputationClubWeight: 0.18,
    reputationLeagueWeight: 0.17
};

export interface GenerateOverallOptions {
    fifa?: Fifa;
    position?: Position;
    referenceDate?: Date;
}

export interface OverallCalculationBreakdown {
    marketValue: number;
    ageAdjustedMarketValue: number;
    contextAdjustedMarketValue: number;
    ageMarketFactor: number;
    leagueMarketFactor: number;
    clubMarketFactor: number;
    marketScore: number;
    abilityScore: number;
    calibratedAbilityScore: number;
    positionExperienceBoost: number;
    positionAbilityAdjustment: number;
    leagueStrengthScore?: number;
    teamRelativeScore?: number;
    leagueRelativeScore?: number;
    trophyScore?: number;
    weightedTrophies?: number;
    clubMeanMarketValue?: number;
    leagueMeanMarketValue?: number;
}

export interface OverallCalculationValidation {
    player: boolean;
    marketValue: boolean;
    age: boolean;
    team: boolean;
    league: boolean;
    trophies: boolean;
}

export interface TransfermarktOverallResult {
    playerId: string;
    playerName: string;
    rawOverall: number;
    overall: number;
    reputation: number;
    position: Position;
    fifa: Fifa;
    attributes: FifaRatingAttributes;
    confidence: number;
    validation: OverallCalculationValidation;
    breakdown: OverallCalculationBreakdown;
    context: {
        clubId?: string;
        clubName?: string;
        leagueId?: string;
        leagueName?: string;
        leagueCountry?: string;
        leagueTier?: number;
        achievements: number;
    };
    warnings: string[];
}

interface ResolvedTransfermarktContext {
    playerId: string;
    profile: PlayerProfileResponse;
    market?: PlayerMarketValueResponse;
    achievements?: PlayerAchievementsResponse;
    club?: ClubProfileResponse;
    competition?: CompetitionSearchResult;
    warnings: string[];
    validation: OverallCalculationValidation;
}

export class OverallCalculator {
    readonly config: OverallCalculatorConfig;

    constructor(
        private readonly transfermarkt: OverallCalculatorTransfermarktGateway = new CommonTransfermarktParser(),
        config: Partial<OverallCalculatorConfig> = {}
    ) {
        this.config = { ...defaultOverallCalculatorConfig, ...config };
        this.validateConfig();
    }

    async generateFromTransfermarkt(
        playerId: string | number,
        options: GenerateOverallOptions = {}
    ): Promise<TransfermarktOverallResult> {
        const id = String(playerId).trim();
        if (!/^\d+$/.test(id) || Number(id) <= 0) {
            throw new Error(`Invalid Transfermarkt player id "${playerId}".`);
        }

        const context = await this.resolveTransfermarktContext(id);
        return this.calculate(context, options);
    }

    private async resolveTransfermarktContext(playerId: string): Promise<ResolvedTransfermarktContext> {
        const warnings: string[] = [];
        const playerResponse = await this.transfermarkt.getPlayers({ id: playerId });
        if (Array.isArray(playerResponse)) {
            throw new Error(`Transfermarkt returned search results instead of player ${playerId}.`);
        }
        const profile = playerResponse;
        const validation: OverallCalculationValidation = {
            player: profile.id === null || profile.id === playerId,
            marketValue: false,
            age: profile.age !== null && Number.isFinite(profile.age),
            team: false,
            league: false,
            trophies: false
        };
        if (!validation.player) {
            warnings.push(`Transfermarkt returned player ${profile.id ?? "unknown"} for requested id ${playerId}.`);
        }

        const [market, achievements] = await Promise.all([
            this.optional(() => this.transfermarkt.getPlayerMarketValue(playerId), "market value history", warnings),
            this.optional(() => this.transfermarkt.getPlayerAchievements(playerId), "achievements", warnings)
        ]);
        validation.trophies = Boolean(achievements);

        let club: ClubProfileResponse | undefined;
        let competition: CompetitionSearchResult | undefined;
        if (profile.club.id) {
            club = await this.optional(() => this.transfermarkt.getClubProfile(profile.club.id as string), "club profile", warnings);
            validation.team = Boolean(club && club.id === profile.club.id);
            if (club && !validation.team) {
                warnings.push(`Transfermarkt club ${club.id} does not match player club ${profile.club.id}.`);
            }
        } else {
            warnings.push("Player has no current Transfermarkt club; team and league adjustments were omitted.");
        }

        if (club?.league.name) {
            const search = await this.optional(
                () => this.transfermarkt.searchCompetitions(club?.league.name as string),
                "league profile",
                warnings
            );
            competition = search ? this.matchCompetition(search, club) : undefined;
            validation.league = Boolean(competition);
            if (!competition) {
                warnings.push(`Could not validate league ${club.league.name}.`);
            }
        }

        const marketValue = this.positiveNumber(market?.marketValue) ?? this.positiveNumber(profile.marketValue);
        validation.marketValue = marketValue !== undefined;
        if (!validation.marketValue) {
            throw new Error(`Transfermarkt player ${playerId} has no usable market value.`);
        }
        if (!validation.age) {
            throw new Error(`Transfermarkt player ${playerId} has no usable age.`);
        }

        return { playerId, profile, market, achievements, club, competition, warnings, validation };
    }

    private calculate(context: ResolvedTransfermarktContext, options: GenerateOverallOptions): TransfermarktOverallResult {
        const { profile, club, competition, achievements, market, warnings, validation } = context;
        const marketValue = this.positiveNumber(market?.marketValue) ?? this.positiveNumber(profile.marketValue) as number;
        const age = profile.age as number;
        const position = options.position ?? transfermarktPositionToFifaPosition(profile.position.main);
        if (!position) {
            throw new Error(`Unsupported Transfermarkt position "${profile.position.main ?? "unknown"}".`);
        }
        const fifa = options.fifa ?? Fifa.Fifa23;
        const referenceDate = options.referenceDate ?? new Date();

        const squadSize = this.positiveNumber(club?.squad.size);
        const clubMeanMarketValue = this.positiveNumber(club?.currentMarketValue) && squadSize
            ? (club?.currentMarketValue as number) / squadSize
            : undefined;
        const leagueMeanMarketValue = this.positiveNumber(competition?.totalMarketValue) && this.positiveNumber(competition?.players)
                ? (competition?.totalMarketValue as number) / (competition?.players as number)
                : this.positiveNumber(competition?.meanMarketValue);

        const ageMarketFactor = age <= this.config.primeAge
            ? Math.exp(this.config.youthValuePremiumPerYear * (this.config.primeAge - age))
            : Math.exp(-this.config.veteranValueDiscountPerYear * (age - this.config.primeAge));
        const ageAdjustedMarketValue = marketValue / ageMarketFactor;
        const leagueMarketFactor = leagueMeanMarketValue
            ? Math.pow(leagueMeanMarketValue / this.config.leagueReferenceMeanMarketValue, this.config.leagueCorrectionExponent)
            : 1;
        const clubMarketFactor = clubMeanMarketValue
            ? Math.pow(clubMeanMarketValue / this.config.clubReferenceMeanMarketValue, this.config.clubCorrectionExponent)
            : 1;
        const contextMultiplier = this.clamp(
            leagueMarketFactor * clubMarketFactor,
            this.config.minimumContextMultiplier,
            this.config.maximumContextMultiplier
        );
        const contextAdjustedMarketValue = ageAdjustedMarketValue * contextMultiplier;
        const marketScore = this.logNormalize(
            contextAdjustedMarketValue,
            this.config.marketValueFloor,
            this.config.marketValueCeiling
        );
        const teamRelativeScore = clubMeanMarketValue
            ? this.relativeValueScore(ageAdjustedMarketValue, clubMeanMarketValue, this.config.relativeValueSpread)
            : undefined;
        const leagueRelativeScore = leagueMeanMarketValue
            ? this.relativeValueScore(ageAdjustedMarketValue, leagueMeanMarketValue, this.config.relativeValueSpread)
            : undefined;
        const weightedTrophies = achievements
            ? this.weightAchievements(achievements, referenceDate)
            : undefined;
        const trophyScore = weightedTrophies === undefined
            ? undefined
            : 1 - Math.exp(-weightedTrophies / this.config.trophySaturation);
        const leagueStrengthScore = leagueMeanMarketValue
            ? this.logNormalize(leagueMeanMarketValue, this.config.marketValueFloor, this.config.marketValueCeiling)
            : undefined;

        const abilityScore = this.weightedMean([
            { value: marketScore, weight: this.config.marketWeight },
            { value: teamRelativeScore, weight: this.config.teamRelativeWeight },
            { value: leagueRelativeScore, weight: this.config.leagueRelativeWeight },
            { value: trophyScore, weight: this.config.trophyWeight },
            { value: leagueStrengthScore, weight: this.config.leagueStrengthWeight }
        ]);
        const midTierBand = 64 * abilityScore ** 3 * (1 - abilityScore) ** 3;
        const curveAdjustedAbilityScore = this.clamp(
            abilityScore + this.config.midTierOverallBoost * midTierBand,
            0,
            1
        );
        const positionExperienceBoost = this.positionExperienceBoost(position, age, curveAdjustedAbilityScore);
        const positionAbilityAdjustment = (position === Position.GK ? this.config.goalkeeperBaseAbilityAdjustment : 0)
            + positionExperienceBoost;
        const calibratedAbilityScore = this.clamp(curveAdjustedAbilityScore + positionAbilityAdjustment, 0, 1);
        const rawOverall = this.clampInteger(
            this.config.minimumOverall
                + calibratedAbilityScore * (this.config.maximumRawOverall - this.config.minimumOverall),
            this.config.minimumOverall,
            this.config.maximumRawOverall
        );

        const clubStrength = clubMeanMarketValue
            ? this.logNormalize(clubMeanMarketValue, this.config.marketValueFloor, this.config.marketValueCeiling)
            : undefined;
        const leagueStrength = leagueStrengthScore;
        const rankingScore = this.rankingReputationScore(market?.ranking);
        const reputationScore = this.weightedMean([
            { value: rankingScore ?? marketScore, weight: this.config.reputationMarketWeight },
            { value: trophyScore, weight: this.config.reputationTrophyWeight },
            { value: clubStrength, weight: this.config.reputationClubWeight },
            { value: leagueStrength, weight: this.config.reputationLeagueWeight }
        ]);
        const reputation = this.clampInteger(1 + reputationScore * 4, 1, 5);
        const attributes = AttributesUtils.generateRawOverall(fifa, position, rawOverall);
        const calculatedRawOverall = CalculateUtils.rawOverall(attributes, fifa, position);
        if (calculatedRawOverall !== rawOverall) {
            throw new Error(`fifarating generated raw overall ${calculatedRawOverall}; expected ${rawOverall}.`);
        }
        const overall = CalculateUtils.displayOverall(attributes, fifa, position, reputation);

        const validationCount = Object.values(validation).filter(Boolean).length;
        const confidence = this.round(validationCount / Object.keys(validation).length, 3);
        const leagueTier = this.parseInteger(club?.league.tier);
        const achievementCount = achievements?.achievements.reduce((total, achievement) => total + achievement.count, 0) ?? 0;

        return {
            playerId: context.playerId,
            playerName: profile.name ?? profile.fullName ?? context.playerId,
            rawOverall,
            overall,
            reputation,
            position,
            fifa,
            attributes,
            confidence,
            validation,
            breakdown: {
                marketValue,
                ageAdjustedMarketValue: this.round(ageAdjustedMarketValue),
                contextAdjustedMarketValue: this.round(contextAdjustedMarketValue),
                ageMarketFactor: this.round(ageMarketFactor, 4),
                leagueMarketFactor: this.round(leagueMarketFactor, 4),
                clubMarketFactor: this.round(clubMarketFactor, 4),
                marketScore: this.round(marketScore, 4),
                abilityScore: this.round(abilityScore, 4),
                calibratedAbilityScore: this.round(calibratedAbilityScore, 4),
                positionExperienceBoost: this.round(positionExperienceBoost, 4),
                positionAbilityAdjustment: this.round(positionAbilityAdjustment, 4),
                leagueStrengthScore: this.optionalRound(leagueStrengthScore),
                teamRelativeScore: this.optionalRound(teamRelativeScore),
                leagueRelativeScore: this.optionalRound(leagueRelativeScore),
                trophyScore: this.optionalRound(trophyScore),
                weightedTrophies: this.optionalRound(weightedTrophies),
                clubMeanMarketValue: this.optionalRound(clubMeanMarketValue),
                leagueMeanMarketValue: this.optionalRound(leagueMeanMarketValue)
            },
            context: {
                clubId: club?.id ?? profile.club.id ?? undefined,
                clubName: club?.name ?? profile.club.name ?? undefined,
                leagueId: club?.league.id ?? competition?.id ?? undefined,
                leagueName: club?.league.name ?? competition?.name ?? undefined,
                leagueCountry: club?.league.countryName ?? competition?.country ?? undefined,
                leagueTier,
                achievements: achievementCount
            },
            warnings
        };
    }

    private matchCompetition(search: CompetitionSearchResponse, club: ClubProfileResponse): CompetitionSearchResult | undefined {
        const leagueId = this.normalize(club.league.id);
        const leagueName = this.normalize(club.league.name);
        const country = this.normalize(club.league.countryName);
        return search.results.find((result) => leagueId && this.normalize(result.id) === leagueId)
            ?? search.results.find((result) => this.normalize(result.name) === leagueName && (!country || this.normalize(result.country) === country));
    }

    private weightAchievements(achievements: PlayerAchievementsResponse, referenceDate: Date): number {
        return achievements.achievements.reduce((total, achievement) => {
            if (achievement.details.length === 0) {
                return total + achievement.count;
            }
            const detailWeight = achievement.details.reduce((detailTotal, detail) => {
                const seasonYear = this.parseSeasonYear(detail.season.id ?? detail.season.name);
                if (seasonYear === undefined) {
                    return detailTotal + 1;
                }
                const ageYears = Math.max(0, referenceDate.getUTCFullYear() - seasonYear);
                return detailTotal + Math.pow(0.5, ageYears / this.config.trophyHalfLifeYears);
            }, 0);
            return total + detailWeight;
        }, 0);
    }

    private async optional<T>(operation: () => Promise<T>, label: string, warnings: string[]): Promise<T | undefined> {
        try {
            return await operation();
        } catch (error) {
            warnings.push(`Could not load Transfermarkt ${label}: ${error instanceof Error ? error.message : String(error)}`);
            return undefined;
        }
    }

    private validateConfig(): void {
        if (this.config.marketValueFloor <= 0 || this.config.marketValueCeiling <= this.config.marketValueFloor) {
            throw new Error("Overall calculator market-value bounds are invalid.");
        }
        if (this.config.maximumRawOverall <= this.config.minimumOverall || this.config.maximumRawOverall > 99) {
            throw new Error("Overall calculator rating bounds are invalid.");
        }
        if (!Number.isFinite(this.config.midTierOverallBoost) || this.config.midTierOverallBoost < 0 || this.config.midTierOverallBoost > 0.25) {
            throw new Error("Overall calculator mid-tier boost is invalid.");
        }
        if (
            !Number.isFinite(this.config.goalkeeperExperienceStartAge)
            || !Number.isFinite(this.config.goalkeeperBaseAbilityAdjustment)
            || !Number.isFinite(this.config.goalkeeperExperienceMaximumBoost)
            || !Number.isFinite(this.config.goalkeeperExperienceRampYears)
            || this.config.goalkeeperExperienceStartAge < 18
            || this.config.goalkeeperBaseAbilityAdjustment < -0.1
            || this.config.goalkeeperBaseAbilityAdjustment > 0.1
            || this.config.goalkeeperExperienceMaximumBoost < 0
            || this.config.goalkeeperExperienceMaximumBoost > 0.2
            || this.config.goalkeeperExperienceRampYears <= 0
        ) {
            throw new Error("Overall calculator goalkeeper experience configuration is invalid.");
        }
        const weights = [
            this.config.marketWeight,
            this.config.teamRelativeWeight,
            this.config.leagueRelativeWeight,
            this.config.trophyWeight,
            this.config.leagueStrengthWeight,
            this.config.reputationMarketWeight,
            this.config.reputationTrophyWeight,
            this.config.reputationClubWeight,
            this.config.reputationLeagueWeight
        ];
        if (weights.some((weight) => !Number.isFinite(weight) || weight < 0)) {
            throw new Error("Overall calculator weights must be finite non-negative numbers.");
        }
    }

    private positiveNumber(value: unknown): number | undefined {
        if (typeof value === "number" && Number.isFinite(value) && value > 0) {
            return value;
        }
        if (typeof value === "string") {
            const parsed = Number(value.replace(/[^\d.-]/g, ""));
            return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
        }
        return undefined;
    }

    private positionExperienceBoost(position: Position, age: number, abilityScore: number): number {
        if (position !== Position.GK || age <= this.config.goalkeeperExperienceStartAge) {
            return 0;
        }
        const experienceYears = age - this.config.goalkeeperExperienceStartAge;
        const longevity = 1 - Math.exp(-experienceYears / this.config.goalkeeperExperienceRampYears);
        const highRatingDamping = Math.min(1, (1 - abilityScore) / 0.5);
        return this.config.goalkeeperExperienceMaximumBoost * longevity * highRatingDamping;
    }

    private parseInteger(value: unknown): number | undefined {
        const match = String(value ?? "").match(/\d+/);
        return match ? Number(match[0]) : undefined;
    }

    private parseSeasonYear(value: string | null | undefined): number | undefined {
        const match = value?.match(/(?:19|20)\d{2}/);
        return match ? Number(match[0]) : undefined;
    }

    private normalize(value: string | null | undefined): string {
        return (value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
    }

    private logNormalize(value: number, floor: number, ceiling: number): number {
        const normalized = (Math.log(Math.max(value, floor)) - Math.log(floor)) / (Math.log(ceiling) - Math.log(floor));
        return this.clamp(normalized, 0, 1);
    }

    private relativeValueScore(value: number, reference: number, spread: number): number {
        return 0.5 + Math.atan(Math.log(value / reference) / spread) / Math.PI;
    }

    private rankingReputationScore(ranking: Record<string, string> | undefined): number | undefined {
        const ranks = Object.values(ranking ?? {})
            .map((value) => value.match(/[\d,.]+/)?.[0].replace(/[,.]/g, ""))
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0);
        if (ranks.length === 0) {
            return undefined;
        }
        return 1 / (1 + Math.log1p(Math.min(...ranks)) / 4);
    }

    private weightedMean(entries: Array<{ value: number | undefined; weight: number }>): number {
        const available = entries.filter((entry): entry is { value: number; weight: number } => entry.value !== undefined && entry.weight > 0);
        const totalWeight = available.reduce((total, entry) => total + entry.weight, 0);
        if (totalWeight === 0) {
            return 0;
        }
        return available.reduce((total, entry) => total + entry.value * entry.weight, 0) / totalWeight;
    }

    private clamp(value: number, minimum: number, maximum: number): number {
        return Math.min(Math.max(value, minimum), maximum);
    }

    private clampInteger(value: number, minimum: number, maximum: number): number {
        return Math.round(this.clamp(value, minimum, maximum));
    }

    private round(value: number, digits = 0): number {
        const factor = 10 ** digits;
        return Math.round(value * factor) / factor;
    }

    private optionalRound(value: number | undefined, digits = 4): number | undefined {
        return value === undefined ? undefined : this.round(value, digits);
    }
}
