describe('Authentication Flow', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    cy.clearLocalStorage();
    // Intercept API calls for authentication
    cy.intercept('POST', '/api/auth/register', { fixture: 'register_success.json' }).as('register');
    cy.intercept('POST', '/api/auth/login', { fixture: 'login_success.json' }).as('login');
    cy.intercept('GET', '/api/users/me', { fixture: 'user_profile.json' }).as('getUser');
  });

  it('should register a new user and redirect to login', () => {
    cy.visit('/register');
    
    // Fill the registration form
    cy.get('input[name="username"]').type('newuser');
    cy.get('input[name="email"]').type('newuser@example.com');
    cy.get('input[name="password"]').type('Password123!');
    cy.get('input[name="confirmPassword"]').type('Password123!');
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Wait for the API call
    cy.wait('@register');
    
    // Should be redirected to login
    cy.url().should('include', '/login');
  });

  it('should login a user and redirect to dashboard', () => {
    cy.visit('/login');
    
    // Fill the login form
    cy.get('input[name="username"]').type('testuser');
    cy.get('input[name="password"]').type('Password123!');
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Wait for the API calls
    cy.wait('@login');
    cy.wait('@getUser');
    
    // Should be redirected to dashboard
    cy.url().should('include', '/dashboard');
    
    // Check that the dashboard displays user information
    cy.contains('Welcome back, testuser');
  });

  it('should show error message for invalid login', () => {
    // Override the login intercept for this test
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 401,
      body: { detail: 'Incorrect username or password' }
    }).as('failedLogin');
    
    cy.visit('/login');
    
    // Fill the login form
    cy.get('input[name="username"]').type('wronguser');
    cy.get('input[name="password"]').type('WrongPassword');
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Wait for the API call
    cy.wait('@failedLogin');
    
    // Should still be on login page
    cy.url().should('include', '/login');
    
    // Should show error message
    cy.contains('Incorrect username or password');
  });

  it('should logout a user and redirect to login', () => {
    // Setup: Login first
    cy.visit('/login');
    cy.get('input[name="username"]').type('testuser');
    cy.get('input[name="password"]').type('Password123!');
    cy.get('button[type="submit"]').click();
    cy.wait('@login');
    cy.wait('@getUser');
    
    // Now test logout
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="logout-button"]').click();
    
    // Should be redirected to login
    cy.url().should('include', '/login');
    
    // Check that localStorage token is removed
    cy.window().then((window) => {
      expect(window.localStorage.getItem('token')).to.be.null;
    });
  });
}); 