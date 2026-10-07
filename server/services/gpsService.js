const Class = require('../models/Class');
const Student = require('../models/Student');
const AuditLog = require('../models/AuditLog');

const GPS_GATEWAY_URL = process.env.GPS_GATEWAY_URL || '';
const GPS_API_KEY = process.env.GPS_API_KEY || '';
const GPS_TRACKER_ENABLED = process.env.GPS_TRACKER_ENABLED === 'true';

/**
 * Calculates great-circle distance between two coordinates in kilometers using Haversine formula
 */
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371.0; // Earth's mean radius in km
  const toRad = (deg) => (deg * Math.PI) / 180.0;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Configuration status check
 */
const getTelemetryConfigurationStatus = () => {
  const configured = Boolean(GPS_TRACKER_ENABLED && GPS_GATEWAY_URL);
  return {
    configured,
    status: configured ? 'READY' : 'CONFIGURATION REQUIRED',
    provider: 'Teltonika / Traccar / OBD-II Telemetry Gateway',
    gatewayUrl: GPS_GATEWAY_URL || 'NOT_CONFIGURED',
    hasApiKey: Boolean(GPS_API_KEY),
    manualModeActive: true,
    supportedModes: ['MANUAL', 'GPS_LIVE', 'MOBILE_TRACKER'],
    message: configured
      ? 'Live GPS Telemetry gateway is active and tracking connected vehicles.'
      : 'Live GPS Telemetry interface is online. Hardware gateway (GPS_GATEWAY_URL) pending vehicle tracker pairing. Manual odometer (kmStart/kmEnd/kmDriven) is fully operational.'
  };
};

/**
 * Start a GPS telemetry session for a driving class
 */
const startGpsSession = async ({ classId, startLocation = {}, deviceId = 'GPS-DEVICE-01', user = null }) => {
  const cls = await Class.findById(classId);
  if (!cls) {
    throw new Error('Class session not found');
  }

  cls.telemetryMode = 'GPS_LIVE';
  cls.gpsSession = {
    status: 'IN_PROGRESS',
    startedAt: new Date(),
    startLocation: {
      lat: startLocation.lat || 0,
      lng: startLocation.lng || 0,
      address: startLocation.address || 'Starting Point'
    },
    waypoints: startLocation.lat ? [{
      lat: startLocation.lat,
      lng: startLocation.lng,
      timestamp: new Date(),
      speed: 0,
      accuracy: startLocation.accuracy || 10,
      eventId: `START-${Date.now()}`
    }] : [],
    calculatedGpsKm: 0,
    deviceId
  };

  await cls.save();

  await AuditLog.logAction({
    user,
    action: 'GPS_SESSION_STARTED',
    entity: 'Class',
    entityId: String(cls._id),
    details: {
      classId: String(cls._id),
      student: cls.student,
      vehicleNo: cls.vehicleNo,
      deviceId
    }
  });

  return {
    success: true,
    classId: cls._id,
    session: cls.gpsSession
  };
};

/**
 * Record waypoint coordinates pushed from vehicle GPS tracker or mobile app
 * Handles duplicate prevention and calculates incremental distance
 */
const recordWaypoints = async ({ classId, waypoints = [], deviceId = '' }) => {
  const cls = await Class.findById(classId);
  if (!cls) {
    throw new Error('Class session not found');
  }

  if (!cls.gpsSession || cls.gpsSession.status !== 'IN_PROGRESS') {
    throw new Error('GPS session is not in progress for this class');
  }

  const existingWaypoints = cls.gpsSession.waypoints || [];
  const existingEventIds = new Set(existingWaypoints.map((w) => w.eventId).filter(Boolean));

  let addedPoints = 0;
  let totalDistanceKm = cls.gpsSession.calculatedGpsKm || 0;

  let lastPoint = existingWaypoints.length > 0 ? existingWaypoints[existingWaypoints.length - 1] : null;

  for (const pt of waypoints) {
    if (!pt.lat || !pt.lng) continue;
    if (pt.eventId && existingEventIds.has(pt.eventId)) continue; // duplicate point

    const newPt = {
      lat: Number(pt.lat),
      lng: Number(pt.lng),
      timestamp: pt.timestamp ? new Date(pt.timestamp) : new Date(),
      speed: Number(pt.speed) || 0,
      accuracy: Number(pt.accuracy) || 10,
      eventId: pt.eventId || `WP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    };

    if (lastPoint && lastPoint.lat && lastPoint.lng) {
      const segDistance = calculateHaversineDistance(
        lastPoint.lat,
        lastPoint.lng,
        newPt.lat,
        newPt.lng
      );
      // Filter out GPS jump noise (> 150 km/h or instant teleports)
      if (segDistance < 5.0) {
        totalDistanceKm += segDistance;
      }
    }

    cls.gpsSession.waypoints.push(newPt);
    if (newPt.eventId) existingEventIds.add(newPt.eventId);
    lastPoint = newPt;
    addedPoints++;
  }

  cls.gpsSession.calculatedGpsKm = Math.round(totalDistanceKm * 100) / 100;
  if (deviceId) cls.gpsSession.deviceId = deviceId;

  await cls.save();

  return {
    success: true,
    addedWaypoints: addedPoints,
    totalWaypoints: cls.gpsSession.waypoints.length,
    calculatedGpsKm: cls.gpsSession.calculatedGpsKm
  };
};

/**
 * Stop GPS session, calculate final distance, and synchronize with class ledger
 */
const stopGpsSession = async ({
  classId,
  endLocation = {},
  deviceId = '',
  syncToOdometer = true,
  user = null
}) => {
  const cls = await Class.findById(classId);
  if (!cls) {
    throw new Error('Class session not found');
  }

  if (!cls.gpsSession || cls.gpsSession.status !== 'IN_PROGRESS') {
    throw new Error('GPS session is not currently active');
  }

  cls.gpsSession.status = 'COMPLETED';
  cls.gpsSession.stoppedAt = new Date();
  cls.gpsSession.endLocation = {
    lat: endLocation.lat || 0,
    lng: endLocation.lng || 0,
    address: endLocation.address || 'Destination Point'
  };

  const finalKm = Math.round((cls.gpsSession.calculatedGpsKm || 0) * 10) / 10;

  if (syncToOdometer) {
    cls.kmDriven = finalKm;
    cls.km = finalKm;
    if (cls.kmStart > 0 && (!cls.kmEnd || cls.kmEnd <= cls.kmStart)) {
      cls.kmEnd = cls.kmStart + finalKm;
    }
  }

  cls.status = 'Completed';
  await cls.save();

  // Audit Log
  await AuditLog.logAction({
    user,
    action: 'GPS_SESSION_COMPLETED',
    entity: 'Class',
    entityId: String(cls._id),
    details: {
      classId: String(cls._id),
      student: cls.student,
      finalKm,
      waypointCount: cls.gpsSession.waypoints.length
    }
  });

  return {
    success: true,
    classId: cls._id,
    finalKm,
    roadClassesEarned: Math.floor(finalKm / 5),
    session: cls.gpsSession
  };
};

module.exports = {
  calculateHaversineDistance,
  getTelemetryConfigurationStatus,
  startGpsSession,
  recordWaypoints,
  stopGpsSession
};
