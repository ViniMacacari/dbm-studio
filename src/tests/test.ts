import { OverallCalculator } from "../utils/overall-calculator";
import { GetPlayerOverallService } from "../renderer/services/transfermarkt-services/get-player-overall/get-player-overall.service";
import { CommonTransfermarktParser } from "../utils/transfermarkt-services/transfermarkt-parser";
import { AttributesUtils, CalculateUtils, ConfigUtils, Fifa, Position } from 'fifarating';

const test = async () => {
    // const player = 8198

    // const result = await new OverallCalculator()
    //     .generateFromTransfermarkt(player);

    // console.log(result.overall);
    // console.log(result.reputation);
    // console.log(result.breakdown);

    // console.log("=== Testing CommonTransfermarktParser Wrapper Methods ===");
    // const parser = new CommonTransfermarktParser();

    // const result1 = await parser.getPlayers({
    //     id: player
    // })

    // console.log(result1)

    // const fifa = Fifa.Fifa12;
    // const position = Position.GK;
    // const defaultOverall = 75;
    // const reputation = 5;
    // const attributes = AttributesUtils.init(defaultOverall);

    // console.log(ConfigUtils.fifa(fifa));

    // console.log(ConfigUtils.fifaPosition(fifa, position));

    // console.log(CalculateUtils.rawOverall(attributes, fifa, position));

    // console.log(CalculateUtils.displayOverall(attributes, fifa, position, reputation));

    // console.log(AttributesUtils.init(defaultOverall));

    // console.log(AttributesUtils.setRawOverall(AttributesUtils.init(defaultOverall), fifa, position, defaultOverall + 5));

    // console.log(AttributesUtils.generateRawOverall(fifa, position, defaultOverall));

    const result = await new OverallCalculator()
        .generateFromTransfermarkt(943837);

    console.log(result)
};

test().catch(err => {
    console.error("Test failed:", err);
});