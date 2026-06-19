import { Injectable } from "@angular/core";
import { CalculateUtils, Fifa, Position, type FifaRatingAttributes } from "fifarating";
import type { TransfermarktOverallResult } from "../../../../utils/overall-calculator";
import type { DbMasterApi } from "../../dbmaster-api";

export interface CompletePlayerOverall extends TransfermarktOverallResult {
  playerFields: Record<string, number>;
}

@Injectable({ providedIn: "root" })
export class GetPlayerOverallService {
  private readonly api: DbMasterApi = window.dbmaster;

  async getPlayerOverall(playerId: string | number, fifa: Fifa = Fifa.Fifa23): Promise<CompletePlayerOverall> {
    const response = await this.api.getTransfermarktPlayerOverall(playerId, fifa);
    if (response.error || !response.result) {
      throw new Error(response.error ?? `Could not calculate Transfermarkt player ${playerId}.`);
    }

    const result = response.result;
    const rawOverall = CalculateUtils.rawOverall(result.attributes, result.fifa, result.position);
    const overall = CalculateUtils.displayOverall(
      result.attributes,
      result.fifa,
      result.position,
      result.reputation
    );
    if (rawOverall !== result.rawOverall || overall !== result.overall) {
      throw new Error(
        `Invalid fifarating result for player ${playerId}: expected ${result.rawOverall}/${result.overall}, received ${rawOverall}/${overall}.`
      );
    }

    return {
      ...result,
      playerFields: this.toPlayerFields(result.attributes, overall, result.reputation, result.position)
    };
  }

  private toPlayerFields(
    attributes: FifaRatingAttributes,
    overall: number,
    reputation: number,
    position: Position
  ): Record<string, number> {
    const goalkeeper = position === Position.GK;
    const pace = this.average(attributes.acceleration, attributes.sprintspeed);
    const shooting = this.average(
      attributes.finishing,
      attributes.shotpower,
      attributes.longshots,
      attributes.positioning,
      attributes.volleys,
      attributes.penalties
    );
    const passing = this.average(
      attributes.vision,
      attributes.crossing,
      attributes.freekickaccuracy,
      attributes.shortpassing,
      attributes.longpassing,
      attributes.curve
    );
    const dribbling = this.average(
      attributes.agility,
      attributes.balance,
      attributes.reactions,
      attributes.ballcontrol,
      attributes.dribbling
    );
    const defending = this.average(
      attributes.interceptions,
      attributes.headingaccuracy,
      attributes.marking,
      attributes.standingtackle,
      attributes.slidingtackle
    );
    const physical = this.average(
      attributes.jumping,
      attributes.stamina,
      attributes.strength,
      attributes.aggression
    );

    return {
      overallrating: overall,
      internationalrep: reputation,
      ...attributes,
      defensiveawareness: attributes.marking,
      composure: this.average(attributes.reactions, attributes.ballcontrol, attributes.vision),
      pacdiv: goalkeeper ? attributes.gkdiving : pace,
      shohan: goalkeeper ? attributes.gkhandling : shooting,
      paskic: goalkeeper ? attributes.gkkicking : passing,
      driref: goalkeeper ? attributes.gkreflexes : dribbling,
      defspe: goalkeeper ? pace : defending,
      phypos: goalkeeper ? attributes.gkpositioning : physical
    };
  }

  private average(...values: number[]): number {
    return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
  }
}
