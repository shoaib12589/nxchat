const { sequelize } = require('../config/database');
const { Company, WidgetKey } = require('../models');
const { getWidgetUrl } = require('../../config/urls');

async function getWidgetKeys() {
  try {
    console.log('🔑 NxChat Widget Keys\n');
    
    const widgetKeys = await WidgetKey.findAll({
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'status'] }
      ],
      where: { is_active: true },
      order: [['created_at', 'ASC']]
    });
    
    if (widgetKeys.length === 0) {
      console.log('No active widget keys found.');
      return;
    }
    
    console.log('| Company | Widget Key | Snippet URL |');
    console.log('|---------|------------|-------------|');
    
    widgetKeys.forEach(widgetKey => {
      const company = widgetKey.company;
      const snippetUrl = getWidgetUrl(widgetKey.key);
      
      console.log(`| ${company.name} | \`${widgetKey.key}\` | \`${snippetUrl}\` |`);
    });
    
    console.log('\n📝 Usage Example:');
    console.log('```html');
    console.log(`<script src="${getWidgetUrl(widgetKeys[0].key)}"></script>`);
    console.log('```');
    
  } catch (error) {
    console.error('Error getting widget keys:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the script
getWidgetKeys();
