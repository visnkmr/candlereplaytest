// Simple test to verify localStorage functionality
// This can be run in the browser console

// Test data
const testData = {
  jsonData: '{"test": "data"}',
  parsedData: [{ timestamp: 1234567890, open: 100, high: 110, low: 90, close: 105, volume: 1000 }],
  replayData: [{ timestamp: 1234567890, open: 100, high: 110, low: 90, close: 105, volume: 1000 }],
  replayIndex: 5,
  isReplaying: true,
  isPaused: false,
  transactions: [{ type: 'buy', price: 100, quantity: 10, timestamp: 1234567890, index: 0 }],
  currentPosition: { quantity: 10, avgPrice: 100 },
  quantity: 5,
  symbol: 'TEST',
  interval: '1m',
  timePeriod: '1d'
};

// Save test data
Object.keys(testData).forEach(key => {
  const storageKey = `candlestick_${key}`;
  localStorage.setItem(storageKey, JSON.stringify(testData[key]));
});

console.log('Test data saved to localStorage');

// Verify data was saved
Object.keys(testData).forEach(key => {
  const storageKey = `candlestick_${key}`;
  const saved = localStorage.getItem(storageKey);
  console.log(`${key}:`, saved ? JSON.parse(saved) : 'Not found');
});

console.log('LocalStorage test completed');