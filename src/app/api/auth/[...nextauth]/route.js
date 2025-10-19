import { handlers } from "../../../../../auth" // Referring to the auth.ts we just created

// Add CORS headers to all responses
function addCorsHeaders(response) {
    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3002');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    return response;
}

// Handle CORS preflight
export async function OPTIONS(request) {
    console.log('🔄 [CORS] Handling OPTIONS preflight request for:', request.url);
    return addCorsHeaders(new Response(null, { status: 200 }));
}

// Wrap the existing handlers with CORS headers
export async function GET(request, context) {
    console.log('🔄 [CORS] Handling GET request for:', request.url);
    const response = await handlers.GET(request, context);
    return addCorsHeaders(response);
}

export async function POST(request, context) {
    console.log('🔄 [CORS] Handling POST request for:', request.url);
    const response = await handlers.POST(request, context);
    return addCorsHeaders(response);
}