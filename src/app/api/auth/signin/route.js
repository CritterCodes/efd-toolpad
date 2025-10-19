// src/app/api/auth/signin/route.js
import AuthService from '../[...nextauth]/service';
import { NextResponse } from 'next/server';
import { logRequestCookies, logResponseCookies } from '../../../../lib/cookie-debug.js';

export async function POST(req) {
    try {
        console.log('\n🔐 === SIGNIN API START ===');
        console.log('⏰ Timestamp:', new Date().toISOString());
        console.log('🌐 Request URL:', req.url);
        
        // Log all cookies in the request
        logRequestCookies(req, 'SIGNIN_API_REQUEST');
        
        const { email, password } = await req.json();
        console.log('📧 Login attempt for email:', email);
        console.log('🔑 Password provided:', !!password);
        
        console.log('🔍 Calling AuthService.login...');
        const userData = await AuthService.login(email, password);
        console.log('📤 AuthService.login result:');
        
        if (userData) {
            console.log('  ✅ User data received:');
            console.log('    📧 Email:', userData.email);
            console.log('    🎭 Role:', userData.role);
            console.log('    👤 Name:', userData.firstName, userData.lastName);
            console.log('    🆔 UserID:', userData.userID);
            console.log('    🏪 StoreID:', userData.storeID);
        } else {
            console.log('  ❌ No user data returned');
        }

        if (!userData) {
            console.log('🚫 Invalid credentials - returning 401');
            const response = NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
            logResponseCookies(response, 'SIGNIN_API_RESPONSE_401');
            console.log('🔐 === SIGNIN API END (401) ===\n');
            return response;
        }

        // ✅ Block client users from accessing admin panel
        if (userData.role === "client") {
            console.log('🚫 Client user blocked from admin panel');
            const response = NextResponse.json({ 
                error: "ADMIN_ONLY_ACCESS",
                message: "This login is for admin users only. Please visit our shop to access your customer account." 
            }, { status: 403 });
            logResponseCookies(response, 'SIGNIN_API_RESPONSE_403');
            console.log('🔐 === SIGNIN API END (403) ===\n');
            return response;
        }

        // ✅ Return the entire user data for NextAuth handling
        console.log('✅ Returning user data for NextAuth:');
        console.log('  📧 Email:', userData.email);
        console.log('  🎭 Role:', userData.role);
        console.log('  👤 Name:', userData.firstName, userData.lastName);
        
        const response = NextResponse.json(userData, { status: 200 });
        logResponseCookies(response, 'SIGNIN_API_RESPONSE_200');
        console.log('🔐 === SIGNIN API END (SUCCESS) ===\n');
        return response;
    } catch (error) {
        console.error("❌ Signin error:", error);
        const response = NextResponse.json({ error: error.message }, { status: 500 });
        logResponseCookies(response, 'SIGNIN_API_RESPONSE_500');
        console.log('🔐 === SIGNIN API END (ERROR) ===\n');
        return response;
    }
}
