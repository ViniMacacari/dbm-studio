import { DbmTransfermarktParser } from "../utils/transfermarkt-parser/transfermarkt-parser";

const test = async () => {
    const service = new DbmTransfermarktParser()

    const result = await service.getCountryId('BRAZIL')
    const result2 = await service.getCompetition(26)

    console.log(result)
    console.log(result2)
}

test()