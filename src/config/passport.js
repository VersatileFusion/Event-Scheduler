const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');
const logger = require('../utils/logger');

// Set up Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/users/auth/google/callback`
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // If user exists but doesn't have Google ID, update it
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
            logger.info(`Updated Google ID for user: ${user.email} | آیدی گوگل برای کاربر ${user.email} بروزرسانی شد`);
          }
        } else {
          // Create new user
          user = await User.create({
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            picture: profile.photos[0]?.value || '',
            isEmailVerified: true, // Emails from Google OAuth are verified
            timezone: 'UTC' // Default timezone
          });
          logger.info(`Created new user via Google OAuth: ${user.email} | کاربر جدید از طریق گوگل ایجاد شد: ${user.email}`);
        }

        return done(null, user);
      } catch (error) {
        logger.error('Google OAuth error | خطا در احراز هویت گوگل:', error);
        return done(error, null);
      }
    }
  )
);

// Set up GitHub OAuth strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/users/auth/github/callback`,
      scope: ['user:email'] // Request email access
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Get email from GitHub profile
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        
        if (!email) {
          logger.error('GitHub OAuth error: No email provided | خطا در احراز هویت گیت‌هاب: ایمیل ارائه نشده است');
          return done(new Error('No email provided from GitHub'), null);
        }

        // Check if user already exists
        let user = await User.findOne({ email });

        if (user) {
          // If user exists but doesn't have GitHub ID, update it
          if (!user.githubId) {
            user.githubId = profile.id;
            await user.save();
            logger.info(`Updated GitHub ID for user: ${user.email} | آیدی گیت‌هاب برای کاربر ${user.email} بروزرسانی شد`);
          }
        } else {
          // Create new user
          user = await User.create({
            githubId: profile.id,
            email,
            name: profile.displayName || profile.username,
            picture: profile.photos[0]?.value || '',
            isEmailVerified: true, // Emails from GitHub OAuth are verified
            timezone: 'UTC' // Default timezone
          });
          logger.info(`Created new user via GitHub OAuth: ${user.email} | کاربر جدید از طریق گیت‌هاب ایجاد شد: ${user.email}`);
        }

        return done(null, user);
      } catch (error) {
        logger.error('GitHub OAuth error | خطا در احراز هویت گیت‌هاب:', error);
        return done(error, null);
      }
    }
  )
);

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport; 