

A simple backend API that integrates with the Genderize API to predict the gender of a given name, process the response, and return a structured result.

---

## Overview

This API accepts a name as a query parameter, sends it to the Genderize API, processes the response, and returns a standardized JSON output including a confidence indicator and timestamp.

---

## Tech Stack

* Node.js
* Express.js
* Axios
* CORS

---

##  Base URL

```
https://your-app-url.com
```

---

##  Endpoint

### Classify Name

```
GET /api/classify?name={name}
```

### Example Request

```
GET /api/classify?name=john
```

---

##  Success Response (200 OK)

```json
{
  "status": "success",
  "data": {
    "name": "john",
    "gender": "male",
    "probability": 0.99,
    "sample_size": 1234,
    "is_confident": true,
    "processed_at": "2026-04-01T12:00:00Z"
  }
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "status": "error",
  "message": "Missing or empty name parameter"
}
```

---

### 422 Unprocessable Entity

```json
{
  "status": "error",
  "message": "name must be a string"
}
```

---

### 422 No Prediction Available

```json
{
  "status": "error",
  "message": "No prediction available for the provided name"
}
```

---

### 500 Internal Server Error

```json
{
  "status": "error",
  "message": "Something went wrong"
}
```

---

## Processing Logic

* Extract:

  * `gender`
  * `probability`
  * `count` → renamed to `sample_size`

* Compute:

  * `is_confident` is **true only if**:

    * `probability >= 0.7`
    * `sample_size >= 100`

* Generate:

  * `processed_at` (UTC, ISO 8601 format)

---

## Edge Case Handling

If the Genderize API returns:

* `gender: null`
* `count: 0`

The API responds with:

```json
{
  "status": "error",
  "message": "No prediction available for the provided name"
}
```

---

##  CORS

CORS is enabled to allow requests from all origins:

```
Access-Control-Allow-Origin: *
```

---

## 🚀 Getting Started (Local Setup)



### 2. Install dependencies

```
npm install
```

### 3. Run the server

```
node server.js
```

Server will start on:

```
http://localhost:9000
```

---

##  Testing

Test the endpoint using:

* Browser
* Postman
* Curl

Example:

```
http://localhost:3000/api/classify?name=miracle
```


A simple backend API that integrates with the Genderize API to predict the gender of a given name, process the response, and return a structured result.

Tech Stack
Node.js
Express
Axios
Cors

Endpoint
Get /api/classify?name={name}

