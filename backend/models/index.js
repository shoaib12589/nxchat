const User = require('./User');
const Company = require('./Company');
const Plan = require('./Plan');
const Department = require('./Department');
const Chat = require('./Chat');
const Message = require('./Message');
const Trigger = require('./Trigger');
const AITrainingDoc = require('./AITrainingDoc');
const Notification = require('./Notification');
const CallSession = require('./CallSession');
const Ticket = require('./Ticket');
const AgentSetting = require('./AgentSetting');
const WidgetSetting = require('./WidgetSetting');
const StorageProvider = require('./StorageProvider');
const SystemSetting = require('./SystemSetting');
const Visitor = require('./Visitor');
const VisitorMessage = require('./VisitorMessage');
const VisitorActivity = require('./VisitorActivity');
const WidgetKey = require('./WidgetKey');
const Brand = require('./Brand');
const BrandAgent = require('./BrandAgent');
const EmailTemplate = require('./EmailTemplate');

// Company relationships
Company.hasMany(User, { foreignKey: 'tenant_id', as: 'users' });
Company.hasMany(Department, { foreignKey: 'tenant_id', as: 'departments' });
Company.hasMany(Chat, { foreignKey: 'tenant_id', as: 'chats' });
Company.hasMany(Trigger, { foreignKey: 'tenant_id', as: 'triggers' });
Company.hasMany(AITrainingDoc, { foreignKey: 'tenant_id', as: 'aiTrainingDocs' });
Company.hasMany(Ticket, { foreignKey: 'tenant_id', as: 'tickets' });
Company.hasOne(WidgetSetting, { foreignKey: 'tenant_id', as: 'widgetSettings' });
Company.hasMany(Visitor, { foreignKey: 'tenant_id', as: 'visitors' });
Company.hasMany(VisitorMessage, { foreignKey: 'tenant_id', as: 'visitorMessages' });
Company.hasMany(VisitorActivity, { foreignKey: 'tenant_id', as: 'visitorActivities' });
Company.hasMany(WidgetKey, { foreignKey: 'tenant_id', as: 'widgetKeys' });
Company.hasMany(Brand, { foreignKey: 'tenant_id', as: 'brands' });
Company.belongsTo(Plan, { foreignKey: 'plan_id', as: 'plan' });

// Plan relationships
Plan.hasMany(Company, { foreignKey: 'plan_id', as: 'companies' });

// User relationships
User.belongsTo(Company, { foreignKey: 'tenant_id', as: 'company' });
User.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
User.hasMany(Chat, { foreignKey: 'customer_id', as: 'customerChats' });
User.hasMany(Chat, { foreignKey: 'agent_id', as: 'agentChats' });
User.hasMany(Message, { foreignKey: 'sender_id', as: 'messages' });
User.hasMany(AITrainingDoc, { foreignKey: 'uploaded_by', as: 'uploadedDocs' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
User.hasMany(CallSession, { foreignKey: 'initiator_id', as: 'initiatedCalls' });
User.hasMany(CallSession, { foreignKey: 'participant_id', as: 'participatedCalls' });
User.hasMany(Ticket, { foreignKey: 'customer_id', as: 'customerTickets' });
User.hasMany(Ticket, { foreignKey: 'agent_id', as: 'agentTickets' });
User.hasOne(AgentSetting, { foreignKey: 'agent_id', as: 'agentSettings' });
User.hasMany(SystemSetting, { foreignKey: 'updated_by', as: 'updatedSettings' });
User.hasMany(Visitor, { foreignKey: 'assigned_agent_id', as: 'assignedVisitors' });
User.hasMany(VisitorMessage, { foreignKey: 'sender_id', as: 'visitorMessages' });
User.hasMany(VisitorActivity, { foreignKey: 'visitor_id', as: 'visitorActivities' });

// Department relationships
Department.belongsTo(Company, { foreignKey: 'tenant_id', as: 'company' });
Department.hasMany(User, { foreignKey: 'department_id', as: 'users' });
Department.hasMany(Chat, { foreignKey: 'department_id', as: 'chats' });
Department.hasMany(Ticket, { foreignKey: 'department_id', as: 'tickets' });

// Chat relationships
Chat.belongsTo(Company, { foreignKey: 'tenant_id', as: 'company' });
Chat.belongsTo(User, { foreignKey: 'customer_id', as: 'customer' });
Chat.belongsTo(User, { foreignKey: 'agent_id', as: 'agent' });
Chat.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Chat.hasMany(Message, { foreignKey: 'chat_id', as: 'messages' });
Chat.hasMany(CallSession, { foreignKey: 'chat_id', as: 'callSessions' });

// Message relationships
Message.belongsTo(Chat, { foreignKey: 'chat_id', as: 'chat' });
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

// Trigger relationships
Trigger.belongsTo(Company, { foreignKey: 'tenant_id', as: 'company' });

// AITrainingDoc relationships
AITrainingDoc.belongsTo(Company, { foreignKey: 'tenant_id', as: 'company' });
AITrainingDoc.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

// Notification relationships
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// CallSession relationships
CallSession.belongsTo(Chat, { foreignKey: 'chat_id', as: 'chat' });
CallSession.belongsTo(User, { foreignKey: 'initiator_id', as: 'initiator' });
CallSession.belongsTo(User, { foreignKey: 'participant_id', as: 'participant' });

// Ticket relationships
Ticket.belongsTo(Company, { foreignKey: 'tenant_id', as: 'company' });
Ticket.belongsTo(User, { foreignKey: 'customer_id', as: 'customer' });
Ticket.belongsTo(User, { foreignKey: 'agent_id', as: 'agent' });
Ticket.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

// AgentSetting relationships
AgentSetting.belongsTo(User, { foreignKey: 'agent_id', as: 'agent' });

// WidgetSetting relationships
WidgetSetting.belongsTo(Company, { foreignKey: 'tenant_id', as: 'company' });

// SystemSetting relationships
SystemSetting.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });

// Visitor relationships
Visitor.belongsTo(Company, { foreignKey: 'tenant_id', as: 'company' });
Visitor.belongsTo(User, { foreignKey: 'assigned_agent_id', as: 'assignedAgent' });
Visitor.belongsTo(Brand, { foreignKey: 'brand_id', as: 'brand' });
Visitor.hasMany(VisitorMessage, { foreignKey: 'visitor_id', as: 'messages' });
Visitor.hasMany(VisitorActivity, { foreignKey: 'visitor_id', as: 'activities' });

// VisitorMessage relationships
VisitorMessage.belongsTo(Visitor, { foreignKey: 'visitor_id', as: 'visitor' });
VisitorMessage.belongsTo(Company, { foreignKey: 'tenant_id', as: 'company' });
VisitorMessage.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

// VisitorActivity relationships
VisitorActivity.belongsTo(Visitor, { foreignKey: 'visitor_id', as: 'visitor' });
VisitorActivity.belongsTo(Company, { foreignKey: 'tenant_id', as: 'company' });

// WidgetKey relationships
WidgetKey.belongsTo(Company, { foreignKey: 'tenant_id', as: 'company' });
WidgetKey.belongsTo(Brand, { foreignKey: 'brand_id', as: 'brand' });

// Brand relationships
Brand.belongsTo(Company, { foreignKey: 'tenant_id', as: 'company' });
Brand.hasMany(WidgetKey, { foreignKey: 'brand_id', as: 'widgetKeys' });
Brand.hasMany(Visitor, { foreignKey: 'brand_id', as: 'visitors' });
Brand.belongsToMany(User, { 
  through: BrandAgent, 
  foreignKey: 'brand_id', 
  otherKey: 'agent_id',
  as: 'agents' 
});

// BrandAgent relationships
BrandAgent.belongsTo(Brand, { foreignKey: 'brand_id', as: 'brand' });
BrandAgent.belongsTo(User, { foreignKey: 'agent_id', as: 'agent' });
BrandAgent.belongsTo(User, { foreignKey: 'assigned_by', as: 'assignedBy' });

// User brand relationships
User.belongsToMany(Brand, { 
  through: BrandAgent, 
  foreignKey: 'agent_id', 
  otherKey: 'brand_id',
  as: 'assignedBrands' 
});

// EmailTemplate relationships - remove for now to avoid FK constraint issues

module.exports = {
  User,
  Company,
  Plan,
  Department,
  Chat,
  Message,
  Trigger,
  AITrainingDoc,
  Notification,
  CallSession,
  Ticket,
  AgentSetting,
  WidgetSetting,
  StorageProvider,
  SystemSetting,
  Visitor,
  VisitorMessage,
  VisitorActivity,
  WidgetKey,
  Brand,
  BrandAgent,
  EmailTemplate
};
