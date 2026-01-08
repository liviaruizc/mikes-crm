/**
 * Calendar Export Utility
 * 
 * Generate .ics files for appointments that can be imported into:
 * - Google Calendar
 * - Apple Calendar
 * - Outlook
 * - Any calendar app that supports iCalendar format
 */

interface AppointmentExport {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  customerName?: string;
}

/**
 * Format date to iCalendar format (YYYYMMDDTHHMMSSZ)
 */
function formatICalDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escape special characters for iCalendar format
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate .ics file content for a single appointment
 */
export function generateICalContent(appointment: AppointmentExport): string {
  const now = new Date();
  const uid = `${appointment.id}@boss-crm.local`;
  
  // Build description
  let description = appointment.description || '';
  if (appointment.customerName) {
    description = `Customer: ${appointment.customerName}\n${description}`;
  }
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Boss CRM//Appointment//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICalDate(now)}`,
    `DTSTART:${formatICalDate(appointment.startTime)}`,
    `DTEND:${formatICalDate(appointment.endTime)}`,
    `SUMMARY:${escapeICalText(appointment.title)}`,
    description ? `DESCRIPTION:${escapeICalText(description)}` : '',
    appointment.location ? `LOCATION:${escapeICalText(appointment.location)}` : '',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Appointment Reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(line => line).join('\r\n');
  
  return icsContent;
}

/**
 * Download .ics file for a single appointment
 */
export function downloadAppointmentICS(appointment: AppointmentExport): void {
  const icsContent = generateICalContent(appointment);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `appointment-${appointment.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Generate .ics file content for multiple appointments
 */
export function generateMultipleICalContent(appointments: AppointmentExport[]): string {
  const now = new Date();
  
  const events = appointments.map(appointment => {
    const uid = `${appointment.id}@boss-crm.local`;
    
    let description = appointment.description || '';
    if (appointment.customerName) {
      description = `Customer: ${appointment.customerName}\n${description}`;
    }
    
    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${formatICalDate(now)}`,
      `DTSTART:${formatICalDate(appointment.startTime)}`,
      `DTEND:${formatICalDate(appointment.endTime)}`,
      `SUMMARY:${escapeICalText(appointment.title)}`,
      description ? `DESCRIPTION:${escapeICalText(description)}` : '',
      appointment.location ? `LOCATION:${escapeICalText(appointment.location)}` : '',
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'BEGIN:VALARM',
      'TRIGGER:-PT24H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Appointment Reminder',
      'END:VALARM',
      'END:VEVENT'
    ].filter(line => line).join('\r\n');
  }).join('\r\n');
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Boss CRM//Appointments//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    events,
    'END:VCALENDAR'
  ].join('\r\n');
  
  return icsContent;
}

/**
 * Download .ics file for multiple appointments
 */
export function downloadMultipleAppointmentsICS(appointments: AppointmentExport[], filename: string = 'appointments.ics'): void {
  const icsContent = generateMultipleICalContent(appointments);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
