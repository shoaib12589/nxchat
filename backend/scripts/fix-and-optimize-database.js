const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const DB_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: process.env.MYSQL_DB || 'nxchat',
  port: process.env.MYSQL_PORT || 3306,
  multipleStatements: true
};

// Expected tables and their relationships
const TABLE_RELATIONSHIPS = {
  users: {
    foreignKeys: [
      { column: 'tenant_id', references: { table: 'companies', column: 'id' }, nullable: true },
      { column: 'department_id', references: { table: 'departments', column: 'id' }, nullable: true }
    ],
    indexes: [
      { name: 'idx_users_tenant_id', columns: ['tenant_id'] },
      { name: 'idx_users_department_id', columns: ['department_id'] },
      { name: 'idx_users_email', columns: ['email'], unique: true },
      { name: 'idx_users_role', columns: ['role'] },
      { name: 'idx_users_status', columns: ['status'] },
      { name: 'idx_users_last_login', columns: ['last_login'] },
      { name: 'idx_users_tenant_role', columns: ['tenant_id', 'role'] },
      { name: 'idx_users_tenant_status', columns: ['tenant_id', 'status'] }
    ],
    primaryKey: 'id',
    autoIncrement: true
  },
  companies: {
    foreignKeys: [
      { column: 'plan_id', references: { table: 'plans', column: 'id' }, nullable: true }
    ],
    indexes: [
      { name: 'idx_companies_status', columns: ['status'] },
      { name: 'idx_companies_plan_id', columns: ['plan_id'] },
      { name: 'idx_companies_stripe_customer_id', columns: ['stripe_customer_id'] },
      { name: 'idx_companies_created_at', columns: ['created_at'] }
    ],
    primaryKey: 'id',
    autoIncrement: true
  },
  departments: {
    foreignKeys: [
      { column: 'tenant_id', references: { table: 'companies', column: 'id' }, nullable: false }
    ],
    indexes: [
      { name: 'idx_departments_tenant_id', columns: ['tenant_id'] },
      { name: 'idx_departments_status', columns: ['status'] }
    ],
    primaryKey: 'id',
    autoIncrement: true
  },
  chats: {
    foreignKeys: [
      { column: 'tenant_id', references: { table: 'companies', column: 'id' }, nullable: false },
      { column: 'customer_id', references: { table: 'users', column: 'id' }, nullable: true },
      { column: 'agent_id', references: { table: 'users', column: 'id' }, nullable: true },
      { column: 'department_id', references: { table: 'departments', column: 'id' }, nullable: true }
    ],
    indexes: [
      { name: 'idx_chats_tenant_id', columns: ['tenant_id'] },
      { name: 'idx_chats_customer_id', columns: ['customer_id'] },
      { name: 'idx_chats_agent_id', columns: ['agent_id'] },
      { name: 'idx_chats_department_id', columns: ['department_id'] },
      { name: 'idx_chats_status', columns: ['status'] },
      { name: 'idx_chats_created_at', columns: ['created_at'] },
      { name: 'idx_chats_updated_at', columns: ['updated_at'] },
      { name: 'idx_chats_tenant_status', columns: ['tenant_id', 'status'] },
      { name: 'idx_chats_started_at', columns: ['started_at'] }
    ],
    primaryKey: 'id',
    autoIncrement: true
  },
  messages: {
    foreignKeys: [
      { column: 'chat_id', references: { table: 'chats', column: 'id' }, nullable: false },
      { column: 'sender_id', references: { table: 'users', column: 'id' }, nullable: true }
    ],
    indexes: [
      { name: 'idx_messages_chat_id', columns: ['chat_id'] },
      { name: 'idx_messages_sender_id', columns: ['sender_id'] },
      { name: 'idx_messages_sender_type', columns: ['sender_type'] },
      { name: 'idx_messages_created_at', columns: ['created_at'] },
      { name: 'idx_messages_chat_created', columns: ['chat_id', 'created_at'] },
      { name: 'idx_messages_is_read', columns: ['is_read'] }
    ],
    primaryKey: 'id',
    autoIncrement: true
  },
  tickets: {
    foreignKeys: [
      { column: 'tenant_id', references: { table: 'companies', column: 'id' }, nullable: false },
      { column: 'customer_id', references: { table: 'users', column: 'id' }, nullable: true },
      { column: 'agent_id', references: { table: 'users', column: 'id' }, nullable: true },
      { column: 'department_id', references: { table: 'departments', column: 'id' }, nullable: true }
    ],
    indexes: [
      { name: 'idx_tickets_tenant_id', columns: ['tenant_id'] },
      { name: 'idx_tickets_customer_id', columns: ['customer_id'] },
      { name: 'idx_tickets_agent_id', columns: ['agent_id'] },
      { name: 'idx_tickets_department_id', columns: ['department_id'] },
      { name: 'idx_tickets_status', columns: ['status'] },
      { name: 'idx_tickets_priority', columns: ['priority'] },
      { name: 'idx_tickets_created_at', columns: ['created_at'] },
      { name: 'idx_tickets_tenant_status', columns: ['tenant_id', 'status'] }
    ],
    primaryKey: 'id',
    autoIncrement: true
  },
  visitors: {
    foreignKeys: [
      { column: 'tenant_id', references: { table: 'companies', column: 'id' }, nullable: false },
      { column: 'assigned_agent_id', references: { table: 'users', column: 'id' }, nullable: true },
      { column: 'brand_id', references: { table: 'brands', column: 'id' }, nullable: true }
    ],
    indexes: [
      { name: 'idx_visitors_tenant_id', columns: ['tenant_id'] },
      { name: 'idx_visitors_assigned_agent_id', columns: ['assigned_agent_id'] },
      { name: 'idx_visitors_brand_id', columns: ['brand_id'] },
      { name: 'idx_visitors_status', columns: ['status'] },
      { name: 'idx_visitors_last_activity', columns: ['last_activity'] },
      { name: 'idx_visitors_created_at', columns: ['created_at'] },
      { name: 'idx_visitors_session_id', columns: ['session_id'], unique: true },
      { name: 'idx_visitors_ip_address', columns: ['ip_address'] }
    ],
    primaryKey: 'id',
    autoIncrement: false // Visitors uses UUID
  },
  visitor_messages: {
    foreignKeys: [
      { column: 'visitor_id', references: { table: 'visitors', column: 'id' }, nullable: false },
      { column: 'tenant_id', references: { table: 'companies', column: 'id' }, nullable: false },
      { column: 'sender_id', references: { table: 'users', column: 'id' }, nullable: true }
    ],
    indexes: [
      { name: 'idx_visitor_messages_visitor_id', columns: ['visitor_id'] },
      { name: 'idx_visitor_messages_tenant_id', columns: ['tenant_id'] },
      { name: 'idx_visitor_messages_sender_id', columns: ['sender_id'] },
      { name: 'idx_visitor_messages_created_at', columns: ['created_at'] },
      { name: 'idx_visitor_messages_is_read', columns: ['is_read'] },
      { name: 'idx_visitor_messages_visitor_created', columns: ['visitor_id', 'created_at'] }
    ],
    primaryKey: 'id',
    autoIncrement: true
  },
  visitor_activities: {
    foreignKeys: [
      { column: 'visitor_id', references: { table: 'visitors', column: 'id' }, nullable: false },
      { column: 'tenant_id', references: { table: 'companies', column: 'id' }, nullable: false }
    ],
    indexes: [
      { name: 'idx_visitor_activities_visitor_id', columns: ['visitor_id'] },
      { name: 'idx_visitor_activities_tenant_id', columns: ['tenant_id'] },
      { name: 'idx_visitor_activities_timestamp', columns: ['timestamp'] },
      { name: 'idx_visitor_activities_type', columns: ['activity_type'] },
      { name: 'idx_visitor_activities_visitor_timestamp', columns: ['visitor_id', 'timestamp'] },
      { name: 'idx_visitor_activities_session_id', columns: ['session_id'] }
    ],
    primaryKey: 'id',
    autoIncrement: true
  },
  notifications: {
    foreignKeys: [
      { column: 'user_id', references: { table: 'users', column: 'id' }, nullable: false }
    ],
    indexes: [
      { name: 'idx_notifications_user_id', columns: ['user_id'] },
      { name: 'idx_notifications_read', columns: ['`read`'] },
      { name: 'idx_notifications_created_at', columns: ['created_at'] },
      { name: 'idx_notifications_user_read', columns: ['user_id', '`read`'] },
      { name: 'idx_notifications_type', columns: ['type'] }
    ],
    primaryKey: 'id',
    autoIncrement: true
  },
  brands: {
    foreignKeys: [
      { column: 'tenant_id', references: { table: 'companies', column: 'id' }, nullable: false }
    ],
    indexes: [
      { name: 'idx_brands_tenant_id', columns: ['tenant_id'] },
      { name: 'idx_brands_status', columns: ['status'] },
      { name: 'idx_brands_tenant_status', columns: ['tenant_id', 'status'] }
    ],
    primaryKey: 'id',
    autoIncrement: true
  },
  brand_agents: {
    foreignKeys: [
      { column: 'brand_id', references: { table: 'brands', column: 'id' }, nullable: false },
      { column: 'agent_id', references: { table: 'users', column: 'id' }, nullable: false },
      { column: 'assigned_by', references: { table: 'users', column: 'id' }, nullable: true }
    ],
    indexes: [
      { name: 'idx_brand_agents_brand_id', columns: ['brand_id'] },
      { name: 'idx_brand_agents_agent_id', columns: ['agent_id'] },
      { name: 'idx_brand_agents_status', columns: ['status'] },
      { name: 'idx_brand_agents_brand_agent', columns: ['brand_id', 'agent_id'], unique: true }
    ],
    primaryKey: 'id',
    autoIncrement: true
  },
  widget_keys: {
    foreignKeys: [
      { column: 'tenant_id', references: { table: 'companies', column: 'id' }, nullable: false },
      { column: 'brand_id', references: { table: 'brands', column: 'id' }, nullable: true }
    ],
    indexes: [
      { name: 'idx_widget_keys_tenant_id', columns: ['tenant_id'] },
      { name: 'idx_widget_keys_brand_id', columns: ['brand_id'] },
      { name: 'idx_widget_keys_key', columns: ['`key`'], unique: true }
    ],
    primaryKey: 'id',
    autoIncrement: false // Uses UUID
  },
  banned_ips: {
    foreignKeys: [
      { column: 'tenant_id', references: { table: 'companies', column: 'id' }, nullable: false },
      { column: 'banned_by', references: { table: 'users', column: 'id' }, nullable: true }
    ],
    indexes: [
      { name: 'idx_banned_ips_tenant_id', columns: ['tenant_id'] },
      { name: 'idx_banned_ips_ip_address', columns: ['ip_address'] },
      { name: 'idx_banned_ips_is_active', columns: ['is_active'] }
    ],
    primaryKey: 'id',
    autoIncrement: true
  }
};

async function connectToDatabase() {
  try {
    const connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected to MySQL database');
    return connection;
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    process.exit(1);
  }
}

async function checkTableExists(connection, tableName) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) as count FROM information_schema.tables 
     WHERE table_schema = ? AND table_name = ?`,
    [DB_CONFIG.database, tableName]
  );
  return rows[0].count > 0;
}

async function checkOrphanedForeignKeys(connection) {
  console.log('\n🔍 Checking for orphaned foreign key references...');
  const errors = [];

  for (const [tableName, config] of Object.entries(TABLE_RELATIONSHIPS)) {
    if (!(await checkTableExists(connection, tableName))) {
      console.log(`⚠️  Table ${tableName} does not exist, skipping`);
      continue;
    }

    for (const fk of config.foreignKeys) {
      const refTable = fk.references.table;
      const refColumn = fk.references.column;

      if (!(await checkTableExists(connection, refTable))) {
        console.log(`⚠️  Referenced table ${refTable} does not exist, skipping FK check`);
        continue;
      }

      try {
        const query = `
          SELECT COUNT(*) as count 
          FROM \`${tableName}\` t
          LEFT JOIN \`${refTable}\` r ON t.\`${fk.column}\` = r.\`${refColumn}\`
          WHERE t.\`${fk.column}\` IS NOT NULL 
            AND r.\`${refColumn}\` IS NULL
        `;

        const [rows] = await connection.execute(query);
        const orphanCount = rows[0].count;

        if (orphanCount > 0) {
          errors.push({
            table: tableName,
            column: fk.column,
            referencedTable: refTable,
            count: orphanCount,
            type: 'orphaned_fk'
          });
          console.log(`❌ Found ${orphanCount} orphaned references in ${tableName}.${fk.column} -> ${refTable}.${refColumn}`);
        }
      } catch (error) {
        console.log(`⚠️  Error checking ${tableName}.${fk.column}: ${error.message}`);
      }
    }
  }

  return errors;
}

async function fixOrphanedForeignKeys(connection, errors) {
  console.log('\n🔧 Fixing orphaned foreign key references...');
  let fixed = 0;

  for (const error of errors) {
    if (error.type !== 'orphaned_fk') continue;

    const config = TABLE_RELATIONSHIPS[error.table];
    const fk = config.foreignKeys.find(f => f.column === error.column);
    
    if (fk && fk.nullable) {
      try {
        const refCol = 'id'; // All referenced tables use 'id' as primary key
        const fixedQuery = `
          UPDATE \`${error.table}\` t
          LEFT JOIN \`${error.referencedTable}\` r ON t.\`${error.column}\` = r.\`${refCol}\`
          SET t.\`${error.column}\` = NULL
          WHERE t.\`${error.column}\` IS NOT NULL 
            AND r.\`${refCol}\` IS NULL
        `;

        const [result] = await connection.execute(fixedQuery);
        if (result.affectedRows > 0) {
          console.log(`✅ Fixed ${result.affectedRows} orphaned references in ${error.table}.${error.column}`);
          fixed += result.affectedRows;
        }
      } catch (err) {
        console.log(`⚠️  Could not fix ${error.table}.${error.column}: ${err.message}`);
      }
    } else {
      // For non-nullable foreign keys, we need to delete the orphaned records
      console.log(`⚠️  Cannot set ${error.table}.${error.column} to NULL (not nullable). Deleting orphaned records...`);
      try {
        const refCol = 'id';
        const deleteQuery = `
          DELETE FROM \`${error.table}\`
          WHERE \`${error.column}\` IS NOT NULL
            AND \`${error.column}\` NOT IN (SELECT \`${refCol}\` FROM \`${error.referencedTable}\`)
        `;
        const [result] = await connection.execute(deleteQuery);
        if (result.affectedRows > 0) {
          console.log(`✅ Deleted ${result.affectedRows} orphaned records from ${error.table}`);
          fixed += result.affectedRows;
        }
      } catch (err) {
        console.log(`❌ Could not delete orphaned records from ${error.table}: ${err.message}`);
      }
    }
  }

  return fixed;
}

async function checkMissingIndexes(connection) {
  console.log('\n🔍 Checking for missing indexes...');
  const missingIndexes = [];

  for (const [tableName, config] of Object.entries(TABLE_RELATIONSHIPS)) {
    if (!(await checkTableExists(connection, tableName))) {
      continue;
    }

    for (const index of config.indexes) {
      try {
        const [rows] = await connection.execute(
          `SELECT COUNT(*) as count 
           FROM information_schema.statistics 
           WHERE table_schema = ? 
             AND table_name = ? 
             AND index_name = ?`,
          [DB_CONFIG.database, tableName, index.name]
        );

        if (rows[0].count === 0) {
          missingIndexes.push({ table: tableName, index });
        }
      } catch (error) {
        console.log(`⚠️  Error checking index ${index.name} on ${tableName}: ${error.message}`);
      }
    }
  }

  return missingIndexes;
}

async function createMissingIndexes(connection, missingIndexes) {
  console.log('\n🔧 Creating missing indexes...');
  let created = 0;

  for (const { table, index } of missingIndexes) {
    try {
      // Escape column names that might be reserved keywords
      const columns = index.columns.map(col => {
        // Remove existing backticks and re-add them
        const cleanCol = col.replace(/`/g, '');
        return `\`${cleanCol}\``;
      }).join(', ');
      const unique = index.unique ? 'UNIQUE' : '';
      const query = `CREATE ${unique} INDEX ${index.name} ON \`${table}\` (${columns})`;

      await connection.execute(query);
      console.log(`✅ Created index ${index.name} on ${table}`);
      created++;
    } catch (error) {
      // If it's a duplicate key error, try to fix duplicates first
      if (error.message.includes('Duplicate entry')) {
        console.log(`⚠️  Duplicate entries found for ${index.name} on ${table}. Fixing duplicates...`);
        try {
          await fixDuplicateEntries(connection, table, index);
          // Wait a moment for the fix to complete
          await new Promise(resolve => setTimeout(resolve, 100));
          // Try creating index again
          const columns = index.columns.map(col => {
            const cleanCol = col.replace(/`/g, '');
            return `\`${cleanCol}\``;
          }).join(', ');
          const unique = index.unique ? 'UNIQUE' : '';
          const query = `CREATE ${unique} INDEX ${index.name} ON \`${table}\` (${columns})`;
          await connection.execute(query);
          console.log(`✅ Created index ${index.name} on ${table} after fixing duplicates`);
          created++;
        } catch (fixError) {
          // If still fails, create non-unique index instead
          if (index.unique && fixError.message.includes('Duplicate entry')) {
            console.log(`⚠️  Still have duplicates. Creating non-unique index instead...`);
            try {
              const columns = index.columns.map(col => {
                const cleanCol = col.replace(/`/g, '');
                return `\`${cleanCol}\``;
              }).join(', ');
              const query = `CREATE INDEX ${index.name} ON \`${table}\` (${columns})`;
              await connection.execute(query);
              console.log(`✅ Created non-unique index ${index.name} on ${table}`);
              created++;
            } catch (nonUniqueError) {
              console.log(`❌ Failed to create non-unique index ${index.name} on ${table}: ${nonUniqueError.message}`);
            }
          } else {
            console.log(`❌ Failed to fix duplicates and create index ${index.name} on ${table}: ${fixError.message}`);
          }
        }
      } else {
        console.log(`❌ Failed to create index ${index.name} on ${table}: ${error.message}`);
      }
    }
  }

  return created;
}

async function fixDuplicateEntries(connection, table, index) {
  // For unique indexes with duplicates, we need to handle them
  if (index.unique && index.columns.length === 1) {
    const column = index.columns[0].replace(/`/g, '');
    
    // Check if table has an id column
    const [cols] = await connection.execute(`SHOW COLUMNS FROM \`${table}\` LIKE 'id'`);
    const [createdCols] = await connection.execute(`SHOW COLUMNS FROM \`${table}\` LIKE 'created_at'`);
    
    if (cols.length > 0) {
      // Check if id is integer or UUID
      const idType = cols[0].Type.toLowerCase();
      if (idType.includes('int')) {
        // Integer ID - remove duplicates, keeping the first occurrence (lowest id)
        const query = `
          DELETE t1 FROM \`${table}\` t1
          INNER JOIN \`${table}\` t2 
          WHERE t1.id > t2.id 
            AND t1.\`${column}\` = t2.\`${column}\`
            AND t1.\`${column}\` IS NOT NULL
        `;
        await connection.execute(query);
      } else if (createdCols.length > 0) {
        // UUID ID - keep the oldest by created_at
        const query = `
          DELETE t1 FROM \`${table}\` t1
          INNER JOIN \`${table}\` t2 
          WHERE t1.created_at > t2.created_at 
            AND t1.\`${column}\` = t2.\`${column}\`
            AND t1.\`${column}\` IS NOT NULL
        `;
        await connection.execute(query);
      } else {
        // No created_at, update duplicates to make them unique
        const [duplicates] = await connection.execute(`
          SELECT \`${column}\`, COUNT(*) as cnt 
          FROM \`${table}\` 
          WHERE \`${column}\` IS NOT NULL 
          GROUP BY \`${column}\` 
          HAVING cnt > 1
        `);
        
        for (const dup of duplicates) {
          const [rows] = await connection.execute(`
            SELECT id FROM \`${table}\` 
            WHERE \`${column}\` = ? 
            ORDER BY ${createdCols.length > 0 ? 'created_at' : 'id'} ASC
          `, [dup[column]]);
          
          // Keep first, update others
          for (let i = 1; i < rows.length; i++) {
            const newValue = `${dup[column]}_${Date.now()}_${i}`;
            await connection.execute(`
              UPDATE \`${table}\` 
              SET \`${column}\` = ? 
              WHERE id = ?
            `, [newValue, rows[i].id]);
          }
        }
      }
    } else if (createdCols.length > 0) {
      // No id column, use created_at
      const query = `
        DELETE t1 FROM \`${table}\` t1
        INNER JOIN \`${table}\` t2 
        WHERE t1.created_at > t2.created_at 
          AND t1.\`${column}\` = t2.\`${column}\`
          AND t1.\`${column}\` IS NOT NULL
      `;
      await connection.execute(query);
    }
  }
}

async function checkAutoIncrement(connection) {
  console.log('\n🔍 Checking AUTO_INCREMENT settings...');
  const issues = [];

  for (const [tableName, config] of Object.entries(TABLE_RELATIONSHIPS)) {
    if (!(await checkTableExists(connection, tableName)) || config.autoIncrement === false) {
      continue;
    }

    try {
      const [rows] = await connection.execute(
        `SHOW COLUMNS FROM \`${tableName}\` WHERE Field = ? AND Extra LIKE '%auto_increment%'`,
        [config.primaryKey]
      );

      if (rows.length === 0) {
        issues.push({ table: tableName, column: config.primaryKey });
        console.log(`❌ Missing AUTO_INCREMENT on ${tableName}.${config.primaryKey}`);
      }
    } catch (error) {
      console.log(`⚠️  Error checking AUTO_INCREMENT on ${tableName}: ${error.message}`);
    }
  }

  return issues;
}

async function fixAutoIncrement(connection, issues) {
  console.log('\n🔧 Fixing AUTO_INCREMENT settings...');
  let fixed = 0;

  for (const issue of issues) {
    try {
      // Temporarily disable foreign key checks
      await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
      
      // Get current column definition
      const [cols] = await connection.execute(
        `SHOW COLUMNS FROM \`${issue.table}\` WHERE Field = ?`,
        [issue.column]
      );

      if (cols.length === 0) {
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        continue;
      }

      const col = cols[0];
      const type = col.Type;
      const nullConstraint = col.Null === 'NO' ? 'NOT NULL' : 'NULL';
      const defaultVal = col.Default !== null && col.Default !== undefined ? `DEFAULT ${col.Default}` : '';

      const query = `ALTER TABLE \`${issue.table}\` 
                     MODIFY \`${issue.column}\` ${type} ${nullConstraint} ${defaultVal} AUTO_INCREMENT`;

      await connection.execute(query);
      
      // Re-enable foreign key checks
      await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      
      console.log(`✅ Fixed AUTO_INCREMENT on ${issue.table}.${issue.column}`);
      fixed++;
    } catch (error) {
      // Make sure to re-enable foreign key checks even on error
      await connection.execute('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
      console.log(`❌ Failed to fix AUTO_INCREMENT on ${issue.table}.${issue.column}: ${error.message}`);
    }
  }

  return fixed;
}

async function optimizeTables(connection) {
  console.log('\n🔧 Optimizing tables...');
  const tables = Object.keys(TABLE_RELATIONSHIPS);
  let optimized = 0;

  for (const table of tables) {
    if (!(await checkTableExists(connection, table))) {
      continue;
    }

    try {
      await connection.execute(`OPTIMIZE TABLE ${table}`);
      console.log(`✅ Optimized table ${table}`);
      optimized++;
    } catch (error) {
      console.log(`⚠️  Could not optimize ${table}: ${error.message}`);
    }
  }

  return optimized;
}

async function analyzeTables(connection) {
  console.log('\n🔧 Analyzing tables for query optimization...');
  const tables = Object.keys(TABLE_RELATIONSHIPS);
  let analyzed = 0;

  for (const table of tables) {
    if (!(await checkTableExists(connection, table))) {
      continue;
    }

    try {
      await connection.execute(`ANALYZE TABLE ${table}`);
      console.log(`✅ Analyzed table ${table}`);
      analyzed++;
    } catch (error) {
      console.log(`⚠️  Could not analyze ${table}: ${error.message}`);
    }
  }

  return analyzed;
}

async function checkTableEngine(connection) {
  console.log('\n🔍 Checking table engines...');
  const issues = [];
  const tables = Object.keys(TABLE_RELATIONSHIPS);

  for (const table of tables) {
    if (!(await checkTableExists(connection, table))) {
      continue;
    }

    try {
      const [rows] = await connection.execute(
        `SELECT ENGINE FROM information_schema.TABLES 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [DB_CONFIG.database, table]
      );

      if (rows.length > 0 && rows[0].ENGINE !== 'InnoDB') {
        issues.push({ table, engine: rows[0].ENGINE });
        console.log(`⚠️  Table ${table} uses ${rows[0].ENGINE} instead of InnoDB`);
      }
    } catch (error) {
      console.log(`⚠️  Error checking engine for ${table}: ${error.message}`);
    }
  }

  return issues;
}

async function fixTableEngine(connection, issues) {
  console.log('\n🔧 Converting tables to InnoDB...');
  let fixed = 0;

  for (const issue of issues) {
    try {
      await connection.execute(`ALTER TABLE ${issue.table} ENGINE=InnoDB`);
      console.log(`✅ Converted ${issue.table} to InnoDB`);
      fixed++;
    } catch (error) {
      console.log(`❌ Failed to convert ${issue.table}: ${error.message}`);
    }
  }

  return fixed;
}

async function checkCharset(connection) {
  console.log('\n🔍 Checking table charset...');
  const issues = [];
  const tables = Object.keys(TABLE_RELATIONSHIPS);

  for (const table of tables) {
    if (!(await checkTableExists(connection, table))) {
      continue;
    }

    try {
      const [rows] = await connection.execute(
        `SELECT TABLE_COLLATION FROM information_schema.TABLES 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [DB_CONFIG.database, table]
      );

      if (rows.length > 0 && !rows[0].TABLE_COLLATION.includes('utf8mb4')) {
        issues.push({ table, collation: rows[0].TABLE_COLLATION });
        console.log(`⚠️  Table ${table} uses ${rows[0].TABLE_COLLATION} instead of utf8mb4`);
      }
    } catch (error) {
      console.log(`⚠️  Error checking charset for ${table}: ${error.message}`);
    }
  }

  return issues;
}

async function fixCharset(connection, issues) {
  console.log('\n🔧 Converting tables to utf8mb4...');
  let fixed = 0;

  for (const issue of issues) {
    try {
      await connection.execute(
        `ALTER TABLE ${issue.table} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      console.log(`✅ Converted ${issue.table} to utf8mb4_unicode_ci`);
      fixed++;
    } catch (error) {
      console.log(`❌ Failed to convert ${issue.table}: ${error.message}`);
    }
  }

  return fixed;
}

async function main() {
  const connection = await connectToDatabase();
  const results = {
    orphanedFks: 0,
    fixedOrphanedFks: 0,
    missingIndexes: 0,
    createdIndexes: 0,
    autoIncrementIssues: 0,
    fixedAutoIncrement: 0,
    optimizedTables: 0,
    analyzedTables: 0,
    engineIssues: 0,
    fixedEngines: 0,
    charsetIssues: 0,
    fixedCharset: 0
  };

  try {
    // Check and fix orphaned foreign keys
    const orphanedFks = await checkOrphanedForeignKeys(connection);
    results.orphanedFks = orphanedFks.length;
    if (orphanedFks.length > 0) {
      results.fixedOrphanedFks = await fixOrphanedForeignKeys(connection, orphanedFks);
    }

    // Check and create missing indexes
    const missingIndexes = await checkMissingIndexes(connection);
    results.missingIndexes = missingIndexes.length;
    if (missingIndexes.length > 0) {
      results.createdIndexes = await createMissingIndexes(connection, missingIndexes);
    }

    // Check and fix AUTO_INCREMENT
    const autoIncrementIssues = await checkAutoIncrement(connection);
    results.autoIncrementIssues = autoIncrementIssues.length;
    if (autoIncrementIssues.length > 0) {
      results.fixedAutoIncrement = await fixAutoIncrement(connection, autoIncrementIssues);
    }

    // Check and fix table engines
    const engineIssues = await checkTableEngine(connection);
    results.engineIssues = engineIssues.length;
    if (engineIssues.length > 0) {
      results.fixedEngines = await fixTableEngine(connection, engineIssues);
    }

    // Check and fix charset
    const charsetIssues = await checkCharset(connection);
    results.charsetIssues = charsetIssues.length;
    if (charsetIssues.length > 0) {
      results.fixedCharset = await fixCharset(connection, charsetIssues);
    }

    // Optimize tables
    results.optimizedTables = await optimizeTables(connection);

    // Analyze tables
    results.analyzedTables = await analyzeTables(connection);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 DATABASE FIX AND OPTIMIZATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Orphaned Foreign Keys Found: ${results.orphanedFks}`);
    console.log(`Orphaned Foreign Keys Fixed: ${results.fixedOrphanedFks}`);
    console.log(`Missing Indexes Found: ${results.missingIndexes}`);
    console.log(`Indexes Created: ${results.createdIndexes}`);
    console.log(`AUTO_INCREMENT Issues Found: ${results.autoIncrementIssues}`);
    console.log(`AUTO_INCREMENT Issues Fixed: ${results.fixedAutoIncrement}`);
    console.log(`Table Engine Issues Found: ${results.engineIssues}`);
    console.log(`Table Engines Fixed: ${results.fixedEngines}`);
    console.log(`Charset Issues Found: ${results.charsetIssues}`);
    console.log(`Charset Issues Fixed: ${results.fixedCharset}`);
    console.log(`Tables Optimized: ${results.optimizedTables}`);
    console.log(`Tables Analyzed: ${results.analyzedTables}`);
    console.log('='.repeat(60));
    console.log('✅ Database fix and optimization completed!');

  } catch (error) {
    console.error('❌ Error during database fix and optimization:', error);
  } finally {
    await connection.end();
    console.log('\n✅ Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };

