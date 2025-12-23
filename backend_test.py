import requests
import sys
import json
from datetime import datetime

class MenuAPITester:
    def __init__(self, base_url="https://menumaker-2.preview.emergentagent.com/api"):
        self.base_url = base_url
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
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {response.text[:200]}"
                
                self.log_test(name, False, error_msg)
                return False, {}

        except requests.exceptions.RequestException as e:
            self.log_test(name, False, f"Request error: {str(e)}")
            return False, {}
        except Exception as e:
            self.log_test(name, False, f"Unexpected error: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        test_user_data = {
            "name": f"Test User {datetime.now().strftime('%H%M%S')}",
            "email": f"test_{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        # First register a user
        test_user_data = {
            "name": f"Login Test User {datetime.now().strftime('%H%M%S')}",
            "email": f"login_test_{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "LoginTest123!"
        }
        
        # Register first
        success, response = self.run_test(
            "User Registration for Login Test",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if not success:
            return False
            
        # Now test login
        login_data = {
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            # Update token for subsequent tests
            self.token = response['token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_get_user_profile(self):
        """Test getting current user profile"""
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_get_templates(self):
        """Test getting menu templates"""
        success, response = self.run_test(
            "Get Templates",
            "GET",
            "templates",
            200
        )
        
        if success and isinstance(response, list) and len(response) >= 10:
            self.log_test("Template Count Validation", True, f"Found {len(response)} templates")
            return True
        elif success:
            self.log_test("Template Count Validation", False, f"Expected 10+ templates, got {len(response) if isinstance(response, list) else 0}")
            return False
        return False

    def test_create_menu(self):
        """Test creating a new menu"""
        menu_data = {
            "title": f"Test Menu {datetime.now().strftime('%H%M%S')}",
            "template_id": "template-1"
        }
        
        success, response = self.run_test(
            "Create Menu",
            "POST",
            "menus",
            200,
            data=menu_data
        )
        
        if success and 'id' in response:
            self.test_menu_id = response['id']
            return True
        return False

    def test_get_menus(self):
        """Test getting user's menus"""
        success, response = self.run_test(
            "Get User Menus",
            "GET",
            "menus",
            200
        )
        return success

    def test_get_single_menu(self):
        """Test getting a specific menu"""
        if not hasattr(self, 'test_menu_id'):
            self.log_test("Get Single Menu", False, "No menu ID available from create test")
            return False
            
        success, response = self.run_test(
            "Get Single Menu",
            "GET",
            f"menus/{self.test_menu_id}",
            200
        )
        return success

    def test_update_menu(self):
        """Test updating a menu"""
        if not hasattr(self, 'test_menu_id'):
            self.log_test("Update Menu", False, "No menu ID available from create test")
            return False
            
        update_data = {
            "title": f"Updated Menu {datetime.now().strftime('%H%M%S')}",
            "items": [
                {
                    "id": "item-1",
                    "name": "Test Dish",
                    "description": "A delicious test dish",
                    "price": "15.99",
                    "category": "Main Course"
                }
            ]
        }
        
        success, response = self.run_test(
            "Update Menu",
            "PUT",
            f"menus/{self.test_menu_id}",
            200,
            data=update_data
        )
        return success

    def test_ai_description_generation(self):
        """Test AI description generation"""
        ai_request = {
            "dish_name": "Grilled Salmon",
            "ingredients": "Fresh Atlantic salmon, lemon, herbs",
            "style": "professional"
        }
        
        success, response = self.run_test(
            "AI Description Generation",
            "POST",
            "ai/generate-description",
            200,
            data=ai_request
        )
        
        if success and 'description' in response and response['description']:
            self.log_test("AI Description Content Validation", True, f"Generated: {response['description'][:50]}...")
            return True
        elif success:
            self.log_test("AI Description Content Validation", False, "No description in response")
            return False
        return False

    def test_delete_menu(self):
        """Test deleting a menu"""
        if not hasattr(self, 'test_menu_id'):
            self.log_test("Delete Menu", False, "No menu ID available from create test")
            return False
            
        success, response = self.run_test(
            "Delete Menu",
            "DELETE",
            f"menus/{self.test_menu_id}",
            200
        )
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Menu Creation Platform API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)

        # Authentication Tests
        print("\n📋 AUTHENTICATION TESTS")
        if not self.test_user_registration():
            print("❌ Registration failed, stopping tests")
            return False
            
        if not self.test_user_login():
            print("❌ Login failed, stopping tests")
            return False
            
        self.test_get_user_profile()

        # Template Tests
        print("\n📋 TEMPLATE TESTS")
        self.test_get_templates()

        # Menu CRUD Tests
        print("\n📋 MENU CRUD TESTS")
        if self.test_create_menu():
            self.test_get_menus()
            self.test_get_single_menu()
            self.test_update_menu()
            self.test_delete_menu()

        # AI Integration Tests
        print("\n📋 AI INTEGRATION TESTS")
        self.test_ai_description_generation()

        # Print Results
        print("\n" + "=" * 60)
        print(f"📊 TEST RESULTS: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            print("\nFailed tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")
            return False

def main():
    tester = MenuAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())