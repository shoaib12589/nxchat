# Database Optimization Guide for Visitor Tables

This guide provides comprehensive optimization strategies for the heavy visitor-related tables in your MySQL database.

## Tables Being Optimized

1. **visitors** - Main visitor tracking table
2. **visitor_activities** - Visitor activity log table
3. **visitor_messages** - Visitor chat messages table

## Quick Start

### Step 1: Analyze Current State

First, analyze your tables to understand the current state:

```bash
cd backend
node scripts/analyze-visitor-tables.js
```

This will show you:
- Table sizes and row counts
- Visitor statistics
- Activity and message statistics
- Index information
- Optimization recommendations

### Step 2: Add Performance Indexes

Run the optimization script to add comprehensive indexes:

```bash
node scripts/run-visitor-optimization.js
```

This will:
- Add composite indexes for common query patterns
- Optimize table structures
- Analyze tables for better query planning

### Step 3: Clean Up Old Data

After analyzing, clean up old inactive data:

```bash
# Dry run (see what would be deleted)
node scripts/cleanup-old-visitor-data.js --dry-run --days=90

# Actually delete old data (inactive visitors > 90 days)
node scripts/cleanup-old-visitor-data.js --days=90

# Custom retention period (e.g., 180 days)
node scripts/cleanup-old-visitor-data.js --days=180
```

## Optimization Strategies

### 1. Index Optimization

The optimization script adds these critical indexes:

#### Visitors Table
- `idx_visitors_tenant_status_active` - For filtering active visitors by tenant
- `idx_visitors_tenant_brand_status` - For brand-specific visitor queries
- `idx_visitors_agent_status` - For agent-assigned visitor queries
- `idx_visitors_ip_tenant` - For IP-based queries
- `idx_visitors_tenant_active_activity` - For active visitor listings

#### Visitor Activities Table
- `idx_visitor_activities_visitor_timestamp` - For visitor activity history
- `idx_visitor_activities_tenant_timestamp` - For tenant activity analysis
- `idx_visitor_activities_session_timestamp` - For session-based queries
- `idx_visitor_activities_tenant_type_timestamp` - For activity type analysis

#### Visitor Messages Table
- `idx_visitor_messages_visitor_created_read` - For message retrieval with read status
- `idx_visitor_messages_tenant_created` - For tenant message queries
- `idx_visitor_messages_visitor_unread` - For unread message queries
- `idx_visitor_messages_sender_created` - For sender-based queries

### 2. Data Cleanup Strategy

#### Recommended Retention Periods

- **Active Visitors**: Keep indefinitely (or until marked inactive)
- **Inactive Visitors**: Delete after 90 days of inactivity
- **Visitor Activities**: Archive after 180 days, delete after 365 days
- **Visitor Messages**: Keep for 365 days (or based on compliance requirements)

#### Cleanup Process

The cleanup script:
1. Identifies inactive visitors older than retention period
2. Counts related activities and messages
3. Deletes in batches to avoid table locking
4. Optimizes tables after cleanup
5. Provides detailed statistics

### 3. Query Optimization

#### Best Practices

1. **Always use indexes**: Ensure WHERE clauses use indexed columns
2. **Limit results**: Use LIMIT for pagination
3. **Select only needed fields**: Use `attributes` in Sequelize queries
4. **Use composite indexes**: Match WHERE clause order to index column order
5. **Avoid SELECT \***: Only select columns you need

#### Example Optimized Queries

```javascript
// Good: Uses composite index
Visitor.findAll({
  where: {
    tenant_id: 1,
    status: 'online',
    is_active: true
  },
  attributes: ['id', 'name', 'status', 'last_activity'],
  order: [['last_activity', 'DESC']],
  limit: 50
});

// Bad: Full table scan
Visitor.findAll({
  where: {
    name: { [Op.like]: '%search%' }
  }
});
```

## Maintenance Schedule

### Daily
- Monitor query performance
- Check for slow queries

### Weekly
- Analyze table sizes: `node scripts/analyze-visitor-tables.js`
- Review inactive visitor count

### Monthly
- Run cleanup script: `node scripts/cleanup-old-visitor-data.js --days=90`
- Optimize tables: `OPTIMIZE TABLE visitors, visitor_activities, visitor_messages;`

### Quarterly
- Review and adjust retention periods
- Analyze index usage
- Consider archiving old data instead of deleting

## Automation

### Cron Job Setup (Linux/Mac)

Add to crontab (`crontab -e`):

```bash
# Weekly analysis on Monday at 2 AM
0 2 * * 1 cd /path/to/backend && node scripts/analyze-visitor-tables.js >> /var/log/visitor-analysis.log 2>&1

# Monthly cleanup on 1st of month at 3 AM
0 3 1 * * cd /path/to/backend && node scripts/cleanup-old-visitor-data.js --days=90 >> /var/log/visitor-cleanup.log 2>&1
```

### Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (weekly/monthly)
4. Action: Start a program
5. Program: `node`
6. Arguments: `scripts/cleanup-old-visitor-data.js --days=90`
7. Start in: `D:\MAMP\htdocs\ai-projects\nxchat\backend`

## Performance Monitoring

### Key Metrics to Monitor

1. **Table Sizes**: Should stay under 10GB per table
2. **Query Times**: Should be under 100ms for indexed queries
3. **Index Usage**: Monitor unused indexes
4. **Row Counts**: Track growth rate

### MySQL Slow Query Log

Enable slow query logging:

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1; -- Log queries > 1 second
```

## Troubleshooting

### Index Not Being Used

1. Check if WHERE clause matches index columns
2. Verify column order matches composite index
3. Run `ANALYZE TABLE` to update statistics
4. Check for data type mismatches

### Cleanup Taking Too Long

1. Reduce batch size in cleanup script
2. Run during low-traffic periods
3. Consider archiving instead of deleting
4. Use partitioning for very large tables

### Table Still Slow After Optimization

1. Check for missing indexes on frequently queried columns
2. Review query patterns and add specific indexes
3. Consider table partitioning for tables > 10GB
4. Review application query patterns

## Expected Performance Improvements

After optimization, you should see:

- **Query Speed**: 10-50x faster for indexed queries
- **Table Size**: Reduced by 30-70% after cleanup
- **Index Usage**: 90%+ of queries using indexes
- **Lock Contention**: Reduced by batching operations

## Backup Before Cleanup

⚠️ **IMPORTANT**: Always backup your database before running cleanup:

```bash
mysqldump -u username -p database_name > backup_$(date +%Y%m%d).sql
```

## Support

For issues or questions:
1. Run analysis script to diagnose
2. Check MySQL slow query log
3. Review query execution plans with `EXPLAIN`
4. Monitor table sizes and growth rates

