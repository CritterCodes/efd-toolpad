// src/app/api/auth/auth.route.js

import { Router } from 'express';
import AuthController from './auth.controller.js';

const router = Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user with email and password
 */
router.post('/register', AuthController.register);

/**
 * @route POST /api/auth/login
 * @desc Login a user with email and password
 */
router.post('/login', AuthController.login);

/**
 * @route POST /api/auth/google
 * @desc Handle Google OAuth signup/login
 */
router.post('/google', AuthController.googleAuth);

/**
 * @route GET /api/auth/verify/:token
 * @desc Verify email using a unique token
 */
router.get('/verify/:token', AuthController.verifyEmail);

/**
 * @route POST /api/auth/resend-verification
 * @desc Resend the verification email
 */
router.post('/resend-verification', AuthController.resendVerification);

/**
 * @route POST /api/auth/logout
 * @desc Logout the user and invalidate the session
 */
router.post('/logout', AuthController.logout);

export default router;
