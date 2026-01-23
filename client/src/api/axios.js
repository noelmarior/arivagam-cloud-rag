import axios from 'axios';

// The Bridge Configuration
const api = axios.create({
    // This points to your Node.js server
    baseURL: 'http://localhost:5000/api', 
    headers: {
        'Content-Type': 'application/json',
    }
});

export default api;