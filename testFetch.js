const axios = require('axios');
const unzipper = require('unzipper');
const csv = require('csv-parser');

async function testFetch() {
    console.log("Getting download URL...");
    const res = await axios.get('https://www150.statcan.gc.ca/t1/wds/rest/getFullTableDownloadCSV/14100287/en');
    const downloadUrl = res.data.object;
    
    console.log(`Downloading zip from: ${downloadUrl}`);
    const response = await axios({
        method: 'get',
        url: downloadUrl,
        responseType: 'stream'
    });

    let count = 0;
    response.data
        .pipe(unzipper.ParseOne(/14100287\.csv/))
        .pipe(csv())
        .on('data', (row) => {
            if (count === 0) {
                console.log("Headers:", Object.keys(row));
                console.log("First row details:");
                console.log(row);
            }
            if (row['GEO'] === 'Canada') {
                if (count < 5) {
                    console.log("Sample Canada row:", row);
                    count++;
                } else if (count === 5) {
                   process.exit(0);
                }
            }
        });
}

testFetch();
