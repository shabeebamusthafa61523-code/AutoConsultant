require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Student = require('../models/Student');
const Instructor = require('../models/Instructor');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const Batch = require('../models/Batch');
const Counter = require('../models/Counter');

async function seedComplaints() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas');

    // Check if complaints already seeded
    const existingCount = await Complaint.countDocuments();
    if (existingCount > 0) {
      console.log(`ℹ Complaints collection already has ${existingCount} records. Skipping seed.`);
      await mongoose.disconnect();
      return;
    }

    const [adminUser, student, instructor, vehicle, batch] = await Promise.all([
      User.findOne({ role: { $in: ['Superadmin', 'Admin'] } }),
      Student.findOne({}),
      Instructor.findOne({ instructorId: 'INS002' }) || Instructor.findOne({}),
      Vehicle.findOne({ vehicleId: 'VEH-001' }) || Vehicle.findOne({}),
      Batch.findOne({})
    ]);

    const adminId = adminUser ? adminUser._id : null;
    const adminName = adminUser ? adminUser.name : 'Super Admin';

    // Reset or set complaint counter
    await Counter.findByIdAndUpdate(
      { _id: 'complaintId' },
      { seq: 6 },
      { upsert: true }
    );

    const now = new Date();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const inFourDays = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);

    const complaintsToSeed = [
      {
        complaintId: 'CMP-0001',
        complaintDate: threeDaysAgo,
        source: 'Phone',
        complainantType: 'Student',
        student: student ? student._id : null,
        complainantName: student ? student.fullName : 'Rameez Ali',
        complainantMobile: student ? (student.phone || '9847123456') : '9847123456',
        category: 'Scheduling',
        description: 'Student reported that Saturday morning road practice session was rescheduled without prior SMS/WhatsApp notification.',
        relatedStudent: student ? student._id : null,
        relatedBatch: batch ? batch._id : null,
        priority: 'Medium',
        status: 'Resolved',
        assignedTo: adminId,
        assignedToName: adminName,
        expectedResolutionDate: yesterday,
        resolution: {
          resolutionNotes: 'Called student, clarified schedule conflict with RTO test batch, scheduled complimentary 1-hour road session on Sunday.',
          resolvedBy: adminId,
          resolvedByName: adminName,
          resolvedDate: yesterday,
          correctiveActionTaken: 'Enforced WhatsApp batch broadcast 24 hours prior in SOP DDS-SOP-005.',
          satisfactionRating: 'Satisfied'
        },
        activities: [
          { action: 'Created', details: 'Complaint registered by front desk', performedByName: 'Front Desk Staff', timestamp: threeDaysAgo },
          { action: 'Assigned', details: `Assigned to ${adminName}`, performedByName: 'System', timestamp: threeDaysAgo },
          { action: 'Status Changed', details: 'Status changed from Open to In Progress', performedByName: adminName, timestamp: twoDaysAgo },
          { action: 'Resolved', details: 'Compensatory class scheduled and agreed by candidate', performedByName: adminName, timestamp: yesterday }
        ],
        comments: [
          { comment: 'Student was very cooperative once batch schedule clash was explained.', createdByName: adminName, createdAt: yesterday }
        ]
      },
      {
        complaintId: 'CMP-0002',
        complaintDate: twoDaysAgo,
        source: 'Staff',
        complainantType: 'Instructor',
        instructor: instructor ? instructor._id : null,
        complainantName: instructor ? instructor.name : 'Farhan',
        complainantMobile: instructor ? instructor.mobile : '6238454540',
        category: 'Vehicle',
        description: 'Air conditioning in Maruti Alto (KL-10-AB-5265) cooling insufficiently during afternoon 2:00 PM session; dual-control clutch pedal requires tightening.',
        relatedInstructor: instructor ? instructor._id : null,
        relatedVehicle: vehicle ? vehicle._id : null,
        priority: 'High',
        status: 'In Progress',
        assignedTo: adminId,
        assignedToName: adminName,
        expectedResolutionDate: inTwoDays,
        activities: [
          { action: 'Created', details: 'Reported by instructor after morning session', performedByName: instructor ? instructor.name : 'Farhan', timestamp: twoDaysAgo },
          { action: 'Assigned', details: `Assigned to ${adminName} for workshop coordination`, performedByName: 'System', timestamp: twoDaysAgo },
          { action: 'Status Changed', details: 'Status changed from Open to In Progress. Booked service slot at Maruti Authorized Center.', performedByName: adminName, timestamp: yesterday }
        ],
        comments: [
          { comment: 'Vehicle booked at Authorized Service Center Kodur for tomorrow 9 AM.', createdByName: adminName, createdAt: yesterday }
        ]
      },
      {
        complaintId: 'CMP-0003',
        complaintDate: yesterday,
        source: 'Walk-in',
        complainantType: 'Student',
        student: student ? student._id : null,
        complainantName: student ? student.fullName : 'Amina K',
        complainantMobile: student ? (student.phone || '9447000000') : '9447000000',
        category: 'Documentation',
        description: 'Student submitted Form 1A Medical Certificate 10 days ago, but Parivahan portal still shows Document Verification pending at RTO desk.',
        relatedStudent: student ? student._id : null,
        priority: 'Urgent',
        status: 'Escalated',
        assignedTo: adminId,
        assignedToName: adminName,
        expectedResolutionDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        escalation: {
          isEscalated: true,
          escalatedTo: adminId,
          escalatedToName: 'Managing Director (Mohamed Jasim P)',
          escalatedDate: yesterday,
          escalationReason: 'Parivahan application nearing 14-day SLA expiry; requires direct RTO liaison intervention.'
        },
        activities: [
          { action: 'Created', details: 'Walk-in student enquiry at Malappuram office', performedByName: 'Front Desk', timestamp: yesterday },
          { action: 'Escalated', details: 'Escalated to MD due to RTO portal backlog', performedByName: adminName, timestamp: yesterday }
        ],
        comments: [
          { comment: 'Contacted Motor Driving Inspector office Malappuram; batch scrutiny scheduled for 3 PM.', createdByName: adminName, createdAt: now }
        ]
      },
      {
        complaintId: 'CMP-0004',
        complaintDate: now,
        source: 'WhatsApp',
        complainantType: 'Customer/Visitor',
        complainantName: 'Kabeer Hussain',
        complainantMobile: '9744112233',
        category: 'Fees / Payment',
        description: 'Parent inquired regarding installment receipt for Stage 2 training fee paid via UPI on 22nd Sep; digital receipt PDF was not delivered to WhatsApp.',
        priority: 'Low',
        status: 'Open',
        assignedTo: adminId,
        assignedToName: adminName,
        expectedResolutionDate: inFourDays,
        activities: [
          { action: 'Created', details: 'WhatsApp inquiry received on official Benz CRM line', performedByName: 'Front Desk', timestamp: now }
        ]
      },
      {
        complaintId: 'CMP-0005',
        complaintDate: now,
        source: 'Student',
        complainantType: 'Student',
        student: student ? student._id : null,
        complainantName: student ? student.fullName : 'Naveen Kumar',
        complainantMobile: student ? (student.phone || '9567889900') : '9567889900',
        category: 'Training',
        description: 'Candidate requested extra focus on H-track reverse parking maneuver before upcoming Friday RTO driving test slot.',
        relatedStudent: student ? student._id : null,
        priority: 'Medium',
        status: 'Pending',
        assignedTo: adminId,
        assignedToName: adminName,
        expectedResolutionDate: inTwoDays,
        activities: [
          { action: 'Created', details: 'Candidate submitted training refinement request', performedByName: 'Front Desk', timestamp: now }
        ]
      },
      {
        complaintId: 'CMP-0006',
        complaintDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        source: 'Management',
        complainantType: 'Employee',
        complainantName: 'Sameer P',
        complainantMobile: '7012035687',
        category: 'Safety',
        description: 'Training car first-aid kit in WagonR (KL-10-AZ-7788) requires replenishment of antiseptic solution, burn ointment, and sterile gauze.',
        relatedVehicle: vehicle ? vehicle._id : null,
        priority: 'High',
        status: 'Open',
        assignedTo: adminId,
        assignedToName: adminName,
        // Past expected resolution date to simulate OVERDUE complaint
        expectedResolutionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        activities: [
          { action: 'Created', details: 'Noted during weekly vehicle asset audit (DDS-CHK-005)', performedByName: 'Sameer P', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
        ]
      }
    ];

    await Complaint.insertMany(complaintsToSeed);
    console.log(`✅ Successfully seeded ${complaintsToSeed.length} operational complaints.`);

  } catch (err) {
    console.error('❌ Error seeding complaints:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Mongoose disconnected.');
  }
}

seedComplaints();
