import { Position } from "fifarating";

export interface PotentialCalculatorConfig {
    minimumOverall: number;
    maximumPotential: number;
    maximumValueImpliedOverall: number;
    marketValueFloor: number;
    marketValueCeiling: number;
}

export interface PotentialCalculationInput {
    overall: number;
    age: number;
    marketValue: number;
    position: Position;
}

export interface PotentialCalculationBreakdown {
    marketScore: number;
    valueImpliedOverall: number;
    marketPremium: number;
    marketGrowthFactor: number;
    youthGrowthFloor: number;
    ageGrowthCeiling: number;
    positionGrowthFactor: number;
    highOverallDamping: number;
    growth: number;
}

export interface PotentialCalculationResult {
    potential: number;
    breakdown: PotentialCalculationBreakdown;
}

export const defaultPotentialCalculatorConfig: Readonly<PotentialCalculatorConfig> = {
    minimumOverall: 45,
    maximumPotential: 99,
    maximumValueImpliedOverall: 95,
    marketValueFloor: 50_000,
    marketValueCeiling: 180_000_000
};

export class PotentialCalculator {
    readonly config: PotentialCalculatorConfig;

    constructor(config: Partial<PotentialCalculatorConfig> = {}) {
        this.config = { ...defaultPotentialCalculatorConfig, ...config };
        this.validateConfig();
    }

    calculate(input: PotentialCalculationInput): PotentialCalculationResult {
        this.validateInput(input);
        const overall = this.clampInteger(input.overall, this.config.minimumOverall, this.config.maximumPotential);
        const age = Math.floor(input.age);
        const marketValue = Math.max(input.marketValue, this.config.marketValueFloor);

        if (age >= 28) {
            return this.makeResult(overall, {
                marketScore: this.logNormalize(marketValue),
                valueImpliedOverall: overall,
                marketPremium: 0,
                marketGrowthFactor: 0,
                youthGrowthFloor: 0,
                ageGrowthCeiling: 0,
                positionGrowthFactor: this.positionGrowthFactor(input.position, age),
                highOverallDamping: 1,
                growth: 0
            });
        }

        const marketScore = this.logNormalize(marketValue);
        const valueImpliedOverall = this.config.minimumOverall
            + marketScore * (this.config.maximumValueImpliedOverall - this.config.minimumOverall);
        const marketPremium = valueImpliedOverall - overall;
        const marketGrowthFactor = this.clamp((marketPremium + 8) / 18, 0, 1);
        const youthGrowthFloor = this.youthGrowthFloor(age);
        const ageGrowthCeiling = this.ageGrowthCeiling(age, input.position);
        const positionGrowthFactor = this.positionGrowthFactor(input.position, age);
        const highOverallDamping = 1 - this.clamp((overall - 84) / 20, 0, 0.45);

        const latePeakThreshold = age === 27 ? 0.74 : age === 26 ? 0.58 : 0;
        const eligibleForLateGrowth = age < 26 || marketGrowthFactor >= latePeakThreshold;
        const growthScore = eligibleForLateGrowth
            ? this.clamp(youthGrowthFloor + marketGrowthFactor * (1 - youthGrowthFloor), 0, 1)
            : 0;
        const growth = this.clampInteger(
            ageGrowthCeiling * growthScore * positionGrowthFactor * highOverallDamping,
            0,
            this.config.maximumPotential - overall
        );

        return this.makeResult(overall + growth, {
            marketScore: this.round(marketScore, 4),
            valueImpliedOverall: this.round(valueImpliedOverall, 2),
            marketPremium: this.round(marketPremium, 2),
            marketGrowthFactor: this.round(marketGrowthFactor, 4),
            youthGrowthFloor: this.round(youthGrowthFloor, 4),
            ageGrowthCeiling,
            positionGrowthFactor: this.round(positionGrowthFactor, 4),
            highOverallDamping: this.round(highOverallDamping, 4),
            growth
        });
    }

    private makeResult(potential: number, breakdown: PotentialCalculationBreakdown): PotentialCalculationResult {
        return {
            potential: this.clampInteger(potential, this.config.minimumOverall, this.config.maximumPotential),
            breakdown
        };
    }

    private validateConfig(): void {
        if (this.config.minimumOverall < 0 || this.config.minimumOverall >= this.config.maximumPotential) {
            throw new Error("Potential calculator rating bounds are invalid.");
        }
        if (this.config.maximumPotential > 99 || this.config.maximumValueImpliedOverall > this.config.maximumPotential) {
            throw new Error("Potential calculator maximum values are invalid.");
        }
        if (this.config.marketValueFloor <= 0 || this.config.marketValueCeiling <= this.config.marketValueFloor) {
            throw new Error("Potential calculator market-value bounds are invalid.");
        }
    }

    private validateInput(input: PotentialCalculationInput): void {
        if (!Number.isFinite(input.overall) || !Number.isFinite(input.age) || input.age < 15) {
            throw new Error("Potential calculator requires a valid overall and age.");
        }
        if (!Number.isFinite(input.marketValue) || input.marketValue <= 0) {
            throw new Error("Potential calculator requires a positive market value.");
        }
        if (!Object.values(Position).includes(input.position)) {
            throw new Error(`Potential calculator received an unsupported position "${input.position}".`);
        }
    }

    private ageGrowthCeiling(age: number, position: Position): number {
        const baseCeiling = age <= 16 ? 20
            : age === 17 ? 18
            : age === 18 ? 16
            : age === 19 ? 14
            : age === 20 ? 12
            : age === 21 ? 10
            : age === 22 ? 8
            : age === 23 ? 6
            : age === 24 ? 5
            : age === 25 ? 3
            : age === 26 ? 2
            : age === 27 ? 1
            : 0;
        if (age >= 26 && this.isLateDevelopingPosition(position)) {
            return baseCeiling + 1;
        }
        return baseCeiling;
    }

    private youthGrowthFloor(age: number): number {
        if (age <= 18) {
            return 0.28;
        }
        if (age <= 21) {
            return 0.22;
        }
        if (age <= 23) {
            return 0.14;
        }
        if (age <= 25) {
            return 0.08;
        }
        return 0;
    }

    private positionGrowthFactor(position: Position, age: number): number {
        if (position === Position.GK) {
            return age <= 21 ? 0.9 : 1.18;
        }
        if (this.isLateDevelopingPosition(position)) {
            return age >= 22 ? 1.12 : 1.02;
        }
        if ([Position.RW, Position.LW, Position.RF, Position.LF, Position.RS, Position.LS, Position.ST].includes(position)) {
            return age >= 24 ? 0.92 : 1.04;
        }
        if ([Position.CAM, Position.RAM, Position.LAM, Position.CF].includes(position)) {
            return age >= 24 ? 0.96 : 1.02;
        }
        return 1;
    }

    private isLateDevelopingPosition(position: Position): boolean {
        return [
            Position.GK,
            Position.CB,
            Position.RCB,
            Position.LCB,
            Position.CDM,
            Position.RDM,
            Position.LDM,
            Position.CM,
            Position.RCM,
            Position.LCM
        ].includes(position);
    }

    private logNormalize(value: number): number {
        const normalized = (Math.log(Math.max(value, this.config.marketValueFloor)) - Math.log(this.config.marketValueFloor))
            / (Math.log(this.config.marketValueCeiling) - Math.log(this.config.marketValueFloor));
        return this.clamp(normalized, 0, 1);
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
}
