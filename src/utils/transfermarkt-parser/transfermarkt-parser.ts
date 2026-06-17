import { club, competition, player, season, country } from 'transfermarkt-parser'
import { CountryReturn, CompetitionReturn } from './transfermarkt'

export class DbmTransfermarktParser {
    async getCountryId(name: string): Promise<CountryReturn[]> {
        const result = await country.list()

        const search = result.find(x => x.title?.toUpperCase() === name.toUpperCase())

        if (!search) {
            return []
        }

        return search
    }

    async getCompetition(id: number) {
        const result = await competition.list(id)

        return result
    }
}