# 9. Code Refactoring Best Practices

[← Back to Table of Contents](./README.md)

---

## Before vs After Refactoring

### ❌ Before: Monolithic Function (68 lines)

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    if (isLogin) {
      // 30 lines of login logic
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (data.success) {
        alert('Success');
      } else {
        alert('Error');
      }
    } else {
      // 30 lines of signup logic
      if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await response.json();
      if (data.success) {
        alert('Success');
        setIsLogin(true);
        // Clear form...
      }
    }
  } catch (error) {
    alert('Error occurred');
  }
};
```

**Problems:**
- ❌ Too long (68 lines)
- ❌ Multiple responsibilities
- ❌ Duplicate code
- ❌ Hard to test
- ❌ Hard to maintain

---

### ✅ After: Modular Functions

```javascript
// Helper 1: Reset form
const resetForm = () => {
  setFormData({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
};

// Helper 2: Validate passwords
const validatePasswordMatch = () => {
  if (formData.password !== formData.confirmPassword) {
    alert('❌ Passwords do not match!');
    return false;
  }
  return true;
};

// Helper 3: Reusable API call
const apiCall = async (endpoint, payload) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return await response.json();
};

// Function 4: Login logic
const handleLogin = async () => {
  const data = await apiCall('/api/auth/login', {
    email: formData.email,
    password: formData.password
  });

  if (data.success) {
    alert('✅ ' + data.message);
    console.log('User:', data.user);
  } else {
    alert('❌ ' + data.message);
  }
};

// Function 5: Signup logic
const handleSignup = async () => {
  if (!validatePasswordMatch()) return;

  const data = await apiCall('/api/auth/signup', {
    name: formData.name,
    email: formData.email,
    password: formData.password
  });

  if (data.success) {
    alert('✅ ' + data.message);
    setIsLogin(true);
    resetForm();
  } else {
    alert('❌ ' + data.message);
  }
};

// Main handler (now only 10 lines!)
const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    if (isLogin) {
      await handleLogin();
    } else {
      await handleSignup();
    }
  } catch (error) {
    console.error('Error:', error);
    alert('❌ An error occurred.');
  }
};
```

---

## Refactoring Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Lines in handleSubmit** | 68 | 10 |
| **Number of functions** | 1 | 6 |
| **Duplicate code** | Yes | No |
| **Single Responsibility** | No | Yes |
| **Testable** | No | Yes |
| **Reusable** | No | Yes |
| **Maintainable** | Hard | Easy |

---

## SOLID Principles Applied

### 1. Single Responsibility Principle

Each function has ONE job:

```javascript
// ❌ Bad: One function does everything
handleSubmit() {
  // validate
  // make API call
  // handle response
  // update state
  // show messages
}

// ✅ Good: Each function has one job
validatePasswordMatch() { /* only validates */ }
apiCall() { /* only makes API calls */ }
handleLogin() { /* only handles login */ }
resetForm() { /* only resets form */ }
```

### 2. Open/Closed Principle

Open for extension, closed for modification:

```javascript
// Easy to extend without modifying
const apiCall = async (endpoint, payload, options = {}) => {
  const response = await fetch(endpoint, {
    method: options.method || 'POST',
    headers: options.headers || { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return await response.json();
};

// Extend functionality
apiCall('/api/auth/login', data, { method: 'POST' });
apiCall('/api/users', data, { 
  headers: { 'Authorization': 'Bearer token' } 
});
```

### 3. DRY Principle (Don't Repeat Yourself)

```javascript
// ❌ Bad: Duplicate fetch calls
// Login: fetch('/api/auth/login', { method: 'POST', headers: {...}, body: {...} })
// Signup: fetch('/api/auth/signup', { method: 'POST', headers: {...}, body: {...} })

// ✅ Good: Reusable function
const apiCall = async (endpoint, payload) => { /* ... */ };
```

---

## Refactoring Patterns

### Pattern 1: Extract Function

```javascript
// Before
function processUser() {
  // 20 lines of validation
  // 30 lines of processing
  // 15 lines of saving
}

// After
function processUser() {
  validateUser();
  transformUserData();
  saveUser();
}
```

### Pattern 2: Extract Variable

```javascript
// Before
if (user.roles.includes('admin') && user.isVerified && !user.isLocked) {
  // allow access
}

// After
const canAccess = user.roles.includes('admin') && 
                  user.isVerified && 
                  !user.isLocked;

if (canAccess) {
  // allow access
}
```

### Pattern 3: Replace Magic Numbers

```javascript
// Before
setTimeout(callback, 900000);

// After
const FIFTEEN_MINUTES = 15 * 60 * 1000;
setTimeout(callback, FIFTEEN_MINUTES);
```

### Pattern 4: Early Return

```javascript
// Before
function validateInput(data) {
  if (data) {
    if (data.email) {
      if (data.password) {
        return true;
      }
    }
  }
  return false;
}

// After
function validateInput(data) {
  if (!data) return false;
  if (!data.email) return false;
  if (!data.password) return false;
  return true;
}
```

---

## Code Smells to Avoid

### 1. Long Functions
```javascript
// ❌ Function longer than 20 lines
// ✅ Break into smaller functions
```

### 2. Duplicate Code
```javascript
// ❌ Copy-pasted code
// ✅ Extract to reusable function
```

### 3. Magic Numbers
```javascript
// ❌ if (attempts > 5)
// ✅ const MAX_ATTEMPTS = 5; if (attempts > MAX_ATTEMPTS)
```

### 4. Deep Nesting
```javascript
// ❌ if { if { if { if { } } } }
// ✅ Use early returns
```

### 5. Unclear Names
```javascript
// ❌ function f1(x, y)
// ✅ function calculateTotal(price, quantity)
```

---

## Refactoring Checklist

- [ ] Functions are small (< 20 lines)
- [ ] Each function has one responsibility
- [ ] No duplicate code
- [ ] Clear variable names
- [ ] No magic numbers
- [ ] Minimal nesting (< 3 levels)
- [ ] Early returns used
- [ ] Consistent formatting
- [ ] Comments explain "why", not "what"
- [ ] Functions are testable

---

## Key Takeaways

1. **Refactor continuously** - Don't let code debt accumulate
2. **Small functions** - Easier to understand and test
3. **DRY principle** - Don't Repeat Yourself
4. **Clear names** - Code should read like a story
5. **Test after refactoring** - Ensure behavior unchanged

---

[← Previous: Project Architecture](./08-project-architecture.md) | [Next: Auth Plan →](./10-auth-plan.md)

