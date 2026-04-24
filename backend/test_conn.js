import 'dotenv/config';
import { getMVsFromDB } from './src/services/v2_mapper.js';
async function test() {
    try {
        const data = await getMVsFromDB();
        console.log(`Successfully fetched ${data.length} MVs!`);
        console.log(data[0]);
        process.exit(0);
    }
    catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}
test();
