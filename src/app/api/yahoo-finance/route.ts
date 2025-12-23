import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const period1 = searchParams.get('period1');
  const period2 = searchParams.get('period2');
  const interval = searchParams.get('interval');

  if (!symbol || !period1 || !period2 || !interval) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    const yahooUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=${interval}&includePrePost=true&events=div%7Csplit%7Cearn&lang=en-US&region=US&source=cosaic`;

    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch data from Yahoo Finance' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching Yahoo Finance data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}