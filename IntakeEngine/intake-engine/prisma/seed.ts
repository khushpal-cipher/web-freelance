import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.provisionedAccount.deleteMany();
  await prisma.submission.deleteMany();

  const inProgress = await prisma.submission.create({
    data: {
      currentStep: "clinic-compliance",
      data: {
        businessName: "Riverside Family Dental",
        contactEmail: "office@riversidedental.example",
        businessType: "clinic",
        practiceType: "dental",
        patientVolume: 240,
        hipaaRequired: true,
      },
    },
  });

  const signed = await prisma.submission.create({
    data: {
      currentStep: "review",
      status: "SIGNED",
      signedAt: new Date(),
      data: {
        businessName: "Northwind Outfitters",
        contactEmail: "hello@northwindoutfitters.example",
        businessType: "ecommerce",
        platform: "shopify",
        monthlyOrders: 850,
        handlesPayments: true,
        servicesNeeded: ["onboarding-setup", "integration"],
        budgetRange: "15-50k",
        timeline: "1-3mo",
      },
    },
  });

  const provisioned = await prisma.submission.create({
    data: {
      currentStep: "review",
      status: "PROVISIONED",
      signedAt: new Date(Date.now() - 86_400_000),
      data: {
        businessName: "Beacon Creative Agency",
        contactEmail: "team@beaconcreative.example",
        businessType: "agency",
        clientCount: 34,
        servicesOffered: "Brand strategy, web design, paid media",
        servicesNeeded: ["onboarding-setup", "training", "support"],
        budgetRange: "50k+",
        timeline: "immediate",
      },
    },
  });

  await prisma.provisionedAccount.create({
    data: { submissionId: provisioned.id, welcomeSentAt: new Date(Date.now() - 86_000_000) },
  });

  console.log("Seeded submissions:", { inProgress: inProgress.id, signed: signed.id, provisioned: provisioned.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
