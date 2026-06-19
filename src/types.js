/**
 * @typedef {'client' | 'manager'} UserRole
 *
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} name
 * @property {UserRole} role
 * @property {string} [phone]
 * @property {string} [location]
 * @property {string} createdAt
 *
 * @typedef {'Initiated'|'Design Stage'|'Procurement & Execution'|'Snag List Clearance'|'Defect Liability / Retention'|'Completed'} ProjectStatus
 *
 * @typedef {Object} Project
 * @property {string} id
 * @property {string} name
 * @property {string} location
 * @property {string} clientId
 * @property {string} clientName
 * @property {string} managerName
 * @property {ProjectStatus} status
 * @property {number} totalAmount
 * @property {number} retentionPercentage
 * @property {number} retentionAmount
 * @property {boolean} retentionReleased
 * @property {string} retentionReleaseDate
 * @property {boolean} punchListCleared
 * @property {string} createdAt
 *
 * @typedef {'Pending'|'Invoiced'|'Paid'} MilestoneStatus
 *
 * @typedef {Object} Milestone
 * @property {string} id
 * @property {string} projectId
 * @property {string} name
 * @property {number} stageOrder
 * @property {number} weightage
 * @property {number} invoiceAmount
 * @property {string|null} invoiceNumber
 * @property {MilestoneStatus} status
 * @property {string} dueDate
 * @property {string|null} paidDate
 * @property {boolean} isRetentionApplicable
 * @property {number} retentionHeld
 * @property {string} [createdAt]
 *
 * @typedef {Object} SnagItem
 * @property {string} id
 * @property {string} projectId
 * @property {string} description
 * @property {string} roomLocation
 * @property {'Pending'|'In Progress'|'Cleared'} status
 * @property {string} reportedBy
 * @property {string} reportedAt
 * @property {string|null} resolvedAt
 *
 * @typedef {Object} Document
 * @property {string} id
 * @property {string} projectId
 * @property {'Layout Plan'|'Quotation'|'Milestone Invoice'|'Site Photo'|'Punch List'|'Contract'} type
 * @property {string} fileUrl
 * @property {string} fileName
 * @property {string} fileSize
 * @property {string} uploadedBy
 * @property {string} uploadedAt
 *
 * @typedef {Object} Notification
 * @property {string} id
 * @property {string} userId
 * @property {string} projectId
 * @property {string} projectName
 * @property {string} message
 * @property {'info'|'alert'|'milestone'|'retention'} type
 * @property {boolean} read
 * @property {string} createdAt
 *
 * @typedef {Object} AuditLog
 * @property {string} id
 * @property {string} userId
 * @property {string} userName
 * @property {UserRole} userRole
 * @property {string} projectId
 * @property {string} projectName
 * @property {string} action
 * @property {string} details
 * @property {string} timestamp
 */

export {};
