const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require('express');
const router = express.Router();
const { authenticateToken, requireCompanyAdmin } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenantAuth');
const { Company, Plan, User } = require('../models');

// Test route to check if plans exist
router.get('/test-plans', async (req, res) => {
  try {
    const plans = await Plan.findAll({
      where: { is_active: true },
      order: [['price', 'ASC']]
    });

    res.json({
      success: true,
      message: 'Plans found',
      count: plans.length,
      data: plans
    });
  } catch (error) {
    console.error('Test plans error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch plans',
      error: error.message 
    });
  }
});

// Get available plans for billing
router.get('/plans', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const plans = await Plan.findAll({
      where: { is_active: true },
      order: [['price', 'ASC']]
    });

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch plans' });
  }
});

// Create Stripe checkout session
router.post('/create-checkout-session', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const { plan_id } = req.body;
    const tenantId = req.user.tenant_id;

    const company = await Company.findByPk(tenantId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const plan = await Plan.findByPk(plan_id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    // Create or get Stripe customer
    let customerId = company.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: company.name,
        metadata: {
          company_id: company.id,
          tenant_id: tenantId
        }
      });
      customerId = customer.id;
      
      // Update company with customer ID
      await company.update({ stripe_customer_id: customerId });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripe_price_id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/company/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/company/billing?canceled=true`,
      metadata: {
        company_id: company.id,
        plan_id: plan.id,
        tenant_id: tenantId
      }
    });

    res.json({
      success: true,
      data: {
        checkout_url: session.url,
        session_id: session.id
      }
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ success: false, message: 'Failed to create checkout session' });
  }
});

// Create Stripe customer for company
router.post('/create-customer', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { email, name } = req.body;

    const company = await Company.findByPk(tenantId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: email || company.email,
      name: name || company.name,
      metadata: {
        company_id: company.id,
        tenant_id: tenantId
      }
    });

    // Update company with Stripe customer ID
    await company.update({
      stripe_customer_id: customer.id
    });

    res.json({
      success: true,
      message: 'Stripe customer created successfully',
      customer_id: customer.id
    });
  } catch (error) {
    console.error('Create Stripe customer error:', error);
    res.status(500).json({ success: false, message: 'Failed to create Stripe customer' });
  }
});

// Create subscription
router.post('/create-subscription', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { plan_id, payment_method_id } = req.body;

    const company = await Company.findByPk(tenantId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const plan = await Plan.findByPk(plan_id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    if (!company.stripe_customer_id) {
      return res.status(400).json({ success: false, message: 'Stripe customer not created' });
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(payment_method_id, {
      customer: company.stripe_customer_id,
    });

    // Set as default payment method
    await stripe.customers.update(company.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: payment_method_id,
      },
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: company.stripe_customer_id,
      items: [{ price: plan.stripe_price_id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    // Update company with subscription info
    await company.update({
      stripe_subscription_id: subscription.id,
      plan_id: plan_id,
      subscription_status: subscription.status
    });

    res.json({
      success: true,
      message: 'Subscription created successfully',
      subscription_id: subscription.id,
      client_secret: subscription.latest_invoice.payment_intent.client_secret
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ success: false, message: 'Failed to create subscription' });
  }
});

// Update subscription (upgrade/downgrade)
router.put('/update-subscription', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { new_plan_id } = req.body;

    const company = await Company.findByPk(tenantId);
    if (!company || !company.stripe_subscription_id) {
      return res.status(404).json({ success: false, message: 'Active subscription not found' });
    }

    const newPlan = await Plan.findByPk(new_plan_id);
    if (!newPlan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(company.stripe_subscription_id);

    // Update subscription with new plan
    const updatedSubscription = await stripe.subscriptions.update(company.stripe_subscription_id, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPlan.stripe_price_id,
      }],
      proration_behavior: 'create_prorations',
    });

    // Update company
    await company.update({
      plan_id: new_plan_id,
      subscription_status: updatedSubscription.status
    });

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      subscription: updatedSubscription
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ success: false, message: 'Failed to update subscription' });
  }
});

// Cancel subscription
router.delete('/cancel-subscription', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const company = await Company.findByPk(tenantId);
    if (!company || !company.stripe_subscription_id) {
      return res.status(404).json({ success: false, message: 'Active subscription not found' });
    }

    // Cancel subscription at period end
    const subscription = await stripe.subscriptions.update(company.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    res.json({
      success: true,
      message: 'Subscription will be cancelled at period end',
      subscription: subscription
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel subscription' });
  }
});

// Get subscription details
router.get('/subscription', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const company = await Company.findByPk(tenantId, {
      include: [{ model: Plan, as: 'plan' }]
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    let subscription = null;
    if (company.stripe_subscription_id) {
      subscription = await stripe.subscriptions.retrieve(company.stripe_subscription_id);
    }

    res.json({
      success: true,
      data: {
        company: company,
        subscription: subscription,
        plan: company.plan
      }
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ success: false, message: 'Failed to get subscription details' });
  }
});

// Get invoices
router.get('/invoices', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const company = await Company.findByPk(tenantId);
    if (!company || !company.stripe_customer_id) {
      return res.status(404).json({ success: false, message: 'Stripe customer not found' });
    }

    const invoices = await stripe.invoices.list({
      customer: company.stripe_customer_id,
      limit: 10
    });

    res.json({
      success: true,
      data: invoices.data
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ success: false, message: 'Failed to get invoices' });
  }
});

// Create customer portal session
router.post('/portal-session', authenticateToken, requireCompanyAdmin, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const company = await Company.findByPk(tenantId);
    if (!company || !company.stripe_customer_id) {
      return res.status(404).json({ success: false, message: 'Stripe customer not found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL}/company/billing`,
    });

    res.json({
      success: true,
      url: session.url
    });
  } catch (error) {
    console.error('Create portal session error:', error);
    res.status(500).json({ success: false, message: 'Failed to create portal session' });
  }
});

// Webhook handler for Stripe events
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({received: true});
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({error: 'Webhook handler failed'});
  }
});

// Webhook handlers
async function handleSubscriptionCreated(subscription) {
  try {
    const company = await Company.findOne({
      where: { stripe_customer_id: subscription.customer }
    });

    if (company) {
      await company.update({
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status
      });
      console.log(`Subscription created for company ${company.id}`);
    }
  } catch (error) {
    console.error('Handle subscription created error:', error);
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    const company = await Company.findOne({
      where: { stripe_subscription_id: subscription.id }
    });

    if (company) {
      await company.update({
        subscription_status: subscription.status
      });
      console.log(`Subscription updated for company ${company.id}`);
    }
  } catch (error) {
    console.error('Handle subscription updated error:', error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    const company = await Company.findOne({
      where: { stripe_subscription_id: subscription.id }
    });

    if (company) {
      await company.update({
        stripe_subscription_id: null,
        subscription_status: 'cancelled'
      });
      console.log(`Subscription cancelled for company ${company.id}`);
    }
  } catch (error) {
    console.error('Handle subscription deleted error:', error);
  }
}

async function handlePaymentSucceeded(invoice) {
  try {
    const company = await Company.findOne({
      where: { stripe_customer_id: invoice.customer }
    });

    if (company) {
      // Update company status to active
      await company.update({
        status: 'active'
      });
      console.log(`Payment succeeded for company ${company.id}`);
    }
  } catch (error) {
    console.error('Handle payment succeeded error:', error);
  }
}

async function handlePaymentFailed(invoice) {
  try {
    const company = await Company.findOne({
      where: { stripe_customer_id: invoice.customer }
    });

    if (company) {
      // Update company status to suspended
      await company.update({
        status: 'suspended'
      });
      console.log(`Payment failed for company ${company.id}`);
    }
  } catch (error) {
    console.error('Handle payment failed error:', error);
  }
}

module.exports = router;
