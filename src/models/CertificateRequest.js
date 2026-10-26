const mongoose = require('mongoose');

const certificateRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      unique: true,
      index: true
    },
    seqId: {
      type: Number,
      unique: true,
      index: true
    },
    student_name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true
    },
    enrollment_no: {
      type: String,
      required: [true, 'Enrollment number is required'],
      trim: true,
      uppercase: true,
      index: true
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      trim: true,
      lowercase: true
    },
    certificate_type: {
      type: String,
      required: [true, 'Certificate type is required'],
      trim: true
    },
    purpose: {
      type: String,
      required: [true, 'Purpose is required'],
      minlength: [10, 'Purpose must be at least 10 characters long'],
      trim: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending'
    },
    requested_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

// Pre-save hook to ensure seqId and formatted requestId exist
certificateRequestSchema.pre('save', async function (next) {
  if (this.isNew && (!this.seqId || !this.requestId)) {
    try {
      const highest = await mongoose.model('CertificateRequest').findOne().sort({ seqId: -1 });
      const nextSeq = highest && highest.seqId ? highest.seqId + 1 : 43;
      if (!this.seqId) this.seqId = nextSeq;
      if (!this.requestId) this.requestId = `CR-${String(this.seqId).padStart(4, '0')}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

const CertificateRequest = mongoose.model('CertificateRequest', certificateRequestSchema);

module.exports = CertificateRequest;
