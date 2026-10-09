# Library Books REST API Design

## Resource Information

- Resource: Books
- Base URL: `/api/books`
- Data format: JSON

## 1. List All Books

- **Method:** GET
- **Path:** `/api/books`
- **Description:** Returns a list of all books in the library.
- **Success status:** `200 OK`

## 2. Get One Book

- **Method:** GET
- **Path:** `/api/books/:id`
- **Description:** Returns one book using its unique ID.
- **Success status:** `200 OK`

## 3. Create a Book

- **Method:** POST
- **Path:** `/api/books`
- **Description:** Creates a new book in the library.

Example request body:

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "publishedYear": 1958
}
```

- **Success status:** `201 Created`

## 4. Update a Book

- **Method:** PUT
- **Path:** `/api/books/:id`
- **Description:** Replaces the details of an existing book.

Example request body:

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "publishedYear": 1958
}
```

- **Success status:** `200 OK`

## 5. Delete a Book

- **Method:** DELETE
- **Path:** `/api/books/:id`
- **Description:** Deletes a book using its unique ID.
- **Success status:** `204 No Content`

## 6. List Books by Author

- **Method:** GET
- **Path:** `/api/books?author=Chinua%20Achebe`
- **Description:** Returns books written by the specified author.
- **Success status:** `200 OK`

## Error Responses

### 400 Bad Request

- **Meaning:** The request contains invalid data.
- **Example:** Creating a book without a required title or author.

### 404 Not Found

- **Meaning:** The requested resource does not exist.
- **Example:** Requesting `/api/books/9999` when book ID 9999 does not exist.