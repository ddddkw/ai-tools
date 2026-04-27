import { Router } from 'express';
import { authController } from '../controllers/AuthController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Email auth
router.post('/register/email', (req, res, next) => authController.registerEmail(req, res, next));
router.post('/login/email', (req, res, next) => authController.loginEmail(req, res, next));

// Password reset
router.post('/forgot-password', (req, res, next) => authController.forgotPassword(req, res, next));
router.post('/reset-password', (req, res, next) => authController.resetPassword(req, res, next));

// Phone auth
router.post('/register/phone', (req, res, next) => authController.registerPhone(req, res, next));
router.post('/login/phone/request-code', (req, res, next) => authController.requestPhoneCode(req, res, next));
router.post('/login/phone/verify', (req, res, next) => authController.verifyPhoneCode(req, res, next));

// GitHub OAuth
router.get('/github', (req, res) => authController.githubAuth(req, res));
router.get('/github/callback', (req, res, next) => authController.githubCallback(req, res, next));

// Token management
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));

// User info
router.get('/me', authMiddleware, (req, res, next) => authController.me(req, res, next));

export default router;
