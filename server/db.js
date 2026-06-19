import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATABASE_FILE = path.resolve(process.cwd(), 'database.sqlite');

const SQL = await initSqlJs({
  locateFile: (file) => path.resolve(__dirname, '..', 'node_modules', 'sql.js', 'dist', file)
});

let db;

function bool(value) {
  return value === 1 || value === true;
}

function toBoolInt(value) {
  return value ? 1 : 0;
}

function persist() {
  const binary = db.export();
  fs.writeFileSync(DATABASE_FILE, Buffer.from(binary));
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (Array.isArray(params) && params.length) {
    stmt.bind(params);
  }
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function normalizeParams(sql, params) {
  if (Array.isArray(params)) return params;
  if (!params || typeof params !== 'object') return [];
  const placeholders = Array.from(sql.matchAll(/[@:$](\w+)/g), (match) => match[1]);
  return placeholders.map((key) =>
    params[key] !== undefined
      ? params[key]
      : params[`@${key}`] !== undefined
      ? params[`@${key}`]
      : params[`:${key}`]
  );
}

function execute(sql, params = []) {
  const normalized = normalizeParams(sql, params);
  const missing = normalized.some((value) => value === undefined);
  if (missing) {
    const placeholders = Array.from(sql.matchAll(/[@:$](\w+)/g), (match) => match[0]);
    throw new Error(`Missing SQL parameter values for query ${sql} with placeholders ${placeholders.join(', ')} and params ${JSON.stringify(params)}`);
  }
  const sqlText = normalized.length ? sql.replace(/[@:$](\w+)/g, '?') : sql;
  db.run(sqlText, normalized);
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT,
      location TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      clientId TEXT NOT NULL,
      clientName TEXT NOT NULL,
      managerName TEXT NOT NULL,
      status TEXT NOT NULL,
      totalAmount REAL NOT NULL,
      retentionPercentage REAL NOT NULL,
      retentionAmount REAL NOT NULL,
      retentionReleased INTEGER NOT NULL,
      retentionReleaseDate TEXT NOT NULL,
      punchListCleared INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      name TEXT NOT NULL,
      stageOrder INTEGER NOT NULL,
      weightage REAL NOT NULL,
      invoiceAmount REAL NOT NULL,
      invoiceNumber TEXT,
      status TEXT NOT NULL,
      dueDate TEXT NOT NULL,
      paidDate TEXT,
      isRetentionApplicable INTEGER NOT NULL,
      retentionHeld REAL NOT NULL,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS snagItems (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      description TEXT NOT NULL,
      roomLocation TEXT NOT NULL,
      status TEXT NOT NULL,
      reportedBy TEXT NOT NULL,
      reportedAt TEXT NOT NULL,
      resolvedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      fileUrl TEXT NOT NULL,
      fileName TEXT NOT NULL,
      fileSize TEXT NOT NULL,
      uploadedBy TEXT NOT NULL,
      uploadedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      projectId TEXT NOT NULL,
      projectName TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      read INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auditLogs (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      userName TEXT NOT NULL,
      userRole TEXT NOT NULL,
      projectId TEXT NOT NULL,
      projectName TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );
  `);
}

function mapBooleanFields(rows, fields) {
  return rows.map((row) => {
    const copy = { ...row };
    for (const field of fields) {
      copy[field] = bool(copy[field]);
    }
    return copy;
  });
}

function seedDatabase() {
  const users = [
    {
      id: 'usr_mgr_1',
      email: 'manager@gmail.com',
      name: 'Glory Simon',
      role: 'manager',
      phone: '+1 (555) 123-4567',
      location: 'Design Studio, HQ',
      createdAt: new Date('2026-01-10').toISOString()
    },
    {
      id: 'usr_clt_1',
      email: 'client@gmail.com',
      name: 'Sarah Connor',
      role: 'client',
      phone: '+1 (555) 987-6543',
      location: 'Villa 42, Ocean Crest Blvd',
      createdAt: new Date('2026-02-01').toISOString()
    },
    {
      id: 'usr_clt_2',
      email: 'client2@gmail.com',
      name: 'Robert Chen',
      role: 'client',
      phone: '+1 (555) 345-6789',
      location: 'Penthouse B, Skyline Heights',
      createdAt: new Date('2026-03-05').toISOString()
    }
  ];

  const projects = [
    {
      id: 'proj_sarah_1',
      name: 'Villa Horizon Living Area',
      location: 'Ocean Crest Villa 42',
      clientId: 'usr_clt_1',
      clientName: 'Sarah Connor',
      managerName: 'Glory Simon',
      status: 'Defect Liability / Retention',
      totalAmount: 120000,
      retentionPercentage: 5,
      retentionAmount: 6000,
      retentionReleased: false,
      retentionReleaseDate: new Date('2026-06-25').toISOString(),
      punchListCleared: false,
      createdAt: new Date('2026-02-15').toISOString()
    },
    {
      id: 'proj_robert_2',
      name: 'Skyline Penthouse Modular Kitchen',
      location: 'Heights Apartment 1204',
      clientId: 'usr_clt_2',
      clientName: 'Robert Chen',
      managerName: 'Glory Simon',
      status: 'Procurement & Execution',
      totalAmount: 85000,
      retentionPercentage: 10,
      retentionAmount: 8500,
      retentionReleased: false,
      retentionReleaseDate: new Date('2026-09-15').toISOString(),
      punchListCleared: false,
      createdAt: new Date('2026-03-10').toISOString()
    }
  ];

  const milestones = [
    {
      id: 'ms_sarah_1',
      projectId: 'proj_sarah_1',
      name: 'Inception, Theme & Space Planning',
      stageOrder: 1,
      weightage: 15,
      invoiceAmount: 18000,
      invoiceNumber: 'INV-2026-001',
      status: 'Paid',
      dueDate: '2026-02-25T00:00:00.000Z',
      paidDate: '2026-02-24T14:30:00.000Z',
      isRetentionApplicable: true,
      retentionHeld: 900,
      createdAt: new Date('2026-02-15').toISOString()
    },
    {
      id: 'ms_sarah_2',
      projectId: 'proj_sarah_1',
      name: 'Plumbing, Civil Alterations & Demolition',
      stageOrder: 2,
      weightage: 15,
      invoiceAmount: 18000,
      invoiceNumber: 'INV-2026-004',
      status: 'Paid',
      dueDate: '2026-03-15T00:00:00.000Z',
      paidDate: '2026-03-16T10:15:00.000Z',
      isRetentionApplicable: true,
      retentionHeld: 900,
      createdAt: new Date('2026-02-15').toISOString()
    },
    {
      id: 'ms_sarah_3',
      projectId: 'proj_sarah_1',
      name: 'False Ceiling & Electrical Concealment',
      stageOrder: 3,
      weightage: 20,
      invoiceAmount: 24000,
      invoiceNumber: 'INV-2026-009',
      status: 'Paid',
      dueDate: '2026-04-10T00:00:00.000Z',
      paidDate: '2026-04-09T16:45:00.000Z',
      isRetentionApplicable: true,
      retentionHeld: 1200,
      createdAt: new Date('2026-02-15').toISOString()
    },
    {
      id: 'ms_sarah_4',
      projectId: 'proj_sarah_1',
      name: 'Premium Woodwork, Cabinetry & Veneers',
      stageOrder: 4,
      weightage: 30,
      invoiceAmount: 36000,
      invoiceNumber: 'INV-2026-015',
      status: 'Paid',
      dueDate: '2026-05-05T00:00:00.000Z',
      paidDate: '2026-05-08T11:00:00.000Z',
      isRetentionApplicable: true,
      retentionHeld: 1800,
      createdAt: new Date('2026-02-15').toISOString()
    },
    {
      id: 'ms_sarah_5',
      projectId: 'proj_sarah_1',
      name: 'Finishing, Wall Treatment & Lighting Trim',
      stageOrder: 5,
      weightage: 10,
      invoiceAmount: 12000,
      invoiceNumber: 'INV-2026-021',
      status: 'Invoiced',
      dueDate: '2026-06-10T00:00:00.000Z',
      paidDate: null,
      isRetentionApplicable: true,
      retentionHeld: 600,
      createdAt: new Date('2026-02-15').toISOString()
    },
    {
      id: 'ms_sarah_6',
      projectId: 'proj_sarah_1',
      name: 'Handover Inspection, Punch List & Defect liability',
      stageOrder: 6,
      weightage: 10,
      invoiceAmount: 12000,
      invoiceNumber: null,
      status: 'Pending',
      dueDate: '2026-06-25T00:00:00.000Z',
      paidDate: null,
      isRetentionApplicable: true,
      retentionHeld: 600,
      createdAt: new Date('2026-02-15').toISOString()
    },
    {
      id: 'ms_robert_1',
      projectId: 'proj_robert_2',
      name: 'Inception, Theme & Space Planning',
      stageOrder: 1,
      weightage: 20,
      invoiceAmount: 17000,
      invoiceNumber: 'INV-2026-003',
      status: 'Paid',
      dueDate: '2026-03-25T00:00:00.000Z',
      paidDate: '2026-03-22T09:30:00.000Z',
      isRetentionApplicable: true,
      retentionHeld: 1700,
      createdAt: new Date('2026-03-10').toISOString()
    },
    {
      id: 'ms_robert_2',
      projectId: 'proj_robert_2',
      name: 'Plumbing, Civil Alterations & Demolition',
      stageOrder: 2,
      weightage: 10,
      invoiceAmount: 8500,
      invoiceNumber: 'INV-2026-007',
      status: 'Paid',
      dueDate: '2026-04-15T00:00:00.000Z',
      paidDate: '2026-04-18T15:20:00.000Z',
      isRetentionApplicable: true,
      retentionHeld: 850,
      createdAt: new Date('2026-03-10').toISOString()
    },
    {
      id: 'ms_robert_3',
      projectId: 'proj_robert_2',
      name: 'False Ceiling & Electrical Concealment',
      stageOrder: 3,
      weightage: 20,
      invoiceAmount: 17000,
      invoiceNumber: 'INV-2026-018',
      status: 'Invoiced',
      dueDate: '2026-05-20T00:00:00.000Z',
      paidDate: null,
      isRetentionApplicable: true,
      retentionHeld: 1700,
      createdAt: new Date('2026-03-10').toISOString()
    },
    {
      id: 'ms_robert_4',
      projectId: 'proj_robert_2',
      name: 'Premium Woodwork, Cabinetry & Veneers',
      stageOrder: 4,
      weightage: 30,
      invoiceAmount: 25500,
      invoiceNumber: null,
      status: 'Pending',
      dueDate: '2026-06-30T00:00:00.000Z',
      paidDate: null,
      isRetentionApplicable: true,
      retentionHeld: 2550,
      createdAt: new Date('2026-03-10').toISOString()
    },
    {
      id: 'ms_robert_5',
      projectId: 'proj_robert_2',
      name: 'Finishing, Wall Treatment & Lighting Trim',
      stageOrder: 5,
      weightage: 10,
      invoiceAmount: 8500,
      invoiceNumber: null,
      status: 'Pending',
      dueDate: '2026-07-20T00:00:00.000Z',
      paidDate: null,
      isRetentionApplicable: true,
      retentionHeld: 850,
      createdAt: new Date('2026-03-10').toISOString()
    },
    {
      id: 'ms_robert_6',
      projectId: 'proj_robert_2',
      name: 'Handover Inspection, Punch List & Defect liability',
      stageOrder: 6,
      weightage: 10,
      invoiceAmount: 8500,
      invoiceNumber: null,
      status: 'Pending',
      dueDate: '2026-09-15T00:00:00.000Z',
      paidDate: null,
      isRetentionApplicable: true,
      retentionHeld: 850,
      createdAt: new Date('2026-03-10').toISOString()
    }
  ];

  const snagItems = [
    {
      id: 'snag_1',
      projectId: 'proj_sarah_1',
      description: 'Minor hairline paint crack on southern partition wall',
      roomLocation: 'Main Living Room',
      status: 'In Progress',
      reportedBy: 'Client: Sarah',
      reportedAt: '2026-06-05T10:00:00.000Z',
      resolvedAt: null
    },
    {
      id: 'snag_2',
      projectId: 'proj_sarah_1',
      description: 'Touch up soft dampener for corner pantry drawer track',
      roomLocation: 'Pantry Archway',
      status: 'Pending',
      reportedBy: 'Client: Sarah',
      reportedAt: '2026-06-11T16:30:00.000Z',
      resolvedAt: null
    },
    {
      id: 'snag_3',
      projectId: 'proj_sarah_1',
      description: 'Clean dust residue around the overhead chandelier canopy',
      roomLocation: 'Double Height Foyer',
      status: 'Cleared',
      reportedBy: 'Manager: Glory',
      reportedAt: '2026-06-01T09:00:00.000Z',
      resolvedAt: '2026-06-03T14:00:00.000Z'
    }
  ];

  const documents = [
    {
      id: 'doc_1',
      projectId: 'proj_sarah_1',
      name: 'Approved Concept Pitch & Material Moodboard',
      type: 'Layout Plan',
      fileUrl: '/assets/sample_moodboard.pdf',
      fileName: 'Villa_Horizon_Moodboard.pdf',
      fileSize: '4.2 MB',
      uploadedBy: 'Manager: Glory Simon',
      uploadedAt: '2026-02-18T11:20:00.000Z'
    },
    {
      id: 'doc_2',
      projectId: 'proj_sarah_1',
      name: 'Executed Work Completion Agreement',
      type: 'Contract',
      fileUrl: '/assets/sarah_completion_signed.pdf',
      fileName: 'Sarah_Completion_Signed.pdf',
      fileSize: '1.8 MB',
      uploadedBy: 'Manager: Glory Simon',
      uploadedAt: '2026-05-15T09:00:00.000Z'
    }
  ];

  const notifications = [
    {
      id: 'notif_1',
      userId: 'usr_clt_1',
      projectId: 'proj_sarah_1',
      projectName: 'Villa Horizon Living Area',
      message: 'Stage 5 Milestone was invoiced (INV-2026-021). Outstanding payment: ₹12,000.',
      type: 'milestone',
      read: false,
      createdAt: '2026-06-10T14:45:00.000Z'
    },
    {
      id: 'notif_2',
      userId: 'usr_mgr_1',
      projectId: 'proj_sarah_1',
      projectName: 'Villa Horizon Living Area',
      message: 'Sarah Connor has reported a new snag item in the Main Living Room.',
      type: 'info',
      read: false,
      createdAt: '2026-06-11T16:35:00.000Z'
    }
  ];

  const auditLogs = [
    {
      id: 'audit_1',
      userId: 'usr_mgr_1',
      userName: 'Glory Simon',
      userRole: 'manager',
      projectId: 'proj_sarah_1',
      projectName: 'Villa Horizon Living Area',
      action: 'Project Stage Transitioned',
      details: "Transitioned project stage from 'Cabinetry Woodwork' to 'Defect Liability / Retention'.",
      timestamp: '2026-05-15T09:05:00.000Z'
    },
    {
      id: 'audit_2',
      userId: 'usr_mgr_1',
      userName: 'Glory Simon',
      userRole: 'manager',
      projectId: 'proj_sarah_1',
      projectName: 'Villa Horizon Living Area',
      action: 'Invoice Raised',
      details: "Issued Invoice INV-2026-021 for Milestone 5 'Finishing & Paintings (₹12,000)' with 5% retention held.",
      timestamp: '2026-06-10T14:40:00.000Z'
    }
  ];

  db.exec('BEGIN TRANSACTION;');
  for (const item of users) {
    execute(`INSERT INTO users (id, email, name, role, phone, location, createdAt) VALUES (@id, @email, @name, @role, @phone, @location, @createdAt);`, item);
  }
  for (const item of projects) {
    execute(`INSERT INTO projects (id, name, location, clientId, clientName, managerName, status, totalAmount, retentionPercentage, retentionAmount, retentionReleased, retentionReleaseDate, punchListCleared, createdAt) VALUES (@id, @name, @location, @clientId, @clientName, @managerName, @status, @totalAmount, @retentionPercentage, @retentionAmount, @retentionReleased, @retentionReleaseDate, @punchListCleared, @createdAt);`, {
      ...item,
      retentionReleased: toBoolInt(item.retentionReleased),
      punchListCleared: toBoolInt(item.punchListCleared)
    });
  }
  for (const item of milestones) {
    execute(`INSERT INTO milestones (id, projectId, name, stageOrder, weightage, invoiceAmount, invoiceNumber, status, dueDate, paidDate, isRetentionApplicable, retentionHeld, createdAt) VALUES (@id, @projectId, @name, @stageOrder, @weightage, @invoiceAmount, @invoiceNumber, @status, @dueDate, @paidDate, @isRetentionApplicable, @retentionHeld, @createdAt);`, {
      ...item,
      isRetentionApplicable: toBoolInt(item.isRetentionApplicable)
    });
  }
  for (const item of snagItems) {
    execute(`INSERT INTO snagItems (id, projectId, description, roomLocation, status, reportedBy, reportedAt, resolvedAt) VALUES (@id, @projectId, @description, @roomLocation, @status, @reportedBy, @reportedAt, @resolvedAt);`, item);
  }
  for (const item of documents) {
    execute(`INSERT INTO documents (id, projectId, name, type, fileUrl, fileName, fileSize, uploadedBy, uploadedAt) VALUES (@id, @projectId, @name, @type, @fileUrl, @fileName, @fileSize, @uploadedBy, @uploadedAt);`, item);
  }
  for (const item of notifications) {
    execute(`INSERT INTO notifications (id, userId, projectId, projectName, message, type, read, createdAt) VALUES (@id, @userId, @projectId, @projectName, @message, @type, @read, @createdAt);`, {
      ...item,
      read: toBoolInt(item.read)
    });
  }
  for (const item of auditLogs) {
    execute(`INSERT INTO auditLogs (id, userId, userName, userRole, projectId, projectName, action, details, timestamp) VALUES (@id, @userId, @userName, @userRole, @projectId, @projectName, @action, @details, @timestamp);`, item);
  }
  db.exec('COMMIT;');
  persist();
}

function initializeDatabase() {
  createTables();
  const count = queryAll('SELECT COUNT(*) as count FROM users;')[0]?.count ?? 0;
  if (count === 0) {
    seedDatabase();
  }
}

function toObjects(result) {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map((row) => {
    const obj = {};
    row.forEach((value, index) => {
      obj[columns[index]] = value;
    });
    return obj;
  });
}

export function readDB() {
  return {
    users: queryAll('SELECT * FROM users;'),
    projects: mapBooleanFields(queryAll('SELECT * FROM projects;'), ['retentionReleased', 'punchListCleared']),
    milestones: mapBooleanFields(queryAll('SELECT * FROM milestones;'), ['isRetentionApplicable']),
    snagItems: queryAll('SELECT * FROM snagItems;'),
    documents: queryAll('SELECT * FROM documents;'),
    notifications: mapBooleanFields(queryAll('SELECT * FROM notifications;'), ['read']),
    auditLogs: queryAll('SELECT * FROM auditLogs;')
  };
}

export function writeDB(database) {
  db.exec('BEGIN TRANSACTION;');
  db.exec('DELETE FROM notifications; DELETE FROM auditLogs; DELETE FROM documents; DELETE FROM snagItems; DELETE FROM milestones; DELETE FROM projects; DELETE FROM users;');

  const insertUser = `INSERT INTO users (id, email, name, role, phone, location, createdAt) VALUES (@id, @email, @name, @role, @phone, @location, @createdAt);`;
  const insertProject = `INSERT INTO projects (id, name, location, clientId, clientName, managerName, status, totalAmount, retentionPercentage, retentionAmount, retentionReleased, retentionReleaseDate, punchListCleared, createdAt) VALUES (@id, @name, @location, @clientId, @clientName, @managerName, @status, @totalAmount, @retentionPercentage, @retentionAmount, @retentionReleased, @retentionReleaseDate, @punchListCleared, @createdAt);`;
  const insertMilestone = `INSERT INTO milestones (id, projectId, name, stageOrder, weightage, invoiceAmount, invoiceNumber, status, dueDate, paidDate, isRetentionApplicable, retentionHeld, createdAt) VALUES (@id, @projectId, @name, @stageOrder, @weightage, @invoiceAmount, @invoiceNumber, @status, @dueDate, @paidDate, @isRetentionApplicable, @retentionHeld, @createdAt);`;
  const insertSnag = `INSERT INTO snagItems (id, projectId, description, roomLocation, status, reportedBy, reportedAt, resolvedAt) VALUES (@id, @projectId, @description, @roomLocation, @status, @reportedBy, @reportedAt, @resolvedAt);`;
  const insertDocument = `INSERT INTO documents (id, projectId, name, type, fileUrl, fileName, fileSize, uploadedBy, uploadedAt) VALUES (@id, @projectId, @name, @type, @fileUrl, @fileName, @fileSize, @uploadedBy, @uploadedAt);`;
  const insertNotification = `INSERT INTO notifications (id, userId, projectId, projectName, message, type, read, createdAt) VALUES (@id, @userId, @projectId, @projectName, @message, @type, @read, @createdAt);`;
  const insertAudit = `INSERT INTO auditLogs (id, userId, userName, userRole, projectId, projectName, action, details, timestamp) VALUES (@id, @userId, @userName, @userRole, @projectId, @projectName, @action, @details, @timestamp);`;

  for (const item of database.users) execute(insertUser, item);
  for (const item of database.projects) execute(insertProject, {
    ...item,
    retentionReleased: toBoolInt(item.retentionReleased),
    punchListCleared: toBoolInt(item.punchListCleared)
  });
  for (const item of database.milestones) execute(insertMilestone, {
    ...item,
    isRetentionApplicable: toBoolInt(item.isRetentionApplicable)
  });
  for (const item of database.snagItems) execute(insertSnag, item);
  for (const item of database.documents) execute(insertDocument, item);
  for (const item of database.notifications) execute(insertNotification, {
    ...item,
    read: toBoolInt(item.read)
  });
  for (const item of database.auditLogs) execute(insertAudit, item);

  db.exec('COMMIT;');
  persist();
}

export function logAction(userId, userName, userRole, projectId, projectName, action, details) {
  const log = {
    id: `audit_${Date.now()}`,
    userId,
    userName,
    userRole,
    projectId,
    projectName,
    action,
    details,
    timestamp: new Date().toISOString()
  };
  execute(`INSERT INTO auditLogs (id, userId, userName, userRole, projectId, projectName, action, details, timestamp) VALUES (@id, @userId, @userName, @userRole, @projectId, @projectName, @action, @details, @timestamp);`, log);
  persist();
  return log;
}

export function pushNotification(userId, projectId, projectName, message, type) {
  const notification = {
    id: `notif_${Date.now()}`,
    userId,
    projectId,
    projectName,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString()
  };
  execute(`INSERT INTO notifications (id, userId, projectId, projectName, message, type, read, createdAt) VALUES (@id, @userId, @projectId, @projectName, @message, @type, @read, @createdAt);`, {
    ...notification,
    read: toBoolInt(notification.read)
  });
  persist();
  return notification;
}

if (fs.existsSync(DATABASE_FILE)) {
  const existing = fs.readFileSync(DATABASE_FILE);
  db = new SQL.Database(new Uint8Array(existing));
  createTables();
} else {
  db = new SQL.Database();
  createTables();
  seedDatabase();
}
