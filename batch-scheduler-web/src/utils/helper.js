import { clsx } from 'clsx';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { twMerge } from 'tailwind-merge';
import {
  completedStates,
  currentStateOptions,
  failStates,
  runningStates,
  standbyStates,
  successStates,
} from './enum';
dayjs.extend(utc);
dayjs.extend(timezone);

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getUserTimeZone() {
  return dayjs.tz.guess();
}

export function timestampFormat(timestamp) {
  if (!timestamp || timestamp === 1) {
    return '';
  }
  if (timestamp) {
    return dayjs(timestamp).format('YYYY/MM/DD HH:mm:ss');
  }
}

export function formatDate(dayjsObject) {
  // return dayjs(dateString).format('YYYY-MM-DDTHH:mm:ss');
  return dayjsObject.valueOf();
}

export function formatDateTime(date, time) {
  // Extract the time (hours and minutes) from the time object
  const combinedDateTime = date
    .hour(time.hour())
    .minute(time.minute())
    .second(0); // Set seconds to 0 or adjust as needed

  return combinedDateTime.valueOf(); // Return the timestamp
}

// Apple-style status colors
export function colorIndicator(state) {
  if (failStates.includes(state)) {
    return { color: '#FF3B30' }; // Apple Red
  }
  if (successStates.includes(state)) {
    return { color: '#34C759' }; // Apple Green
  }
  if (runningStates.includes(state)) {
    return { color: '#FF9500' }; // Apple Orange
  }
  if (standbyStates.includes(state)) {
    return { color: '#8E8E93' }; // Apple System Gray
  }
  if (completedStates.includes(state)) {
    return { color: '#0071E3' }; // Apple Blue
  }
  return { color: '#86868B' }; // Apple Gray
}

export function backgroundIndicator(state) {
  if (failStates.includes(state)) {
    return '#FF3B30'; // Apple Red
  }
  if (successStates.includes(state)) {
    return '#34C759'; // Apple Green
  }
  if (runningStates.includes(state)) {
    return '#FF9500'; // Apple Orange
  }
  if (standbyStates.includes(state)) {
    return '#8E8E93'; // Apple System Gray
  }
  if (completedStates.includes(state)) {
    return '#0071E3'; // Apple Blue
  }
  return '#86868B'; // Apple Gray
}

export function colorRowStatus(state) {
  if (state === currentStateOptions[1]) {
    return { backgroundColor: 'rgba(255, 149, 0, 0.08)' }; // Apple Orange tint
  }
}

// Apple-style chip backgrounds (with transparency)
export function styleChipBackground(state) {
  if (failStates.includes(state)) {
    return 'rgba(255, 59, 48, 0.12)'; // Apple Red tint
  }
  if (successStates.includes(state)) {
    return 'rgba(52, 199, 89, 0.12)'; // Apple Green tint
  }
  if (state === currentStateOptions[1]) {
    return 'rgba(255, 149, 0, 0.12)'; // Apple Orange tint
  }
  return 'rgba(134, 134, 139, 0.12)'; // Apple Gray tint
}

export function stopPropagate(callback) {
  return (e) => {
    e.preventDefault();
    e.stopPropagation();
    callback();
  };
}

export function formatPhoneNumber(numberString) {
  if (!numberString) {
    return '';
  }
  // Remove any non-digit characters
  const cleaned = numberString.replace(/\D/g, '');

  // Format based on length
  // 11 digits (mobile): xxx-xxxx-xxxx (3-4-4)
  // 10 digits (landline/old): xxx-xxx-xxxx (3-3-4)
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  }

  // Return as-is if doesn't match expected lengths
  return cleaned;
}

export function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
