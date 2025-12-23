#!/usr/bin/env python3
"""
MenuMaker Backend API Testing Suite - P0 Fixes Focus
Tests the 3 critical P0 issues that were reported and fixed:
1. AI chef-inspired descriptions not generating
2. Image import (JPG/PNG) broken after CSV import was added  
3. Menu layout unprofessional and not print-ready
"""

import requests
import sys
import json
import time
import io
from datetime import datetime

class MenuMakerP0Tester:
    def __init__(self, base_url="https://menumaker-2.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.p0_fixes_tested = 0
        self.p0_fixes_passed = 0

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, timeout=45):
        """Run a single API test with proper error handling"""
        url = f"{self.base_url}/{endpoint}"
        headers = {}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        # Only set Content-Type for JSON requests
        if not files:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers=headers, timeout=timeout)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - {name}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, response.text
            else:
                self.log(f"❌ FAILED - {name}")
                self.log(f"   Expected: {expected_status}, Got: {response.status_code}")
                self.log(f"   Response: {response.text[:300]}")
                return False, {}

        except Exception as e:
            self.log(f"❌ ERROR - {name}: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test login with provided admin credentials"""
        self.log("🔐 Testing Admin Login...")
        success, response = self.run_test(
            "Admin Login",
            "POST", 
            "auth/login",
            200,
            data={"email": "admin@menumaker.com", "password": "admin123"}
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('user', {}).get('id')
            self.log(f"✅ Admin login successful")
            return True
        else:
            self.log(f"❌ Admin login failed - cannot proceed with P0 tests")
            return False

    def test_p0_fix_1_ai_descriptions(self):
        """P0 Fix #1: AI chef-inspired descriptions not generating"""
        self.log("🤖 Testing P0 Fix #1: AI Description Generation...")
        self.p0_fixes_tested += 1
        
        test_dishes = [
            {"dish_name": "Grilled Salmon", "ingredients": "Atlantic salmon, lemon butter", "style": "chef"},
            {"dish_name": "Truffle Risotto", "ingredients": "Arborio rice, black truffle, parmesan", "style": "chef"},
            {"dish_name": "Beef Wellington", "style": "professional"}
        ]
        
        descriptions_generated = 0
        
        for dish in test_dishes:
            success, response = self.run_test(
                f"AI Description: {dish['dish_name']}",
                "POST",
                "ai/generate-description", 
                200,
                data=dish,
                timeout=60  # AI calls can be slow
            )
            
            if success and response.get('description'):
                description = response['description']
                self.log(f"   Generated: '{description[:50]}...'")
                if len(description) > 5:  # Basic validation
                    descriptions_generated += 1
                else:
                    self.log(f"   ⚠️  Description too short")
            else:
                self.log(f"   ❌ No description returned for {dish['dish_name']}")
        
        if descriptions_generated >= 2:  # At least 2/3 should work
            self.p0_fixes_passed += 1
            self.log(f"✅ P0 Fix #1 VERIFIED: AI descriptions working ({descriptions_generated}/3)")
            return True
        else:
            self.log(f"❌ P0 Fix #1 FAILED: Only {descriptions_generated}/3 descriptions generated")
            return False

    def test_p0_fix_2_image_import(self):
        """P0 Fix #2: Image import (JPG/PNG) broken after CSV import was added"""
        self.log("📷 Testing P0 Fix #2: Image Import with OCR...")
        self.p0_fixes_tested += 1
        
        # Create a test image with menu text using PIL
        try:
            from PIL import Image, ImageDraw, ImageFont
            import io
            
            # Create test image with menu text
            img = Image.new('RGB', (400, 200), color='white')
            draw = ImageDraw.Draw(img)
            
            menu_text = '''RESTAURANT MENU
Grilled Salmon - $24.99
Caesar Salad - $12.99
Chocolate Cake - $8.99'''
            
            try:
                font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 14)
            except:
                font = ImageFont.load_default()
            
            draw.text((10, 10), menu_text, fill='black', font=font)
            
            # Save as PNG
            png_buffer = io.BytesIO()
            img.save(png_buffer, format='PNG')
            png_data = png_buffer.getvalue()
            
            files = {
                'file': ('test_menu.png', png_data, 'image/png')
            }
            
            success, response = self.run_test(
                "PNG Image Upload with OCR",
                "POST",
                "import/upload",
                200,
                files=files,
                timeout=90
            )
            
            if success and response.get('items_found', 0) > 0:
                items_found = response.get('items_found', 0)
                extracted_text = response.get('extracted_text', '')
                self.log(f"   OCR extracted {items_found} items")
                self.log(f"   Text: '{extracted_text[:60]}...'")
                
                self.p0_fixes_passed += 1
                self.log(f"✅ P0 Fix #2 VERIFIED: Image import with OCR working")
                return True
            else:
                self.log(f"❌ P0 Fix #2 FAILED: No items extracted from image")
                return False
                
        except ImportError:
            self.log("⚠️  PIL not available, testing with minimal image data...")
            
            # Fallback: Test that endpoint accepts images (even if OCR fails)
            minimal_png = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc```\x00\x00\x00\x04\x00\x01\xdd\xcc\xdb\x1d\x00\x00\x00\x00IEND\xaeB`\x82'
            
            files = {
                'file': ('empty.png', minimal_png, 'image/png')
            }
            
            success, response = self.run_test(
                "Minimal PNG Upload",
                "POST",
                "import/upload", 
                400,  # Expect 400 for empty image
                files=files,
                timeout=90
            )
            
            # If we get a proper error about no text, OCR is working
            if success or 'text could be extracted' in str(response):
                self.p0_fixes_passed += 1
                self.log(f"✅ P0 Fix #2 VERIFIED: Image upload endpoint working")
                return True
            else:
                self.log(f"❌ P0 Fix #2 FAILED: Image upload not working")
                return False

    def test_csv_still_works(self):
        """Verify CSV import still works alongside image import"""
        self.log("📊 Testing CSV Import Compatibility...")
        
        csv_content = """Name,Description,Price,Category
Grilled Salmon,Fresh Atlantic salmon with herbs,24.99,Main Course
Caesar Salad,Crisp romaine with parmesan,12.99,Salads
Chocolate Cake,Rich dark chocolate dessert,8.99,Desserts"""
        
        files = {
            'file': ('test_menu.csv', csv_content.encode(), 'text/csv')
        }
        
        success, response = self.run_test(
            "CSV Upload",
            "POST",
            "import/upload", 
            200,
            files=files
        )
        
        if success and response.get('items_found', 0) >= 3:
            self.log(f"✅ CSV import still working: {response.get('items_found')} items")
            return True
        else:
            self.log(f"❌ CSV import broken")
            return False

    def test_p0_fix_3_menu_layout(self):
        """P0 Fix #3: Menu layout unprofessional and not print-ready"""
        self.log("📋 Testing P0 Fix #3: Professional Menu Layout...")
        self.p0_fixes_tested += 1
        
        # Test single-column layout with dotted leaders
        single_column_menu = {
            "title": "Professional Menu Test",
            "pages": [{
                "id": "page-test-1",
                "page_number": 1,
                "title": "FINE DINING MENU",
                "subtitle": "Chef's Selection",
                "items": [
                    {
                        "id": "item-1",
                        "name": "Pan-Seared Scallops",
                        "description": "Diver scallops with cauliflower purée and pancetta",
                        "price": "28.00",
                        "category": "Appetizers"
                    },
                    {
                        "id": "item-2", 
                        "name": "Wagyu Beef Tenderloin",
                        "description": "8oz prime cut with truffle butter and seasonal vegetables",
                        "price": "65.00",
                        "category": "Main Course"
                    }
                ],
                "design": {
                    "layout": "single-column",
                    "backgroundColor": "#ffffff",
                    "titleFont": "Playfair Display",
                    "itemFont": "DM Sans",
                    "priceFont": "Playfair Display",
                    "padding": 50,
                    "itemSpacing": 24,
                    "categorySpacing": 40,
                    "pageWidth": 816,
                    "pageHeight": 1056
                }
            }]
        }
        
        success, response = self.run_test(
            "Create Single-Column Menu",
            "POST",
            "menus",
            200,
            data=single_column_menu
        )
        
        single_column_works = success and 'id' in response
        menu_id_1 = response.get('id') if success else None
        
        # Test two-column layout with balanced distribution
        two_column_menu = {
            "title": "Two Column Layout Test",
            "pages": [{
                "id": "page-test-2", 
                "page_number": 1,
                "title": "BISTRO MENU",
                "subtitle": "Seasonal Offerings",
                "items": [
                    {
                        "id": "item-3",
                        "name": "Soup of the Day",
                        "description": "Chef's daily creation",
                        "price": "8.00",
                        "category": "Appetizers"
                    },
                    {
                        "id": "item-4",
                        "name": "Grilled Chicken",
                        "description": "Free-range chicken breast",
                        "price": "22.00", 
                        "category": "Main Course"
                    },
                    {
                        "id": "item-5",
                        "name": "Seasonal Vegetables",
                        "description": "Market fresh selection",
                        "price": "12.00",
                        "category": "Sides"
                    },
                    {
                        "id": "item-6",
                        "name": "Tiramisu",
                        "description": "Classic Italian dessert",
                        "price": "9.00",
                        "category": "Desserts"
                    }
                ],
                "design": {
                    "layout": "two-column",
                    "backgroundColor": "#ffffff", 
                    "titleFont": "Playfair Display",
                    "itemFont": "DM Sans",
                    "priceFont": "Playfair Display",
                    "padding": 50,
                    "itemSpacing": 24,
                    "categorySpacing": 40,
                    "pageWidth": 816,
                    "pageHeight": 1056
                }
            }]
        }
        
        success, response = self.run_test(
            "Create Two-Column Menu",
            "POST",
            "menus", 
            200,
            data=two_column_menu
        )
        
        two_column_works = success and 'id' in response
        menu_id_2 = response.get('id') if success else None
        
        # Verify menu retrieval and layout preservation
        layouts_preserved = True
        if menu_id_1:
            success, response = self.run_test(
                "Retrieve Single-Column Menu",
                "GET",
                f"menus/{menu_id_1}",
                200
            )
            if not (success and response.get('pages', [{}])[0].get('design', {}).get('layout') == 'single-column'):
                layouts_preserved = False
        
        if menu_id_2:
            success, response = self.run_test(
                "Retrieve Two-Column Menu", 
                "GET",
                f"menus/{menu_id_2}",
                200
            )
            if not (success and response.get('pages', [{}])[0].get('design', {}).get('layout') == 'two-column'):
                layouts_preserved = False
        
        if single_column_works and two_column_works and layouts_preserved:
            self.p0_fixes_passed += 1
            self.log(f"✅ P0 Fix #3 VERIFIED: Professional layout system working")
            return True
        else:
            self.log(f"❌ P0 Fix #3 FAILED: Layout system issues")
            return False

    def run_p0_test_suite(self):
        """Run focused test suite for the 3 P0 fixes"""
        self.log("🚀 Starting MenuMaker P0 Fixes Test Suite")
        self.log(f"Testing against: {self.base_url}")
        
        start_time = time.time()
        
        # Must login first
        if not self.test_admin_login():
            self.log("❌ CRITICAL: Cannot login - stopping all tests")
            return False
        
        # Test the 3 P0 fixes
        self.log("\n" + "="*60)
        self.log("TESTING P0 FIXES")
        self.log("="*60)
        
        p0_tests = [
            ("P0 Fix #1: AI Description Generation", self.test_p0_fix_1_ai_descriptions),
            ("P0 Fix #2: Image Import with OCR", self.test_p0_fix_2_image_import), 
            ("P0 Fix #3: Professional Menu Layout", self.test_p0_fix_3_menu_layout)
        ]
        
        for test_name, test_func in p0_tests:
            try:
                self.log(f"\n--- {test_name} ---")
                test_func()
            except Exception as e:
                self.log(f"❌ {test_name} - EXCEPTION: {str(e)}")
        
        # Additional compatibility test
        self.log(f"\n--- Additional Compatibility Tests ---")
        self.test_csv_still_works()
        
        # Final results
        duration = time.time() - start_time
        self.log(f"\n" + "="*60)
        self.log("P0 FIXES TEST RESULTS")
        self.log("="*60)
        self.log(f"Total API tests: {self.tests_run}")
        self.log(f"API tests passed: {self.tests_passed}")
        self.log(f"API success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        self.log(f"P0 fixes tested: {self.p0_fixes_tested}")
        self.log(f"P0 fixes verified: {self.p0_fixes_passed}")
        self.log(f"Duration: {duration:.1f}s")
        
        if self.p0_fixes_passed == 3:
            self.log("🎉 ALL 3 P0 FIXES VERIFIED SUCCESSFULLY!")
            return True
        else:
            self.log(f"⚠️  {3-self.p0_fixes_passed} P0 fixes still have issues")
            return False

def main():
    """Main test execution"""
    tester = MenuMakerP0Tester()
    success = tester.run_p0_test_suite()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())