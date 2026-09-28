const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const Instructor = require('../models/Instructor');
const Vehicle = require('../models/Vehicle');
const Batch = require('../models/Batch');
const instructorsData = [
  {
    instructorId: 'INS001',
    name: 'Mohamed Jasim P',
    mobile: '6282892320',
    licenceNo: 'KL-10-2015001234',
    badgeNo: 'BDG-7891',
    experience: '8 Years',
    status: 'Active',
    department: 'Instructor Team',
    designation: 'Road & H-Class Instructor',
    bloodGroup: 'B+',
    address: 'Pulamanthole, Malappuram',
    emergencyContact: '9747298810',
    notes: 'Managing Director & Senior Driving Instructor'
  },
  {
    instructorId: 'INS002',
    name: 'Farhan',
    mobile: '6238454540',
    licenceNo: 'KL-10-2018005678',
    badgeNo: 'BDG-4521',
    experience: '5 Years',
    status: 'Active',
    department: 'Instructor Team',
    designation: 'Road & H-Class Instructor',
    bloodGroup: 'O+',
    address: 'West Kodur, Malappuram',
    emergencyContact: '9633525449',
    notes: 'Working Partner & Practical Driving Instructor'
  },
  {
    instructorId: 'INS003',
    name: 'Noushad',
    mobile: '9037876566',
    licenceNo: 'KL-10-2016009876',
    badgeNo: 'BDG-3312',
    experience: '6 Years',
    status: 'Active',
    department: 'Instructor Team',
    designation: 'Road & H-Class Instructor',
    bloodGroup: 'A+',
    address: 'East Kodur, Malappuram',
    emergencyContact: '9207298810',
    notes: 'Senior Road Instructor from Operations Register'
  },
  {
    instructorId: 'INS004',
    name: 'Sameer P',
    mobile: '7012035687',
    licenceNo: 'KL-10-2019003412',
    badgeNo: 'BDG-6623',
    experience: '4 Years',
    status: 'Active',
    department: 'Instructor Team',
    designation: 'Road & H-Class Instructor',
    bloodGroup: 'B+',
    address: 'Malappuram',
    notes: 'Instructor Team Member'
  },
  {
    instructorId: 'INS005',
    name: 'Rashad',
    mobile: '9562014267',
    licenceNo: 'KL-10-2020007890',
    badgeNo: 'BDG-8819',
    experience: '3 Years',
    status: 'Active',
    department: 'Instructor Team',
    designation: 'Bike Instructor',
    bloodGroup: 'AB+',
    address: 'Malappuram',
    notes: 'Two Wheeler Specialist Instructor'
  }
];

const vehiclesData = [
  {
    vehicleId: 'VEH-001',
    vehicleNumber: 'KL-10-AB-5265',
    vehicleType: 'LMV',
    brand: 'Maruti Suzuki',
    model: 'Alto',
    branch: 'West Kodur',
    status: 'Active',
    assignedInstructorName: 'Mohamed Jasim P',
    rc: {
      rcNumber: 'KL10AB5265RC',
      ownerName: 'Abdul Gafoor',
      issueDate: new Date('2021-07-06'),
      expiryDate: new Date('2036-07-05'),
      status: 'Valid'
    },
    insurance: {
      insuranceCompany: 'Direct Assurance Vadakkemanna',
      policyNumber: 'DIR-INS-2026-5265',
      contact: '7902991991',
      startDate: new Date('2025-07-06'),
      expiryDate: new Date('2026-07-06'),
      premium: 2855,
      status: 'Renewal Due'
    },
    fitness: {
      fitnessCertificateNumber: 'FC-KL10-2021-9988',
      issueDate: new Date('2021-07-06'),
      expiryDate: new Date('2026-07-05'),
      status: 'Renewal Due'
    },
    tax: {
      taxType: 'Road Tax',
      lastPaidDate: new Date('2025-07-01'),
      nextDueDate: new Date('2026-06-30'),
      amount: 3500,
      status: 'Due Soon'
    },
    puc: {
      pucNumber: 'PUC-KL10-2026-4412',
      issueDate: new Date('2026-01-10'),
      expiryDate: new Date('2026-07-10'),
      status: 'Expiring Soon'
    }
  },
  {
    vehicleId: 'VEH-002',
    vehicleNumber: 'KL-10-AZ-7788',
    vehicleType: 'LMV',
    brand: 'Maruti Suzuki',
    model: 'WagonR',
    branch: 'West Kodur',
    status: 'Active',
    assignedInstructorName: 'Jasim',
    rc: {
      rcNumber: 'KL10AZ7788RC',
      ownerName: 'Mohamed Jasim P',
      issueDate: new Date('2022-01-15'),
      expiryDate: new Date('2037-01-14'),
      status: 'Valid'
    },
    insurance: {
      insuranceCompany: 'National Insurance Co',
      policyNumber: 'NAT-2026-7788',
      contact: '9747298810',
      startDate: new Date('2026-01-15'),
      expiryDate: new Date('2027-01-14'),
      premium: 3100,
      status: 'Valid'
    },
    fitness: {
      fitnessCertificateNumber: 'FC-KL10-2022-1122',
      issueDate: new Date('2022-01-15'),
      expiryDate: new Date('2027-01-14'),
      status: 'Valid'
    },
    tax: {
      taxType: 'Annual',
      lastPaidDate: new Date('2026-01-10'),
      nextDueDate: new Date('2027-01-09'),
      amount: 3800,
      status: 'Paid'
    },
    puc: {
      pucNumber: 'PUC-KL10-2026-8891',
      issueDate: new Date('2026-02-01'),
      expiryDate: new Date('2026-08-01'),
      status: 'Valid'
    }
  },
  {
    vehicleId: 'VEH-003',
    vehicleNumber: 'KL-10-BK-3344',
    vehicleType: 'Motorcycle Training',
    brand: 'Hero',
    model: 'Splendor Plus',
    branch: 'West Kodur',
    status: 'Active',
    assignedInstructorName: 'Rashad',
    rc: {
      rcNumber: 'KL10BK3344RC',
      ownerName: 'Mohamed Jasim P',
      issueDate: new Date('2023-03-10'),
      expiryDate: new Date('2038-03-09'),
      status: 'Valid'
    },
    insurance: {
      insuranceCompany: 'United India Insurance',
      policyNumber: 'UII-2026-3344',
      contact: '9747298810',
      startDate: new Date('2026-03-10'),
      expiryDate: new Date('2027-03-09'),
      premium: 1200,
      status: 'Valid'
    },
    fitness: {
      fitnessCertificateNumber: 'FC-KL10-2023-7766',
      issueDate: new Date('2023-03-10'),
      expiryDate: new Date('2028-03-09'),
      status: 'Valid'
    },
    tax: {
      taxType: 'One-Time 5 Year',
      lastPaidDate: new Date('2023-03-10'),
      nextDueDate: new Date('2028-03-09'),
      amount: 1500,
      status: 'Paid'
    },
    puc: {
      pucNumber: 'PUC-KL10-2026-2233',
      issueDate: new Date('2026-03-15'),
      expiryDate: new Date('2026-09-15'),
      status: 'Valid'
    }
  }
];

    // 4. Connect Batches with Instructor and Vehicle references
    const batches = await Batch.find();
    for (const b of batches) {
      let modified = false;
      if (b.instructor && !b.instructorRef) {
        const found = await Instructor.findOne({
          $or: [
            { name: { $regex: b.instructor, $options: 'i' } },
            { name: b.instructor }
          ]
        });
        if (found) {
          b.instructorRef = found._id;
          modified = true;
        }
      }
      if (b.vehicleNo && !b.vehicleRef) {
        const foundVeh = await Vehicle.findOne({ vehicleNumber: b.vehicleNo.trim().toUpperCase() });
        if (foundVeh) {
          b.vehicleRef = foundVeh._id;
          modified = true;
        }
      }
      if (modified) {
        await b.save();
      }
    }
    console.log(`✓ Synchronized Batch instructor and vehicle relationships.`);

    console.log('Operational database seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedData();
