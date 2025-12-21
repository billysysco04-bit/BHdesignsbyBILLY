import requests
import sys
import json
import os
from datetime import datetime
from pathlib import Path

class MenuGeniusAPITester:
    def __init__(self, base_url="https://foodcostpro-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)
        
        # Remove Content-Type for file uploads
        if files:
            test_headers.pop('Content-Type', None)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, data=data, headers=test_headers, timeout=60)
                else:
                    response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (expected {expected_status})"
                try:
                    error_data = response.json()
                    details += f" - {error_data.get('detail', 'No error details')}"
                except:
                    details += f" - Response: {response.text[:200]}"

            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {}
            return {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return {}

    def test_health_check(self):
        """Test health check endpoint"""
        response = self.run_test("Health Check", "GET", "health", 200)
        return response.get("status") == "healthy"

    def test_root_endpoint(self):
        """Test root API endpoint"""
        response = self.run_test("Root Endpoint", "GET", "", 200)
        return "MenuGenius" in response.get("message", "")

    def test_register_user(self):
        """Test user registration"""
        timestamp = datetime.now().strftime("%H%M%S")
        test_data = {
            "email": f"test_user_{timestamp}@example.com",
            "password": "TestPass123!",
            "name": "Test User",
            "business_name": "Test Restaurant",
            "location": "Austin, TX"
        }
        
        response = self.run_test("User Registration", "POST", "auth/register", 200, test_data)
        
        if response.get("access_token"):
            self.token = response["access_token"]
            self.user_id = response["user"]["id"]
            return True
        return False

    def test_login_user(self):
        """Test user login with existing credentials"""
        if not self.token:
            return False
            
        # Try to get user info to verify token works
        response = self.run_test("Get Current User", "GET", "auth/me", 200)
        return response.get("id") == self.user_id

    def test_get_credit_packages(self):
        """Test getting credit packages"""
        response = self.run_test("Get Credit Packages", "GET", "credits/packages", 200)
        return isinstance(response, list) and len(response) > 0

    def test_get_menus(self):
        """Test getting user menus"""
        response = self.run_test("Get User Menus", "GET", "menus", 200)
        return isinstance(response, list)

    def test_invalid_endpoints(self):
        """Test invalid endpoints return 404"""
        self.run_test("Invalid Endpoint", "GET", "nonexistent", 404)
        return True

    def test_unauthorized_access(self):
        """Test unauthorized access"""
        # Temporarily remove token
        temp_token = self.token
        self.token = None
        
        self.run_test("Unauthorized Access", "GET", "menus", 401)
        
        # Restore token
        self.token = temp_token
        return True

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting MenuGenius API Tests")
        print(f"📍 Testing: {self.base_url}")
        print("=" * 50)

        # Basic connectivity tests
        self.test_health_check()
        self.test_root_endpoint()
        
        # Authentication tests
        if self.test_register_user():
            self.test_login_user()
        
        # Protected endpoint tests (require auth)
        if self.token:
            self.test_get_credit_packages()
            self.test_get_menus()
        
        # Error handling tests
        self.test_invalid_endpoints()
        self.test_unauthorized_access()

        # Print summary
        print("=" * 50)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed")
            return 1

    def get_test_summary(self):
        """Get test summary for reporting"""
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0,
            "test_results": self.test_results
        }

def main():
    tester = MenuGeniusAPITester()
    exit_code = tester.run_all_tests()
    
    # Save detailed results
    summary = tester.get_test_summary()
    with open('/app/test_reports/backend_test_results.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    return exit_code

if __name__ == "__main__":
    sys.exit(main())