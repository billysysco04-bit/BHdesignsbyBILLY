# MenuGenius - Comprehensive A-Z Testing Protocol

user_problem_statement: |
  MenuGenius - Full A-Z Testing
  Complete end-to-end testing of all features to ensure robustness.
  Find bugs, fix them, and suggest improvements for mass market appeal.

backend:
  - task: "Authentication - Admin login"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    priority: "high"
    needs_retesting: true

  - task: "Authentication - User registration"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    priority: "high"
    needs_retesting: true

  - task: "Menu upload - Single file"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    priority: "high"
    needs_retesting: true

  - task: "Menu upload - Multiple files"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    priority: "high"
    needs_retesting: true

  - task: "Menu analysis - Gemini AI"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    priority: "high"
    needs_retesting: true

  - task: "Export CSV"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    priority: "high"
    needs_retesting: true

  - task: "Export JSON"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    priority: "high"
    needs_retesting: true

  - task: "Stripe subscription checkout"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    priority: "high"
    needs_retesting: true

  - task: "Stripe credit purchase"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    priority: "high"
    needs_retesting: true

  - task: "Price approval/update"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    priority: "medium"
    needs_retesting: true

frontend:
  - task: "Landing page"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/LandingPage.jsx"
    priority: "high"
    needs_retesting: true

  - task: "Auth page - Login/Register"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/AuthPage.jsx"
    priority: "high"
    needs_retesting: true

  - task: "Dashboard - Stats display"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/Dashboard.jsx"
    priority: "high"
    needs_retesting: true

  - task: "Menu upload page"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/MenuUpload.jsx"
    priority: "high"
    needs_retesting: true

  - task: "Menu analysis page"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/MenuAnalysis.jsx"
    priority: "high"
    needs_retesting: true

  - task: "Subscription page"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/SubscriptionPage.jsx"
    priority: "high"
    needs_retesting: true

  - task: "Credits page"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/CreditsPage.jsx"
    priority: "high"
    needs_retesting: true

  - task: "Export functionality"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/MenuAnalysis.jsx"
    priority: "high"
    needs_retesting: true

metadata:
  created_by: "main_agent"
  version: "4.0"
  test_sequence: 3
  run_ui: true

test_plan:
  current_focus:
    - "Full A-Z end-to-end testing"
    - "Bug identification"
    - "User flow validation"
  stuck_tasks: []
  test_all: true

agent_communication:
  - agent: "main"
    message: |
      Running comprehensive A-Z testing of MenuGenius application.
      
      Test Flow:
      1. Landing page load
      2. Admin login
      3. Dashboard stats verification
      4. Menu upload (single + multi-page)
      5. AI analysis with Gemini
      6. Price decisions (maintain/increase/decrease/custom)
      7. Export CSV and JSON
      8. Subscription page and checkout
      9. Credits page and checkout
      10. User registration flow
      11. Logout and re-login
      
      Using user's own Gemini API key and Stripe test key.
      Look for any bugs, edge cases, or UX issues.
