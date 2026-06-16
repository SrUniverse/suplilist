/**
 * K6 Load Test: Stress Test Scenario (5000+ concurrent users)
 *
 * Test Objectives:
 * - Push system to breaking point
 * - Identify max capacity
 * - Find resource exhaustion points
 * - Measure graceful degradation
 * - Verify error handling under extreme load
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('stress_errors');
const responseTime = new Trend('stress_response_time');
const failureCount = new Counter('stress_failures');
const circuitBreakerTrips = new Counter('circuit_breaker_trips');

export const options = {
  stages: [
    { duration: '1m', target: 500 },    // Quick ramp
    { duration: '1m', target: 2000 },   // Get to stress level
    { duration: '2m', target: 5000 },   // Push to extreme
    { duration: '3m', target: 5000 },   // Hold at stress
    { duration: '2m', target: 0 },      // Cool down
  ],
  thresholds: {
    'http_req_duration': ['p(99)<5000', 'p(100)<10000'],
    'http_req_failed': ['rate<0.2'],
  },
  discardResponseBodies: true,
  ext: {
    loadimpact: {
      projectID: 3478460,
      name: 'SupliList Stress Test'
    }
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function setup() {
  return {
    testUsers: generateTestUsers(20)
  };
}

export default function (data) {
  const testUser = data.testUsers[__VU % data.testUsers.length];

  group('Stress Test', () => {
    // Aggressive read operations
    if (Math.random() < 0.5) {
      stressSearchOperations();
    }

    // Some write operations to stress database
    if (Math.random() < 0.3) {
      const token = authenticateUser(testUser);
      if (token) {
        stressWriteOperations(token);
      }
    }

    // Health check and edge cases
    if (Math.random() < 0.2) {
      healthCheck();
    }
  });

  sleep(Math.random() * 1);
}

function stressSearchOperations() {
  const paths = [
    '/api/supplements?search=test&limit=100',
    '/api/supplements?category=protein&limit=100',
    '/api/supplements?sort=popularity&limit=50',
    '/api/supplements/trending',
  ];

  const path = paths[Math.floor(Math.random() * paths.length)];

  const res = http.get(
    `${BASE_URL}${path}`,
    { timeout: '3s', tags: { name: 'StressSearch' } }
  );

  const ok = res.status === 200 || res.status === 304 || res.status === 429;
  errorRate.add(!ok);

  if (!ok) {
    failureCount.add(1);
    if (res.status === 503 || res.status === 429) {
      circuitBreakerTrips.add(1);
    }
  }

  responseTime.add(res.timings.duration);
}

function stressWriteOperations(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Rapid stack operations
  for (let i = 0; i < 3; i++) {
    const res = http.post(
      `${BASE_URL}/api/stack`,
      {
        supplementId: `stress_${__VU}_${i}`,
        quantity: Math.floor(Math.random() * 10) + 1,
      },
      { headers, timeout: '3s', tags: { name: 'StressWrite' } }
    );

    const ok = res.status === 200 || res.status === 201 || res.status === 429;
    errorRate.add(!ok);

    if (!ok && res.status !== 429) {
      failureCount.add(1);
    }
  }
}

function healthCheck() {
  const res = http.get(
    `${BASE_URL}/health`,
    { timeout: '2s', tags: { name: 'Health' } }
  );

  check(res, {
    'health check responds': (r) => r.status === 200 || r.status === 503,
  });

  if (res.status !== 200) {
    circuitBreakerTrips.add(1);
  }
}

function authenticateUser(user) {
  try {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      { email: user.email, password: user.password },
      { timeout: '3s', headers: { 'Content-Type': 'application/json' } }
    );

    if ((res.status === 200 || res.status === 201) && res.body) {
      try {
        const body = JSON.parse(res.body);
        return body.data?.token || body.token || body.accessToken;
      } catch (e) {
        return null;
      }
    }
  } catch (e) {
    // Timeout
  }
  return null;
}

function generateTestUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push({
      email: `stress_${i}@suplilist.test`,
      password: 'TestPassword123!@#'
    });
  }
  return users;
}

export function teardown() {
  console.log('Stress test completed');
}
