import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
// Load environment variables
dotenv.config();
import { readDB, writeDB, logAction, pushNotification } from "./server/db.js";
const app = express();
const PORT = process.env.PORT || 3000;
// Set up support for larger JSON payloads (important for base64 file uploads)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
// Create the uploads and assets folder if they do not exist
const uploadsDir = process.env.VERCEL 
    ? "/tmp/uploads" 
    : path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
// Serve uploaded files statically
app.use("/uploads", express.static(uploadsDir));
// Keep track of active logins (in-memory mock sessions)
const activeSessions = new Map();
// Lazy initialize Gemini client
let aiClient = null;
function getGeminiClient() {
    if (!aiClient) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
            aiClient = new GoogleGenAI({
                apiKey,
                httpOptions: {
                    headers: {
                        "User-Agent": "aistudio-build",
                    },
                },
            });
        }
    }
    return aiClient;
}
// ================= PRIVATE MIDDLEWARE =================
// Simple auth verification from header
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
        res.status(401).json({ error: "Access token missing" });
        return;
    }
    const user = activeSessions.get(token);
    if (!user) {
        res.status(403).json({ error: "Session expired or invalid" });
        return;
    }
    req.user = user;
    next();
};
// ================= API ROUTES FIRST =================
// Auth Route: Login
app.post("/api/auth/login", async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
        res.status(400).json({ error: "Email, password, and role are required" });
        return;
    }
    const db = await readDB();
    const matchedUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.role === role);
    if (!matchedUser) {
        res.status(401).json({ error: "Invalid credentials for chosen role" });
        return;
    }
    // Simple token generation
    const sessionToken = `session_${matchedUser.id}_${Date.now()}`;
    activeSessions.set(sessionToken, matchedUser);
    res.json({
        token: sessionToken,
        user: matchedUser
    });
});
// Auth Route: Sign Up
app.post("/api/auth/signup", async (req, res) => {
    const { email, name, password, role, phone, location } = req.body;
    if (!email || !name || !password || !role) {
        res.status(400).json({ error: "Required fields are missing" });
        return;
    }
    const db = await readDB();
    const exists = db.users.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
        res.status(400).json({ error: "A user with this email already exists" });
        return;
    }
    const newUser = {
        id: `usr_${Date.now()}`,
        email,
        name,
        role,
        phone,
        location,
        createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    await writeDB(db);
    const sessionToken = `session_${newUser.id}_${Date.now()}`;
    activeSessions.set(sessionToken, newUser);
    res.status(201).json({
        token: sessionToken,
        user: newUser
    });
});
// Auth Route: Profile / Validate
app.get("/api/auth/me", async (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
        res.status(401).json({ error: "Token not found" });
        return;
    }
    const user = activeSessions.get(token);
    if (!user) {
        res.status(401).json({ error: "Invalid session" });
        return;
    }
    res.json({ user });
});
// Logs Out Service
app.post("/api/auth/logout", async (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token) {
        activeSessions.delete(token);
    }
    res.json({ success: true, message: "Logged out successfully" });
});
// Debug Route: show all database tables in raw JSON (development helper)
app.get("/api/debug/all", async (req, res) => {
    if (process.env.NODE_ENV === "production") {
        res.status(403).json({ error: "Debug endpoint disabled in production" });
        return;
    }
    const db = await readDB();
    res.json(db);
});

function renderDebugHtml(db) {
    const renderTable = (name, rows) => {
        if (!rows || rows.length === 0) {
            return `<section><h2>${name}</h2><p><em>No rows found.</em></p></section>`;
        }
        const columns = Object.keys(rows[0]);
        const header = columns.map(col => `<th>${col}</th>`).join("");
        const body = rows.map(row => `
            <tr>${columns.map(col => `<td>${String(row[col] ?? "")}</td>`).join("")}</tr>
        `).join("");
        return `
            <section>
                <h2>${name} (${rows.length})</h2>
                <div class="table-wrap">
                    <table>
                        <thead><tr>${header}</tr></thead>
                        <tbody>${body}</tbody>
                    </table>
                </div>
            </section>
        `;
    };
    const tablesHtml = Object.entries(db).map(([name, rows]) => renderTable(name, rows)).join("\n");
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Database Debug Viewer</title>
    <style>
        body { font-family: Inter, Arial, sans-serif; margin: 0; padding: 24px; background:#f6f8fb; color:#111; }
        h1 { margin-bottom: 8px; }
        p { margin-top: 0; color:#444; }
        section { background: #fff; border: 1px solid #d8dee6; border-radius: 12px; padding: 18px; margin: 20px 0; box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08); }
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 700px; }
        th, td { padding: 10px 12px; border: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
        th { background: #f3f4f6; color: #111827; font-weight: 600; }
        tr:nth-child(even) { background: #fbfbfb; }
        a { color: #1d4ed8; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .top-bar { margin-bottom: 14px; }
    </style>
</head>
<body>
    <div class="top-bar">
        <h1>Database Debug Viewer</h1>
        <p>Live database tables in a readable table format. <a href="/api/debug/all">View raw JSON instead</a>.</p>
    </div>
    ${tablesHtml}
</body>
</html>`;
}

// Debug Route: show all database tables in HTML table format
app.get("/api/debug/html", async (req, res) => {
    if (process.env.NODE_ENV === "production") {
        res.status(403).send("<h1>Debug endpoint disabled in production</h1>");
        return;
    }
    const db = await readDB();
    res.send(renderDebugHtml(db));
});

// Local debug page route
app.get("/debug", async (req, res) => {
    if (process.env.NODE_ENV === "production") {
        res.status(403).send("<h1>Debug endpoint disabled in production</h1>");
        return;
    }
    const db = await readDB();
    res.send(renderDebugHtml(db));
});
// Projects: Get pipeline (Clients see only theirs, Managers see all)
app.get("/api/projects", authenticateToken, async (req, res) => {
    const user = req.user;
    const db = await readDB();
    if (user.role === "manager") {
        res.json(db.projects);
    }
    else {
        // Client sees only projects assigned to their client email/id
        const clientProjects = db.projects.filter(p => p.clientId === user.id);
        res.json(clientProjects);
    }
});
// Projects: Create a new project (Manager only)
app.post("/api/projects", authenticateToken, async (req, res) => {
    const user = req.user;
    if (user.role !== "manager") {
        res.status(403).json({ error: "Manager permissions required" });
        return;
    }
    const { name, clientEmail, location, totalAmount, retentionPercentage, retentionReleaseMonths } = req.body;
    if (!name || !clientEmail || !location || !totalAmount) {
        res.status(400).json({ error: "Required fields missing" });
        return;
    }
    const db = await readDB();
    // Lookup client
    const client = db.users.find(u => u.email.toLowerCase() === clientEmail.toLowerCase() && u.role === "client");
    if (!client) {
        res.status(404).json({ error: "Client with this email was not found. Please verify they are registered first." });
        return;
    }
    const projectId = `proj_${Date.now()}`;
    const totalVal = parseFloat(totalAmount);
    const retPercent = parseInt(retentionPercentage) || 5;
    const retAmount = totalVal * (retPercent / 100);
    // Retention release date (typically project completion date + defect liability month wait)
    const waitMonths = parseInt(retentionReleaseMonths) || 12;
    const retentionDate = new Date();
    retentionDate.setMonth(retentionDate.getMonth() + waitMonths);
    const newProject = {
        id: projectId,
        name,
        location,
        clientId: client.id,
        clientName: client.name,
        managerName: user.name,
        status: "Initiated",
        totalAmount: totalVal,
        retentionPercentage: retPercent,
        retentionAmount: retAmount,
        retentionReleased: false,
        retentionReleaseDate: retentionDate.toISOString(),
        punchListCleared: false,
        createdAt: new Date().toISOString()
    };
    db.projects.push(newProject);
    // Initialize standard 6-stage milestones for interior workflow
    const milestoneWeights = [15, 15, 20, 30, 10, 10]; // Sums up to 100%
    const milestoneNames = [
        "Inception, Theme & Space Planning",
        "Plumbing, Civil Alterations & Demolition",
        "False Ceiling & Electrical Concealment",
        "Premium Woodwork, Cabinetry & Veneers",
        "Finishing, Wall Treatment & Lighting Trim",
        "Handover Inspection, Punch List & Defect liability"
    ];
    const projectMilestones = milestoneNames.map((mName, index) => {
        const layer = index + 1;
        const weight = milestoneWeights[index];
        const portionVal = totalVal * (weight / 100);
        return {
            id: `ms_${projectId}_${layer}`,
            projectId,
            name: mName,
            stageOrder: layer,
            weightage: weight,
            invoiceAmount: portionVal,
            invoiceNumber: null,
            status: "Pending",
            dueDate: new Date(Date.now() + layer * 15 * 24 * 60 * 60 * 1000).toISOString(),
            paidDate: null,
            isRetentionApplicable: true,
            retentionHeld: portionVal * (retPercent / 100),
            createdAt: new Date().toISOString()
        };
    });
    db.milestones.push(...projectMilestones);
    await writeDB(db);
    await logAction(user.id, user.name, "manager", projectId, name, "Project Formed", `Created project with 10% retention rule, release scheduled on ${retentionDate.toLocaleDateString()}.`);
    await pushNotification(client.id, projectId, name, `New Glory Simon Interiors project "${name}" has been established with your design team. Welcome!`, "info");
    res.status(201).json({ project: newProject, milestones: projectMilestones });
});
// Update project status (Manager only)
app.put("/api/projects/:id/status", authenticateToken, async (req, res) => {
    const user = req.user;
    if (user.role !== "manager") {
        res.status(403).json({ error: "Manager permissions required" });
        return;
    }
    const { status } = req.body;
    if (!status) {
        res.status(400).json({ error: "Status is required" });
        return;
    }
    const db = await readDB();
    const projectIdx = db.projects.findIndex(p => p.id === req.params.id);
    if (projectIdx === -1) {
        res.status(404).json({ error: "Project not found" });
        return;
    }
    const oldStatus = db.projects[projectIdx].status;
    db.projects[projectIdx].status = status;
    const project = db.projects[projectIdx];
    await writeDB(db);
    await logAction(user.id, user.name, "manager", project.id, project.name, "Status Changed", `Shifted project phase from '${oldStatus}' to '${status}'.`);
    await pushNotification(project.clientId, project.id, project.name, `Your project stage is officially in "${status}". View the breakdown in your client portal.`, "info");
    res.json(project);
});
// Get Milestones for project
app.get("/api/projects/:id/milestones", authenticateToken, async (req, res) => {
    const db = await readDB();
    const projectMilestones = db.milestones.filter(m => m.projectId === req.params.id);
    // Sort by stageOrder chronological index
    projectMilestones.sort((a, b) => a.stageOrder - b.stageOrder);
    res.json(projectMilestones);
});
// Raising invoice for Milestone / Confirming payment
app.put("/api/milestones/:id", authenticateToken, async (req, res) => {
    const user = req.user;
    const { status, invoiceNumber, paidDate } = req.body;
    const db = await readDB();
    const index = db.milestones.findIndex(m => m.id === req.params.id);
    if (index === -1) {
        res.status(404).json({ error: "Milestone status update failed" });
        return;
    }
    const milestone = db.milestones[index];
    const project = db.projects.find(p => p.id === milestone.projectId);
    if (!project) {
        res.status(404).json({ error: "Associated project not found" });
        return;
    }
    // Authorize: Client can only update to "Paid" if paying, or manager can invoice/pay.
    if (user.role === "client" && status !== "Paid" && milestone.status !== "Invoiced") {
        res.status(403).json({ error: "Clients can only record payments for invoiced milestones." });
        return;
    }
    const prevStatus = milestone.status;
    milestone.status = status;
    if (status === "Invoiced") {
        milestone.invoiceNumber = invoiceNumber || `INV-2026-${Math.floor(100 + Math.random() * 900)}`;
        await logAction(user.id, user.name, user.role, project.id, project.name, "Milestone Invoiced", `Created Invoice ${milestone.invoiceNumber} for '${milestone.name}'. Retention deduction amount held: ₹${milestone.retentionHeld.toLocaleString()}.`);
        await pushNotification(project.clientId, project.id, project.name, `Glory Simon Interiors posted Invoice ${milestone.invoiceNumber} for phase "${milestone.name}". Please process at your earliest convenience.`, "milestone");
    }
    else if (status === "Paid") {
        milestone.paidDate = paidDate || new Date().toISOString();
        await logAction(user.id, user.name, user.role, project.id, project.name, "Milestone Cleared", `Settled Milestone Invoice covering '${milestone.name}'. Received amount, retention deposit recorded.`);
        await pushNotification(project.clientId, project.id, project.name, `Payment confirmation: ₹${milestone.invoiceAmount.toLocaleString()} has been received for "${milestone.name}". Thank you.`, "milestone");
        await pushNotification(db.users.find(u => u.role === "manager")?.id || "usr_mgr_1", project.id, project.name, `Client ${project.clientName} paid Invoice for "${milestone.name}". Milestone cleared successfully.`, "info");
        // Auto status update: If ALL project milestones are Paid, set project status to "Completed"
        const allMilestones = db.milestones.filter(m => m.projectId === project.id);
        const allPaid = allMilestones.every(m => m.status === "Paid");
        if (allPaid) {
            project.status = "Completed";
        }
    }
    await writeDB(db);
    res.json(milestone);
});
// Update retention release status (Manager only)
app.put("/api/projects/:id/retention-release", authenticateToken, async (req, res) => {
    const user = req.user;
    if (user.role !== "manager") {
        res.status(403).json({ error: "Manager permissions required" });
        return;
    }
    const { release } = req.body;
    const db = await readDB();
    const projectIdx = db.projects.findIndex(p => p.id === req.params.id);
    if (projectIdx === -1) {
        res.status(404).json({ error: "Project not found" });
        return;
    }
    const project = db.projects[projectIdx];
    project.retentionReleased = !!release;
    if (release) {
        project.status = "Completed";
    }
    await writeDB(db);
    await logAction(user.id, user.name, "manager", project.id, project.name, "Retention Released", `Retention fund of ₹${project.retentionAmount.toLocaleString()} officially claimed and received. Defect Liability Period Certificate issued.`);
    await pushNotification(project.clientId, project.id, project.name, `Glory Simon Interiors has successfully claimed the matching retention hold. The project is marked as Fully Settled!`, "retention");
    res.json(project);
});
// Get Snags for project
app.get("/api/projects/:id/snags", authenticateToken, async (req, res) => {
    const db = await readDB();
    const snags = db.snagItems.filter(s => s.projectId === req.params.id);
    res.json(snags);
});
// Create Snag Item (Client or Manager)
app.post("/api/projects/:id/snags", authenticateToken, async (req, res) => {
    const user = req.user;
    const { description, roomLocation } = req.body;
    if (!description || !roomLocation) {
        res.status(400).json({ error: "Description and Room Location are required" });
        return;
    }
    const db = await readDB();
    const project = db.projects.find(p => p.id === req.params.id);
    if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
    }
    const newSnag = {
        id: `snag_${Date.now()}`,
        projectId: project.id,
        description,
        roomLocation,
        status: "Pending",
        reportedBy: `${user.role === 'manager' ? 'Manager' : 'Client'}: ${user.name}`,
        reportedAt: new Date().toISOString(),
        resolvedAt: null
    };
    db.snagItems.push(newSnag);
    // Mark project punchListCleared as false if newly added punch items
    project.punchListCleared = false;
    if (project.status === "Completed") {
        project.status = "Snag List Clearance";
    }
    await writeDB(db);
    await logAction(user.id, user.name, user.role, project.id, project.name, "Snag Added", `Reported snag in ${roomLocation}: "${description}".`);
    // Notify other party
    const targetAlertUserId = user.role === "manager" ? project.clientId : "usr_mgr_1";
    await pushNotification(targetAlertUserId, project.id, project.name, `New defect reported in room: ${roomLocation} - ${description}. Please review snag logs.`, "alert");
    res.status(201).json(newSnag);
});
// Update Snag status (Clear, In Progress)
app.put("/api/snags/:id", authenticateToken, async (req, res) => {
    const user = req.user;
    const { status } = req.body;
    if (!status) {
        res.status(400).json({ error: "Status is required" });
        return;
    }
    const db = await readDB();
    const index = db.snagItems.findIndex(s => s.id === req.params.id);
    if (index === -1) {
        res.status(404).json({ error: "Snag item not found" });
        return;
    }
    const snag = db.snagItems[index];
    const project = db.projects.find(p => p.id === snag.projectId);
    if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
    }
    const oldStatus = snag.status;
    snag.status = status;
    if (status === "Cleared") {
        snag.resolvedAt = new Date().toISOString();
    }
    else {
        snag.resolvedAt = null;
    }
    // Recalculate punch list status for project
    const allProjectSnags = db.snagItems.filter(s => s.projectId === project.id);
    const uncleared = allProjectSnags.filter(s => s.status !== "Cleared");
    project.punchListCleared = uncleared.length === 0;
    await writeDB(db);
    await logAction(user.id, user.name, user.role, project.id, project.name, "Snag Status Update", `Set defect snag "${snag.description}" resolved status to: ${status}.`);
    const targetAlertUserId = user.role === "manager" ? project.clientId : "usr_mgr_1";
    await pushNotification(targetAlertUserId, project.id, project.name, `Snag update: defect reported in ${snag.roomLocation} is now marked "${status}".`, "info");
    res.json(snag);
});
// Secure Documents Sharing list
app.get("/api/projects/:id/documents", authenticateToken, async (req, res) => {
    const db = await readDB();
    const docs = db.documents.filter(d => d.projectId === req.params.id);
    res.json(docs);
});
// Secure File Upload route (Takes base64 JSON upload to remain robust inside containers)
app.post("/api/projects/:id/documents", authenticateToken, async (req, res) => {
    const user = req.user;
    const { name, type, base64Data, fileName, fileSize } = req.body;
    if (!name || !type || !base64Data || !fileName) {
        res.status(400).json({ error: "Document credentials (name, type, file payload) missing" });
        return;
    }
    const db = await readDB();
    const project = db.projects.find(p => p.id === req.params.id);
    if (!project) {
        res.status(404).json({ error: "Project references invalid" });
        return;
    }
    try {
        // Write base64 string safely to a server disk file
        // Sanitise fileName to avoid folder path injection hacks
        const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const filePath = path.join(uploadsDir, safeName);
        // Slice off metadata portion of data URL (e.g. "data:application/pdf;base64,")
        const cleanBase64 = base64Data.includes(";base64,")
            ? base64Data.split(";base64,")[1]
            : base64Data;
        fs.writeFileSync(filePath, Buffer.from(cleanBase64, "base64"));
        const documentRecord = {
            id: `doc_${Date.now()}`,
            projectId: project.id,
            name,
            type,
            fileUrl: `/uploads/${safeName}`,
            fileName,
            fileSize: fileSize || "1.2 MB",
            uploadedBy: `${user.role === 'manager' ? 'Manager' : 'Client'}: ${user.name}`,
            uploadedAt: new Date().toISOString()
        };
        db.documents.push(documentRecord);
        await writeDB(db);
        await logAction(user.id, user.name, user.role, project.id, project.name, "Document Shared", `Shared layout/milestone file: "${name}" (${fileName}).`);
        const targetAlertUserId = user.role === "manager" ? project.clientId : "usr_mgr_1";
        await pushNotification(targetAlertUserId, project.id, project.name, `A new document has been shared with you: "${name}" uploaded by ${user.name}.`, "info");
        res.status(201).json(documentRecord);
    }
    catch (err) {
        console.error("File upload failed on disk write:", err);
        res.status(500).json({ error: `File save error: ${err.message}` });
    }
});
// Get notification center matching role
app.get("/api/notifications", authenticateToken, async (req, res) => {
    const user = req.user;
    const db = await readDB();
    const myNotifications = db.notifications.filter(n => n.userId === user.id);
    res.json(myNotifications);
});
// Clear single alert
app.put("/api/notifications/:id/read", authenticateToken, async (req, res) => {
    const db = await readDB();
    const index = db.notifications.findIndex(n => n.id === req.params.id);
    if (index !== -1) {
        db.notifications[index].read = true;
        await writeDB(db);
        res.json({ success: true });
        return;
    }
    res.status(404).json({ error: "Notification not found" });
});
// System wide audit trail (Manager only check)
app.get("/api/audit-logs", authenticateToken, async (req, res) => {
    const user = req.user;
    if (user.role !== "manager") {
        res.status(403).json({ error: "Manager permissions required" });
        return;
    }
    const db = await readDB();
    res.json(db.auditLogs);
});
app.get("/api/projects/:id/export", authenticateToken, async (req, res) => {
    const user = req.user;
    const db = await readDB();
    const project = db.projects.find((p) => p.id === req.params.id);
    if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
    }
    if (user.role === "client" && project.clientId !== user.id) {
        res.status(403).json({ error: "Access denied" });
        return;
    }
    const milestones = db.milestones.filter((m) => m.projectId === project.id);
    const csvRow = (values) => values.map((value) => {
        const cell = value == null ? '' : `${value}`;
        return `"${cell.replace(/"/g, '""')}"`;
    }).join(",");
    const headerRows = [
        ["Project ID", project.id],
        ["Project Name", project.name],
        ["Client", project.clientName],
        ["Location", project.location],
        ["Status", project.status],
        ["Contract Value", project.totalAmount],
        ["Retention Held", project.retentionAmount],
        ["Retention Percentage", project.retentionPercentage],
        ["Retention Release Date", project.retentionReleaseDate],
        ["Created At", project.createdAt]
    ];
    const contentRows = [
        csvRow(["Project Summary"]),
        ...headerRows.map((row) => csvRow(row)),
        csvRow([]),
        csvRow(["Milestone ID", "Stage", "Status", "Invoice Number", "Invoice Amount", "Retention Held", "Due Date", "Paid Date"]),
        ...milestones.map((ms) => csvRow([
            ms.id,
            ms.name,
            ms.status,
            ms.invoiceNumber || "",
            ms.invoiceAmount,
            ms.retentionHeld,
            ms.dueDate || "",
            ms.paidDate || ""
        ]))
    ];
    const csv = contentRows.join("\n");
    const fileName = `${project.name.replace(/[^a-zA-Z0-9-_]/g, '_')}_export.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(csv);
});
// ================= AI DYNAMIC TOOLS (GEMINI) =================
// Dynamic Reminder generator (Used by manager)
app.post("/api/ai/reminder", authenticateToken, async (req, res) => {
    const user = req.user;
    if (user.role !== "manager") {
        res.status(403).json({ error: "Manager authentication is required" });
        return;
    }
    const { project, milestone, type } = req.body;
    if (!project || !milestone) {
        res.status(400).json({ error: "Project and Milestone data are required to generate reminder template" });
        return;
    }
    const client = getGeminiClient();
    try {
        if (!client) {
            // Return beautiful default template matching parameters if Gemini API Key not present
            const fallbackSubject = type === 'retention'
                ? `Claim Request: Joint Completion Handover & Defect Liability Clearance - ${project.name}`
                : `Notification of Core Milestone Handover & Invoice Stage - ${milestone.name}`;
            const fallbackText = type === 'retention'
                ? `Dear ${project.clientName},\n\nWe hope you are loving your brand new space! Our record indicates the Defect Liability Period for ${project.name} reaches terminal status soon, with the release of the final retention fund holding (₹${project.retentionAmount.toLocaleString()}) on ${new Date(project.retentionReleaseDate).toLocaleDateString()}.\n\nAll snags have been addressed, and we would love to conduct our final punch list review together. Thank you for choosing Glory Simon Interiors!\n\nWarm regards,\nGlory Simon`
                : `Dear ${project.clientName},\n\nWe are excited to share that stage "${milestone.name}" of your interior renovation has was completed with standard quality standards. We have raised the Stage ${milestone.stageOrder} Invoice for payment.\n\nSummary:\n- Stage: ${milestone.name}\n- Portion Value: ₹${milestone.invoiceAmount.toLocaleString()}\n- Retention Deposited (held for DLP): ₹${milestone.retentionHeld.toLocaleString()}\n\nPlease verify details under your Glory Simon Interiors client portal. Thank you!\n\nRespectfully,\nGlory Simon`;
            res.json({ text: fallbackText, subject: fallbackSubject, isFallback: true });
            return;
        }
        // Build smart generative prompt
        let promptSubject = "";
        if (type === 'retention') {
            promptSubject = `Write an extremely professional, warm, yet assertive notification letter to client ${project.clientName} regarding the upcoming release date (${new Date(project.retentionReleaseDate).toLocaleDateString()}) of the ₹${project.retentionAmount.toLocaleString()} retention money held during the Defect Liability Period of their interior project "${project.name}" with Glory Simon Interiors. Mention that snags are being finalized and retention release forms require signature.`;
        }
        else {
            promptSubject = `Write a beautifully styled payment reminder notice to client ${project.clientName} for the milestone stage "${milestone.name}" which is currently in status "${milestone.status}". The invoice amount is ₹${milestone.invoiceAmount.toLocaleString()} and the 5% defect retention portion being held is ₹${milestone.retentionHeld.toLocaleString()}. Maintain a highly supportive, design-focused tone (Glory Simon Interiors) that keeps relations positive but requests processing of invoice dues.`;
        }
        const response = await client.models.generateContent({
            model: "gemini-3.5-flash",
            contents: promptSubject,
            config: {
                systemInstruction: "You are Glory Simon, Director of Glory Simon Interiors. Write in a sophisticated, clear, and professional layout appropriate for high-end clients.",
            }
        });
        res.json({ text: response.text, subject: type === 'retention' ? 'Defect Liability Clearance & Retention Fund Claim' : 'Milestone Handover Payment Request', isFallback: false });
    }
    catch (err) {
        console.error("Gemini request failed:", err);
        res.status(500).json({ error: `AI compilation failed: ${err.message}` });
    }
});
// Explain project milestones, safety terms, and defect retention (Used by Client)
app.post("/api/ai/explain", authenticateToken, async (req, res) => {
    const { query, retentionPercent, projectPrice } = req.body;
    if (!query) {
        res.status(400).json({ error: "A query parameter is required" });
        return;
    }
    const client = getGeminiClient();
    try {
        if (!client) {
            // Solid fallback explanation of retention and milestones
            const genericResponse = `The defect liability period and payment milestones are crucial for ensuring high standards in premium projects:

- **What are milestones?**: We divide payments into small increments matching real work completions (typically 6 stages, e.g., electrical, modular cabinet assembly, finishing). This ensures transparency.
- **What is Retention?**: A small Portion (typically 5% to 10%) of each phase payment is temporarily kept by you, the client, until the project is fully handed over. This provides trust and security while defect snags or hairline plaster cracks are cleared during the follow-up period (Defect Liability).
- **Claim conditions**: After Glory Simon Interiors clears all snags reported on the punch list, the retention sum is claimed on the Defect Liability release date.

(Note: Configure the Gemini API secret to enable personalized interactive guidance from our smart AI Assistant!)`;
            res.json({ text: genericResponse, isFallback: true });
            return;
        }
        const customizedContext = `The client is currently customising an interior package with total value ₹${projectPrice || "100,000"} and retention hold of ${retentionPercent || "5"}%. Offer a clear, educational, reassuring explanation to the client's question: "${query}". Address them directly as our client Sarah / Robert, and validate how retention acts as a win-win trust mechanism for quality assurance with Glory Simon Interiors.`;
        const response = await client.models.generateContent({
            model: "gemini-3.5-flash",
            contents: customizedContext,
            config: {
                systemInstruction: "You are the friendly AI Design Assistant for Glory Simon Interiors. Keep explanations engaging, warm, simple, structured with bullet points, and free of complex legal jargon.",
            }
        });
        res.json({ text: response.text, isFallback: false });
    }
    catch (err) {
        console.error("Gemini explain error:", err);
        res.status(500).json({ error: `AI Assistant explanation error: ${err.message}` });
    }
});
// ================= VITE OR STATIC SERVER MIDDLEWARE =================
async function listenOnPort(port) {
    return new Promise((resolve, reject) => {
        const server = app.listen(port, "0.0.0.0", () => {
            console.log(`Server running securely on port ${port}`);
            resolve(server);
        });
        server.on("error", reject);
    });
}

async function startServer() {
    if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    }
    else {
        const distPath = path.join(process.cwd(), "dist");
        app.use(express.static(distPath));
        app.get("*", async (req, res) => {
            res.sendFile(path.join(distPath, "index.html"));
        });
    }

    const basePort = parseInt(process.env.PORT, 10) || 3002;
    try {
        await listenOnPort(basePort);
    }
    catch (error) {
        if (error.code === "EADDRINUSE") {
            const fallbackPort = basePort === 3002 ? 3003 : basePort + 1;
            console.warn(`Port ${basePort} is already in use. Falling back to port ${fallbackPort}.`);
            await listenOnPort(fallbackPort);
        }
        else {
            throw error;
        }
    }
}
if (!process.env.VERCEL) {
    startServer();
}

export default app;
