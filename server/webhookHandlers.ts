// Stripe Webhook Handlers
import { getStripeSync } from './stripeClient';
import { storage } from './storage';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
  }

  static async handleCheckoutCompleted(session: any): Promise<void> {
    const { customer, subscription, metadata } = session;
    
    if (metadata?.organizationId) {
      await storage.updateOrganizationSubscription(metadata.organizationId, {
        stripeCustomerId: customer,
        stripeSubscriptionId: subscription,
        subscriptionStatus: 'active',
        status: 'active',
      });
      
      await storage.createSubscriptionHistory({
        organizationId: metadata.organizationId,
        planId: metadata.planId,
        stripeSubscriptionId: subscription,
        action: 'subscription_created',
        status: 'active',
        amount: session.amount_total,
      });
    }
  }

  static async handleSubscriptionUpdated(subscription: any): Promise<void> {
    const org = await storage.getOrganizationByStripeSubscriptionId(subscription.id);
    if (org) {
      const status = subscription.status === 'active' ? 'active' : 
                     subscription.status === 'past_due' ? 'suspended' : 
                     subscription.status;
      
      await storage.updateOrganizationSubscription(org.id, {
        subscriptionStatus: subscription.status,
        status: status as any,
      });
    }
  }

  static async handleInvoicePaid(invoice: any): Promise<void> {
    const org = await storage.getOrganizationByStripeCustomerId(invoice.customer);
    if (org) {
      await storage.createSubscriptionHistory({
        organizationId: org.id,
        stripeInvoiceId: invoice.id,
        stripeSubscriptionId: invoice.subscription,
        action: 'invoice_paid',
        status: 'paid',
        amount: invoice.amount_paid,
        periodStart: new Date(invoice.period_start * 1000),
        periodEnd: new Date(invoice.period_end * 1000),
      });
    }
  }

  static async handleInvoicePaymentFailed(invoice: any): Promise<void> {
    const org = await storage.getOrganizationByStripeCustomerId(invoice.customer);
    if (org) {
      await storage.updateOrganizationSubscription(org.id, {
        subscriptionStatus: 'past_due',
        status: 'suspended',
      });
      
      await storage.createSubscriptionHistory({
        organizationId: org.id,
        stripeInvoiceId: invoice.id,
        stripeSubscriptionId: invoice.subscription,
        action: 'payment_failed',
        status: 'failed',
        amount: invoice.amount_due,
      });
    }
  }

  static async handleSubscriptionDeleted(subscription: any): Promise<void> {
    const org = await storage.getOrganizationByStripeSubscriptionId(subscription.id);
    if (org) {
      await storage.updateOrganizationSubscription(org.id, {
        subscriptionStatus: 'cancelled',
        status: 'cancelled',
      });
      
      await storage.createSubscriptionHistory({
        organizationId: org.id,
        stripeSubscriptionId: subscription.id,
        action: 'subscription_cancelled',
        status: 'cancelled',
      });
    }
  }
}
