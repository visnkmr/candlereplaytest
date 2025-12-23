import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');

  if (!symbol || !fromDate || !toDate) {
    return NextResponse.json({ error: 'Missing required parameters: symbol, fromDate, toDate' }, { status: 400 });
  }

  const url = `https://www.nseindia.com/api/NextApi/apiClient/GetQuoteApi?functionName=getHistoricalTradeData&symbol=${symbol}&series=GB&fromDate=${fromDate}&toDate=${toDate}&csv=true`;
  console.log(url)
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch data from NSE' }, { status: response.status });
    }
    const jsonData = await response.json();
    console.log('Fetched data length:', jsonData.length);

    // Parse JSON data
    const data = [];
    for (const item of jsonData) {
      const dateStr = item.mtimestamp;
      const close = item.chClosingPrice;

      if (dateStr && typeof close === 'number') {
        // Parse date DD-MMM-YYYY e.g., "27-Dec-2022"
        const [dayStr, monthStr, yearStr] = dateStr.split('-');
        const day = parseInt(dayStr);
        const year = parseInt(yearStr);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames.indexOf(monthStr);

        if (month !== -1) {
          const date = new Date(year, month, day);
          const timestamp = Math.floor(date.getTime() / 1000);

          data.push({ timestamp, close });
        }
      }
    }

    // Sort by timestamp ascending
    data.sort((a, b) => a.timestamp - b.timestamp);
    console.log('Parsed data length:', data.length);

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching NSE data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}