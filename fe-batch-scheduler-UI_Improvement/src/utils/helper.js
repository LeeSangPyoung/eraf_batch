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

export function colorIndicator(state) {
  if (failStates.includes(state)) {
    return { color: '#D92D20' };
  }
  if (successStates.includes(state)) {
    return { color: '#17B26A' };
  }
  if (runningStates.includes(state)) {
    return { color: '#FFCC00' };
  }
  if (completedStates.includes(state)) {
    return { color: '#7DBBFF' };
  }
  return { color: 'rgba(0,0,0,0.4)' };
}

export function backgroundIndicator(state) {
  if (failStates.includes(state)) {
    return '#D92D20';
  }
  if (successStates.includes(state)) {
    return '#17B26A';
  }
  if (runningStates.includes(state)) {
    return '#FFCC00';
  }
  if (completedStates.includes(state)) {
    return '#7DBBFF';
  }
  return 'rgba(0,0,0,0.4)';
}

export function colorRowStatus(state) {
  if (state === currentStateOptions[1]) {
    return { backgroundColor: '#ff9800' };
  }
}

export function styleChipBackground(state) {
  if (failStates.includes(state)) {
    return '#fd625782';
  }
  if (successStates.includes(state)) {
    return '#53ba58ab';
  }
  if (state === currentStateOptions[1]) {
    return '#f8ac3c9e';
  }
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

  // Match and format into the desired pattern
  const formatted = cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');

  return formatted;
}

export function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
