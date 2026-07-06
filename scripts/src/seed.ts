import {
  db,
  usersTable,
  userProfilesTable,
  companiesTable,
  categoriesTable,
  productsTable,
  vendorOffersTable,
} from "@workspace/db";

async function main() {
  console.log("Seeding database...");

  const [adminUser, vendorUser1, vendorUser2, buyerUser] = await Promise.all([
    upsertUser("seed-admin", "admin@medsupply.test", "Ava", "Admin"),
    upsertUser("seed-vendor-1", "sales@medisource.test", "Miguel", "Torres"),
    upsertUser("seed-vendor-2", "orders@caresupplyco.test", "Priya", "Nair"),
    upsertUser("seed-buyer-1", "procurement@stmarys.test", "Daniel", "Kim"),
  ]);

  const [vendorCompany1] = await db
    .insert(companiesTable)
    .values({
      name: "MediSource Distribution",
      type: "vendor",
      subtype: "distributor",
      registrationNumber: "MD-10293",
      address: "1400 Industrial Pkwy, Columbus, OH",
      contactEmail: "sales@medisource.test",
      contactPhone: "+1-614-555-0110",
      status: "approved",
      ownerUserId: vendorUser1.id,
    })
    .onConflictDoNothing()
    .returning();

  const [vendorCompany2] = await db
    .insert(companiesTable)
    .values({
      name: "CareSupply Co.",
      type: "vendor",
      subtype: "manufacturer",
      registrationNumber: "CS-88213",
      address: "82 Harbor Rd, Newark, NJ",
      contactEmail: "orders@caresupplyco.test",
      contactPhone: "+1-973-555-0199",
      status: "approved",
      ownerUserId: vendorUser2.id,
    })
    .onConflictDoNothing()
    .returning();

  const [buyerCompany] = await db
    .insert(companiesTable)
    .values({
      name: "St. Mary's Hospital",
      type: "buyer",
      subtype: "hospital",
      address: "500 Mercy Ave, Boston, MA",
      contactEmail: "procurement@stmarys.test",
      contactPhone: "+1-617-555-0142",
      status: "approved",
      ownerUserId: buyerUser.id,
    })
    .onConflictDoNothing()
    .returning();

  await db
    .insert(userProfilesTable)
    .values([
      { userId: adminUser.id, role: "admin", companyId: null },
      { userId: vendorUser1.id, role: "vendor", companyId: vendorCompany1.id },
      { userId: vendorUser2.id, role: "vendor", companyId: vendorCompany2.id },
      { userId: buyerUser.id, role: "buyer", companyId: buyerCompany.id },
    ])
    .onConflictDoNothing();

  const categoryRows = await db
    .insert(categoriesTable)
    .values([
      { name: "PPE & Safety", slug: "ppe-safety" },
      { name: "Diagnostic Equipment", slug: "diagnostic-equipment" },
      { name: "Surgical Supplies", slug: "surgical-supplies" },
      { name: "Mobility & Care", slug: "mobility-care" },
    ])
    .onConflictDoNothing()
    .returning();

  const categories = categoryRows.length
    ? categoryRows
    : await db.select().from(categoriesTable);
  const catId = (slug: string) => categories.find((c) => c.slug === slug)!.id;

  const productRows = await db
    .insert(productsTable)
    .values([
      {
        categoryId: catId("ppe-safety"),
        name: "Nitrile Examination Gloves (Box of 100)",
        description: "Powder-free nitrile gloves, medical grade, latex-free.",
        unit: "box",
        imageUrl: null,
      },
      {
        categoryId: catId("ppe-safety"),
        name: "3-Ply Surgical Face Masks (Box of 50)",
        description: "ASTM Level 2 surgical masks with ear loops.",
        unit: "box",
        imageUrl: null,
      },
      {
        categoryId: catId("diagnostic-equipment"),
        name: "Digital Blood Pressure Monitor",
        description: "Automatic upper-arm BP monitor with irregular heartbeat detection.",
        unit: "unit",
        imageUrl: null,
      },
      {
        categoryId: catId("diagnostic-equipment"),
        name: "Infrared Forehead Thermometer",
        description: "Non-contact digital thermometer with fever alarm.",
        unit: "unit",
        imageUrl: null,
      },
      {
        categoryId: catId("surgical-supplies"),
        name: "Disposable Surgical Gowns (Pack of 20)",
        description: "Fluid-resistant Level 2 surgical gowns.",
        unit: "pack",
        imageUrl: null,
      },
      {
        categoryId: catId("mobility-care"),
        name: "Standard Wheelchair",
        description: "Folding steel-frame wheelchair with footrests.",
        unit: "unit",
        imageUrl: null,
      },
    ])
    .onConflictDoNothing()
    .returning();

  const products = productRows.length ? productRows : await db.select().from(productsTable);
  const prodId = (name: string) => products.find((p) => p.name === name)!.id;

  await db
    .insert(vendorOffersTable)
    .values([
      {
        productId: prodId("Nitrile Examination Gloves (Box of 100)"),
        vendorCompanyId: vendorCompany1.id,
        price: "8.50",
        moq: 20,
        stock: 5000,
        deliveryDays: 3,
        priceTiers: [
          { minQty: 20, maxQty: 99, price: 8.5 },
          { minQty: 100, maxQty: null, price: 7.25 },
        ],
        status: "active",
      },
      {
        productId: prodId("Nitrile Examination Gloves (Box of 100)"),
        vendorCompanyId: vendorCompany2.id,
        price: "9.10",
        moq: 10,
        stock: 3200,
        deliveryDays: 2,
        priceTiers: [
          { minQty: 10, maxQty: 49, price: 9.1 },
          { minQty: 50, maxQty: null, price: 8.0 },
        ],
        status: "active",
      },
      {
        productId: prodId("3-Ply Surgical Face Masks (Box of 50)"),
        vendorCompanyId: vendorCompany1.id,
        price: "4.20",
        moq: 30,
        stock: 8000,
        deliveryDays: 4,
        priceTiers: [{ minQty: 30, maxQty: null, price: 4.2 }],
        status: "active",
      },
      {
        productId: prodId("3-Ply Surgical Face Masks (Box of 50)"),
        vendorCompanyId: vendorCompany2.id,
        price: "3.95",
        moq: 25,
        stock: 6000,
        deliveryDays: 3,
        priceTiers: [
          { minQty: 25, maxQty: 99, price: 3.95 },
          { minQty: 100, maxQty: null, price: 3.4 },
        ],
        status: "active",
      },
      {
        productId: prodId("Digital Blood Pressure Monitor"),
        vendorCompanyId: vendorCompany2.id,
        price: "34.00",
        moq: 5,
        stock: 400,
        deliveryDays: 6,
        priceTiers: [
          { minQty: 5, maxQty: 19, price: 34.0 },
          { minQty: 20, maxQty: null, price: 29.5 },
        ],
        status: "active",
      },
      {
        productId: prodId("Infrared Forehead Thermometer"),
        vendorCompanyId: vendorCompany1.id,
        price: "18.75",
        moq: 10,
        stock: 900,
        deliveryDays: 5,
        priceTiers: [{ minQty: 10, maxQty: null, price: 18.75 }],
        status: "active",
      },
      {
        productId: prodId("Disposable Surgical Gowns (Pack of 20)"),
        vendorCompanyId: vendorCompany1.id,
        price: "22.00",
        moq: 15,
        stock: 700,
        deliveryDays: 4,
        priceTiers: [
          { minQty: 15, maxQty: 49, price: 22.0 },
          { minQty: 50, maxQty: null, price: 19.5 },
        ],
        status: "active",
      },
      {
        productId: prodId("Standard Wheelchair"),
        vendorCompanyId: vendorCompany2.id,
        price: "145.00",
        moq: 2,
        stock: 60,
        deliveryDays: 10,
        priceTiers: [{ minQty: 2, maxQty: null, price: 145.0 }],
        status: "active",
      },
    ])
    .onConflictDoNothing();

  console.log("Seed complete.");
  process.exit(0);
}

async function upsertUser(id: string, email: string, firstName: string, lastName: string) {
  const [user] = await db
    .insert(usersTable)
    .values({ id, email, firstName, lastName, profileImageUrl: null })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: { email, firstName, lastName, updatedAt: new Date() },
    })
    .returning();
  return user;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
