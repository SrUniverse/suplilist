"""
Locust Load Testing Suite for SupliList

Features:
- Multiple load scenarios (normal, peak, stress)
- User behavior simulation
- Custom metrics and statistics
- Support for distributed testing
"""

import json
import random
import time
from locust import HttpUser, task, between, events, TaskSet
from locust.contrib.fasthttp import FastHttpUser
from locust.exception import StopUser, RescheduleTaskImmediately
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SupplementSearchBehavior(TaskSet):
    """Simulate supplement search behavior"""

    def on_start(self):
        self.token = None
        self.user_email = f"locust_{random.randint(1000, 99999)}@suplilist.test"
        self.user_password = "TestPassword123!@#"

    @task(40)
    def search_supplements(self):
        """Heavy read operation - supplement search"""
        queries = [
            "whey protein",
            "creatine",
            "vitamin d",
            "magnesium",
            "omega-3",
            "bcaa",
            "pre-workout",
            "multivitamin",
            "iron supplement",
            "zinc"
        ]
        query = random.choice(queries)
        limit = random.choice([10, 20, 50])

        with self.client.get(
            f"/api/supplements?search={query}&limit={limit}",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
                try:
                    data = response.json()
                    if data.get('data') and len(data['data']) > 0:
                        return data['data'][0]['id']
                except:
                    pass
            else:
                response.failure(f"Search failed with status {response.status_code}")

    @task(25)
    def get_supplement_detail(self):
        """Get supplement detail page"""
        supplement_id = f"supp_{random.randint(1, 10000)}"

        with self.client.get(
            f"/api/supplements/{supplement_id}",
            catch_response=True
        ) as response:
            if response.status_code in [200, 404]:
                response.success()
            else:
                response.failure(f"Detail page failed with status {response.status_code}")

    @task(20)
    def user_authentication(self):
        """Authenticate user"""
        with self.client.post(
            "/api/auth/login",
            json={
                "email": self.user_email,
                "password": self.user_password
            },
            catch_response=True
        ) as response:
            if response.status_code in [200, 201]:
                try:
                    data = response.json()
                    self.token = (
                        data.get('data', {}).get('token') or
                        data.get('token') or
                        data.get('accessToken')
                    )
                    response.success()
                except:
                    response.failure("Failed to parse auth response")
            else:
                response.failure(f"Auth failed with status {response.status_code}")

    @task(10)
    def get_user_profile(self):
        """Get authenticated user profile"""
        if not self.token:
            self.user_authentication()

        if self.token:
            with self.client.get(
                "/api/profile",
                headers={"Authorization": f"Bearer {self.token}"},
                catch_response=True
            ) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Profile fetch failed: {response.status_code}")

    @task(15)
    def get_user_stack(self):
        """Get user's supplement stack"""
        if not self.token:
            self.user_authentication()

        if self.token:
            with self.client.get(
                "/api/stack",
                headers={"Authorization": f"Bearer {self.token}"},
                catch_response=True
            ) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Stack fetch failed: {response.status_code}")

    @task(12)
    def add_to_stack(self):
        """Add supplement to user's stack"""
        if not self.token:
            self.user_authentication()

        if self.token:
            with self.client.post(
                "/api/stack",
                json={
                    "supplementId": f"supp_{random.randint(1, 5000)}",
                    "quantity": random.randint(1, 5),
                    "unit": random.choice(["mg", "g", "ml"])
                },
                headers={"Authorization": f"Bearer {self.token}"},
                catch_response=True
            ) as response:
                if response.status_code in [200, 201]:
                    response.success()
                else:
                    response.failure(f"Add to stack failed: {response.status_code}")

    @task(10)
    def get_favorites(self):
        """Get user's favorite supplements"""
        if not self.token:
            self.user_authentication()

        if self.token:
            with self.client.get(
                "/api/favorites",
                headers={"Authorization": f"Bearer {self.token}"},
                catch_response=True
            ) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Favorites fetch failed: {response.status_code}")

    @task(8)
    def add_favorite(self):
        """Add supplement to favorites"""
        if not self.token:
            self.user_authentication()

        if self.token:
            with self.client.post(
                "/api/favorites",
                json={"supplementId": f"supp_{random.randint(1, 5000)}"},
                headers={"Authorization": f"Bearer {self.token}"},
                catch_response=True
            ) as response:
                if response.status_code in [200, 201]:
                    response.success()
                else:
                    response.failure(f"Add favorite failed: {response.status_code}")

    @task(5)
    def update_profile(self):
        """Update user profile"""
        if not self.token:
            self.user_authentication()

        if self.token:
            with self.client.put(
                "/api/profile",
                json={
                    "firstName": f"LoadTest_{random.randint(1, 1000)}",
                    "bio": "Testing SupliList",
                },
                headers={"Authorization": f"Bearer {self.token}"},
                catch_response=True
            ) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Profile update failed: {response.status_code}")


class NormalLoadUser(FastHttpUser):
    """Simulates normal user behavior - 100 concurrent users"""
    wait_time = between(1, 3)
    tasks = [SupplementSearchBehavior]


class PeakLoadUser(FastHttpUser):
    """Simulates peak load - 1000 concurrent users"""
    wait_time = between(0.5, 2)
    tasks = [SupplementSearchBehavior]


class StressTestUser(FastHttpUser):
    """Simulates stress conditions - 5000+ concurrent users"""
    wait_time = between(0.1, 1)
    tasks = [SupplementSearchBehavior]


# Event handlers for metrics collection
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when test starts"""
    logger.info("=" * 60)
    logger.info(f"Load test started at {datetime.now()}")
    logger.info(f"Target: {environment.host}")
    logger.info("=" * 60)


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when test stops"""
    logger.info("=" * 60)
    logger.info(f"Load test stopped at {datetime.now()}")
    logger.info("Generating final statistics...")
    logger.info("=" * 60)

    # Print response time statistics
    logger.info("\nResponse Time Statistics (ms):")
    logger.info(f"  Min: {environment.stats.total.min_response_time:.2f}")
    logger.info(f"  Max: {environment.stats.total.max_response_time:.2f}")
    logger.info(f"  Avg: {environment.stats.total.avg_response_time:.2f}")
    logger.info(f"  Median: {environment.stats.total.get_response_time_percentile(0.5):.2f}")
    logger.info(f"  p95: {environment.stats.total.get_response_time_percentile(0.95):.2f}")
    logger.info(f"  p99: {environment.stats.total.get_response_time_percentile(0.99):.2f}")

    # Print error statistics
    logger.info("\nError Statistics:")
    logger.info(f"  Total requests: {environment.stats.total.num_requests}")
    logger.info(f"  Failed requests: {environment.stats.total.num_failures}")
    logger.info(f"  Failure rate: {(environment.stats.total.num_failures / environment.stats.total.num_requests * 100) if environment.stats.total.num_requests > 0 else 0:.2f}%")

    # Print request distribution
    logger.info("\nRequest Distribution:")
    for endpoint in sorted(environment.stats.entries.keys()):
        stats = environment.stats.entries[endpoint]
        if stats.num_requests > 0:
            error_pct = (stats.num_failures / stats.num_requests * 100) if stats.num_requests > 0 else 0
            logger.info(
                f"  {endpoint}: "
                f"{stats.num_requests} requests, "
                f"avg {stats.avg_response_time:.2f}ms, "
                f"{error_pct:.2f}% errors"
            )


@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, **kwargs):
    """Called for each request"""
    if exception:
        logger.debug(f"Request failed: {name} - {exception}")
    else:
        logger.debug(f"Request: {name} - {response_time:.2f}ms")
