/**
 * K6 Load Test: Normal Load Scenario (100 concurrent users)
 *
 * Test Objectives:
 * - Baseline performance under normal conditions
 * - Verify API response times
 * - Check for memory leaks
 * - Validate database query performance
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const responseSize = new Trend('response_size');
const registrationTime = new Trend('registration_time');
const loginTime = new Trend('login_time');
const stackOperationTime = new Trend('stack_operation_time');
const successCount = new Counter('success_count');
const errorCount = new Counter('error_count');

// VU tracker
const activeVUs = new Gauge('active_vus');

export const options = {
  stages: [
    { duration: '2m', target: 20 },   // Warm up
    { duration: '5m', target: 100 },  // Ramp up to 100 VUs
    { duration: '5m', target: 100 },  // Stay at 100
    { duration: '2m', target: 0 },    // Cool down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000', 'p(100)<2000'],
    'http_req_failed': ['rate<0.05'],
    'errors': ['rate<0.05'],
  },
  ext: {
    loadimpact: {
      projectID: 3478460,
      name: 'SupliList Normal Load Test'
    }
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function setup() {
  // Global setup - create test users
  return {
    testUsers: generateTestUsers(5)
  };
}

export default function (data) {
  activeVUs.add(__VU);

  const testUser = data.testUsers[__VU % data.testUsers.length];

  // 1. Authentication Flows
  group('Authentication', () => {
    authenticationScenario(testUser);
  });

  // 2. Supplement Search and Browse
  group('Supplement Search', () => {
    supplementSearchScenario();
  });

  // 3. Stack Operations
  group('Stack Management', () => {
    stackOperationsScenario(testUser);
  });

  // 4. User Profile
  group('User Profile', () => {
    userProfileScenario(testUser);
  });

  // 5. Favorites Management
  group('Favorites', () => {
    favoritesScenario(testUser);
  });

  sleep(1);
}

function authenticationScenario(user) {
  // Login
  const loginRes = http.post(`${BASE_URL}/api/auth/login`,
    {
      email: user.email,
      password: user.password,
    },
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Login' }
    }
  );

  const loginChecks = check(loginRes, {
    'login status 200/201': (r) => r.status === 200 || r.status === 201,
    'login has token': (r) => r.body.includes('token') || r.body.includes('access'),
  });

  loginTime.add(loginRes.timings.duration);
  errorRate.add(!loginChecks);
  if (loginChecks) successCount.add(1);
  else errorCount.add(1);

  responseSize.add(loginRes.body.length);

  let token = null;
  try {
    const body = JSON.parse(loginRes.body);
    token = body.data?.token || body.token || body.accessToken;
  } catch (e) {
    console.log('Failed to parse login response');
  }

  if (token) {
    // Get current user
    const meRes = http.get(
      `${BASE_URL}/api/auth/me`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        tags: { name: 'Get Me' }
      }
    );

    check(meRes, {
      'me status 200': (r) => r.status === 200,
      'me has user data': (r) => r.body.includes('id') || r.body.includes('email'),
    });

    responseTime.add(meRes.timings.duration);
    responseSize.add(meRes.body.length);
  }
}

function supplementSearchScenario() {
  const queries = [
    'whey protein',
    'creatine',
    'vitamin d',
    'magnesium',
    'omega-3',
    'bcaa',
    'pre-workout'
  ];

  const query = queries[Math.floor(Math.random() * queries.length)];

  // Search supplements
  const searchRes = http.get(
    `${BASE_URL}/api/supplements?search=${encodeURIComponent(query)}&limit=20`,
    {
      tags: { name: 'Search Supplements' }
    }
  );

  const searchChecks = check(searchRes, {
    'search status 200': (r) => r.status === 200,
    'search has results': (r) => r.body.includes('data') || r.body.includes('id'),
  });

  responseTime.add(searchRes.timings.duration);
  responseSize.add(searchRes.body.length);
  errorRate.add(!searchChecks);

  // Get supplement details
  if (searchRes.status === 200) {
    try {
      const body = JSON.parse(searchRes.body);
      const supplements = body.data || [];
      if (supplements.length > 0) {
        const supplement = supplements[0];
        const detailRes = http.get(
          `${BASE_URL}/api/supplements/${supplement.id}`,
          { tags: { name: 'Get Supplement' } }
        );

        check(detailRes, {
          'detail status 200': (r) => r.status === 200,
        });

        responseTime.add(detailRes.timings.duration);
      }
    } catch (e) {
      console.log('Failed to parse search response');
    }
  }
}

function stackOperationsScenario(user) {
  // This requires authentication
  const loginRes = http.post(`${BASE_URL}/api/auth/login`,
    {
      email: user.email,
      password: user.password,
    },
    { headers: { 'Content-Type': 'application/json' } }
  );

  let token = null;
  try {
    const body = JSON.parse(loginRes.body);
    token = body.data?.token || body.token || body.accessToken;
  } catch (e) {
    return;
  }

  if (!token) return;

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Get current stack
  const getStackRes = http.get(
    `${BASE_URL}/api/stack`,
    { headers, tags: { name: 'Get Stack' } }
  );

  check(getStackRes, {
    'get stack status 200': (r) => r.status === 200,
  });

  responseTime.add(getStackRes.timings.duration);

  // Add item to stack
  const addItemRes = http.post(
    `${BASE_URL}/api/stack`,
    {
      supplementId: `supplement_${Math.floor(Math.random() * 1000)}`,
      quantity: Math.floor(Math.random() * 3) + 1,
      unit: 'mg',
    },
    { headers, tags: { name: 'Add Stack Item' } }
  );

  const addChecks = check(addItemRes, {
    'add item status 200/201': (r) => r.status === 200 || r.status === 201,
  });

  stackOperationTime.add(addItemRes.timings.duration);
  errorRate.add(!addChecks);
}

function userProfileScenario(user) {
  const loginRes = http.post(`${BASE_URL}/api/auth/login`,
    {
      email: user.email,
      password: user.password,
    },
    { headers: { 'Content-Type': 'application/json' } }
  );

  let token = null;
  try {
    const body = JSON.parse(loginRes.body);
    token = body.data?.token || body.token || body.accessToken;
  } catch (e) {
    return;
  }

  if (!token) return;

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Get profile
  const profileRes = http.get(
    `${BASE_URL}/api/profile`,
    { headers, tags: { name: 'Get Profile' } }
  );

  check(profileRes, {
    'profile status 200': (r) => r.status === 200,
  });

  responseTime.add(profileRes.timings.duration);

  // Update profile
  const updateRes = http.put(
    `${BASE_URL}/api/profile`,
    {
      firstName: `User_${__VU}`,
      lastName: 'Test',
      bio: 'Fitness enthusiast',
    },
    { headers, tags: { name: 'Update Profile' } }
  );

  check(updateRes, {
    'update profile status 200': (r) => r.status === 200,
  });

  responseTime.add(updateRes.timings.duration);
}

function favoritesScenario(user) {
  const loginRes = http.post(`${BASE_URL}/api/auth/login`,
    {
      email: user.email,
      password: user.password,
    },
    { headers: { 'Content-Type': 'application/json' } }
  );

  let token = null;
  try {
    const body = JSON.parse(loginRes.body);
    token = body.data?.token || body.token || body.accessToken;
  } catch (e) {
    return;
  }

  if (!token) return;

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Add to favorites
  const supplementId = `supplement_${Math.floor(Math.random() * 1000)}`;
  const addFavRes = http.post(
    `${BASE_URL}/api/favorites`,
    { supplementId },
    { headers, tags: { name: 'Add Favorite' } }
  );

  check(addFavRes, {
    'add favorite status 200/201': (r) => r.status === 200 || r.status === 201,
  });

  responseTime.add(addFavRes.timings.duration);

  // Get favorites list
  const listRes = http.get(
    `${BASE_URL}/api/favorites`,
    { headers, tags: { name: 'Get Favorites' } }
  );

  check(listRes, {
    'list favorites status 200': (r) => r.status === 200,
  });

  responseTime.add(listRes.timings.duration);
}

function generateTestUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push({
      email: `loadtest_${i}@suplilist.test`,
      password: 'TestPassword123!@#',
      firstName: `LoadTest${i}`,
      lastName: 'User'
    });
  }
  return users;
}

export function teardown(data) {
  // Cleanup after test
  console.log('Load test completed');
}
