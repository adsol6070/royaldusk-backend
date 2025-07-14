import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/user.service";

// Extend Express Request interface to include 'user'
declare global {
  namespace Express {
    interface UserPayload {
      id: string;
      [key: string]: any;
    }
    interface Request {
      user?: UserPayload;
    }
  }
}
import { rabbitMQ } from "../services/rabbitmq.service";
import { asyncHandler } from "@repo/utils/asyncHandler";
import { ApiError } from "@repo/utils/ApiError";
import { admin } from "@repo/utils/FirebaseAdmin";

// ==================== SIMPLIFIED EMAIL AUTH ====================

const sendOTP = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { email, type = 'email' } = req.body;

    if (!email || type !== 'email') {
      throw new ApiError(400, "Valid email is required");
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const existingUser = await UserService.findUniqueUser(
      { email: normalizedEmail },
      { id: true, email: true, verified: true, profile_completed: true }
    );

    const isNewUser = !existingUser;

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP in database
    await UserService.storeOTP({
      email: normalizedEmail,
      otp,
      type,
      expiresAt
    });

    // Send OTP email
    await rabbitMQ.publishToQueue("email.otp", {
      to: normalizedEmail,
      subject: "Your Royal Dusk verification code",
      templateName: "send-otp",
      templateData: {
        otp,
        expiresIn: 5
      },
    });

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      data: {
        isNewUser,
        expiresIn: 300 // 5 minutes in seconds
      }
    });
  } catch (error) {
    next(error);
  }
};

const verifyOTP = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { email, otp, type = 'email' } = req.body;

    if (!email || !otp) {
      throw new ApiError(400, "Email and OTP are required");
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify OTP
    const isValidOTP = await UserService.verifyOTP(normalizedEmail, otp, type);

    if (!isValidOTP) {
      throw new ApiError(400, "Invalid or expired OTP");
    }

    // Check if user exists and profile is complete
    const user = await UserService.findUniqueUser(
      { email: normalizedEmail },
      {
        id: true,
        email: true,
        name: true,
        phone: true,
        verified: true,
        profile_completed: true,
        role: true,
        createdAt: true
      }
    );

    if (user && user.profile_completed) {
      // Existing user with complete profile - return full login response
      await UserService.updateUser(
        { id: user.id },
        { verified: true }
      );

      const { access_token, refresh_token } = await UserService.signTokens(user);

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          isNewUser: false,
          needsProfileCompletion: false,
          token: access_token,
          refreshToken: refresh_token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            verified: true,
            joinedDate: user.createdAt
          }
        }
      });
    } else {
      // New user or incomplete profile
      let userId = user?.id;

      if (!user) {
        // Create basic user record
        const newUser = await UserService.createUser({
          email: normalizedEmail,
          password: "EMAIL_AUTH", // placeholder
          verified: true,
          profile_completed: false
        });
        userId = newUser.id;
      }

      // Generate temporary token for profile completion
      const temporaryToken = await UserService.generateTemporaryToken(normalizedEmail);

      return res.status(200).json({
        success: true,
        message: "OTP verified, please complete your profile",
        data: {
          isNewUser: !user,
          needsProfileCompletion: true,
          temporaryToken,
          user: null
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

const completeProfile = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { name, phone } = req.body;
    const temporaryToken = req.headers.authorization?.replace('Bearer ', '');

    if (!temporaryToken) {
      throw new ApiError(401, "Temporary token is required");
    }

    if (!name || !phone) {
      throw new ApiError(400, "Name and phone are required");
    }

    // Verify temporary token and get email
    const email = await UserService.verifyTemporaryToken(temporaryToken);

    if (!email) {
      throw new ApiError(401, "Invalid or expired temporary token");
    }

    // Find user by email
    const user = await UserService.findUniqueUser(
      { email },
      { id: true, email: true, verified: true }
    );

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Update user profile
    const updatedUser = await UserService.updateUser(
      { id: user.id },
      {
        name: name.trim(),
        phone: phone.trim(),
        profile_completed: true,
        verified: true
      },
      {
        id: true,
        email: true,
        name: true,
        phone: true,
        verified: true,
        role: true,
        createdAt: true
      }
    );

    // Generate permanent tokens
    const { access_token, refresh_token } = await UserService.signTokens(updatedUser);

    res.status(200).json({
      success: true,
      message: "Profile completed successfully",
      data: {
        token: access_token,
        refreshToken: refresh_token,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          phone: updatedUser.phone,
          verified: true,
          joinedDate: updatedUser.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== SOCIAL LOGIN ====================

const googleLogin = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      throw new ApiError(400, "ID token is required");
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    if (!email) {
      throw new ApiError(400, "Email is required from Google");
    }

    // Check if user exists
    let user = await UserService.findUniqueUser(
      { email: email.toLowerCase() },
      {
        id: true,
        email: true,
        name: true,
        phone: true,
        verified: true,
        profile_completed: true,
        role: true,
        createdAt: true
      }
    );

    if (!user) {
      // Create new user from Google
      user = await UserService.createUser({
        email: email.toLowerCase(),
        name: name || "Google User",
        password: "GOOGLE_AUTH",
        verified: true,
        profile_completed: !!name, // Consider profile complete if Google provides name
        provider: "google",
        provider_id: uid
      });
    } else if (!user.verified) {
      // Mark existing user as verified
      await UserService.updateUser(
        { id: user.id },
        { verified: true, provider: "google", provider_id: uid }
      );
    }

    const { access_token, refresh_token } = await UserService.signTokens(user);

    res.status(200).json({
      success: true,
      message: "Google login successful",
      data: {
        token: access_token,
        refreshToken: refresh_token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          verified: true,
          joinedDate: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const appleLogin = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { identityToken, email, name } = req.body;

    if (!identityToken) {
      throw new ApiError(400, "Identity token is required");
    }

    // Verify Apple identity token (you'll need to implement this)
    const appleUser = await UserService.verifyAppleToken(identityToken);

    if (!appleUser || !appleUser.email) {
      throw new ApiError(400, "Invalid Apple token or email not provided");
    }

    const userEmail = email || appleUser.email;

    // Check if user exists
    let user = await UserService.findUniqueUser(
      { email: userEmail.toLowerCase() },
      {
        id: true,
        email: true,
        name: true,
        phone: true,
        verified: true,
        profile_completed: true,
        role: true,
        createdAt: true
      }
    );

    if (!user) {
      // Create new user from Apple
      user = await UserService.createUser({
        email: userEmail.toLowerCase(),
        name: name || appleUser.name || "Apple User",
        password: "APPLE_AUTH",
        verified: true,
        profile_completed: !!(name || appleUser.name),
        provider: "apple",
        provider_id: appleUser.sub
      });
    } else if (!user.verified) {
      // Mark existing user as verified
      await UserService.updateUser(
        { id: user.id },
        { verified: true, provider: "apple", provider_id: appleUser.sub }
      );
    }

    const { access_token, refresh_token } = await UserService.signTokens(user);

    res.status(200).json({
      success: true,
      message: "Apple login successful",
      data: {
        token: access_token,
        refreshToken: refresh_token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          verified: true,
          joinedDate: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== TOKEN MANAGEMENT ====================

const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ApiError(400, "Refresh token is required");
    }

    const tokens = await UserService.refreshTokens(refreshToken);

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: tokens
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    // Invalidate refresh token if needed
    const { refreshToken } = req.body;

    if (refreshToken) {
      await UserService.invalidateRefreshToken(refreshToken);
    }

    res.status(200).json({
      success: true,
      message: "Successfully logged out",
    });
  } catch (error) {
    next(error);
  }
};

// ==================== USER PROFILE ====================

const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const userId = req.user?.id; // From auth middleware

    if (!userId) {
      throw new ApiError(401, "User not authenticated");
    }

    const user = await UserService.findUniqueUser(
      { id: userId },
      {
        id: true,
        email: true,
        name: true,
        phone: true,
        verified: true,
        profile_completed: true,
        createdAt: true
      }
    );

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          verified: user.verified,
          joinedDate: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  // Simplified email auth
  sendOTP: asyncHandler(sendOTP),
  verifyOTP: asyncHandler(verifyOTP),
  completeProfile: asyncHandler(completeProfile),

  // Social login
  googleLogin: asyncHandler(googleLogin),
  appleLogin: asyncHandler(appleLogin),

  // Token management
  refreshToken: asyncHandler(refreshToken),
  logout: asyncHandler(logout),

  // User profile
  getProfile: asyncHandler(getProfile),
};