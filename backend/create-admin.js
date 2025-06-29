const axios = require('axios');

async function createAdminUser() {
  try {
    const response = await axios.post('http://localhost:3000/auth/register', {
      email: 'admin@example.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN'
    });
    
    console.log('Admin user created successfully:', response.data);
  } catch (error) {
    console.error('Error creating admin user:', error.response?.data || error.message);
  }
}

createAdminUser(); 