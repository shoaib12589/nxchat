const bcrypt = require('bcrypt');
const { User, Company, Plan } = require('../models');

async function createSuperAdmin() {
  try {
    console.log('Creating super admin user...');
    
    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({
      where: { role: 'super_admin' }
    });
    
    if (existingSuperAdmin) {
      console.log('Super admin already exists:', existingSuperAdmin.email);
      return;
    }
    
    // Create super admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const superAdmin = await User.create({
      email: 'admin@nxchat.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'super_admin',
      status: 'active',
      email_verified: true
    });
    
    console.log('Super admin created successfully:', superAdmin.email);
    console.log('Password: admin123');
    
    // Create a test company
    const testCompany = await Company.create({
      name: 'Test Company',
      subdomain: 'testcompany',
      status: 'active',
      plan_id: 2 // Professional plan
    });
    
    console.log('Test company created:', testCompany.name);
    
    // Create company admin for test company
    const companyAdminPassword = await bcrypt.hash('admin123', 10);
    const companyAdmin = await User.create({
      tenant_id: testCompany.id,
      email: 'admin@testcompany.com',
      password: companyAdminPassword,
      name: 'Company Admin',
      role: 'company_admin',
      status: 'active',
      email_verified: true
    });
    
    console.log('Company admin created:', companyAdmin.email);
    
  } catch (error) {
    console.error('Error creating super admin:', error);
    throw error;
  }
}

// Run if this file is executed directly
if (require.main === module) {
  createSuperAdmin()
    .then(() => {
      console.log('Setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = createSuperAdmin;
