import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import {
  User,
  Property,
  Room,
  InventoryItem,
  Tenancy,
  Invitation,
  Inspection,
  ConditionRecord,
  Photo,
  MeterReading,
  IssueReport,
  Comparison,
  Report,
  Config,
  AuditLog,
} from '../models/index.js';
import { runComparison } from '../services/comparison.service.js';
import { generatePdfReport, createShareLink } from '../services/report.service.js';
import { generateRandomToken, hashToken } from '../utils/tokens.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../../storage/uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Minimal valid 1x1 JPEG photo buffer
const samplePhotoBuffer = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64'
);

function createPhotoFixture(filenamePrefix) {
  const filename = `${filenamePrefix}-${Date.now()}.jpg`;
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, samplePhotoBuffer);
  const sha256 = crypto.createHash('sha256').update(samplePhotoBuffer).digest('hex');
  return {
    fileUrl: `/uploads/${filename}`,
    publicId: filename,
    sha256,
  };
}

export async function seed() {
  console.log('\n[Seed] Connecting to MongoDB...');
  await connectDB();

  console.log('[Seed] Purging existing database collections...');
  await Promise.all([
    User.deleteMany({}),
    Property.deleteMany({}),
    Room.deleteMany({}),
    InventoryItem.deleteMany({}),
    Tenancy.deleteMany({}),
    Invitation.deleteMany({}),
    Inspection.deleteMany({}),
    ConditionRecord.deleteMany({}),
    Photo.deleteMany({}),
    MeterReading.deleteMany({}),
    IssueReport.deleteMany({}),
    Comparison.deleteMany({}),
    Report.deleteMany({}),
    Config.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  console.log('[Seed] Inserting default configurations...');
  await Config.create([
    {
      key: 'conditionScale',
      value: {
        5: 'EXCELLENT',
        4: 'GOOD',
        3: 'FAIR',
        2: 'POOR',
        1: 'VERY_POOR',
      },
      description: 'Standard 5-point condition rating scale',
    },
    {
      key: 'itemCategories',
      value: [
        'WALLS_FLOORS',
        'FIXTURES',
        'FURNITURE',
        'APPLIANCES',
        'DOORS_WINDOWS',
        'SAFETY_SECURITY',
        'EXTERIOR',
        'OTHER',
      ],
      description: 'Global item inventory categories',
    },
  ]);

  console.log('[Seed] Creating core users (Admin, Landlord Asha, Tenant Ravi)...');
  const passwordAdmin = await bcrypt.hash('Admin@123', 12);
  const passwordAsha = await bcrypt.hash('Asha@1234', 12);
  const passwordRavi = await bcrypt.hash('Ravi@1234', 12);

  const admin = await User.create({
    name: 'System Administrator',
    email: 'admin@leaseledger.test',
    passwordHash: passwordAdmin,
    role: 'ADMIN',
    emailVerified: true,
  });

  const asha = await User.create({
    name: 'Asha Patel',
    email: 'asha@leaseledger.test',
    passwordHash: passwordAsha,
    role: 'LANDLORD',
    phone: '+44 7700 900077',
    emailVerified: true,
  });

  const ravi = await User.create({
    name: 'Ravi Kumar',
    email: 'ravi@leaseledger.test',
    passwordHash: passwordRavi,
    role: 'TENANT',
    phone: '+44 7700 900088',
    emailVerified: true,
  });

  // ==========================================
  // SCENARIO A: FLAT 12 PARK ROAD (COMPLETED)
  // ==========================================
  console.log('[Seed] Building Scenario A: Flat 12 Park Residences (Completed)...');
  const propertyA = await Property.create({
    landlord: asha._id,
    name: 'Flat 12 Park Residences',
    address: '12 Park Road, London NW1 6XE',
    type: 'APARTMENT',
    metadata: {
      postcode: 'NW1 6XE',
      city: 'London',
      state: 'Greater London',
    },
  });

  // Rooms
  const roomBed = await Room.create({ property: propertyA._id, name: 'Bedroom', floor: 1 });
  const roomLiving = await Room.create({ property: propertyA._id, name: 'Living Room', floor: 1 });
  const roomKitchen = await Room.create({ property: propertyA._id, name: 'Kitchen', floor: 1 });
  const roomHall = await Room.create({ property: propertyA._id, name: 'Hallway', floor: 1 });

  // Items
  const itemWall = await InventoryItem.create({
    property: propertyA._id,
    room: roomBed._id,
    name: 'Bedroom Wall',
    category: 'WALLS_FLOORS',
  });
  const itemSofa = await InventoryItem.create({
    property: propertyA._id,
    room: roomLiving._id,
    name: 'Living Room Sofa',
    category: 'FURNITURE',
  });
  const itemTable = await InventoryItem.create({
    property: propertyA._id,
    room: roomLiving._id,
    name: 'Dining Table',
    category: 'FURNITURE',
  });
  const itemTap = await InventoryItem.create({
    property: propertyA._id,
    room: roomKitchen._id,
    name: 'Kitchen Tap',
    category: 'FIXTURES',
  });
  const itemAlarm = await InventoryItem.create({
    property: propertyA._id,
    room: roomHall._id,
    name: 'Smoke Alarm',
    category: 'SAFETY_SECURITY',
  });
  const itemDoor = await InventoryItem.create({
    property: propertyA._id,
    room: roomHall._id,
    name: 'Front Door Lock',
    category: 'DOORS_WINDOWS',
  });

  // Tenancy
  const tenancyA = await Tenancy.create({
    property: propertyA._id,
    landlord: asha._id,
    tenants: [ravi._id],
    startDate: new Date('2023-01-01'),
    endDate: new Date('2023-12-31'),
    status: 'ACTIVE', // Will be transitioned to COMPLETED by comparison
    rentAmount: 1850,
    depositAmount: 1850,
    notes: 'Annual fixed-term tenancy with verified photographic ledger',
  });

  // Move-In Inspection
  const moveInA = await Inspection.create({
    tenancy: tenancyA._id,
    type: 'MOVE_IN',
    status: 'DRAFT',
    startedBy: asha._id,
    confirmations: [
      {
        user: asha._id,
        role: 'LANDLORD',
        confirmedAt: new Date('2023-01-01T14:00:00Z'),
        ip: '127.0.0.1',
      },
      {
        user: ravi._id,
        role: 'TENANT',
        confirmedAt: new Date('2023-01-01T14:30:00Z'),
        ip: '127.0.0.1',
      },
    ],
  });

  // Move-In Condition Records
  const miWall = await ConditionRecord.create({
    inspection: moveInA._id,
    item: itemWall._id,
    roomName: 'Bedroom',
    itemName: 'Bedroom Wall',
    rating: 3,
    ratingLabel: 'FAIR',
    notes: 'Pre-existing scuff near doorway',
    recordedBy: asha._id,
  });
  const miSofa = await ConditionRecord.create({
    inspection: moveInA._id,
    item: itemSofa._id,
    roomName: 'Living Room',
    itemName: 'Living Room Sofa',
    rating: 5,
    ratingLabel: 'EXCELLENT',
    notes: 'Fabric clean and intact',
    recordedBy: asha._id,
  });
  const miTable = await ConditionRecord.create({
    inspection: moveInA._id,
    item: itemTable._id,
    roomName: 'Living Room',
    itemName: 'Dining Table',
    rating: 4,
    ratingLabel: 'GOOD',
    notes: 'Minor surface wear',
    recordedBy: asha._id,
  });
  const miTap = await ConditionRecord.create({
    inspection: moveInA._id,
    item: itemTap._id,
    roomName: 'Kitchen',
    itemName: 'Kitchen Tap',
    rating: 2,
    ratingLabel: 'POOR',
    notes: 'Slow drip from mixer spout',
    recordedBy: asha._id,
  });
  const miAlarm = await ConditionRecord.create({
    inspection: moveInA._id,
    item: itemAlarm._id,
    roomName: 'Hallway',
    itemName: 'Smoke Alarm',
    rating: 5,
    ratingLabel: 'EXCELLENT',
    notes: 'Tested and functional',
    recordedBy: asha._id,
  });
  const miDoor = await ConditionRecord.create({
    inspection: moveInA._id,
    item: itemDoor._id,
    roomName: 'Hallway',
    itemName: 'Front Door Lock',
    rating: 5,
    ratingLabel: 'EXCELLENT',
    notes: '2 sets of keys provided, latch functional',
    recordedBy: asha._id,
  });

  // Move-In Photos
  for (const rec of [miWall, miSofa, miTable, miTap, miAlarm, miDoor]) {
    const fixture = createPhotoFixture(`movein-${rec.itemName.toLowerCase().replace(/\s+/g, '-')}`);
    await Photo.create({
      ownerModel: 'ConditionRecord',
      ownerId: rec._id,
      fileUrl: fixture.fileUrl,
      publicId: fixture.publicId,
      sha256: fixture.sha256,
      uploadedBy: asha._id,
    });
  }

  // Move-In Meters
  await MeterReading.create([
    {
      inspection: moveInA._id,
      meterType: 'ELECTRICITY',
      value: 12450,
      unit: 'kWh',
      recordedBy: asha._id,
    },
    {
      inspection: moveInA._id,
      meterType: 'GAS',
      value: 4120,
      unit: 'm³',
      recordedBy: asha._id,
    },
    {
      inspection: moveInA._id,
      meterType: 'WATER',
      value: 350,
      unit: 'm³',
      recordedBy: asha._id,
    },
  ]);

  // Lock Move-In
  await Inspection.findByIdAndUpdate(moveInA._id, {
    status: 'LOCKED',
    lockedAt: new Date('2023-01-01T14:30:00Z'),
  });

  // Mid-Tenancy Issue Report
  await IssueReport.create({
    tenancy: tenancyA._id,
    reportedBy: ravi._id,
    title: 'Kitchen tap washer repaired',
    description: 'Plumber replaced valve cartridge to resolve slow drip',
    status: 'RESOLVED',
    resolutionNotes: 'Drip stopped, tested at full pressure. Works as new.',
    resolvedAt: new Date('2023-06-15T11:00:00Z'),
    resolvedBy: asha._id,
  });

  // Move-Out Inspection
  const moveOutA = await Inspection.create({
    tenancy: tenancyA._id,
    type: 'MOVE_OUT',
    status: 'DRAFT',
    startedBy: asha._id,
    confirmations: [
      {
        user: asha._id,
        role: 'LANDLORD',
        confirmedAt: new Date('2023-12-31T15:30:00Z'),
        ip: '127.0.0.1',
      },
      {
        user: ravi._id,
        role: 'TENANT',
        confirmedAt: new Date('2023-12-31T16:00:00Z'),
        ip: '127.0.0.1',
      },
    ],
  });

  // Move-Out Condition Records (reproducing SRS example)
  const moWall = await ConditionRecord.create({
    inspection: moveOutA._id,
    item: itemWall._id,
    roomName: 'Bedroom',
    itemName: 'Bedroom Wall',
    rating: 3,
    ratingLabel: 'FAIR',
    notes: 'Pre-existing scuff near doorway unchanged',
    recordedBy: ravi._id,
  });
  const moSofa = await ConditionRecord.create({
    inspection: moveOutA._id,
    item: itemSofa._id,
    roomName: 'Living Room',
    itemName: 'Living Room Sofa',
    rating: 5,
    ratingLabel: 'EXCELLENT',
    notes: 'No stains or damage',
    recordedBy: ravi._id,
  });
  const moTable = await ConditionRecord.create({
    inspection: moveOutA._id,
    item: itemTable._id,
    roomName: 'Living Room',
    itemName: 'Dining Table',
    rating: 2,
    ratingLabel: 'POOR',
    notes: 'Deep scratch 15cm on tabletop varnish',
    recordedBy: ravi._id,
  });
  const moTap = await ConditionRecord.create({
    inspection: moveOutA._id,
    item: itemTap._id,
    roomName: 'Kitchen',
    itemName: 'Kitchen Tap',
    rating: 4,
    ratingLabel: 'GOOD',
    notes: 'Repaired washer functioning well, no leaks',
    recordedBy: ravi._id,
  });
  const moAlarm = await ConditionRecord.create({
    inspection: moveOutA._id,
    item: itemAlarm._id,
    roomName: 'Hallway',
    itemName: 'Smoke Alarm',
    rating: 5,
    ratingLabel: 'EXCELLENT',
    notes: 'Battery replaced, tested',
    recordedBy: ravi._id,
  });
  const moDoor = await ConditionRecord.create({
    inspection: moveOutA._id,
    item: itemDoor._id,
    roomName: 'Hallway',
    itemName: 'Front Door Lock',
    rating: 5,
    ratingLabel: 'EXCELLENT',
    notes: 'Working properly, both keys returned',
    recordedBy: ravi._id,
  });

  // Move-Out Photos
  for (const rec of [moWall, moSofa, moTable, moTap, moAlarm, moDoor]) {
    const fixture = createPhotoFixture(`moveout-${rec.itemName.toLowerCase().replace(/\s+/g, '-')}`);
    await Photo.create({
      ownerModel: 'ConditionRecord',
      ownerId: rec._id,
      fileUrl: fixture.fileUrl,
      publicId: fixture.publicId,
      sha256: fixture.sha256,
      uploadedBy: ravi._id,
    });
  }

  // Move-Out Meters
  await MeterReading.create([
    {
      inspection: moveOutA._id,
      meterType: 'ELECTRICITY',
      value: 15820,
      unit: 'kWh',
      recordedBy: ravi._id,
    },
    {
      inspection: moveOutA._id,
      meterType: 'GAS',
      value: 5680,
      unit: 'm³',
      recordedBy: ravi._id,
    },
    {
      inspection: moveOutA._id,
      meterType: 'WATER',
      value: 490,
      unit: 'm³',
      recordedBy: ravi._id,
    },
  ]);

  // Lock Move-Out
  await Inspection.findByIdAndUpdate(moveOutA._id, {
    status: 'LOCKED',
    lockedAt: new Date('2023-12-31T16:00:00Z'),
  });

  // Run Comparison Engine
  console.log('[Seed] Executing Comparison Engine for Scenario A...');
  const comparisonA = await runComparison(tenancyA._id);

  // Generate Certified PDF Report
  console.log('[Seed] Generating Certified PDF Report for Scenario A...');
  const { report: reportA } = await generatePdfReport(comparisonA._id);
  const shareA = await createShareLink(reportA._id, asha._id);

  // ==========================================
  // SCENARIO B: MEADOW COTTAGE (IN PROGRESS)
  // ==========================================
  console.log('[Seed] Building Scenario B: 44 Meadow Lane (In Progress)...');
  const propertyB = await Property.create({
    landlord: asha._id,
    name: 'Meadow Cottage',
    address: '44 Meadow Lane, Cambridge CB2 1TJ',
    type: 'HOUSE',
    metadata: {
      postcode: 'CB2 1TJ',
      city: 'Cambridge',
      state: 'Cambridgeshire',
    },
  });

  const roomB1 = await Room.create({ property: propertyB._id, name: 'Lounge', floor: 0 });
  const roomB2 = await Room.create({ property: propertyB._id, name: 'Kitchen', floor: 0 });
  const roomB3 = await Room.create({ property: propertyB._id, name: 'Garden', floor: 0 });

  await InventoryItem.create([
    {
      property: propertyB._id,
      room: roomB1._id,
      name: 'Oak Flooring',
      category: 'WALLS_FLOORS',
    },
    {
      property: propertyB._id,
      room: roomB1._id,
      name: 'French Windows',
      category: 'DOORS_WINDOWS',
    },
    {
      property: propertyB._id,
      room: roomB2._id,
      name: 'Refrigerator',
      category: 'APPLIANCES',
    },
    {
      property: propertyB._id,
      room: roomB3._id,
      name: 'Lawn Mower',
      category: 'EXTERIOR',
    },
  ]);

  const tenancyB = await Tenancy.create({
    property: propertyB._id,
    landlord: asha._id,
    tenants: [],
    startDate: new Date('2024-03-01'),
    endDate: new Date('2025-02-28'),
    status: 'PENDING',
    rentAmount: 2100,
    depositAmount: 2100,
    notes: 'Upcoming tenancy. Move-In draft initiated.',
  });

  // Single-use Invitation Token
  const rawInviteToken = 'demo-invitation-token-32-chars-long-12345';
  const hashedInvite = hashToken(rawInviteToken);
  await Invitation.create({
    tenancy: tenancyB._id,
    email: 'prospect.tenant@example.com',
    tokenHash: hashedInvite,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: 'PENDING',
  });

  // Move-In Draft Inspection for interactive demonstration
  await Inspection.create({
    tenancy: tenancyB._id,
    type: 'MOVE_IN',
    status: 'DRAFT',
    startedBy: asha._id,
  });

  console.log('\n======================================================');
  console.log('✅ DATABASE SEED COMPLETE:');
  console.log('------------------------------------------------------');
  console.log('1. Admin:     admin@leaseledger.test / Admin@123');
  console.log('2. Landlord:  asha@leaseledger.test  / Asha@1234');
  console.log('3. Tenant:    ravi@leaseledger.test  / Ravi@1234');
  console.log('------------------------------------------------------');
  console.log('Scenario A: Flat 12 Park Road');
  console.log(`- Tenancy ID: ${tenancyA._id} (COMPLETED)`);
  console.log(`- Comparison ID: ${comparisonA._id}`);
  console.log(`- Certified PDF Dossier: ${reportA.fileUrl}`);
  console.log(`- Public Share URL: /shared/reports/${shareA.shareToken}`);
  console.log('------------------------------------------------------');
  console.log('Scenario B: 44 Meadow Lane');
  console.log(`- Tenancy ID: ${tenancyB._id} (PENDING)`);
  console.log(`- Single-use Join Link: /join/${rawInviteToken}`);
  console.log('======================================================\n');

  return {
    admin,
    asha,
    ravi,
    tenancyA,
    comparisonA,
    reportA,
    shareA,
    tenancyB,
    rawInviteToken,
  };
}

// Direct execution from CLI
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seed()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed script error:', err);
      process.exit(1);
    });
}
