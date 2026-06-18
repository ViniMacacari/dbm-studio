import { CommonTransfermarktParser } from "../utils/transfermarkt-services/transfermarkt-parser";
import { AttributesUtils, CalculateUtils, ConfigUtils, Fifa, Position } from 'fifarating';

const test = async () => {
    // console.log("=== Testing CommonTransfermarktParser Wrapper Methods ===");
    // const parser = new CommonTransfermarktParser();

    // const result = await parser.getPlayers({
    //     id: 68290
    // })

    // console.log(result)

    const fifa = Fifa.Fifa12;
    const position = Position.GK;
    const defaultOverall = 75;
    const reputation = 5;
    const attributes = AttributesUtils.init(defaultOverall);

    console.log(ConfigUtils.fifa(fifa));

    console.log(ConfigUtils.fifaPosition(fifa, position));

    console.log(CalculateUtils.rawOverall(attributes, fifa, position));

    console.log(CalculateUtils.displayOverall(attributes, fifa, position, reputation));

    console.log(AttributesUtils.init(defaultOverall));

    console.log(AttributesUtils.setRawOverall(AttributesUtils.init(defaultOverall), fifa, position, defaultOverall + 5));

    console.log(AttributesUtils.generateRawOverall(fifa, position, defaultOverall));

};

test().catch(err => {
    console.error("Test failed:", err);
});