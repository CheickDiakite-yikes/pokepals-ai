import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message: string;
}

const results: TestResult[] = [];

async function runTests() {
  console.log('🧪 Starting Card Save Integration Tests...\n');

  // Test 1: Sign up a test user
  let userId: string;
  let sessionCookie: string;
  
  try {
    const signupRes = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test${Date.now()}@pokepals.com`,
        password: 'TestPass123!',
        trainerName: 'Test Trainer',
      }),
    });
    
    const setCookie = signupRes.headers.get('set-cookie');
    if (setCookie) {
      sessionCookie = setCookie.split(';')[0];
    }
    
    if (!signupRes.ok) {
      const error = await signupRes.json();
      throw new Error(error.message);
    }
    
    const userData = await signupRes.json();
    userId = userData.id;
    
    results.push({
      test: 'User Signup',
      status: 'PASS',
      message: `Created user ${userId}`,
    });
  } catch (error: any) {
    results.push({
      test: 'User Signup',
      status: 'FAIL',
      message: error.message,
    });
    printResults();
    return;
  }

  // Test 2: Create a card with all required fields
  try {
    const cardPayload = {
      originalImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      pokemonImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      cardBackImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      stats: JSON.stringify({
        name: 'Test Mon',
        type: 'Digital',
        hp: 100,
        attack: 50,
        defense: 50,
        description: 'A test Pokemon for integration testing',
        moves: ['Test Attack', 'Debug Mode'],
        weakness: 'Bugs',
        rarity: 'Common',
      }),
      isPublic: false,
      timestamp: Date.now(),
    };

    const createRes = await fetch(`${API_BASE}/api/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie,
      },
      body: JSON.stringify(cardPayload),
    });

    if (!createRes.ok) {
      const error = await createRes.json();
      throw new Error(error.message || 'Failed to create card');
    }

    const card = await createRes.json();
    
    if (!card.id || !card.name || !card.pokemonImageUrl) {
      throw new Error('Card missing required fields');
    }
    
    results.push({
      test: 'Create Card',
      status: 'PASS',
      message: `Created card ${card.id} - ${card.name}`,
    });
  } catch (error: any) {
    results.push({
      test: 'Create Card',
      status: 'FAIL',
      message: error.message,
    });
  }

  // Test 3: Retrieve user cards
  try {
    const getRes = await fetch(`${API_BASE}/api/cards`, {
      method: 'GET',
      headers: {
        'Cookie': sessionCookie,
      },
    });

    if (!getRes.ok) {
      throw new Error('Failed to fetch cards');
    }

    const cards = await getRes.json();
    
    if (!Array.isArray(cards) || cards.length === 0) {
      throw new Error('No cards returned');
    }
    
    results.push({
      test: 'Retrieve Cards',
      status: 'PASS',
      message: `Retrieved ${cards.length} card(s)`,
    });
  } catch (error: any) {
    results.push({
      test: 'Retrieve Cards',
      status: 'FAIL',
      message: error.message,
    });
  }

  // Test 4: Verify card data integrity
  try {
    const getRes = await fetch(`${API_BASE}/api/cards`, {
      method: 'GET',
      headers: {
        'Cookie': sessionCookie,
      },
    });

    const cards = await getRes.json();
    const card = cards[0];
    
    // Check top-level fields
    const requiredTopFields = ['id', 'originalImage', 'pokemonImage', 'stats', 'timestamp', 'isPublic'];
    const missingTopFields = requiredTopFields.filter(field => !(field in card));
    
    if (missingTopFields.length > 0) {
      throw new Error(`Missing top-level fields: ${missingTopFields.join(', ')}`);
    }
    
    // Check stats object fields
    const requiredStatsFields = ['name', 'type', 'hp', 'attack', 'defense', 'description', 'moves', 'weakness', 'rarity'];
    const missingStatsFields = requiredStatsFields.filter(field => !(field in card.stats));
    
    if (missingStatsFields.length > 0) {
      throw new Error(`Missing stats fields: ${missingStatsFields.join(', ')}`);
    }
    
    if (card.stats.name !== 'Test Mon') {
      throw new Error(`Expected name 'Test Mon', got '${card.stats.name}'`);
    }
    
    if (card.stats.hp !== 100) {
      throw new Error(`Expected HP 100, got ${card.stats.hp}`);
    }
    
    if (!Array.isArray(card.stats.moves) || card.stats.moves.length !== 2) {
      throw new Error(`Expected 2 moves array, got ${JSON.stringify(card.stats.moves)}`);
    }
    
    if (card.stats.rarity !== 'Common') {
      throw new Error(`Expected rarity 'Common', got '${card.stats.rarity}'`);
    }
    
    results.push({
      test: 'Data Integrity',
      status: 'PASS',
      message: 'All fields correctly stored and retrieved',
    });
  } catch (error: any) {
    results.push({
      test: 'Data Integrity',
      status: 'FAIL',
      message: error.message,
    });
  }

  printResults();
}

function printResults() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS');
  console.log('='.repeat(60) + '\n');
  
  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${result.test}`);
    console.log(`   ${result.message}\n`);
  });
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const total = results.length;
  
  console.log('='.repeat(60));
  console.log(`SUMMARY: ${passed}/${total} tests passed`);
  console.log('='.repeat(60) + '\n');
  
  if (passed === total) {
    console.log('🎉 All tests passed! Card saving is working correctly.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.\n');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
