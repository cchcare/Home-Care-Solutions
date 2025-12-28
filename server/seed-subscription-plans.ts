// Seed script for subscription plans
// Run this script to create Stripe products and prices, then sync to local database
// Usage: npx tsx server/seed-subscription-plans.ts

import { getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { subscriptionPlans } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface PlanConfig {
  name: string;
  description: string;
  priceMonthly: number;
  clientLimitMin: number;
  clientLimitMax: number;
  features: string[];
  isPopular: boolean;
  sortOrder: number;
}

const PLANS: PlanConfig[] = [
  {
    name: "Starter",
    description: "Perfect for small agencies",
    priceMonthly: 4900, // $49/month
    clientLimitMin: 1,
    clientLimitMax: 25,
    features: [
      "Up to 25 clients",
      "Unlimited caregivers",
      "Basic scheduling",
      "Document management",
      "Email support",
    ],
    isPopular: false,
    sortOrder: 1,
  },
  {
    name: "Growth",
    description: "For growing agencies",
    priceMonthly: 9900, // $99/month
    clientLimitMin: 26,
    clientLimitMax: 75,
    features: [
      "Up to 75 clients",
      "Unlimited caregivers",
      "Advanced scheduling",
      "EVV tracking",
      "Compliance monitoring",
      "Priority support",
    ],
    isPopular: true,
    sortOrder: 2,
  },
  {
    name: "Professional",
    description: "For established agencies",
    priceMonthly: 19900, // $199/month
    clientLimitMin: 76,
    clientLimitMax: 200,
    features: [
      "Up to 200 clients",
      "Unlimited caregivers",
      "Full feature access",
      "Billing & payroll",
      "Analytics dashboard",
      "API access",
      "Dedicated support",
    ],
    isPopular: false,
    sortOrder: 3,
  },
  {
    name: "Enterprise",
    description: "For large agencies",
    priceMonthly: 39900, // $399/month
    clientLimitMin: 201,
    clientLimitMax: 500,
    features: [
      "Up to 500 clients",
      "Unlimited caregivers",
      "All features included",
      "Custom integrations",
      "White-glove onboarding",
      "SLA guarantee",
      "24/7 phone support",
    ],
    isPopular: false,
    sortOrder: 4,
  },
];

async function seedPlans() {
  console.log('Starting subscription plan seeding...\n');

  try {
    const stripe = await getUncachableStripeClient();

    for (const plan of PLANS) {
      console.log(`Processing plan: ${plan.name}`);

      // Check if plan already exists locally
      const existingPlans = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.name, plan.name));
      
      if (existingPlans.length > 0 && existingPlans[0].stripePriceId) {
        console.log(`  - Plan "${plan.name}" already exists with Stripe price ID, skipping...`);
        continue;
      }

      // Create Stripe product
      console.log(`  - Creating Stripe product...`);
      const product = await stripe.products.create({
        name: `Home Care - ${plan.name}`,
        description: plan.description,
        metadata: {
          planName: plan.name,
          clientLimitMin: plan.clientLimitMin.toString(),
          clientLimitMax: plan.clientLimitMax.toString(),
        },
      });
      console.log(`  - Product created: ${product.id}`);

      // Create Stripe price
      console.log(`  - Creating Stripe price...`);
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.priceMonthly,
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        metadata: {
          planName: plan.name,
        },
      });
      console.log(`  - Price created: ${price.id}`);

      // Create or update local plan record
      if (existingPlans.length > 0) {
        console.log(`  - Updating local plan record...`);
        await db.update(subscriptionPlans)
          .set({
            stripeProductId: product.id,
            stripePriceId: price.id,
            description: plan.description,
            features: plan.features,
            isPopular: plan.isPopular,
            sortOrder: plan.sortOrder,
            updatedAt: new Date(),
          })
          .where(eq(subscriptionPlans.id, existingPlans[0].id));
      } else {
        console.log(`  - Creating local plan record...`);
        await db.insert(subscriptionPlans).values({
          name: plan.name,
          description: plan.description,
          priceMonthly: plan.priceMonthly,
          clientLimitMin: plan.clientLimitMin,
          clientLimitMax: plan.clientLimitMax,
          features: plan.features,
          stripeProductId: product.id,
          stripePriceId: price.id,
          isPopular: plan.isPopular,
          isActive: true,
          sortOrder: plan.sortOrder,
        });
      }

      console.log(`  - Done!\n`);
    }

    console.log('All plans seeded successfully!');
  } catch (error) {
    console.error('Error seeding plans:', error);
    process.exit(1);
  }
}

seedPlans().then(() => {
  console.log('\nSeeding complete. Exiting...');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
