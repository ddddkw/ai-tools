import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/AuthService';

export class AuthController {
  // Email registration
  async registerEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      const user = await authService.registerWithEmail(email, password);
      res.status(201).json({ message: 'Registration successful', user });
    } catch (error: any) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Email already exists' });
      }
      next(error);
    }
  }

  // Email login
  async loginEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      const result = await authService.loginWithEmail(email, password);
      res.json({ message: 'Login successful', user: result.user, tokens: result.tokens });
    } catch (error: any) {
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      if (error.message === 'This account uses social login') {
        return res.status(401).json({ error: 'This account uses social login. Please login with GitHub.' });
      }
      next(error);
    }
  }

  // Phone registration
  async registerPhone(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
      }
      
      const user = await authService.registerWithPhone(phone);
      res.status(201).json({ message: 'Registration successful', user });
    } catch (error: any) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Phone number already exists' });
      }
      next(error);
    }
  }

  // Phone login - request code
  async requestPhoneCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
      }
      
      const code = await authService.sendVerificationCode(phone);
      res.json({ message: 'Verification code sent', code }); // In production, don't return code
    } catch (error) {
      next(error);
    }
  }

  // Phone login - verify code
  async verifyPhoneCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, code } = req.body;
      
      if (!phone || !code) {
        return res.status(400).json({ error: 'Phone and code are required' });
      }
      
      const result = await authService.loginWithPhone(phone, code);
      res.json({ message: 'Login successful', user: result.user, tokens: result.tokens });
    } catch (error: any) {
      if (error.message === 'Invalid or expired verification code') {
        return res.status(401).json({ error: 'Invalid or expired verification code' });
      }
      next(error);
    }
  }

  // GitHub OAuth initiation
  githubAuth(req: Request, res: Response) {
    const { clientId, callbackUrl } = req.query;
    
    if (!clientId || !callbackUrl) {
      // Demo mode - just return a mock response
      return res.json({ 
        message: 'GitHub OAuth in demo mode',
        demoUrl: `https://github.com/login/oauth/authorize?client_id=${clientId || 'demo'}&redirect_uri=${callbackUrl || 'demo'}` 
      });
    }
    
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${callbackUrl}`;
    res.json({ authUrl: githubAuthUrl });
  }

  // GitHub OAuth callback
  async githubCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.query;
      
      if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
      }
      
      const result = await authService.handleGithubCallback(code as string);
      
      res.json({ 
        message: result.isNewUser ? 'Account created via GitHub' : 'Login successful',
        user: result.user, 
        tokens: result.tokens 
      });
    } catch (error) {
      next(error);
    }
  }

  // Refresh token
  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }
      
      const tokens = await authService.refreshToken(refreshToken);
      res.json({ message: 'Token refreshed', tokens });
    } catch (error: any) {
      if (error.message === 'Invalid refresh token') {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
      }
      next(error);
    }
  }

  // Logout
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken);
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Get current user
  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const user = await authService.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Remove sensitive fields
      delete (user as any).passwordHash;
      delete (user as any).githubToken;
      delete (user as any).figmaToken;
      
      res.json({ user });
    } catch (error) {
      next(error);
    }
  }

  // Update profile
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const updates = req.body;
      
      const user = await authService.updateUser(userId, {
        email: updates.email,
        phone: updates.phone,
        aiProvider: updates.aiProvider,
      });
      
      res.json({ message: 'Profile updated', user });
    } catch (error) {
      next(error);
    }
  }

  // Change password
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { oldPassword, newPassword } = req.body;
      
      if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Old and new passwords are required' });
      }
      
      await authService.changePassword(userId, oldPassword, newPassword);
      res.json({ message: 'Password changed successfully' });
    } catch (error: any) {
      if (error.message === 'Invalid old password') {
        return res.status(401).json({ error: 'Invalid old password' });
      }
      next(error);
    }
  }
}

export const authController = new AuthController();
