export const API_BASE_URL = 'https://fine-very-photographs-down.trycloudflare.com';
// export const API_BASE_URL = 'http://localhost:8080';

// ==========================================
// API SERVICE HANDLER & UTILS
// ==========================================

export async function apiFetch(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    // Retrieve JWT and attach to Authorization header if present
    const token = localStorage.getItem('jwt_token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const fetchOptions = {
        ...options,
        headers
    };

    try {
        const response = await fetch(url, fetchOptions);

        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (response.status === 401) {
            // Handle Unauthorized access by removing token and redirecting
            localStorage.removeItem('jwt_token');
            if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('register.html')) {
                window.location.href = 'login.html';
                // Prevent further code execution by throwing an error early
                throw new Error("Session expired. Please log in again.");
            }
        }

        if (!response.ok) {
            // Handle Spring Boot Enterprise Error Format
            const errorMessage = data && data.message
                ? data.message
                : (typeof data === 'string' ? data : `Error ${response.status}: ${response.statusText}`);

            throw new Error(errorMessage);
        }

        return data;
    } catch (error) {
        console.error(`API Error on ${endpoint}:`, error);
        throw error;
    }
}

export function extractPaginatedData(responseData) {
    if (responseData && Array.isArray(responseData.content)) {
        return responseData.content;
    }
    if (Array.isArray(responseData)) {
        return responseData;
    }
    return [];
}
