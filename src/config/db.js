const mongoose = require('mongoose');
const dns = require('dns');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Ensure reliable DNS resolution for MongoDB Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if not permitted
}

const CertificateRequest = require('../models/CertificateRequest');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/certificate_portal';

let isConnected = false;
let useFallbackStorage = false;
const fallbackFilePath = path.join(__dirname, '..', '..', 'data_storage.json');

// Initial seed data matching project report screenshots
const seedData = [
  {
    seqId: 39,
    requestId: 'CR-0039',
    student_name: 'Aarav Shah',
    enrollment_no: 'LDCEIT2026-039',
    email: 'aarav@example.com',
    certificate_type: 'Transfer Certificate',
    purpose: 'Higher education transfer application requirements',
    status: 'Pending',
    requested_at: new Date('2026-10-05T09:30:00Z')
  },
  {
    seqId: 40,
    requestId: 'CR-0040',
    student_name: 'Dev Mehta',
    enrollment_no: 'LDCEIT2026-040',
    email: 'dev@example.com',
    certificate_type: 'Character Certificate',
    purpose: 'For competitive government examination documentation',
    status: 'Rejected',
    requested_at: new Date('2026-10-05T14:15:00Z')
  },
  {
    seqId: 41,
    requestId: 'CR-0041',
    student_name: 'Bhavya Patel',
    enrollment_no: 'LDCEIT2026-041',
    email: 'bhavya@example.com',
    certificate_type: 'Course Completion',
    purpose: 'Mandatory documentation for university scholarship verification',
    status: 'Approved',
    requested_at: new Date('2026-10-06T10:00:00Z')
  },
  {
    seqId: 42,
    requestId: 'CR-0042',
    student_name: 'Krish Shah',
    enrollment_no: 'LDCEIT2026-042',
    email: 'krish@example.com',
    certificate_type: 'Bonafide Certificate',
    purpose: 'For internship documentation at tech firm',
    status: 'Pending',
    requested_at: new Date('2026-10-06T11:45:00Z')
  }
];

function readFallbackData() {
  try {
    if (fs.existsSync(fallbackFilePath)) {
      const content = fs.readFileSync(fallbackFilePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading fallback storage:', err.message);
  }
  return [...seedData];
}

function writeFallbackData(data) {
  try {
    fs.writeFileSync(fallbackFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing fallback storage:', err.message);
  }
}

async function initDatabase() {
  try {
    const maskedUri = MONGO_URI.replace(/:([^@:]+)@/, ':****@');
    console.log(`Connecting to MongoDB Atlas at: ${maskedUri}...`);
    await mongoose.connect(MONGO_URI, {
      dbName: 'certificate_portal',
      serverSelectionTimeoutMS: 8000
    });

    isConnected = true;
    useFallbackStorage = false;
    console.log('✓ Successfully connected to MongoDB Atlas database (certificate_portal).');

    // Seed initial records if collection is empty
    const count = await CertificateRequest.countDocuments();
    if (count === 0) {
      console.log('Seeding initial certificate requests into MongoDB...');
      await CertificateRequest.insertMany(seedData);
      console.log('✓ Seed data inserted into MongoDB.');
    }

    return true;
  } catch (err) {
    console.warn(`! MongoDB connection note (${err.message}).`);
    console.warn('  -> Using JSON file persistent storage fallback so the server runs smoothly.');
    console.warn('  -> To connect MongoDB, make sure MongoDB is running or set MONGO_URI in .env');
    isConnected = false;
    useFallbackStorage = true;

    if (!fs.existsSync(fallbackFilePath)) {
      writeFallbackData(seedData);
    }
    return false;
  }
}

const db = {
  async init() {
    return await initDatabase();
  },

  isUsingFallback() {
    return useFallbackStorage;
  },

  async getAllRequests({ status, search } = {}) {
    if (useFallbackStorage) {
      let data = readFallbackData();
      if (status && status !== 'All') {
        data = data.filter(r => r.status.toLowerCase() === status.toLowerCase());
      }
      if (search) {
        const q = search.toLowerCase();
        data = data.filter(r =>
          r.student_name.toLowerCase().includes(q) ||
          r.enrollment_no.toLowerCase().includes(q) ||
          r.certificate_type.toLowerCase().includes(q) ||
          (r.requestId && r.requestId.toLowerCase().includes(q))
        );
      }
      data.sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at));
      return data;
    }

    const filter = {};
    if (status && status !== 'All') {
      filter.status = status;
    }
    if (search) {
      const q = search.trim();
      filter.$or = [
        { student_name: { $regex: q, $options: 'i' } },
        { enrollment_no: { $regex: q, $options: 'i' } },
        { certificate_type: { $regex: q, $options: 'i' } },
        { requestId: { $regex: q, $options: 'i' } }
      ];
    }

    const docs = await CertificateRequest.find(filter).sort({ requested_at: -1, seqId: -1 }).lean();
    return docs.map(doc => ({
      ...doc,
      id: doc.seqId
    }));
  },

  async getRequestById(id) {
    const cleanId = String(id).trim();

    if (useFallbackStorage) {
      const data = readFallbackData();
      return (
        data.find(
          r =>
            String(r.id) === cleanId ||
            String(r.seqId) === cleanId ||
            (r.requestId && r.requestId.toUpperCase() === cleanId.toUpperCase())
        ) || null
      );
    }

    // Try finding by requestId, seqId, or MongoDB _id
    let doc = await CertificateRequest.findOne({
      $or: [
        { requestId: cleanId.toUpperCase() },
        { seqId: !isNaN(cleanId) ? Number(cleanId) : -1 }
      ]
    }).lean();

    if (!doc && mongoose.Types.ObjectId.isValid(cleanId)) {
      doc = await CertificateRequest.findById(cleanId).lean();
    }

    if (!doc) return null;
    return { ...doc, id: doc.seqId };
  },

  async findByEnrollmentOrId(queryStr) {
    const clean = queryStr.trim();

    if (useFallbackStorage) {
      const data = readFallbackData();
      const lower = clean.toLowerCase();
      return data.filter(
        r =>
          r.enrollment_no.toLowerCase() === lower ||
          String(r.id) === clean ||
          String(r.seqId) === clean ||
          (r.requestId && r.requestId.toLowerCase() === lower)
      );
    }

    const filter = {
      $or: [
        { enrollment_no: { $regex: `^${clean}$`, $options: 'i' } },
        { requestId: clean.toUpperCase() }
      ]
    };

    if (!isNaN(clean)) {
      filter.$or.push({ seqId: Number(clean) });
    }

    const docs = await CertificateRequest.find(filter).sort({ requested_at: -1 }).lean();
    return docs.map(doc => ({
      ...doc,
      id: doc.seqId
    }));
  },

  async createRequest({ student_name, enrollment_no, email, certificate_type, purpose }) {
    if (useFallbackStorage) {
      const data = readFallbackData();
      const nextSeq = data.reduce((max, r) => Math.max(max, r.seqId || r.id || 0), 42) + 1;
      const formattedId = `CR-${String(nextSeq).padStart(4, '0')}`;
      const newRecord = {
        id: nextSeq,
        seqId: nextSeq,
        requestId: formattedId,
        student_name,
        enrollment_no,
        email,
        certificate_type,
        purpose,
        status: 'Pending',
        requested_at: new Date()
      };
      data.unshift(newRecord);
      writeFallbackData(data);
      return newRecord;
    }

    // Determine next sequential ID
    const highest = await CertificateRequest.findOne().sort({ seqId: -1 }).lean();
    const nextSeq = highest && highest.seqId ? highest.seqId + 1 : 43;
    const formattedId = `CR-${String(nextSeq).padStart(4, '0')}`;

    const newDoc = new CertificateRequest({
      seqId: nextSeq,
      requestId: formattedId,
      student_name,
      enrollment_no,
      email,
      certificate_type,
      purpose,
      status: 'Pending',
      requested_at: new Date()
    });

    const saved = await newDoc.save();
    return {
      ...saved.toObject(),
      id: saved.seqId
    };
  },

  async updateStatus(id, status) {
    const cleanId = String(id).trim();

    if (useFallbackStorage) {
      const data = readFallbackData();
      const index = data.findIndex(
        r =>
          String(r.id) === cleanId ||
          String(r.seqId) === cleanId ||
          (r.requestId && r.requestId.toUpperCase() === cleanId.toUpperCase())
      );
      if (index === -1) return null;
      data[index].status = status;
      writeFallbackData(data);
      return data[index];
    }

    const filter = {
      $or: [
        { requestId: cleanId.toUpperCase() },
        { seqId: !isNaN(cleanId) ? Number(cleanId) : -1 }
      ]
    };
    if (mongoose.Types.ObjectId.isValid(cleanId)) {
      filter.$or.push({ _id: cleanId });
    }

    const updated = await CertificateRequest.findOneAndUpdate(
      filter,
      { $set: { status } },
      { new: true }
    ).lean();

    if (!updated) return null;
    return { ...updated, id: updated.seqId };
  },

  async deleteRequest(id) {
    const cleanId = String(id).trim();

    if (useFallbackStorage) {
      let data = readFallbackData();
      const initialLen = data.length;
      data = data.filter(
        r =>
          String(r.id) !== cleanId &&
          String(r.seqId) !== cleanId &&
          (!r.requestId || r.requestId.toUpperCase() !== cleanId.toUpperCase())
      );
      if (data.length !== initialLen) {
        writeFallbackData(data);
        return true;
      }
      return false;
    }

    const filter = {
      $or: [
        { requestId: cleanId.toUpperCase() },
        { seqId: !isNaN(cleanId) ? Number(cleanId) : -1 }
      ]
    };
    if (mongoose.Types.ObjectId.isValid(cleanId)) {
      filter.$or.push({ _id: cleanId });
    }

    const result = await CertificateRequest.deleteOne(filter);
    return result.deletedCount > 0;
  },

  async getStats() {
    if (useFallbackStorage) {
      const data = readFallbackData();
      const total = data.length;
      const pending = data.filter(r => r.status === 'Pending').length;
      const approved = data.filter(r => r.status === 'Approved').length;
      const rejected = data.filter(r => r.status === 'Rejected').length;
      return { total, pending, approved, rejected };
    }

    const [total, pending, approved, rejected] = await Promise.all([
      CertificateRequest.countDocuments(),
      CertificateRequest.countDocuments({ status: 'Pending' }),
      CertificateRequest.countDocuments({ status: 'Approved' }),
      CertificateRequest.countDocuments({ status: 'Rejected' })
    ]);

    return { total, pending, approved, rejected };
  }
};

module.exports = db;
