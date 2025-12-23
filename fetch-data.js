const fs = require('fs');
const path = require('path');

// Fetch 5 years of HDFCBANK.NS data
async function fetchHDFCBankData() {
  const symbol = 'HDFCBANK.NS';
  const currentYear = new Date().getFullYear();

  // Get data for last 5 years
  const results = [];

  for (let i = 0; i < 5; i++) {
    const year = currentYear - i;
    console.log(`Fetching data for ${year}...`);

    // Start of year
    const startDate = Math.floor(new Date(year, 0, 1).getTime() / 1000);
    // End of year (or current time if it's the current year)
    const endDate = i === 0 ? Math.floor(Date.now() / 1000) : Math.floor(new Date(year, 11, 31, 23, 59, 59).getTime() / 1000);

    const yahooUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startDate}&period2=${endDate}&interval=1d&includePrePost=true&events=div%7Csplit%7Cearn&lang=en-US&region=US&source=cosaic`;

    try {
      const response = await fetch(yahooUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        console.error(`Failed to fetch data for ${year}: ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (data.chart?.result?.[0]) {
        const result = data.chart.result[0];
        const timestamps = result.timestamp;
        const closes = result.indicators.quote[0].close;

        // Filter out null values and get valid data points
        const validData = timestamps
          .map((timestamp, index) => {
            const close = closes[index];
            return close !== null ? { timestamp, close } : null;
          })
          .filter(Boolean);

        if (validData.length > 0) {
          // Normalize to percentage (first valid close = 100%)
          const firstClose = validData[0].close;
          const percentageData = validData.map(item => ({
            timestamp: item.timestamp,
            close: item.close,
            percentage: ((item.close - firstClose) / firstClose) * 100
          }));

          results.push({
            year,
            data: percentageData
          });

          console.log(`✅ Got ${validData.length} data points for ${year}`);
        }
      }
    } catch (error) {
      console.error(`Error fetching data for ${year}:`, error);
    }

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Save to file
  const outputPath = path.join(__dirname, 'data', 'hdfcbank-5year-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Data saved to ${outputPath}`);

  return results;
}

fetchHDFCBankData().catch(console.error);