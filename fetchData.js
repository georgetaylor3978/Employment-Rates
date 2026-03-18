const axios = require('axios');
const unzipper = require('unzipper');
const csv = require('csv-parser');
const fs = require('fs');

async function fetchAndProcessData() {
    try {
        console.log("Getting download URL...");
        const res = await axios.get('https://www150.statcan.gc.ca/t1/wds/rest/getFullTableDownloadCSV/14100287/en');
        if (res.data.status !== 'SUCCESS') {
            throw new Error(`Failed to get URL: ${JSON.stringify(res.data)}`);
        }
        
        const downloadUrl = res.data.object;
        console.log(`Downloading zip from: ${downloadUrl}`);
        
        const response = await axios({
            method: 'get',
            url: downloadUrl,
            responseType: 'stream'
        });

        const data = {};
        
        console.log("Unzipping and parsing CSV stream...");
        response.data
            .pipe(unzipper.ParseOne(/14100287\.csv/))
            .pipe(csv())
            .on('data', (row) => {
                const refDateKey = Object.keys(row)[0]; // To handle BOM: '﻿"REF_DATE"'
                const date = row[refDateKey];
                
                // Keep only Total - Gender, 15 years and over, Seasonally adjusted, Estimate
                if (
                    row['GEO'] === 'Canada' &&
                    row['Gender'] === 'Total - Gender' &&
                    row['Age group'] === '15 years and over' &&
                    row['Statistics'] === 'Estimate' &&
                    row['Data type'] === 'Seasonally adjusted'
                ) {
                    const chars = row['Labour force characteristics'];
                    if (
                        chars === 'Employment' ||
                        chars === 'Unemployment' ||
                        chars === 'Full-time employment' ||
                        chars === 'Part-time employment' ||
                        chars === 'Population' ||
                        chars === 'Labour force'
                    ) {
                        if (!data[date]) {
                            data[date] = { date };
                        }
                        // Multiply by 1000 since UOM is "Persons in thousands"
                        const value = parseFloat(row['VALUE']) * 1000;
                        if (!isNaN(value)) {
                            // Map to simple keys for dashboard
                            let key = chars.toLowerCase().replace(/ /g, '_').replace(/-/, '_');
                            // key space replacement: 'full-time employment' -> 'full_time_employment'
                            key = key.replace(/employment$/, 'emp').replace('_emp', '_employment');
                            if (key === 'population') key = 'population';
                            if (key === 'labour_force') key = 'labour_force';
                            if (key === 'full_time_employment') key = 'full_time_employed';
                            if (key === 'part_time_employment') key = 'part_time_employed';
                            if (key === 'employment') key = 'employed';
                            if (key === 'unemployment') key = 'unemployed';
                            
                            data[date][key] = value;
                        }
                    }
                }
            })
            .on('end', () => {
                const finalData = Object.values(data).sort((a,b) => a.date.localeCompare(b.date));
                console.log(`Processed ${finalData.length} unique dates for Canada.`);
                fs.writeFileSync('employment_data.json', JSON.stringify(finalData, null, 2));
                console.log('Saved to employment_data.json');
            })
            .on('error', (err) => {
                 console.error("Error during streaming: ", err);
            });
            
    } catch (error) {
        console.error("Error:", error.message);
    }
}

fetchAndProcessData();
