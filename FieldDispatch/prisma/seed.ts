import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Philadelphia-area coordinates so travel times are realistic and small.
async function main() {
  await prisma.job.deleteMany();
  await prisma.technician.deleteMany();

  const alex = await prisma.technician.create({
    data: { name: "Alex Rivera", phone: "+15555550101", homeLat: 39.9526, homeLng: -75.1652 },
  });
  const jordan = await prisma.technician.create({
    data: { name: "Jordan Lee", phone: "+15555550102", homeLat: 39.9834, homeLng: -75.155 },
  });
  const sam = await prisma.technician.create({
    data: { name: "Sam Patel", phone: null, smsOptOut: true, homeLat: 40.0092, homeLng: -75.1333 },
  });

  const today = new Date();
  today.setHours(8, 0, 0, 0);
  const at = (hour: number, min = 0) => {
    const d = new Date(today);
    d.setHours(hour, min, 0, 0);
    return d;
  };

  await prisma.job.createMany({
    data: [
      // Alex: two comfortably-spaced jobs, close together (Center City)
      {
        technicianId: alex.id,
        title: "AC repair — Rittenhouse",
        address: "1830 Rittenhouse Sq, Philadelphia, PA",
        lat: 39.9489,
        lng: -75.1719,
        startAt: at(9, 0),
        durationMins: 60,
        status: "SCHEDULED",
      },
      {
        technicianId: alex.id,
        title: "Furnace check — Old City",
        address: "233 Chestnut St, Philadelphia, PA",
        lat: 39.9497,
        lng: -75.1447,
        startAt: at(11, 0),
        durationMins: 45,
        status: "SCHEDULED",
      },
      // Jordan: two jobs far apart, back-to-back — this is the "gotcha" demo pair.
      // Job ends 10:00 in Fishtown; next job starts 10:15 in University City,
      // a ~25min drive. A time-only calendar sees this as fine.
      {
        technicianId: jordan.id,
        title: "Water heater install — Fishtown",
        address: "1201 Frankford Ave, Philadelphia, PA",
        lat: 39.9709,
        lng: -75.1338,
        startAt: at(9, 0),
        durationMins: 60,
        status: "SCHEDULED",
      },
      {
        technicianId: jordan.id,
        title: "Leak inspection — University City",
        address: "3401 Walnut St, Philadelphia, PA",
        lat: 39.9531,
        lng: -75.1927,
        startAt: at(10, 15),
        durationMins: 45,
        status: "SCHEDULED",
      },
      // Sam: one job, plus one unassigned job available to drag onto the board
      {
        technicianId: sam.id,
        title: "Dryer vent cleaning — Northern Liberties",
        address: "700 N 2nd St, Philadelphia, PA",
        lat: 39.9656,
        lng: -75.1428,
        startAt: at(13, 0),
        durationMins: 30,
        status: "SCHEDULED",
      },
      {
        technicianId: null,
        title: "Refrigerator not cooling — Fairmount",
        address: "2101 Pennsylvania Ave, Philadelphia, PA",
        lat: 39.9656,
        lng: -75.1739,
        startAt: at(14, 0),
        durationMins: 60,
        status: "UNASSIGNED",
      },
    ],
  });

  console.log("Seeded 3 technicians and 6 jobs.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
