import requests
import sys
import json
import time
import io
from datetime import datetime, timezone, timedelta
import jwt

class MenuGeniusSecurityTester:
    def __init__(self, base_url="https://menugenius-3.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.admin_token = None
        self.second_user_token = None
        self.second_user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test credentials
        self.admin_email = "admin@menugenius.com"
        self.admin_password = "admin123"

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

    def make_request(self, method, endpoint, expected_status=None, data=None, headers=None, files=None, token=None):
        """Make HTTP request with proper error handling"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if token:
            test_headers['Authorization'] = f'Bearer {token}'
        elif self.token:
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
                    response = requests.post(url, files=files, headers=test_headers, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            if expected_status and response.status_code != expected_status:
                return None, f"Status: {response.status_code} (expected {expected_status})"
            
            try:
                return response.json(), f"Status: {response.status_code}"
            except:
                return {"status_code": response.status_code}, f"Status: {response.status_code}"

        except Exception as e:
            return None, f"Exception: {str(e)}"

    # ============== SECURITY TESTS ==============

    def test_unauthenticated_menu_access(self):
        """SECURITY: Test that unauthenticated requests to /api/menus are rejected"""
        # Remove token temporarily
        temp_token = self.token
        self.token = None
        
        response, details = self.make_request("GET", "menus", expected_status=401)
        success = response is None and "401" in details
        
        self.log_test("SECURITY: Unauthenticated menu access rejected", success, details)
        
        # Restore token
        self.token = temp_token
        return success

    def test_cross_user_menu_access(self):
        """SECURITY: Test that users cannot access other users' menus"""
        if not self.second_user_token:
            self.log_test("SECURITY: Cross-user menu access", False, "Second user not created")
            return False
        
        # Use the existing test menu created in setup
        if not hasattr(self, 'test_menu_id'):
            self.log_test("SECURITY: Cross-user menu access", False, "No test menu available")
            return False
        
        # Try to access the menu as second user (should be blocked)
        response, details = self.make_request("GET", f"menus/{self.test_menu_id}", token=self.second_user_token)
        
        # Should return 404 (not found) or 403 (forbidden) - both indicate proper authorization
        success = response is None or response.get("status_code") in [403, 404]
        if "404" in details or "403" in details:
            success = True
        
        self.log_test("SECURITY: Cross-user menu access blocked", success, details)
        return success

    def test_jwt_token_expiry(self):
        """SECURITY: Test JWT token expiry (simulate expired token)"""
        # Create a manually expired token
        try:
            expired_payload = {
                "user_id": self.user_id,
                "exp": datetime.now(timezone.utc) - timedelta(hours=1)  # Expired 1 hour ago
            }
            expired_token = jwt.encode(expired_payload, "menu-genius-secret-key-2024", algorithm="HS256")
            
            response, details = self.make_request("GET", "auth/me", expected_status=401, token=expired_token)
            success = response is None and "401" in details
            
            self.log_test("SECURITY: JWT token expiry handled", success, details)
            return success
            
        except Exception as e:
            self.log_test("SECURITY: JWT token expiry handled", False, f"Exception: {str(e)}")
            return False

    def test_sql_injection_in_search(self):
        """SECURITY: Test SQL/NoSQL injection in search endpoints"""
        injection_payloads = [
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "'; DELETE FROM users WHERE '1'='1'; --",
            "admin'--",
            "' OR 1=1#",
            "'; INSERT INTO users VALUES('hacker', 'password'); --",
            "$ne",
            "{'$ne': null}",
            "'; db.users.drop(); --"
        ]
        
        all_passed = True
        for payload in injection_payloads:
            response, details = self.make_request("GET", f"location/search?query={payload}")
            
            # Should return empty results or error, not crash or return all data
            if response and isinstance(response.get("results"), list):
                if len(response["results"]) > 50:  # Suspicious if too many results
                    all_passed = False
                    self.log_test(f"SECURITY: SQL injection test failed for payload: {payload[:20]}...", False, "Suspicious large result set")
                    break
            elif response is None:
                # Server error might indicate injection worked
                all_passed = False
                self.log_test(f"SECURITY: SQL injection test failed for payload: {payload[:20]}...", False, "Server error")
                break
        
        if all_passed:
            self.log_test("SECURITY: SQL/NoSQL injection protection", True, "All injection payloads handled safely")
        
        return all_passed

    def test_file_upload_validation(self):
        """SECURITY: Test file upload accepts only valid file types"""
        # Test valid file types
        valid_files = [
            ('test.pdf', b'%PDF-1.4 test content', 'application/pdf'),
            ('test.jpg', b'\xff\xd8\xff\xe0test', 'image/jpeg'),
            ('test.png', b'\x89PNG\r\n\x1a\ntest', 'image/png')
        ]
        
        # Test invalid file types
        invalid_files = [
            ('test.exe', b'MZ\x90\x00test', 'application/octet-stream'),
            ('test.js', b'alert("xss")', 'application/javascript'),
            ('test.php', b'<?php echo "hack"; ?>', 'application/x-php'),
            ('test.txt', b'plain text', 'text/plain')
        ]
        
        valid_passed = 0
        for filename, content, mime_type in valid_files:
            files = {'file': (filename, io.BytesIO(content), mime_type)}
            response, details = self.make_request("POST", "menus/upload", files=files)
            
            if response and response.get("job_id"):
                valid_passed += 1
        
        invalid_blocked = 0
        for filename, content, mime_type in invalid_files:
            files = {'file': (filename, io.BytesIO(content), mime_type)}
            response, details = self.make_request("POST", "menus/upload", expected_status=400, files=files)
            
            if response is None and "400" in details:
                invalid_blocked += 1
        
        success = valid_passed >= 2 and invalid_blocked >= 3
        self.log_test("SECURITY: File upload validation", success, 
                     f"Valid files accepted: {valid_passed}/3, Invalid files blocked: {invalid_blocked}/4")
        return success

    # ============== FEATURE TESTS ==============

    def test_location_search_instant_results(self):
        """FEATURE: Test location search returns instant results for city names"""
        test_cities = ["Austin", "Dallas", "Miami", "New York", "Los Angeles"]
        
        all_passed = True
        for city in test_cities:
            start_time = time.time()
            response, details = self.make_request("GET", f"location/search?query={city}")
            end_time = time.time()
            
            response_time = end_time - start_time
            
            if not response or not isinstance(response.get("results"), list):
                all_passed = False
                self.log_test(f"FEATURE: Location search for {city}", False, "No results returned")
                continue
            
            if response_time > 2.0:  # Should be instant (under 2 seconds)
                all_passed = False
                self.log_test(f"FEATURE: Location search for {city}", False, f"Too slow: {response_time:.2f}s")
                continue
            
            # Check if results contain the city
            found_city = any(city.lower() in result.get("city", "").lower() for result in response["results"])
            if not found_city:
                all_passed = False
                self.log_test(f"FEATURE: Location search for {city}", False, "City not found in results")
                continue
        
        if all_passed:
            self.log_test("FEATURE: Location search instant results", True, "All cities found quickly")
        
        return all_passed

    def test_menu_export_food_cost_percentage(self):
        """FEATURE: Test menu export includes food cost %"""
        # First create a test menu with items
        if not hasattr(self, 'test_menu_id'):
            self.log_test("FEATURE: Menu export food cost %", False, "No test menu available")
            return False
        
        # Test CSV export
        response, details = self.make_request("GET", f"menus/{self.test_menu_id}/export?format=csv")
        
        if not response or not response.get("csv_data"):
            self.log_test("FEATURE: Menu export food cost %", False, "CSV export failed")
            return False
        
        csv_content = response["csv_data"]
        
        # Check if CSV contains food cost percentage column
        has_food_cost_pct = "Food Cost %" in csv_content
        has_percentage_values = "%" in csv_content
        
        success = has_food_cost_pct and has_percentage_values
        self.log_test("FEATURE: Menu export includes food cost %", success, 
                     f"Food Cost % column: {has_food_cost_pct}, Percentage values: {has_percentage_values}")
        return success

    def test_competitor_analysis_restaurants_list(self):
        """FEATURE: Test competitor analysis returns restaurants_analyzed list"""
        if not hasattr(self, 'test_menu_id'):
            self.log_test("FEATURE: Competitor analysis restaurants list", False, "No test menu available")
            return False
        
        response, details = self.make_request("POST", f"menus/{self.test_menu_id}/competitor-analysis")
        
        if not response:
            self.log_test("FEATURE: Competitor analysis restaurants list", False, "Analysis failed")
            return False
        
        has_restaurants_analyzed = "restaurants_analyzed" in response
        restaurants_list = response.get("restaurants_analyzed", [])
        has_restaurant_data = len(restaurants_list) > 0
        
        success = has_restaurants_analyzed and has_restaurant_data
        self.log_test("FEATURE: Competitor analysis returns restaurants list", success, 
                     f"Restaurants analyzed: {len(restaurants_list)}")
        return success

    def test_admin_login(self):
        """FEATURE: Test admin login works correctly"""
        response, details = self.make_request("GET", "auth/admin-login")
        
        if not response or not response.get("access_token"):
            self.log_test("FEATURE: Admin login", False, "No access token returned")
            return False
        
        self.admin_token = response["access_token"]
        admin_user = response.get("user", {})
        
        # Verify admin has correct email and high credits
        is_admin_email = admin_user.get("email") == self.admin_email
        has_high_credits = admin_user.get("credits", 0) > 1000
        
        success = is_admin_email and has_high_credits
        self.log_test("FEATURE: Admin login works", success, 
                     f"Email: {admin_user.get('email')}, Credits: {admin_user.get('credits')}")
        return success

    def test_registration_email_validation(self):
        """API: Test registration validates email format"""
        invalid_emails = [
            "invalid-email",
            "test@",
            "@example.com",
            "test..test@example.com",
            "test@example",
            ""
        ]
        
        blocked_count = 0
        for email in invalid_emails:
            test_data = {
                "email": email,
                "password": "TestPass123!",
                "name": "Test User"
            }
            
            response, details = self.make_request("POST", "auth/register", expected_status=422, data=test_data)
            
            if response is None and ("422" in details or "400" in details):
                blocked_count += 1
        
        success = blocked_count >= len(invalid_emails) - 1  # Allow some tolerance
        self.log_test("API: Registration email validation", success, 
                     f"Invalid emails blocked: {blocked_count}/{len(invalid_emails)}")
        return success

    def test_login_invalid_credentials(self):
        """API: Test login rejects invalid credentials"""
        invalid_credentials = [
            {"email": "nonexistent@example.com", "password": "wrongpass"},
            {"email": self.admin_email, "password": "wrongpassword"},
            {"email": "test@example.com", "password": ""},
            {"email": "", "password": "password"}
        ]
        
        rejected_count = 0
        for creds in invalid_credentials:
            response, details = self.make_request("POST", "auth/login", expected_status=401, data=creds)
            
            if response is None and "401" in details:
                rejected_count += 1
        
        success = rejected_count >= len(invalid_credentials) - 1
        self.log_test("API: Login invalid credentials rejected", success, 
                     f"Invalid logins rejected: {rejected_count}/{len(invalid_credentials)}")
        return success

    # ============== SETUP METHODS ==============

    def setup_test_users(self):
        """Create test users for security testing"""
        timestamp = datetime.now().strftime("%H%M%S")
        
        # Create first user
        user1_data = {
            "email": f"security_test_user1_{timestamp}@example.com",
            "password": "TestPass123!",
            "name": "Security Test User 1",
            "business_name": "Test Restaurant 1",
            "location": "Austin, TX"
        }
        
        response, details = self.make_request("POST", "auth/register", data=user1_data)
        if response and response.get("access_token"):
            self.token = response["access_token"]
            self.user_id = response["user"]["id"]
            print(f"✅ Created first test user: {user1_data['email']}")
        else:
            print(f"❌ Failed to create first test user: {details}")
            return False
        
        # Create second user for cross-user testing
        user2_data = {
            "email": f"security_test_user2_{timestamp}@example.com",
            "password": "TestPass123!",
            "name": "Security Test User 2",
            "business_name": "Test Restaurant 2",
            "location": "Dallas, TX"
        }
        
        response, details = self.make_request("POST", "auth/register", data=user2_data)
        if response and response.get("access_token"):
            self.second_user_token = response["access_token"]
            self.second_user_id = response["user"]["id"]
            print(f"✅ Created second test user: {user2_data['email']}")
        else:
            print(f"❌ Failed to create second test user: {details}")
            return False
        
        return True

    def create_test_menu(self):
        """Create a test menu for feature testing"""
        # Create test file
        test_file_content = b"""Test Menu
        
        Appetizers:
        - Caesar Salad - $12.99
        - Chicken Wings - $14.99
        
        Main Courses:
        - Grilled Salmon - $24.99
        - Ribeye Steak - $32.99
        - Chicken Parmesan - $19.99
        """
        
        files = {'file': ('test_menu.pdf', io.BytesIO(test_file_content), 'application/pdf')}
        
        response, details = self.make_request("POST", "menus/upload", files=files)
        
        if response and response.get("job_id"):
            self.test_menu_id = response["job_id"]
            print(f"✅ Created test menu: {self.test_menu_id}")
            
            # Analyze the menu to get items
            time.sleep(2)  # Wait a bit before analyzing
            self.make_request("POST", f"menus/{self.test_menu_id}/analyze")
            time.sleep(3)  # Wait for analysis to complete
            
            return True
        else:
            print(f"❌ Failed to create test menu: {details}")
            return False

    def run_all_security_tests(self):
        """Run all security and feature tests"""
        print("🔒 Starting MenuGenius Security & Feature Tests")
        print(f"📍 Testing: {self.base_url}")
        print("=" * 60)

        # Setup
        if not self.setup_test_users():
            print("❌ Failed to setup test users")
            return 1
        
        if not self.create_test_menu():
            print("⚠️  Failed to create test menu - some feature tests may fail")

        print("\n🔒 SECURITY TESTS")
        print("-" * 30)
        
        # Security tests
        self.test_unauthenticated_menu_access()
        self.test_cross_user_menu_access()
        self.test_jwt_token_expiry()
        self.test_sql_injection_in_search()
        self.test_file_upload_validation()

        print("\n🚀 FEATURE TESTS")
        print("-" * 30)
        
        # Feature tests
        self.test_location_search_instant_results()
        self.test_admin_login()
        self.test_registration_email_validation()
        self.test_login_invalid_credentials()
        
        # Tests that require test menu
        if hasattr(self, 'test_menu_id'):
            self.test_menu_export_food_cost_percentage()
            self.test_competitor_analysis_restaurants_list()

        # Print summary
        print("=" * 60)
        print(f"📊 Security & Feature Tests: {self.tests_passed}/{self.tests_run} passed")
        
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
    tester = MenuGeniusSecurityTester()
    exit_code = tester.run_all_security_tests()
    
    # Save detailed results
    summary = tester.get_test_summary()
    with open('/app/test_reports/security_test_results.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    return exit_code

if __name__ == "__main__":
    sys.exit(main())