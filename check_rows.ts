import * as fs from 'fs';
import { readFifaDatabase } from './src/core/databaseReader';

function testDB() {
    const original = fs.readFileSync('./FIFA.db');
    // We don't have the descriptors easily, let's just use the fact that they use DbMaster.
    // wait, we can't easily run databaseReader without descriptors.
}
testDB();
