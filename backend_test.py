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
        
        if isinstance(response, list) and len(response) > 0:
            # Verify expected packages exist
            package_ids = [pkg.get('id') for pkg in response]
            expected_packages = ['starter', 'professional', 'enterprise']
            
            for expected in expected_packages:
                if expected not in package_ids:
                    self.log_test("Credit Package Validation", False, f"Missing package: {expected}")
                    return False
            
            # Verify package structure
            for pkg in response:
                required_fields = ['id', 'name', 'credits', 'price']
                for field in required_fields:
                    if field not in pkg:
                        self.log_test("Credit Package Structure", False, f"Missing field: {field}")
                        return False
            
            self.log_test("Credit Package Validation", True, f"Found {len(response)} packages with correct structure")
            return True
        
        return False

    def test_get_subscription_plans(self):
        """Test getting subscription plans"""
        response = self.run_test("Get Subscription Plans", "GET", "subscriptions/plans", 200)
        
        if isinstance(response, list) and len(response) > 0:
            # Verify expected plans exist
            plan_ids = [plan.get('id') for plan in response]
            expected_plans = ['basic', 'pro', 'business']
            
            for expected in expected_plans:
                if expected not in plan_ids:
                    self.log_test("Subscription Plan Validation", False, f"Missing plan: {expected}")
                    return False
            
            # Verify plan structure
            for plan in response:
                required_fields = ['id', 'name', 'credits_per_month', 'price_per_month', 'features']
                for field in required_fields:
                    if field not in plan:
                        self.log_test("Subscription Plan Structure", False, f"Missing field: {field}")
                        return False
            
            self.log_test("Subscription Plan Validation", True, f"Found {len(response)} plans with correct structure")
            return True
        
        return False

    def test_credit_checkout(self):
        """Test credit checkout session creation"""
        if not self.token:
            self.log_test("Credit Checkout", False, "No authentication token")
            return False
        
        # Test with starter package
        response = self.run_test(
            "Credit Checkout Session", 
            "POST", 
            "credits/checkout?package_id=starter", 
            200
        )
        
        if response and 'checkout_url' in response and 'session_id' in response:
            # Verify checkout URL is from Stripe
            checkout_url = response['checkout_url']
            if 'checkout.stripe.com' in checkout_url:
                self.log_test("Credit Checkout URL Validation", True, "Valid Stripe checkout URL")
                return True
            else:
                self.log_test("Credit Checkout URL Validation", False, f"Invalid checkout URL: {checkout_url}")
                return False
        
        return False

    def test_subscription_checkout(self):
        """Test subscription checkout session creation"""
        if not self.token:
            self.log_test("Subscription Checkout", False, "No authentication token")
            return False
        
        # Test with basic plan
        response = self.run_test(
            "Subscription Checkout Session", 
            "POST", 
            "subscriptions/checkout?plan_id=basic", 
            200
        )
        
        if response and 'checkout_url' in response and 'session_id' in response:
            # Verify checkout URL is from Stripe
            checkout_url = response['checkout_url']
            if 'checkout.stripe.com' in checkout_url:
                self.log_test("Subscription Checkout URL Validation", True, "Valid Stripe checkout URL")
                return True
            else:
                self.log_test("Subscription Checkout URL Validation", False, f"Invalid checkout URL: {checkout_url}")
                return False
        
        return False

    def test_invalid_package_checkout(self):
        """Test checkout with invalid package ID"""
        if not self.token:
            return False
        
        self.run_test(
            "Invalid Package Checkout", 
            "POST", 
            "credits/checkout?package_id=invalid", 
            400
        )
        return True

    def test_invalid_plan_checkout(self):
        """Test checkout with invalid plan ID"""
        if not self.token:
            return False
        
        self.run_test(
            "Invalid Plan Checkout", 
            "POST", 
            "subscriptions/checkout?plan_id=invalid", 
            400
        )
        return True

    def test_get_menus(self):
        """Test getting user menus"""
        response = self.run_test("Get User Menus", "GET", "menus", 200)
        return isinstance(response, list)

    def test_invalid_endpoints(self):
        """Test invalid endpoints return 404"""
        self.run_test("Invalid Endpoint", "GET", "nonexistent", 404)
        return True

    def test_admin_login(self):
        """Test admin auto-login for critical bug testing"""
        response = self.run_test(
            "Admin Login",
            "GET",
            "auth/admin-login",
            200
        )
        if response and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_multi_file_upload(self):
        """Test multi-file upload functionality - CRITICAL BUG FIX"""
        if not self.token:
            self.log_test("Multi-file Upload", False, "No authentication token")
            return None

        # Create test files
        test_files = []
        try:
            # Create temporary test image files (PNG format)
            import base64
            
            # Simple 1x1 PNG image data
            png_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg==')
            
            for i in range(2):
                test_files.append(('files', (f'test_menu_{i+1}.png', png_data, 'image/png')))
            
            # Test multi-file upload
            form_data = {
                'name': 'Multi-Page Test Menu',
                'location': 'New York, NY'
            }
            
            response = self.run_test(
                "Multi-file Upload",
                "POST", 
                "menus/upload",
                200,
                data=form_data,
                files=test_files
            )
            
            if response:
                job_id = response.get('job_id')
                total_pages = response.get('total_pages', 0)
                self.log_test("Multi-file Upload Pages", total_pages == 2, f"Expected 2 pages, got {total_pages}")
                return job_id
            return None
            
        except Exception as e:
            self.log_test("Multi-file Upload", False, f"Exception: {str(e)}")
            return None

    def test_export_functionality(self, job_id):
        """Test export CSV and JSON functionality - CRITICAL BUG FIX"""
        if not job_id or not self.token:
            self.log_test("Export Test", False, "No job ID or token")
            return False

        # Test CSV export
        try:
            csv_url = f"{self.base_url}/api/menus/{job_id}/export?format=csv"
            csv_response = requests.get(csv_url, headers={'Authorization': f'Bearer {self.token}'}, timeout=30)
            
            csv_success = (csv_response.status_code == 200 and 
                          'attachment' in csv_response.headers.get('Content-Disposition', '') and
                          len(csv_response.content) > 0)
            
            csv_details = f"Status: {csv_response.status_code}, Content-Disposition: {csv_response.headers.get('Content-Disposition', 'None')}, Size: {len(csv_response.content)} bytes"
            self.log_test("Export CSV", csv_success, csv_details)
            
        except Exception as e:
            self.log_test("Export CSV", False, f"Exception: {str(e)}")
            csv_success = False

        # Test JSON export
        try:
            json_url = f"{self.base_url}/api/menus/{job_id}/export?format=json"
            json_response = requests.get(json_url, headers={'Authorization': f'Bearer {self.token}'}, timeout=30)
            
            json_success = (json_response.status_code == 200 and 
                           'attachment' in json_response.headers.get('Content-Disposition', '') and
                           len(json_response.content) > 0)
            
            json_details = f"Status: {json_response.status_code}, Content-Disposition: {json_response.headers.get('Content-Disposition', 'None')}, Size: {len(json_response.content)} bytes"
            self.log_test("Export JSON", json_success, json_details)
            
        except Exception as e:
            self.log_test("Export JSON", False, f"Exception: {str(e)}")
            json_success = False

        return csv_success and json_success

    def test_menu_retrieval(self, job_id):
        """Test menu retrieval after upload"""
        if not job_id or not self.token:
            return False
            
        response = self.run_test(
            "Menu Retrieval",
            "GET",
            f"menus/{job_id}",
            200
        )
        
        if response:
            file_paths = response.get('file_paths', [])
            items_count = len(response.get('items', []))
            self.log_test("Menu File Paths", len(file_paths) >= 2, f"Expected >=2 file paths, got {len(file_paths)}")
            return True
        return False

    def run_critical_bug_tests(self):
        """Run tests for critical bug fixes"""
        print("🧪 MenuGenius Critical Bug Fix Testing")
        print("=" * 50)
        
        # Test sequence for critical bug fixes
        print("\n1. Testing Admin Login...")
        if not self.test_admin_login():
            print("❌ Admin login failed - cannot proceed with tests")
            return 1

        print("\n2. Testing Multi-file Upload...")
        job_id = self.test_multi_file_upload()
        
        if job_id:
            print(f"\n3. Testing Menu Retrieval (Job ID: {job_id})...")
            self.test_menu_retrieval(job_id)
            
            print("\n4. Testing Export Functionality...")
            self.test_export_functionality(job_id)
        else:
            print("❌ Multi-file upload failed - skipping dependent tests")

        # Summary
        print(f"\n📊 Critical Bug Test Results")
        print("=" * 30)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return 0 if self.tests_passed == self.tests_run else 1

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
    
    # Run critical bug fix tests first
    print("🔥 Running Critical Bug Fix Tests")
    critical_exit_code = tester.run_critical_bug_tests()
    
    # Save detailed results
    results_file = "/app/test_reports/backend_test_results.json"
    with open(results_file, 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "test_type": "critical_bug_fixes",
            "summary": {
                "tests_run": tester.tests_run,
                "tests_passed": tester.tests_passed,
                "success_rate": f"{(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%"
            },
            "test_results": tester.test_results
        }, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: {results_file}")
    
    return critical_exit_code

if __name__ == "__main__":
    sys.exit(main())