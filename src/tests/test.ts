import { CommonTransfermarktParser } from "../utils/transfermarkt-services/transfermarkt-parser";

const test = async () => {
    console.log("=== Testing CommonTransfermarktParser Wrapper Methods ===");
    const parser = new CommonTransfermarktParser();

    console.log("\n--- Testing getPlayers with Name (Neymar) ---");
    const searchRes = await parser.getPlayers({ name: "Neymar" });
    if (Array.isArray(searchRes)) {
        console.log("Search results count:", searchRes.length);
        if (searchRes.length > 0) {
            console.log("First player result:", searchRes[0]);
        }
    } else {
        console.log("Expected search results array but got single profile.");
    }

    console.log("\n--- Testing getPlayers with ID (Neymar - 68290) ---");
    const profileRes = await parser.getPlayers({ id: "68290" });
    if (!Array.isArray(profileRes)) {
        console.log("Player Name:", profileRes.name);
        console.log("Player Date of Birth:", profileRes.dateOfBirth);
        console.log("Player Age:", profileRes.age);
        console.log("Player Height:", profileRes.height);
        console.log("Player Market Value:", profileRes.marketValue);
        console.log("Player Club:", profileRes.club.name);
    } else {
        console.log("Expected single profile but got array.");
    }

    console.log("\n--- Testing getClubProfile (Santos FC - 221) ---");
    const clubProfileRes = await parser.getClubProfile("221");
    console.log("Club Name:", clubProfileRes.name);
    console.log("Official Name:", clubProfileRes.officialName);
    console.log("Founded On:", clubProfileRes.foundedOn);
    console.log("Stadium Name:", clubProfileRes.stadiumName);
    console.log("Stadium Seats:", clubProfileRes.stadiumSeats);
    console.log("Current Market Value:", clubProfileRes.currentMarketValue);

    console.log("\n--- Testing getClubPlayers (Santos FC - 221) ---");
    const clubPlayersRes = await parser.getClubPlayers("221");
    console.log("Club Players Count:", clubPlayersRes.players.length);
    if (clubPlayersRes.players.length > 0) {
        console.log("First player in squad:", clubPlayersRes.players[0]);
    }
};

test().catch(err => {
    console.error("Test failed:", err);
});