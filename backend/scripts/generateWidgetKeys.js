const { sequelize } = require('../config/database');
const { Company, WidgetKey } = require('../models');
const { getWidgetUrl } = require('../config/urls');
const crypto = require('crypto');

async function generateWidgetKeys() {
  try {
    console.log('Starting widget key generation...');
    
    // Get all companies
    const companies = await Company.findAll({
      attributes: ['id', 'name']
    });
    
    console.log(`Found ${companies.length} companies`);
    
    for (const company of companies) {
      // Check if company already has a widget key
      const existingKey = await WidgetKey.findOne({
        where: { 
          tenant_id: company.id,
          is_active: true 
        }
      });
      
      if (existingKey) {
        console.log(`Company ${company.name} (ID: ${company.id}) already has widget key: ${existingKey.key}`);
        continue;
      }
      
      // Generate a random key (similar to UUID format)
      const key = crypto.randomUUID();
      
      // Create widget key
      const widgetKey = await WidgetKey.create({
        tenant_id: company.id,
        key: key,
        is_active: true
      });
      
      console.log(`Generated widget key for ${company.name} (ID: ${company.id}): ${key}`);
      console.log(`Widget snippet URL: ${getWidgetUrl(key)}`);
    }
    
    console.log('Widget key generation completed!');
    
    // Show summary
    const totalKeys = await WidgetKey.count();
    console.log(`Total widget keys: ${totalKeys}`);
    
  } catch (error) {
    console.error('Error generating widget keys:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the script
generateWidgetKeys();
