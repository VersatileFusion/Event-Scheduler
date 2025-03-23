const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../src/server');
const User = require('../src/models/User');

// Test data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123',
  timezone: 'UTC',
  language: 'en'
};

// Connect to test database before tests
beforeAll(async () => {
  const testDbUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/event-scheduler-test';
  await mongoose.connect(testDbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

// Clear test database before each test
beforeEach(async () => {
  await User.deleteMany({});
});

// Disconnect from test database after tests
afterAll(async () => {
  await mongoose.connection.close();
});

// User Registration Tests
describe('User Registration', () => {
  
  test('Should register a new user with valid credentials', async () => {
    const response = await request(app)
      .post('/api/users/register')
      .send(testUser)
      .expect(201);
    
    // Verify response format
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('email', testUser.email);
    expect(response.body.user).toHaveProperty('name', testUser.name);
    
    // Verify user is saved in database
    const savedUser = await User.findOne({ email: testUser.email });
    expect(savedUser).not.toBeNull();
    expect(savedUser.name).toBe(testUser.name);
  });
  
  test('Should not register a user with existing email', async () => {
    // Create a user first
    await request(app)
      .post('/api/users/register')
      .send(testUser);
    
    // Try to register again with same email
    const response = await request(app)
      .post('/api/users/register')
      .send(testUser)
      .expect(400);
    
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('message');
  });
  
  test('Should not register a user with invalid email', async () => {
    const invalidUser = { ...testUser, email: 'invalid-email' };
    
    const response = await request(app)
      .post('/api/users/register')
      .send(invalidUser)
      .expect(400);
    
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('errors');
  });
  
  test('Should not register a user with short password', async () => {
    const invalidUser = { ...testUser, password: '123' };
    
    const response = await request(app)
      .post('/api/users/register')
      .send(invalidUser)
      .expect(400);
    
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('errors');
    
    // Verify user is not saved in database
    const savedUser = await User.findOne({ email: invalidUser.email });
    expect(savedUser).toBeNull();
  });
});

// User Login Tests
describe('User Login', () => {
  
  beforeEach(async () => {
    // Create a test user before each login test
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await User.create({
      ...testUser,
      password: hashedPassword
    });
  });
  
  test('Should login successfully with valid credentials', async () => {
    const response = await request(app)
      .post('/api/users/login')
      .send({
        email: testUser.email,
        password: testUser.password
      })
      .expect(200);
    
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('email', testUser.email);
  });
  
  test('Should not login with incorrect password', async () => {
    const response = await request(app)
      .post('/api/users/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword'
      })
      .expect(401);
    
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('message');
  });
  
  test('Should not login with non-existent email', async () => {
    const response = await request(app)
      .post('/api/users/login')
      .send({
        email: 'nonexistent@example.com',
        password: testUser.password
      })
      .expect(401);
    
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('message');
  });
});

// User Profile Tests
describe('User Profile', () => {
  let token;
  let userId;
  
  beforeEach(async () => {
    // Create a test user and get JWT token
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    const user = await User.create({
      ...testUser,
      password: hashedPassword
    });
    
    userId = user._id;
    
    const response = await request(app)
      .post('/api/users/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
    
    token = response.body.token;
  });
  
  test('Should get user profile with valid token', async () => {
    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('email', testUser.email);
    expect(response.body.user).toHaveProperty('name', testUser.name);
  });
  
  test('Should update user profile with valid token', async () => {
    const updatedProfile = {
      name: 'Updated Name',
      timezone: 'Europe/London',
      language: 'fa'
    };
    
    const response = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send(updatedProfile)
      .expect(200);
    
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('name', updatedProfile.name);
    expect(response.body.user).toHaveProperty('timezone', updatedProfile.timezone);
    expect(response.body.user).toHaveProperty('language', updatedProfile.language);
    
    // Verify changes in database
    const updatedUser = await User.findById(userId);
    expect(updatedUser.name).toBe(updatedProfile.name);
    expect(updatedUser.timezone).toBe(updatedProfile.timezone);
    expect(updatedUser.language).toBe(updatedProfile.language);
  });
  
  test('Should not access profile without token', async () => {
    const response = await request(app)
      .get('/api/users/me')
      .expect(401);
    
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('message');
  });
  
  test('Should not update profile without token', async () => {
    const updatedProfile = {
      name: 'Updated Name'
    };
    
    const response = await request(app)
      .put('/api/users/me')
      .send(updatedProfile)
      .expect(401);
    
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('message');
  });
});

// Password Change Tests
describe('Password Change', () => {
  let token;
  let userId;
  
  beforeEach(async () => {
    // Create a test user and get JWT token
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    const user = await User.create({
      ...testUser,
      password: hashedPassword
    });
    
    userId = user._id;
    
    const response = await request(app)
      .post('/api/users/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
    
    token = response.body.token;
  });
  
  test('Should change password with valid credentials', async () => {
    const passwordData = {
      currentPassword: testUser.password,
      newPassword: 'newpassword123'
    };
    
    const response = await request(app)
      .post('/api/users/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send(passwordData)
      .expect(200);
    
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message');
    
    // Verify can login with new password
    const loginResponse = await request(app)
      .post('/api/users/login')
      .send({
        email: testUser.email,
        password: passwordData.newPassword
      })
      .expect(200);
    
    expect(loginResponse.body).toHaveProperty('success', true);
    expect(loginResponse.body).toHaveProperty('token');
  });
  
  test('Should not change password with incorrect current password', async () => {
    const passwordData = {
      currentPassword: 'wrongpassword',
      newPassword: 'newpassword123'
    };
    
    const response = await request(app)
      .post('/api/users/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send(passwordData)
      .expect(401);
    
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('message');
  });
}); 