/**
 * K6 Load Test: Peak Load Scenario (1000 concurrent users)
 *
 * Test Objectives:
 * - Test system under peak load conditions
 * - Identify bottlenecks at scale
 * - Measure response time degradation
 * - Verify database connection pool adequacy
 * - Check for deadlocks or race conditions
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const peakLoadErrorRate = new Rate('peak_error_rate');
const timeoutCount = new Counter('timeouts');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Warm up
    { duration: '2m', target: 500 },   // Ramp to 500
    { duration: '3m', target: 1000 },  // Ramp to 1000
    { duration: '5m', target: 1000 },  // Stay at 1000 peak
    { duration: '3m', target: 0 },     // Cool down
  ],
  thresholds: {
    'http_req_duration': ['p(99)<2000', 'p(100)<5000'],
    'http_req_failed': ['rate<0.1'],
    'errors': ['rate<0.1'],
  },
  discardResponseBodies: true,
  ext: {
    loadimpact: {
      projectID: 3478460,
      name: 'SupliList Peak Load Test'
    }
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function setup() {
  return {
    testUsers: generateTestUsers(10)
  };
}

export default function (data) {
  const testUser = data.testUsers[__VU % data.testUsers.length];

  group('Peak Load - Mixed Operations', () => {
    // Heavy supplement search - most common operation
    if (Math.random() < 0.4) {
      const queries = ['whey', 'creatine', 'vitamin', 'magnesium', 'bcaa'];
      const query = queries[Math.floor(Math.random() * queries.length)];

      const res = http.get(
        `${BASE_URL}/api/supplements?search=${encodeURIComponent(query)}&limit=50`,
        { timeout: '10s', tags: { name: 'Search' } }
      );

      const ok = check(res, {
        'search status ok': (r) => r.status === 200 || r.status === 304,
      });

      errorRate.add(!ok);
      peakLoadErrorRate.add(!ok);
      if (!ok && res.timings.duration > 10000) {
        timeoutCount.add(1);
      }
    }

    // Authenticated operations
    if (Math.random() < 0.3) {
      const token = authenticateUser(testUser);
      if (token) {
        stackOperations(token);
      }
    }

    // Read-heavy operations
    if (Math.random() < 0.3) {
      browseSupplement();
    }
  });

  sleep(Math.random() * 2);
}

function authenticateUser(user) {
  try {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      {
        email: user.email,
        password: user.password,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: '5s',
        tags: { name: 'Login' }
      }
    );

    if (res.status === 200 || res.status === 201) {
      const body = JSON.parse(res.body);
      return body.data?.token || body.token || body.accessToken;
    }
  } catch (e) {
    // Timeout or parse error
    timeoutCount.add(1);
  }
  return null;
}

function stackOperations(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Get stack
  const getRes = http.get(
    `${BASE_URL}/api/stack`,
    { headers, timeout: '5s', tags: { name: 'GetStack' } }
  );

  check(getRes, {
    'get stack status ok': (r) => r.status === 200,
  });

  responseTime.add(getRes.timings.duration);

  // Add item (write operation)
  if (Math.random() < 0.5) {
    const addRes = http.post(
      `${BASE_URL}/api/stack`,
      {
        supplementId: `supp_${Math.floor(Math.random() * 10000)}`,
        quantity: Math.floor(Math.random() * 5) + 1,
      },
      { headers, timeout: '5s', tags: { name: 'AddStack' } }
    );

    const ok = check(addRes, {
      'add to stack status ok': (r) => r.status === 200 || r.status === 201,
    });

    errorRate.add(!ok);
  }
}

function browseSupplement() {
  const supplementId = `supp_${Math.floor(Math.random() * 10000)}`;
  const res = http.get(
    `${BASE_URL}/api/supplements/${supplementId}`,
    { timeout: '5s', tags: { name: 'DetailPage' } }
  );

  responseTime.add(res.timings.duration);
  const ok = res.status === 200 || res.status === 404;
  errorRate.add(!ok);
}

function generateTestUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push({
      email: `peak_${i}@suplilist.test`,
      password: 'TestPassword123!@#'
    });
  }
  return users;
}

export function teardown() {
  console.log('Peak load test completed');
}
