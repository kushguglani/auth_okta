# 4. Complete Express Features

[← Back to Table of Contents](./README.md)

---

## All 150+ Express.js Features

### Core Application Methods (12)

| Feature | Description |
|---------|-------------|
| `app.use()` | Mount middleware |
| `app.listen()` | Start server |
| `app.set()` | Set app settings |
| `app.get()` (setting) | Get app settings |
| `app.enable()` | Enable setting |
| `app.disable()` | Disable setting |
| `app.enabled()` | Check if enabled |
| `app.disabled()` | Check if disabled |
| `app.locals` | Local variables for templates |
| `app.param()` | Route parameter callbacks |
| `app.path()` | Get app path |
| `app.render()` | Render view template |

---

## HTTP Method Routing (8)

| Feature | Description |
|---------|-------------|
| `app.get()` | Handle GET |
| `app.post()` | Handle POST |
| `app.put()` | Handle PUT |
| `app.delete()` | Handle DELETE |
| `app.patch()` | Handle PATCH |
| `app.head()` | Handle HEAD |
| `app.options()` | Handle OPTIONS |
| `app.all()` | Handle ALL methods |

---

## Built-in Middleware (5)

| Feature | Description |
|---------|-------------|
| `express.json()` | Parse JSON bodies |
| `express.urlencoded()` | Parse form data |
| `express.static()` | Serve static files |
| `express.raw()` | Parse raw bodies |
| `express.text()` | Parse text bodies |

---

## Request Object (25 properties/methods)

| Feature | Description |
|---------|-------------|
| `req.body` | Request body (parsed) |
| `req.params` | Route parameters |
| `req.query` | Query strings |
| `req.headers` | Request headers |
| `req.cookies` | Cookies |
| `req.method` | HTTP method |
| `req.url` | Request URL |
| `req.path` | Request path |
| `req.protocol` | Protocol (http/https) |
| `req.hostname` | Hostname |
| `req.ip` | Client IP |
| `req.ips` | IP addresses (proxy) |
| `req.originalUrl` | Original URL |
| `req.baseUrl` | Base URL |
| `req.fresh` | Check if fresh |
| `req.stale` | Check if stale |
| `req.xhr` | Check if AJAX |
| `req.secure` | Check if HTTPS |
| `req.subdomains` | Subdomains array |
| `req.get()` | Get header value |
| `req.is()` | Check content type |
| `req.accepts()` | Check acceptable types |
| `req.acceptsCharsets()` | Check charsets |
| `req.acceptsEncodings()` | Check encodings |
| `req.acceptsLanguages()` | Check languages |

---

## Response Object (22 methods)

| Feature | Description |
|---------|-------------|
| `res.send()` | Send response |
| `res.json()` | Send JSON |
| `res.status()` | Set status code |
| `res.sendStatus()` | Set status + text |
| `res.end()` | End response |
| `res.redirect()` | Redirect |
| `res.render()` | Render template |
| `res.set()` | Set header |
| `res.get()` | Get header |
| `res.cookie()` | Set cookie |
| `res.clearCookie()` | Clear cookie |
| `res.type()` | Set Content-Type |
| `res.format()` | Content negotiation |
| `res.attachment()` | Set download header |
| `res.download()` | Download file |
| `res.sendFile()` | Send file |
| `res.links()` | Set Link header |
| `res.location()` | Set Location header |
| `res.jsonp()` | Send JSONP |
| `res.vary()` | Set Vary header |
| `res.append()` | Append to header |
| `res.locals` | Local variables |

---

## Top 20 Most Important Features

1. **`app.use()`** - Mount middleware
2. **`app.listen()`** - Start server
3. **`app.get/post/put/delete()`** - Define routes
4. **`express.Router()`** - Modular routing
5. **`express.json()`** - Parse JSON
6. **`express.urlencoded()`** - Parse forms
7. **`express.static()`** - Serve files
8. **`req.body`** - Request body
9. **`req.params`** - URL parameters
10. **`req.query`** - Query strings
11. **`res.json()`** - Send JSON
12. **`res.send()`** - Send response
13. **`res.status()`** - Set status
14. **`res.redirect()`** - Redirect
15. **`next()`** - Pass to next middleware
16. **Error middleware** - Handle errors
17. **`cors`** - Enable CORS
18. **Route parameters** - `:id` syntax
19. **Middleware chaining**
20. **Environment variables**

---

## Common Patterns

### 1. Basic Server Setup
```javascript
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.listen(5000, () => {
  console.log('Server running on port 5000');
});
```

### 2. Router Pattern
```javascript
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'List all' });
});

router.get('/:id', (req, res) => {
  res.json({ id: req.params.id });
});

app.use('/api/users', router);
```

### 3. Error Handling
```javascript
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});
```

### 4. Static Files
```javascript
app.use(express.static('public'));
// Serves files from public/ directory
```

### 5. CORS Configuration
```javascript
const cors = require('cors');

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

---

## Essential Middleware Libraries

### Security
- **helmet** - Security headers
- **cors** - Cross-origin resource sharing
- **express-rate-limit** - Rate limiting
- **express-validator** - Input validation

### Parsing
- **body-parser** - Parse request bodies (built-in now)
- **cookie-parser** - Parse cookies
- **multer** - File uploads

### Utilities
- **morgan** - HTTP request logger
- **compression** - Response compression
- **serve-favicon** - Serve favicon

---

[← Previous: Middleware](./03-middleware.md) | [Next: GraphQL Deep Dive →](./05-graphql-deep-dive.md)

